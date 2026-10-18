package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_deposit_order")
public class DepositOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private String coin;
    private String chain;
    private BigDecimal amount;
    private String channel;
    private BigDecimal expectedAmount;
    private BigDecimal actualAmount;
    private String mainCoinType;
    private String coinType;
    private String channelTradeId;
    private String blockHigh;
    private String txHash;
    private String fromAddress;
    private String toAddress;
    private String memo;
    private String screenshotUrl;
    /** 0 待审 1 通过 2 驳回 3 待支付 4 失败 5 异常 6 过期 */
    private Integer status;
    private String auditRemark;
    private Long auditedBy;
    private LocalDateTime auditedAt;
    private LocalDateTime expireAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
