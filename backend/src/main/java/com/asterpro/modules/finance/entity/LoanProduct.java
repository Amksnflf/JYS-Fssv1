package com.asterpro.modules.finance.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;

@Data
@TableName("t_loan_product")
public class LoanProduct {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String coin;
    private BigDecimal collateralRatio;
    private BigDecimal dailyRate;
    private Integer maxDays;
    private Integer enabled;
}
