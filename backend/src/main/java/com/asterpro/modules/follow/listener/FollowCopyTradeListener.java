package com.asterpro.modules.follow.listener;

import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.follow.entity.FollowOrder;
import com.asterpro.modules.follow.entity.FollowTrader;
import com.asterpro.modules.follow.mapper.FollowOrderMapper;
import com.asterpro.modules.follow.mapper.FollowTraderMapper;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.perp.entity.PerpOrder;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.event.PerpClosedEvent;
import com.asterpro.modules.trade.perp.event.PerpOpenedEvent;
import com.asterpro.modules.trade.perp.mapper.PerpPositionMapper;
import com.asterpro.modules.trade.perp.service.PerpService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * 跟单镜像下单监听器（Spring 事件驱动，不依赖任何外部 MQ）。
 *
 * 触发链路：
 *   交易员（已绑定 t_follow_trader.user_id）调用 PerpService.open / settle
 *   → 发布 PerpOpenedEvent / PerpClosedEvent
 *   → 本监听器 同步 处理每个 FollowOrder（独立 try/catch，互不影响）
 *
 * 风控规则见 {@link #copyOpenForFollower}：
 *   1. 镜像数量 = 交易员开仓量 × (跟单本金 / 交易员展示本金 trader.principal)
 *   2. 杠杆 = min(交易员杠杆, follow.maxLeverage)
 *   3. 镜像数量低于 symbol.minAmount → 跳过
 *   4. 跟单方 TRADE 账户余额不足保证金+手续费 → 跳过（不强行扣穿）
 *   5. 同一交易员订单号已为该跟单方做过镜像 → 幂等跳过
 *   6. 镜像下单失败仅记录日志，不影响交易员主单及其他跟单方
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FollowCopyTradeListener {

    private final FollowTraderMapper traderMapper;
    private final FollowOrderMapper followOrderMapper;
    private final PerpPositionMapper perpPositionMapper;
    private final PerpService perpService;
    private final SymbolService symbolService;
    private final AccountService accountService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPerpOpened(PerpOpenedEvent event) {
        if (event.getSourceOrderNo() != null) {
            return;
        }

        FollowTrader trader = traderMapper.selectOne(new LambdaQueryWrapper<FollowTrader>()
                .eq(FollowTrader::getUserId, event.getUserId())
                .eq(FollowTrader::getEnabled, 1)
                .last("LIMIT 1"));
        if (trader == null) {
            return;
        }
        if (trader.getPrincipal() == null || trader.getPrincipal().signum() <= 0) {
            log.warn("[CopyTrade] trader principal not set, skip mirror. traderId={}, name={}",
                    trader.getId(), trader.getName());
            return;
        }

        Symbol s = symbolService.findBySymbol("perp", event.getSymbol());
        if (s == null) {
            log.warn("[CopyTrade] symbol not found, skip. symbol={}", event.getSymbol());
            return;
        }

        List<FollowOrder> orders = followOrderMapper.selectList(new LambdaQueryWrapper<FollowOrder>()
                .eq(FollowOrder::getTraderId, trader.getId())
                .eq(FollowOrder::getStatus, FollowOrder.STATUS_RUNNING));
        log.info("[CopyTrade] trader open detected. trader={}, orderNo={}, followers={}",
                trader.getName(), event.getOrderNo(), orders.size());

        for (FollowOrder fo : orders) {
            try {
                copyOpenForFollower(event, trader, fo, s);
            } catch (Exception ex) {
                log.error("[CopyTrade] mirror open failed. follower={}, traderOrderNo={}, err={}",
                        fo.getUserId(), event.getOrderNo(), ex.getMessage(), ex);
            }
        }
    }

    private void copyOpenForFollower(PerpOpenedEvent event, FollowTrader trader,
                                     FollowOrder fo, Symbol s) {
        Long exists = perpPositionMapper.selectCount(new LambdaQueryWrapper<PerpPosition>()
                .eq(PerpPosition::getUserId, fo.getUserId())
                .eq(PerpPosition::getSourceOrderNo, event.getOrderNo()));
        if (exists != null && exists > 0) {
            log.info("[CopyTrade] already mirrored, skip. follower={}, sourceOrderNo={}",
                    fo.getUserId(), event.getOrderNo());
            return;
        }

        BigDecimal ratio = fo.getAmount().divide(trader.getPrincipal(), 12, RoundingMode.HALF_UP);
        int amountScale = s.getAmountPrecision() == null ? 4 : s.getAmountPrecision();
        BigDecimal mirrorAmount = event.getAmount().multiply(ratio)
                .setScale(amountScale, RoundingMode.DOWN);
        if (mirrorAmount.signum() <= 0) {
            log.info("[CopyTrade] mirror amount rounded to zero, skip. follower={}, ratio={}",
                    fo.getUserId(), ratio);
            return;
        }
        if (s.getMinAmount() != null && mirrorAmount.compareTo(s.getMinAmount()) < 0) {
            log.info("[CopyTrade] below minAmount, skip. follower={}, mirror={}, min={}",
                    fo.getUserId(), mirrorAmount, s.getMinAmount());
            return;
        }

        int leverage = Math.min(
                event.getLeverage() == null ? 1 : event.getLeverage(),
                fo.getMaxLeverage() == null ? 20 : fo.getMaxLeverage());
        if (leverage < 1) leverage = 1;

        BigDecimal notional = mirrorAmount.multiply(event.getDealPrice());
        BigDecimal margin = notional.divide(BigDecimal.valueOf(leverage), 8, RoundingMode.HALF_UP);
        BigDecimal feeRate = s.getTakerFee() == null ? BigDecimal.ZERO : s.getTakerFee();
        BigDecimal fee = notional.multiply(feeRate).setScale(8, RoundingMode.HALF_UP);
        BigDecimal need = margin.add(fee);

        Account acc = accountService.find(fo.getUserId(), Account.TRADE, s.getQuoteCoin());
        BigDecimal available = acc == null ? BigDecimal.ZERO : acc.getAvailable();
        if (available.compareTo(need) < 0) {
            log.warn("[CopyTrade] insufficient balance, skip. follower={}, need={}, have={}",
                    fo.getUserId(), need, available);
            return;
        }

        perpService.openInternal(fo.getUserId(), event.getSymbol(), event.getSide(),
                PerpOrder.TYPE_MARKET, event.getMarginMode(),
                leverage, null, mirrorAmount,
                event.getTakeProfitPrice(), event.getStopLossPrice(),
                event.getOrderNo());
        log.info("[CopyTrade] mirror open ok. follower={}, symbol={}, amount={}, leverage={}",
                fo.getUserId(), event.getSymbol(), mirrorAmount, leverage);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPerpClosed(PerpClosedEvent event) {
        if (event.getSourceOrderNo() != null) {
            return;
        }

        FollowTrader trader = traderMapper.selectOne(new LambdaQueryWrapper<FollowTrader>()
                .eq(FollowTrader::getUserId, event.getUserId())
                .eq(FollowTrader::getEnabled, 1)
                .last("LIMIT 1"));
        if (trader == null) {
            return;
        }

        List<FollowOrder> orders = followOrderMapper.selectList(new LambdaQueryWrapper<FollowOrder>()
                .eq(FollowOrder::getTraderId, trader.getId())
                .eq(FollowOrder::getStatus, FollowOrder.STATUS_RUNNING));
        for (FollowOrder fo : orders) {
            try {
                List<PerpPosition> positions = perpPositionMapper.selectList(new LambdaQueryWrapper<PerpPosition>()
                        .eq(PerpPosition::getUserId, fo.getUserId())
                        .eq(PerpPosition::getSymbol, event.getSymbol())
                        .eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN)
                        .isNotNull(PerpPosition::getSourceOrderNo));
                for (PerpPosition pos : positions) {
                    perpService.close(fo.getUserId(), pos.getId());
                    log.info("[CopyTrade] mirror close ok. follower={}, positionId={}, reason={}",
                            fo.getUserId(), pos.getId(), event.getReason());
                }
            } catch (Exception ex) {
                log.error("[CopyTrade] mirror close failed. follower={}, traderUser={}, err={}",
                        fo.getUserId(), event.getUserId(), ex.getMessage(), ex);
            }
        }
    }
}
