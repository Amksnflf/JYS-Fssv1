package com.asterpro.modules.support.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_support_ticket")
public class SupportTicket {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String ticketNo;
    private Long userId;
    private String userUid;
    private String userAccount;
    private String source;
    private String channel;
    private String category;
    private String subcategory;
    private String subject;
    private Integer priority;
    private Integer status;
    private String vendorTicketId;
    private Long assignedAdminId;
    private String assignedGroup;
    private Integer lastRepliedByType;
    private LocalDateTime lastReplyAt;
    private Integer riskLevel;
    private String relatedOrderNo;
    private String relatedSymbol;
    private String relatedCoin;
    private String relatedChain;
    private String lang;
    private String deviceInfo;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
