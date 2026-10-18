package com.asterpro.modules.quote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuoteMetaVO {
    private String settlementCoin;
    private BigDecimal settlementPrice;
}
