package com.asterpro.modules.finance.dto;

import com.asterpro.modules.finance.entity.LockOrder;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LockOrderVO {
    private Long id;
    private String orderNo;
    private Integer productId;
    private String productName;
    private Integer lockType;
    private Integer lockDays;
    private String coin;
    private BigDecimal amount;
    private BigDecimal apr;
    /** 已经累计利息（含实时） */
    private BigDecimal interest;
    /** 持有中订单的实时利息 */
    private BigDecimal liveInterest;
    private String startAt;
    private String endAt;
    private Integer status;
    private String createdAt;

    public static LockOrderVO of(LockOrder o) {
        LockOrderVO v = new LockOrderVO();
        v.setId(o.getId());
        v.setOrderNo(o.getOrderNo());
        v.setProductId(o.getProductId());
        v.setCoin(o.getCoin());
        v.setAmount(o.getAmount());
        v.setApr(o.getApr());
        v.setInterest(o.getInterest());
        v.setStartAt(String.valueOf(o.getStartAt()));
        v.setEndAt(o.getEndAt() == null ? null : String.valueOf(o.getEndAt()));
        v.setStatus(o.getStatus());
        v.setCreatedAt(String.valueOf(o.getCreatedAt()));
        return v;
    }
}
