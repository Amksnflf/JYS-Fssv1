package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_lock_order")
public class LockOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private Integer productId;
    private String coin;
    private BigDecimal amount;
    private BigDecimal apr;
    private BigDecimal interest;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    /** 1 持有 2 已赎回 3 已到期（自动结算） */
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int STATUS_HOLDING = 1;
    public static final int STATUS_REDEEMED = 2;
    public static final int STATUS_MATURED = 3;
}
