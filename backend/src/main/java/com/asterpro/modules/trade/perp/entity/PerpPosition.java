package com.asterpro.modules.trade.perp.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_perp_position")
public class PerpPosition {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String symbol;
    /** 1 多 2 空 */
    private Integer side;
    private Integer marginMode;
    private Integer leverage;
    private BigDecimal amount;
    private BigDecimal openPrice;
    private BigDecimal liqPrice;
    private BigDecimal margin;
    private BigDecimal realizedPnl;
    private BigDecimal takeProfitPrice;
    private BigDecimal stopLossPrice;
    /** 1 持仓 2 已平 3 已爆 */
    private Integer status;
    /** 来源交易员订单号(若为镜像跟单单则非空) */
    private String sourceOrderNo;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int SIDE_LONG = 1;
    public static final int SIDE_SHORT = 2;
    public static final int STATUS_OPEN = 1;
    public static final int STATUS_CLOSED = 2;
    public static final int STATUS_LIQUIDATED = 3;
}
