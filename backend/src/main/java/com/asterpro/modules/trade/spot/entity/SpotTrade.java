package com.asterpro.modules.trade.spot.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_spot_trade")
public class SpotTrade {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String tradeNo;
    private Long orderId;
    private Long userId;
    private String symbol;
    private Integer side;
    private BigDecimal price;
    private BigDecimal amount;
    private BigDecimal total;
    private BigDecimal fee;
    private LocalDateTime createdAt;
}
