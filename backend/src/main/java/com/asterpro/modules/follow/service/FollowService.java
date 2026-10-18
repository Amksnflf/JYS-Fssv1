package com.asterpro.modules.follow.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.follow.entity.FollowOrder;
import com.asterpro.modules.follow.entity.FollowTrader;
import com.asterpro.modules.follow.mapper.FollowOrderMapper;
import com.asterpro.modules.follow.mapper.FollowTraderMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowTraderMapper traderMapper;
    private final FollowOrderMapper orderMapper;
    private final AccountService accountService;

    public List<FollowTrader> traders() {
        return traderMapper.selectList(new LambdaQueryWrapper<FollowTrader>()
                .eq(FollowTrader::getEnabled, 1)
                .orderByAsc(FollowTrader::getSort)
                .orderByDesc(FollowTrader::getFollowers));
    }

    @Transactional
    public FollowOrder start(Long userId, Integer traderId, BigDecimal amount, Integer maxLeverage) {
        if (amount == null || amount.signum() <= 0) throw new BizException(ResultCode.PARAM_ERROR);
        FollowTrader trader = traderMapper.selectById(traderId);
        if (trader == null || trader.getEnabled() == null || trader.getEnabled() == 0) {
            throw new BizException("Trader not found"); // 交易员不存在
        }
        accountService.decrease(userId, Account.TRADE, "USDT", amount,
                "follow", "START-" + traderId, "开启跟单:" + trader.getName());
        FollowOrder order = new FollowOrder();
        order.setOrderNo("F" + IdUtil.getSnowflakeNextIdStr());
        order.setUserId(userId);
        order.setTraderId(traderId);
        order.setAmount(amount);
        order.setMaxLeverage(maxLeverage == null || maxLeverage <= 0 ? 20 : maxLeverage);
        order.setStatus(FollowOrder.STATUS_RUNNING);
        orderMapper.insert(order);

        trader.setFollowers((trader.getFollowers() == null ? 0 : trader.getFollowers()) + 1);
        traderMapper.updateById(trader);
        return order;
    }

    @Transactional
    public FollowOrder cancel(Long userId, Long orderId) {
        FollowOrder order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) throw new BizException("Follow order not found"); // 跟单不存在
        if (order.getStatus() != FollowOrder.STATUS_RUNNING) throw new BizException("Current status cannot be cancelled"); // 当前状态不可取消
        accountService.increase(userId, Account.TRADE, "USDT", order.getAmount(),
                "follow", "CANCEL-" + order.getId(), "取消跟单释放资金");
        order.setStatus(FollowOrder.STATUS_CANCELLED);
        orderMapper.updateById(order);

        FollowTrader trader = traderMapper.selectById(order.getTraderId());
        if (trader != null) {
            int next = (trader.getFollowers() == null ? 0 : trader.getFollowers()) - 1;
            trader.setFollowers(Math.max(0, next));
            traderMapper.updateById(trader);
        }
        return order;
    }

    public Page<FollowOrder> myOrders(Long userId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<FollowOrder> w = new LambdaQueryWrapper<>();
        w.eq(FollowOrder::getUserId, userId);
        if (status != null) w.eq(FollowOrder::getStatus, status);
        w.orderByDesc(FollowOrder::getId);
        return orderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w);
    }
}
