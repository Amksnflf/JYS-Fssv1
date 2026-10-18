package com.asterpro.modules.finance.dto;

import com.asterpro.modules.finance.entity.LoanOrder;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LoanOrderVO {
    private Long id;
    private String orderNo;
    private String coin;
    private BigDecimal borrowAmount;
    private BigDecimal collateralAmount;
    private BigDecimal dailyRate;
    private BigDecimal totalInterest;
    private BigDecimal liveInterest;
    private BigDecimal repayAmount;
    private BigDecimal serviceFee;
    private Integer lockDays;
    private String startAt;
    private String dueAt;
    private String repaidAt;
    private Integer status;
    private String createdAt;

    public static LoanOrderVO of(LoanOrder o) {
        LoanOrderVO v = new LoanOrderVO();
        v.setId(o.getId());
        v.setOrderNo(o.getOrderNo());
        v.setCoin(o.getCoin());
        v.setBorrowAmount(o.getBorrowAmount());
        v.setCollateralAmount(o.getCollateralAmount());
        v.setDailyRate(o.getDailyRate());
        v.setTotalInterest(o.getTotalInterest());
        v.setServiceFee(o.getServiceFee());
        v.setLockDays(o.getLockDays());
        v.setStartAt(String.valueOf(o.getStartAt()));
        v.setDueAt(String.valueOf(o.getDueAt()));
        v.setRepaidAt(o.getRepaidAt() == null ? null : String.valueOf(o.getRepaidAt()));
        v.setStatus(o.getStatus());
        v.setCreatedAt(String.valueOf(o.getCreatedAt()));
        return v;
    }
}
