package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;

@Data
@TableName("t_ai_strategy")
public class AiStrategy {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String name;
    private String strategyType;
    private BigDecimal minAmount;
    private BigDecimal maxApr;
    private BigDecimal maxDrawdown;
    private Integer levelRequired;
    private Integer userCount;
    private Integer enabled;
}
