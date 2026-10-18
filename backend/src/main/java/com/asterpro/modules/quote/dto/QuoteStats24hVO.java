package com.asterpro.modules.quote.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class QuoteStats24hVO {
    private String symbol;
    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal close;
    private BigDecimal change;
    private BigDecimal volume;
    private BigDecimal amount;
    private long ts;
}
