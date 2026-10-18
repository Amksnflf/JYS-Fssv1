package com.asterpro.modules.finance.dto;

import com.asterpro.modules.finance.entity.PortfolioOrder;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PortfolioOrderVO {
    private Long id;
    private String orderNo;
    private Integer productId;
    private String productName;
    private Integer durationDays;
    private BigDecimal amount;
    private BigDecimal dailyRate;
    private BigDecimal totalProfit;
    private BigDecimal liveProfit;
    private String startAt;
    private String endAt;
    private Integer status;
    private String createdAt;

    public static PortfolioOrderVO of(PortfolioOrder o) {
        PortfolioOrderVO v = new PortfolioOrderVO();
        v.setId(o.getId());
        v.setOrderNo(o.getOrderNo());
        v.setProductId(o.getProductId());
        v.setAmount(o.getAmount());
        v.setDailyRate(o.getDailyRate());
        v.setTotalProfit(o.getTotalProfit());
        v.setStartAt(String.valueOf(o.getStartAt()));
        v.setEndAt(o.getEndAt() == null ? null : String.valueOf(o.getEndAt()));
        v.setStatus(o.getStatus());
        v.setCreatedAt(String.valueOf(o.getCreatedAt()));
        return v;
    }
}
