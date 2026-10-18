package com.asterpro.modules.quote.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_kline_cache")
public class KlineCache {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String symbol;
    private String source;
    private String sourceSymbol;
    private String period;
    private Long openTime;
    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal close;
    private BigDecimal volume;
    private LocalDateTime createdAt;
}
