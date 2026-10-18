package com.asterpro.modules.quote.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_symbol")
public class Symbol {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String symbol;
    private String baseCoin;
    private String quoteCoin;
    private String category;
    private String tradeType;
    private String alltickCode;
    private String primarySource;
    private String primarySymbol;
    private String backupSource;
    private String backupSymbol;
    private String klineSource;
    private String klineSymbol;
    private String depthSource;
    private String depthSymbol;
    private String tradeSource;
    private String tradeSymbol;
    private String wsSource;
    private String wsSymbol;
    private String statsMode;
    private String depthMode;
    private String tradeMode;
    private Integer subscribeEnabled;
    private Integer pricePrecision;
    private Integer amountPrecision;
    private Integer changePrecision;
    private BigDecimal minAmount;
    private Integer maxLeverage;
    private BigDecimal takerFee;
    private BigDecimal makerFee;
    private Integer enabled;
    private Integer isHot;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
