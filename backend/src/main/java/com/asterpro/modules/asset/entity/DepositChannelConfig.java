package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_deposit_channel_config")
public class DepositChannelConfig {

    public static final String MODE_MANUAL = "MANUAL";
    public static final String MODE_UDUN = "UDUN";
    public static final String MODE_BOTH = "BOTH";

    @TableId(type = IdType.AUTO)
    private Long id;

    private String coin;
    private String chain;
    private String mode;
    private Integer udunEnabled;
    private Integer manualEnabled;
    private Integer fallbackToManual;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private Integer enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
