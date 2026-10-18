package com.asterpro.modules.support.vo;

import com.asterpro.modules.support.entity.SupportTicket;
import com.asterpro.modules.support.entity.SupportTicketMessage;
import lombok.Data;

import java.util.List;

@Data
public class SupportTicketDetailVO {
    private SupportTicket ticket;
    private List<SupportTicketMessage> messages;
}
