package com.asterpro.modules.trade.flash.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_flash_order")
public class FlashOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    /** 1 现货 2 交易 3 理财 */
    private Integer fromAccount;
    private Integer toAccount;
    private String fromCoin;
    private String toCoin;
    private BigDecimal fromAmount;
    private BigDecimal toAmount;
    /** 1 fromCoin = rate × toCoin */
    private BigDecimal rate;
    private BigDecimal feeRate;
    private LocalDateTime createdAt;
}
