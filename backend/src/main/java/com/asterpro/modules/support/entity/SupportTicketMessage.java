package com.asterpro.modules.support.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_support_ticket_message")
public class SupportTicketMessage {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ticketId;
    private Integer senderType;
    private Long senderId;
    private String messageType;
    private String content;
    private String attachments;
    private Integer internalOnly;
    private LocalDateTime createdAt;
}
