package com.asterpro.modules.trade.perp.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

import java.math.BigDecimal;

/**
 * 永续合约开仓成交事件 —— 由 PerpService.open() 在事务提交后发布。
 *
 * 跟单监听器会过滤 sourceOrderNo != null 的事件（避免镜像下单再触发链式跟单）。
 */
@Getter
@ToString
@AllArgsConstructor
public class PerpOpenedEvent {
    /** 下单用户 id（如果是绑定到 t_follow_trader.user_id 的交易员，会触发跟单） */
    private final Long userId;
    /** 交易员主订单号 */
    private final String orderNo;
    private final String symbol;
    /** 1 开多 2 开空（PerpOrder.SIDE_OPEN_*） */
    private final Integer side;
    private final Integer marginMode;
    private final Integer leverage;
    private final BigDecimal amount;
    private final BigDecimal dealPrice;
    private final BigDecimal takeProfitPrice;
    private final BigDecimal stopLossPrice;
    /** 来源订单号，非空表示本次开仓是由跟单监听器镜像产生，不再二次触发跟单 */
    private final String sourceOrderNo;
}
