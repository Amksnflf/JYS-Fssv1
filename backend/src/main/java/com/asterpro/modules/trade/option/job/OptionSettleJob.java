package com.asterpro.modules.trade.option.job;

import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.asterpro.modules.trade.option.service.OptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 期权结算：每秒扫到期单
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OptionSettleJob {

    private final OptionService optionService;

    @Scheduled(fixedDelay = 1000L)
    public void settle() {
        List<OptionOrder> dueScheduled;
        try {
            dueScheduled = optionService.listDueScheduledOrders(200);
        } catch (Exception e) {
            log.warn("optionSettleJob scheduled list err: {}", e.getMessage());
            dueScheduled = List.of();
        }
        for (OptionOrder o : dueScheduled) {
            try {
                optionService.openScheduled(o);
            } catch (Exception e) {
                log.warn("open scheduled option order id={} err: {}", o.getId(), e.getMessage());
            }
        }

        List<OptionOrder> due;
        try {
            due = optionService.listDueOrders(200);
        } catch (Exception e) {
            log.warn("optionSettleJob list err: {}", e.getMessage());
            return;
        }
        if (due.isEmpty()) return;
        for (OptionOrder o : due) {
            try {
                optionService.settle(o);
            } catch (Exception e) {
                log.warn("settle option order id={} err: {}", o.getId(), e.getMessage());
            }
        }
    }
}
