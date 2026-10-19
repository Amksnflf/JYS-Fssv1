package com.asterpro.modules.finance.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.finance.entity.PortfolioOrder;
import com.asterpro.modules.finance.entity.PortfolioProduct;
import com.asterpro.modules.finance.mapper.PortfolioOrderMapper;
import com.asterpro.modules.finance.mapper.PortfolioProductMapper;
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
 * 投资组合产品（USDT 计价）：
 * - 申购：扣 SPOT.USDT，写订单
 * - 收益：每日利率 dailyRate × duration（到期一次性结算）
 * - 提前赎回：仅返本金（无收益）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioService {

    private static final String COIN = "USDT";

    private final PortfolioProductMapper productMapper;
    private final PortfolioOrderMapper orderMapper;
    private final AccountService accountService;

    public List<PortfolioProduct> listProducts() {
        LambdaQueryWrapper<PortfolioProduct> w = new LambdaQueryWrapper<>();
        w.eq(PortfolioProduct::getEnabled, 1)
                .orderByDesc(PortfolioProduct::getIsHot)
                .orderByAsc(PortfolioProduct::getSort);
        return productMapper.selectList(w);
    }

    public PortfolioProduct mustGet(Integer id) {
        PortfolioProduct p = productMapper.selectById(id);
        if (p == null || p.getEnabled() == null || p.getEnabled() == 0) {
            throw new BizException("Product not found"); // 产品不存在
        }
        return p;
    }

    @Transactional
    public PortfolioOrder subscribe(Long userId, Integer productId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        PortfolioProduct p = mustGet(productId);
        if (p.getMinAmount() != null && amount.compareTo(p.getMinAmount()) < 0) {
            throw new BizException("Amount below minimum subscription " + p.getMinAmount().toPlainString()); // 低于最小申购金额
        }
        if (p.getMaxAmount() != null && p.getMaxAmount().signum() > 0
                && amount.compareTo(p.getMaxAmount()) > 0) {
            throw new BizException("Amount exceeds maximum subscription " + p.getMaxAmount().toPlainString()); // 超过最大申购金额
        }

        accountService.decrease(userId, Account.SPOT, COIN, amount,
                "portfolio", "SUBSCRIBE", "投资组合申购:" + p.getName());

        PortfolioOrder o = new PortfolioOrder();
        o.setOrderNo("P" + IdUtil.getSnowflakeNextIdStr());
        o.setUserId(userId);
        o.setProductId(p.getId());
        o.setAmount(amount);
        o.setDailyRate(p.getDailyRate());
        o.setTotalProfit(BigDecimal.ZERO);
        LocalDateTime now = LocalDateTime.now();
        o.setStartAt(now);
        o.setEndAt(now.plusDays(p.getDurationDays()));
        o.setStatus(PortfolioOrder.STATUS_HOLDING);
        orderMapper.insert(o);
        return o;
    }

    @Transactional
    public PortfolioOrder redeem(Long userId, Long orderId) {
        PortfolioOrder o = orderMapper.selectById(orderId);
        if (o == null || !o.getUserId().equals(userId)) {
            throw new BizException("Order not found"); // 订单不存在
        }
        if (o.getStatus() != PortfolioOrder.STATUS_HOLDING) {
            throw new BizException("Current status cannot be redeemed"); // 当前状态不可赎回
        }
        boolean matured = o.getEndAt() != null && !LocalDateTime.now().isBefore(o.getEndAt());
        BigDecimal profit;
        if (o.getTotalProfit() != null && o.getTotalProfit().signum() > 0) {
            profit = o.getTotalProfit();
        } else {
            profit = matured ? computeProfit(o) : BigDecimal.ZERO;
        }
        int rows = orderMapper.update(null, new LambdaUpdateWrapper<PortfolioOrder>()
                .eq(PortfolioOrder::getId, o.getId())
                .eq(PortfolioOrder::getStatus, PortfolioOrder.STATUS_HOLDING)
                .set(PortfolioOrder::getStatus, PortfolioOrder.STATUS_REDEEMED)
                .set(PortfolioOrder::getTotalProfit, profit));
        if (rows == 0) {
            throw new BizException("Order status changed, please refresh and retry"); // 订单状态已变更，请刷新后重试
        }
        BigDecimal back = o.getAmount().add(profit);
        accountService.increase(userId, Account.SPOT, COIN, back,
                "portfolio", "REDEEM-" + o.getId(),
                profit.signum() > 0 ? "投资组合赎回(本金+收益)" : "投资组合赎回(仅本金)");

        o.setTotalProfit(profit);
        o.setStatus(PortfolioOrder.STATUS_REDEEMED);
        return o;
    }

    @Transactional
    public int settleMatured(int batchLimit) {
        LambdaQueryWrapper<PortfolioOrder> w = new LambdaQueryWrapper<>();
        w.eq(PortfolioOrder::getStatus, PortfolioOrder.STATUS_HOLDING)
                .isNotNull(PortfolioOrder::getEndAt)
                .le(PortfolioOrder::getEndAt, LocalDateTime.now())
                .last("LIMIT " + Math.max(1, Math.min(batchLimit, 500)));
        List<PortfolioOrder> rows = orderMapper.selectList(w);
        int n = 0;
        for (PortfolioOrder o : rows) {
            try {
                BigDecimal profit = (o.getTotalProfit() != null && o.getTotalProfit().signum() > 0)
                        ? o.getTotalProfit()
                        : computeProfit(o);
                int updated = orderMapper.update(null, new LambdaUpdateWrapper<PortfolioOrder>()
                        .eq(PortfolioOrder::getId, o.getId())
                        .eq(PortfolioOrder::getStatus, PortfolioOrder.STATUS_HOLDING)
                        .set(PortfolioOrder::getStatus, PortfolioOrder.STATUS_MATURED)
                        .set(PortfolioOrder::getTotalProfit, profit));
                if (updated == 0) continue;
                accountService.increase(o.getUserId(), Account.SPOT, COIN,
                        o.getAmount().add(profit),
                        "portfolio", "MATURE-" + o.getId(), "投资组合到期结算");
                n++;
            } catch (Exception e) {
                log.warn("settle matured portfolio order {} err: {}", o.getId(), e.getMessage());
            }
        }
        return n;
    }

    /** 实时收益（按已持有天数比例） */
    public BigDecimal liveProfit(PortfolioOrder o) {
        if (o.getStatus() != PortfolioOrder.STATUS_HOLDING) return o.getTotalProfit();
        if (o.getTotalProfit() != null && o.getTotalProfit().signum() > 0) return o.getTotalProfit();
        return computeProfit(o);
    }

    private BigDecimal computeProfit(PortfolioOrder o) {
        // 收益 = amount × dailyRate × min(已持有秒, duration秒) / 86400
        long heldSecs = Duration.between(o.getStartAt(),
                LocalDateTime.now().isBefore(o.getEndAt()) ? LocalDateTime.now() : o.getEndAt()
        ).getSeconds();
        if (heldSecs <= 0) return BigDecimal.ZERO;
        return o.getAmount().multiply(o.getDailyRate())
                .multiply(BigDecimal.valueOf(heldSecs))
                .divide(BigDecimal.valueOf(86400L), 18, RoundingMode.HALF_DOWN);
    }

    public Page<PortfolioOrder> myOrders(Long userId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<PortfolioOrder> w = new LambdaQueryWrapper<>();
        w.eq(PortfolioOrder::getUserId, userId);
        if (status != null) w.eq(PortfolioOrder::getStatus, status);
        w.orderByDesc(PortfolioOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
