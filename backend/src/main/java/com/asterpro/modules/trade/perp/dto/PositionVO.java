package com.asterpro.modules.trade.perp.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PositionVO {
    private Long id;
    private String symbol;
    private String settlementCoin;
    private Integer side;
    private Integer marginMode;
    private Integer leverage;
    private BigDecimal amount;
    private BigDecimal openPrice;
    private BigDecimal markPrice;
    private BigDecimal liqPrice;
    private BigDecimal margin;
    private BigDecimal unrealizedPnl;
    /** 收益率 = unrealizedPnl / margin × 100，百分比保留 2 位 */
    private BigDecimal pnlRate;
    private BigDecimal takeProfitPrice;
    private BigDecimal stopLossPrice;
    private LocalDateTime createdAt;
}
