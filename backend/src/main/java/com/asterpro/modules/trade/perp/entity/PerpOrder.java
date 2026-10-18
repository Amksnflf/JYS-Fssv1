package com.asterpro.modules.trade.perp.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_perp_order")
public class PerpOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private String symbol;
    /** 1 开多 2 开空 3 平多 4 平空 */
    private Integer side;
    /** 1 限价 2 市价 */
    private Integer orderType;
    /** 1 逐仓 2 全仓 */
    private Integer marginMode;
    private Integer leverage;
    private BigDecimal price;
    private BigDecimal amount;
    private BigDecimal dealPrice;
    private BigDecimal margin;
    private BigDecimal fee;
    private BigDecimal takeProfitPrice;
    private BigDecimal stopLossPrice;
    /** 0 待成交 1 部分成交 2 完全成交 3 已撤销 */
    private Integer status;
    private Long positionId;
    /** 来源交易员订单号(若为镜像跟单单则非空) */
    private String sourceOrderNo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int SIDE_OPEN_LONG = 1;
    public static final int SIDE_OPEN_SHORT = 2;
    public static final int SIDE_CLOSE_LONG = 3;
    public static final int SIDE_CLOSE_SHORT = 4;
    public static final int TYPE_LIMIT = 1;
    public static final int TYPE_MARKET = 2;
    public static final int MARGIN_ISOLATED = 1;
    public static final int MARGIN_CROSS = 2;
    public static final int STATUS_PENDING = 0;
    public static final int STATUS_FILLED = 2;
    public static final int STATUS_CANCELLED = 3;
}
