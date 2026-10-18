package com.asterpro.modules.finance.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.finance.entity.LockOrder;
import com.asterpro.modules.finance.entity.LockProduct;
import com.asterpro.modules.finance.mapper.LockOrderMapper;
import com.asterpro.modules.finance.mapper.LockProductMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 锁仓理财（活期 + 定期）：
 * - 申购：扣 SPOT 账户币种 → 写入 t_lock_order（status=1 持有）
 * - 活期：随时赎回，按持仓秒数 × apr 计息（年利率 / 365 / 86400）
 * - 定期：到期才能赎回，提前赎回不计息（仅返本金）
 * - 利息发放统一在赎回 / 到期 时一次性返还到 SPOT 账户
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LockService {

    private final LockProductMapper productMapper;
    private final LockOrderMapper orderMapper;
    private final AccountService accountService;

    public List<LockProduct> listProducts(Integer lockType, String coin) {
        LambdaQueryWrapper<LockProduct> w = new LambdaQueryWrapper<>();
        w.eq(LockProduct::getEnabled, 1);
        if (lockType != null) w.eq(LockProduct::getLockType, lockType);
        if (coin != null && !coin.isBlank()) w.eq(LockProduct::getCoin, coin);
        w.orderByDesc(LockProduct::getIsHot).orderByAsc(LockProduct::getSort);
        return productMapper.selectList(w);
    }

    public LockProduct mustGet(Integer id) {
        LockProduct p = productMapper.selectById(id);
        if (p == null || p.getEnabled() == null || p.getEnabled() == 0) {
            throw new BizException("Product not found"); // 产品不存在
        }
        return p;
    }

    @Transactional
    public LockOrder subscribe(Long userId, Integer productId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        LockProduct p = mustGet(productId);
        if (p.getMinAmount() != null && amount.compareTo(p.getMinAmount()) < 0) {
            throw new BizException("Amount below minimum subscription " + p.getMinAmount().toPlainString()); // 低于最小申购数量
        }
        if (p.getMaxAmount() != null && p.getMaxAmount().signum() > 0
                && amount.compareTo(p.getMaxAmount()) > 0) {
            throw new BizException("Amount exceeds maximum subscription " + p.getMaxAmount().toPlainString()); // 超过最大申购数量
        }

        accountService.decrease(userId, Account.SPOT, p.getCoin(), amount,
                "lock", "SUBSCRIBE", "理财申购:" + p.getName());

        LockOrder o = new LockOrder();
        o.setOrderNo("L" + IdUtil.getSnowflakeNextIdStr());
        o.setUserId(userId);
        o.setProductId(p.getId());
        o.setCoin(p.getCoin());
        o.setAmount(amount);
        // apr 取区间均值
        BigDecimal apr = p.getAprMin().add(p.getAprMax())
                .divide(BigDecimal.valueOf(2), 6, RoundingMode.HALF_UP);
        o.setApr(apr);
        o.setInterest(BigDecimal.ZERO);
        LocalDateTime now = LocalDateTime.now();
        o.setStartAt(now);
        if (p.getLockType() == LockProduct.TYPE_FIXED && p.getLockDays() != null) {
            o.setEndAt(now.plusDays(p.getLockDays()));
        }
        o.setStatus(LockOrder.STATUS_HOLDING);
        orderMapper.insert(o);
        return o;
    }

    @Transactional
    public LockOrder redeem(Long userId, Long orderId) {
        LockOrder o = orderMapper.selectById(orderId);
        if (o == null || !o.getUserId().equals(userId)) {
            throw new BizException("Order not found"); // 订单不存在
        }
        if (o.getStatus() != LockOrder.STATUS_HOLDING) {
            throw new BizException("Current status cannot be redeemed"); // 当前状态不可赎回
        }
        LockProduct p = mustGet(o.getProductId());
        boolean fixed = p.getLockType() == LockProduct.TYPE_FIXED;
        boolean matured = !fixed || (o.getEndAt() != null && !LocalDateTime.now().isBefore(o.getEndAt()));
        if (fixed && !matured) {
            throw new BizException("Fixed-term product can only be redeemed after maturity"); // 定期产品到期后才能赎回
        }

        BigDecimal interest = BigDecimal.ZERO;
        if (matured) {
            interest = computeInterest(o, LocalDateTime.now());
        }
        int rows = orderMapper.update(null, new LambdaUpdateWrapper<LockOrder>()
                .eq(LockOrder::getId, o.getId())
                .eq(LockOrder::getStatus, LockOrder.STATUS_HOLDING)
                .set(LockOrder::getStatus, LockOrder.STATUS_REDEEMED)
                .set(LockOrder::getInterest, interest)
                .set(LockOrder::getEndAt, LocalDateTime.now()));
        if (rows == 0) {
            throw new BizException("Order status changed, please refresh and retry"); // 订单状态已变更，请刷新后重试
        }
        BigDecimal back = o.getAmount().add(interest);
        accountService.increase(userId, Account.SPOT, o.getCoin(), back,
                "lock", "REDEEM-" + o.getId(),
                interest.signum() > 0 ? "理财赎回(本金+利息)" : "理财赎回(仅本金)");

        o.setInterest(interest);
        o.setStatus(LockOrder.STATUS_REDEEMED);
        return o;
    }

    /** 定时任务：扫描已到期的定期订单，自动结算（status=3 已到期） */
    @Transactional
    public int settleMatured(int batchLimit) {
        LambdaQueryWrapper<LockOrder> w = new LambdaQueryWrapper<>();
        w.eq(LockOrder::getStatus, LockOrder.STATUS_HOLDING)
                .isNotNull(LockOrder::getEndAt)
                .le(LockOrder::getEndAt, LocalDateTime.now())
                .last("LIMIT " + Math.max(1, Math.min(batchLimit, 500)));
        List<LockOrder> rows = orderMapper.selectList(w);
        int n = 0;
        for (LockOrder o : rows) {
            try {
                BigDecimal interest = computeInterest(o, o.getEndAt());
                int updated = orderMapper.update(null, new LambdaUpdateWrapper<LockOrder>()
                        .eq(LockOrder::getId, o.getId())
                        .eq(LockOrder::getStatus, LockOrder.STATUS_HOLDING)
                        .set(LockOrder::getStatus, LockOrder.STATUS_MATURED)
                        .set(LockOrder::getInterest, interest));
                if (updated == 0) continue;
                accountService.increase(o.getUserId(), Account.SPOT, o.getCoin(),
                        o.getAmount().add(interest),
                        "lock", "MATURE-" + o.getId(), "理财到期结算");
                n++;
            } catch (Exception e) {
                log.warn("settle matured lock order {} err: {}", o.getId(), e.getMessage());
            }
        }
        return n;
    }

    /** 仍在持有的实时利息（用于前端展示，未落库） */
    public BigDecimal liveInterest(LockOrder o) {
        if (o.getStatus() != LockOrder.STATUS_HOLDING) return o.getInterest();
        return computeInterest(o, LocalDateTime.now());
    }

    /** 计算利息：amount × apr × seconds / (365 × 86400) */
    private BigDecimal computeInterest(LockOrder o, LocalDateTime endTime) {
        long secs = Duration.between(o.getStartAt(), endTime).getSeconds();
        if (secs <= 0) return BigDecimal.ZERO;
        BigDecimal denom = BigDecimal.valueOf(365L * 86400L);
        return o.getAmount().multiply(o.getApr())
                .multiply(BigDecimal.valueOf(secs))
                .divide(denom, 18, RoundingMode.HALF_DOWN);
    }

    public Page<LockOrder> myOrders(Long userId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<LockOrder> w = new LambdaQueryWrapper<>();
        w.eq(LockOrder::getUserId, userId);
        if (status != null) w.eq(LockOrder::getStatus, status);
        w.orderByDesc(LockOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
