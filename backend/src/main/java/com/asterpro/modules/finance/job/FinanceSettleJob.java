package com.asterpro.modules.finance.job;

import com.asterpro.modules.finance.service.LockService;
import com.asterpro.modules.finance.service.LoanService;
import com.asterpro.modules.finance.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 理财到期结算：每分钟扫一批
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FinanceSettleJob {

    private final LockService lockService;
    private final PortfolioService portfolioService;
    private final LoanService loanService;

    @Scheduled(fixedDelay = 60_000L)
    public void settle() {
        try {
            int n1 = lockService.settleMatured(200);
            int n2 = portfolioService.settleMatured(200);
            int n3 = loanService.liquidateOverdue(200);
            if (n1 > 0 || n2 > 0 || n3 > 0) {
                log.info("finance settled: lock={} portfolio={} loanLiquidated={}", n1, n2, n3);
            }
        } catch (Exception e) {
            log.warn("finance settle job err: {}", e.getMessage());
        }
    }
}
