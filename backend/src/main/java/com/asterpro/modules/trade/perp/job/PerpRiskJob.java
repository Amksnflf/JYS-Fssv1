package com.asterpro.modules.trade.perp.job;

import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.service.PerpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PerpRiskJob {

    private final PerpService perpService;
    private final SymbolService symbolService;
    private final AccountService accountService;
    private final SettlementService settlementService;

    @Scheduled(fixedDelay = 1000L)
    public void scanRisk() {
        List<PerpPosition> list;
        try {
            list = perpService.listAllOpen();
        } catch (Exception e) {
            log.warn("scanRisk listAllOpen err: {}", e.getMessage());
            return;
        }
        if (list.isEmpty()) return;
        for (PerpPosition pos : list) {
            try {
                Symbol s = symbolService.findBySymbol("perp", pos.getSymbol());
                if (s == null) continue;
                BigDecimal price = settlementService.latestDisplayPrice(s);
                if (price == null || price.signum() <= 0) continue;
                int precision = s.getPricePrecision() == null || s.getPricePrecision() < 0 ? 5 : s.getPricePrecision();
                BigDecimal mark = price.setScale(precision, RoundingMode.HALF_UP);

                if (isLiquidated(pos, mark)) {
                    perpService.settle(pos, s, mark, true, "触发强平");
                    log.info("position liquidated id={} symbol={}", pos.getId(), pos.getSymbol());
                    continue;
                }
                if (pos.getTakeProfitPrice() != null && pos.getTakeProfitPrice().signum() > 0) {
                    boolean hit = pos.getSide() == PerpPosition.SIDE_LONG
                            ? mark.compareTo(pos.getTakeProfitPrice()) >= 0
                            : mark.compareTo(pos.getTakeProfitPrice()) <= 0;
                    if (hit) {
                        perpService.settle(pos, s, mark, false, "触发止盈");
                        continue;
                    }
                }
                if (pos.getStopLossPrice() != null && pos.getStopLossPrice().signum() > 0) {
                    boolean hit = pos.getSide() == PerpPosition.SIDE_LONG
                            ? mark.compareTo(pos.getStopLossPrice()) <= 0
                            : mark.compareTo(pos.getStopLossPrice()) >= 0;
                    if (hit) {
                        perpService.settle(pos, s, mark, false, "触发止损");
                    }
                }
            } catch (Exception e) {
                log.warn("scanRisk position id={} err: {}", pos.getId(), e.getMessage());
            }
        }
    }

    private boolean isLiquidated(PerpPosition pos, BigDecimal mark) {
        if (pos.getLiqPrice() == null) return false;
        return pos.getSide() == PerpPosition.SIDE_LONG
                ? mark.compareTo(pos.getLiqPrice()) <= 0
                : mark.compareTo(pos.getLiqPrice()) >= 0;
    }

    @Scheduled(cron = "0 0 0/8 * * ?")
    public void chargeFundingFee() {
        BigDecimal rate = new BigDecimal("0.0001");
        List<PerpPosition> list = perpService.listAllOpen();
        for (PerpPosition pos : list) {
            try {
                Symbol s = symbolService.findBySymbol("perp", pos.getSymbol());
                if (s == null) continue;
                BigDecimal price = settlementService.latestDisplayPrice(s);
                if (price == null || price.signum() <= 0) continue;
                BigDecimal notionalQuote = pos.getAmount().multiply(price).setScale(8, RoundingMode.HALF_UP);
                BigDecimal fee = settlementService.convertQuoteToSettlement(s, notionalQuote.multiply(rate))
                        .setScale(8, RoundingMode.HALF_UP);
                if (fee.signum() <= 0) continue;
                String settlementCoin = settlementService.settlementCoin(s);
                if (pos.getSide() == PerpPosition.SIDE_LONG) {
                    accountService.decrease(pos.getUserId(), Account.TRADE, settlementCoin,
                            fee, "perp", "FUNDING-" + pos.getId(), "资金费率扣除");
                } else {
                    accountService.increase(pos.getUserId(), Account.TRADE, settlementCoin,
                            fee, "perp", "FUNDING-" + pos.getId(), "资金费率收取");
                }
            } catch (Exception e) {
                log.warn("funding fee position id={} err: {}", pos.getId(), e.getMessage());
            }
        }
    }
}
