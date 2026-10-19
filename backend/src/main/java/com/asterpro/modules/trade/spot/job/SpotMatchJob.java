package com.asterpro.modules.trade.spot.job;

import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.asterpro.modules.trade.spot.service.SpotTradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 现货限价挂单撮合任务：每 3 秒扫描待成交限价单，达到市价则自动成交
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SpotMatchJob {

    private final SpotTradeService spotTradeService;

    @Scheduled(fixedDelay = 3000L)
    public void matchPendingOrders() {
        List<SpotOrder> pending;
        try {
            pending = spotTradeService.listPendingOrders(200);
        } catch (Exception e) {
            log.warn("spotMatchJob listPendingOrders err: {}", e.getMessage());
            return;
        }
        if (pending.isEmpty()) {
            return;
        }
        for (SpotOrder order : pending) {
            try {
                spotTradeService.tryMatchPendingOrder(order);
            } catch (Exception e) {
                log.warn("spotMatchJob match orderId={} err: {}", order.getId(), e.getMessage());
            }
        }
    }
}
