package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_loan_order")
public class LoanOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private String coin;
    private BigDecimal borrowAmount;
    private BigDecimal collateralAmount;
    private BigDecimal dailyRate;
    private BigDecimal totalInterest;
    private BigDecimal serviceFee;
    private Integer lockDays;
    private LocalDateTime startAt;
    private LocalDateTime dueAt;
    private LocalDateTime repaidAt;
    /** 1 借出中 2 已还款 3 已清算 */
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int STATUS_BORROWING = 1;
    public static final int STATUS_REPAID = 2;
    public static final int STATUS_LIQUIDATED = 3;
}
