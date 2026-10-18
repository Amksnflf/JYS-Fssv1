package com.asterpro.modules.quote.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class QuoteTradeVO {
    private String symbol;
    private BigDecimal price;
    private BigDecimal volume;
    /** buy / sell / unknown */
    private String side;
    private long ts;
}
