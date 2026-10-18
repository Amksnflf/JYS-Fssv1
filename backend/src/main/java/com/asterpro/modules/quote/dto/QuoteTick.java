package com.asterpro.modules.quote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuoteTick {
    private String symbol;
    private BigDecimal price;
    /** 24h 涨跌幅，百分比，例如 1.23 表示 +1.23% */
    private BigDecimal change;
    /** 24h 成交额（USDT 估算） */
    private BigDecimal volume;
    private long ts;
}
