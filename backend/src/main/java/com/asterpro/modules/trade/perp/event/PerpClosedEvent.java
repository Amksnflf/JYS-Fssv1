package com.asterpro.modules.trade.perp.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

import java.math.BigDecimal;

/**
 * 永续合约平仓成交事件 —— 由 PerpService.settle() 在事务提交后发布。
 *
 * 跟单监听器会按 traderUserId + symbol 找跟单方对应镜像仓位，按当前价同步平仓。
 */
@Getter
@ToString
@AllArgsConstructor
public class PerpClosedEvent {
    private final Long userId;
    private final Long positionId;
    private final String symbol;
    /** 平仓后的 markPrice */
    private final BigDecimal closePrice;
    /** 是否爆仓 */
    private final boolean liquidated;
    private final String reason;
    /** 跟单方的镜像仓位的 source_order_no（即交易员的开仓主订单号），仅当跟单来源仓位平仓时使用 */
    private final String sourceOrderNo;
}
