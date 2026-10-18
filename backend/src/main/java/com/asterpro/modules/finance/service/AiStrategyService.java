package com.asterpro.modules.finance.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.finance.entity.AiStrategy;
import com.asterpro.modules.finance.entity.AiStrategyOrder;
import com.asterpro.modules.finance.mapper.AiStrategyMapper;
import com.asterpro.modules.finance.mapper.AiStrategyOrderMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiStrategyService {

    private static final String COIN = "USDT";

    private final AiStrategyMapper strategyMapper;
    private final AiStrategyOrderMapper orderMapper;
    private final AccountService accountService;

    public List<AiStrategy> listStrategies() {
        LambdaQueryWrapper<AiStrategy> w = new LambdaQueryWrapper<>();
        w.eq(AiStrategy::getEnabled, 1).orderByDesc(AiStrategy::getUserCount);
        return strategyMapper.selectList(w);
    }

    public AiStrategy mustGet(Integer id) {
        AiStrategy s = strategyMapper.selectById(id);
        if (s == null || s.getEnabled() == null || s.getEnabled() == 0) {
            throw new BizException("Strategy not found"); // 策略不存在
        }
        return s;
    }

    @Transactional
    public AiStrategyOrder start(Long userId, Integer strategyId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        AiStrategy s = mustGet(strategyId);
        if (amount.compareTo(s.getMinAmount()) < 0) {
            throw new BizException("Amount below minimum investment " + s.getMinAmount().toPlainString() + " USDT"); // 低于最低投入
        }
        accountService.decrease(userId, Account.SPOT, COIN, amount,
                "ai_strategy", "START", "AI 策略启动:" + s.getName());

        AiStrategyOrder o = new AiStrategyOrder();
        o.setOrderNo("AI" + IdUtil.getSnowflakeNextIdStr());
        o.setUserId(userId);
        o.setStrategyId(strategyId);
        o.setAmount(amount);
        o.setTotalProfit(BigDecimal.ZERO);
        o.setStartAt(LocalDateTime.now());
        o.setStatus(AiStrategyOrder.STATUS_RUNNING);
        orderMapper.insert(o);

        s.setUserCount((s.getUserCount() == null ? 0 : s.getUserCount()) + 1);
        strategyMapper.updateById(s);
        return o;
    }

    @Transactional
    public AiStrategyOrder stop(Long userId, Long orderId) {
        AiStrategyOrder o = orderMapper.selectById(orderId);
        if (o == null || !o.getUserId().equals(userId)) {
            throw new BizException("Strategy order not found"); // 策略订单不存在
        }
        if (o.getStatus() != AiStrategyOrder.STATUS_RUNNING) {
            throw new BizException("Current status cannot be ended"); // 当前状态不可结束
        }
        BigDecimal profit = liveProfit(o);
        accountService.increase(userId, Account.SPOT, COIN, o.getAmount().add(profit),
                "ai_strategy", "STOP-" + o.getId(), "AI 策略结束(本金+收益)");
        o.setTotalProfit(profit);
        o.setEndAt(LocalDateTime.now());
        o.setStatus(AiStrategyOrder.STATUS_ENDED);
        orderMapper.updateById(o);

        AiStrategy s = strategyMapper.selectById(o.getStrategyId());
        if (s != null) {
            int next = (s.getUserCount() == null ? 0 : s.getUserCount()) - 1;
            s.setUserCount(Math.max(0, next));
            strategyMapper.updateById(s);
        }
        return o;
    }

    public BigDecimal liveProfit(AiStrategyOrder o) {
        if (o.getStatus() != AiStrategyOrder.STATUS_RUNNING) return o.getTotalProfit();
        return o.getTotalProfit() == null ? BigDecimal.ZERO : o.getTotalProfit();
    }

    public Page<AiStrategyOrder> myOrders(Long userId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<AiStrategyOrder> w = new LambdaQueryWrapper<>();
        w.eq(AiStrategyOrder::getUserId, userId);
        if (status != null) w.eq(AiStrategyOrder::getStatus, status);
        w.orderByDesc(AiStrategyOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
