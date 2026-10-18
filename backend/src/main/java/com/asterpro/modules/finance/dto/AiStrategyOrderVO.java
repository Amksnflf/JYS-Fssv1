package com.asterpro.modules.finance.dto;

import com.asterpro.modules.finance.entity.AiStrategyOrder;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AiStrategyOrderVO {
    private Long id;
    private String orderNo;
    private Integer strategyId;
    private String strategyName;
    private String strategyType;
    private BigDecimal amount;
    private BigDecimal totalProfit;
    private BigDecimal liveProfit;
    private String startAt;
    private String endAt;
    private Integer status;
    private String createdAt;

    public static AiStrategyOrderVO of(AiStrategyOrder o) {
        AiStrategyOrderVO v = new AiStrategyOrderVO();
        v.setId(o.getId());
        v.setOrderNo(o.getOrderNo());
        v.setStrategyId(o.getStrategyId());
        v.setAmount(o.getAmount());
        v.setTotalProfit(o.getTotalProfit());
        v.setStartAt(String.valueOf(o.getStartAt()));
        v.setEndAt(o.getEndAt() == null ? null : String.valueOf(o.getEndAt()));
        v.setStatus(o.getStatus());
        v.setCreatedAt(String.valueOf(o.getCreatedAt()));
        return v;
    }
}
