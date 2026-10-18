package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_lock_product")
public class LockProduct {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String name;
    private String coin;
    /** 1 活期 2 定期 */
    private Integer lockType;
    private Integer lockDays;
    private BigDecimal aprMin;
    private BigDecimal aprMax;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private Integer isHot;
    private Integer enabled;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int TYPE_FLEXIBLE = 1;
    public static final int TYPE_FIXED = 2;
}
