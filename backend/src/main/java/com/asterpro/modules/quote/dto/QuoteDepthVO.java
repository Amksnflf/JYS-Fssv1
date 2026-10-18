package com.asterpro.modules.quote.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class QuoteDepthVO {
    private String symbol;
    private long ts;
    private List<Level> bids = new ArrayList<>();
    private List<Level> asks = new ArrayList<>();

    @Data
    public static class Level {
        private BigDecimal price;
        private BigDecimal volume;
    }
}
