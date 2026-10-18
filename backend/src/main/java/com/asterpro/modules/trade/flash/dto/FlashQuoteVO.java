package com.asterpro.modules.trade.flash.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class FlashQuoteVO {
    private String fromCoin;
    private String toCoin;
    private BigDecimal fromAmount;
    private BigDecimal toAmount;
    /** 1 fromCoin = rate toCoin */
    private BigDecimal rate;
    private BigDecimal feeRate;
    /** 报价时间戳，前端展示倒计时（10s 内有效） */
    private Long quoteTs;
}
