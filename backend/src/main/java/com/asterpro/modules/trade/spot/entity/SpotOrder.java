package com.asterpro.modules.trade.spot.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_spot_order")
public class SpotOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private String symbol;
    /** 1 买 2 卖 */
    private Integer side;
    /** 1 限价 2 市价 */
    private Integer orderType;
    private BigDecimal price;
    private BigDecimal amount;
    private BigDecimal total;
    private BigDecimal dealAmount;
    private BigDecimal dealTotal;
    private BigDecimal dealPrice;
    private BigDecimal fee;
    private String feeCoin;
    /** 0 待成交 1 部分成交 2 完全成交 3 已撤销 */
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int SIDE_BUY = 1;
    public static final int SIDE_SELL = 2;
    public static final int TYPE_LIMIT = 1;
    public static final int TYPE_MARKET = 2;
    public static final int STATUS_PENDING = 0;
    public static final int STATUS_PARTIAL = 1;
    public static final int STATUS_FILLED = 2;
    public static final int STATUS_CANCELLED = 3;
}
