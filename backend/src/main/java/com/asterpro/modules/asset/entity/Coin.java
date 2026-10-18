package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_coin")
public class Coin {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String code;
    private String name;
    private String assetCategory;
    private String logo;
    private Integer logoStatus;
    private String chain;
    private Integer decimals;
    private BigDecimal minDeposit;
    private BigDecimal minWithdraw;
    private BigDecimal withdrawFee;
    private Integer depositEnabled;
    private Integer withdrawEnabled;
    private Integer walletEnabled;
    private Integer marketEnabled;
    private String quoteSymbol;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
