package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_udun_callback_log")
public class UdunCallbackLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String tradeId;
    private String tradeType;
    private String txHash;
    private String businessId;
    private String address;
    private String coinType;
    private String mainCoinType;
    private Integer status;
    private Integer signValid;
    private Integer processed;
    private String failReason;
    private String rawBody;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
