package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_portfolio_product")
public class PortfolioProduct {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String name;
    /** 逗号分隔 SOL,DAI,XRP（用于展示标签，本期内不影响逻辑） */
    private String coins;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    /** 每日利率 0.003 = 0.3%/天 */
    private BigDecimal dailyRate;
    private Integer durationDays;
    private Integer isHot;
    private Integer enabled;
    private Integer sort;
    private LocalDateTime createdAt;
}
