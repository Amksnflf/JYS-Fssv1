package com.asterpro.modules.support.service;

import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.support.entity.SupportTicket;
import com.asterpro.modules.support.entity.SupportTicketMessage;
import com.asterpro.modules.support.mapper.SupportTicketMapper;
import com.asterpro.modules.support.mapper.SupportTicketMessageMapper;
import com.asterpro.modules.system.entity.Feedback;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LegacyFeedbackCompatService {

    public static final String LEGACY_FEEDBACK_CHANNEL = "feedback";
    public static final String LEGACY_FEEDBACK_SOURCE = "legacy-feedback";
    public static final String LEGACY_FEEDBACK_IMPORT_SOURCE = "legacy-import";

    private final SupportTicketService supportTicketService;
    private final SupportTicketMapper supportTicketMapper;
    private final SupportTicketMessageMapper supportTicketMessageMapper;

    @Transactional
    public Feedback submit(Long userId, String category, String content, String images) {
        SupportTicketService.CreateTicketDTO dto = new SupportTicketService.CreateTicketDTO();
        dto.setSource(LEGACY_FEEDBACK_SOURCE);
        dto.setChannel(LEGACY_FEEDBACK_CHANNEL);
        dto.setCategory(normalizeCategory(category));
        dto.setSubject("Legacy Feedback");
        dto.setRemark("legacy_feedback_api=submit");
        dto.setContent(content);
        dto.setAttachments(trimToNull(images));
        dto.setMessageType(trimToNull(images) != null && trimToNull(content) == null ? "image" : "text");
        SupportTicket ticket = supportTicketService.createTicket(userId, dto);
        return get(ticket.getId());
    }

    public Page<Feedback> pageMy(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<SupportTicket> wrapper = legacyFeedbackWrapper()
                .eq(SupportTicket::getUserId, userId)
                .orderByDesc(SupportTicket::getLastReplyAt)
                .orderByDesc(SupportTicket::getId);
        return buildFeedbackPage(supportTicketMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper));
    }

    public Page<Feedback> pageAdmin(Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<SupportTicket> wrapper = legacyFeedbackWrapper();
        applyLegacyStatusFilter(wrapper, status);
        wrapper.orderByDesc(SupportTicket::getLastReplyAt).orderByDesc(SupportTicket::getId);
        return buildFeedbackPage(supportTicketMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper));
    }

    @Transactional
    public Feedback adminReply(Long adminId, Long ticketId, Integer legacyStatus, String replyContent) {
        SupportTicket ticket = mustGetLegacyTicket(ticketId);
        String reply = trimToNull(replyContent);
        if (reply != null) {
            SupportTicketService.AdminReplyDTO replyDTO = new SupportTicketService.AdminReplyDTO();
            replyDTO.setTicketId(ticket.getId());
            replyDTO.setMessageType("text");
            replyDTO.setContent(reply);
            replyDTO.setInternalOnly(0);
            replyDTO.setAssignedAdminId(adminId);
            supportTicketService.adminReply(adminId, replyDTO);
        }
        if (legacyStatus != null) {
            SupportTicketService.AdminStatusDTO statusDTO = new SupportTicketService.AdminStatusDTO();
            statusDTO.setTicketId(ticket.getId());
            statusDTO.setStatus(mapLegacyStatusToSupportStatus(legacyStatus));
            statusDTO.setOperatorAdminId(adminId);
            statusDTO.setRemark(ticket.getRemark());
            supportTicketService.adminUpdateStatus(statusDTO);
        }
        return get(ticketId);
    }

    public Feedback get(Long ticketId) {
        SupportTicket ticket = mustGetLegacyTicket(ticketId);
        Map<Long, List<SupportTicketMessage>> messageMap = loadMessageMap(List.of(ticket.getId()));
        return toLegacyFeedback(ticket, messageMap.get(ticket.getId()));
    }

    private Page<Feedback> buildFeedbackPage(Page<SupportTicket> ticketPage) {
        Page<Feedback> page = new Page<>(ticketPage.getCurrent(), ticketPage.getSize(), ticketPage.getTotal());
        page.setRecords(toLegacyFeedbackRecords(ticketPage.getRecords()));
        return page;
    }

    private List<Feedback> toLegacyFeedbackRecords(List<SupportTicket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return List.of();
        }
        List<Long> ticketIds = new ArrayList<>(tickets.size());
        for (SupportTicket ticket : tickets) {
            if (ticket != null && ticket.getId() != null) {
                ticketIds.add(ticket.getId());
            }
        }
        Map<Long, List<SupportTicketMessage>> messageMap = loadMessageMap(ticketIds);
        List<Feedback> records = new ArrayList<>(tickets.size());
        for (SupportTicket ticket : tickets) {
            records.add(toLegacyFeedback(ticket, messageMap.get(ticket.getId())));
        }
        return records;
    }

    private Map<Long, List<SupportTicketMessage>> loadMessageMap(List<Long> ticketIds) {
        Map<Long, List<SupportTicketMessage>> grouped = new LinkedHashMap<>();
        if (ticketIds == null || ticketIds.isEmpty()) {
            return grouped;
        }
        List<SupportTicketMessage> messages = supportTicketMessageMapper.selectList(new LambdaQueryWrapper<SupportTicketMessage>()
                .in(SupportTicketMessage::getTicketId, ticketIds)
                .orderByAsc(SupportTicketMessage::getId));
        for (SupportTicketMessage message : messages) {
            grouped.computeIfAbsent(message.getTicketId(), key -> new ArrayList<>()).add(message);
        }
        return grouped;
    }

    private Feedback toLegacyFeedback(SupportTicket ticket, List<SupportTicketMessage> messages) {
        Feedback feedback = new Feedback();
        feedback.setId(ticket.getId());
        feedback.setUserId(ticket.getUserId());
        feedback.setCategory(ticket.getCategory());
        feedback.setStatus(mapSupportStatusToLegacy(ticket.getStatus()));
        feedback.setCreatedAt(ticket.getCreatedAt());

        SupportTicketMessage firstUserMessage = null;
        SupportTicketMessage latestAdminMessage = null;
        if (messages != null) {
            for (SupportTicketMessage message : messages) {
                if (message == null || Integer.valueOf(1).equals(message.getInternalOnly())) {
                    continue;
                }
                if (firstUserMessage == null && Integer.valueOf(SupportTicketService.SENDER_USER).equals(message.getSenderType())) {
                    firstUserMessage = message;
                }
                if (Integer.valueOf(SupportTicketService.SENDER_ADMIN).equals(message.getSenderType())
                        && trimToNull(message.getContent()) != null) {
                    latestAdminMessage = message;
                }
            }
        }

        feedback.setContent(firstUserMessage == null ? ticket.getSubject() : firstUserMessage.getContent());
        feedback.setImages(firstUserMessage == null ? null : trimToNull(firstUserMessage.getAttachments()));
        if (latestAdminMessage != null) {
            feedback.setReply(latestAdminMessage.getContent());
            feedback.setRepliedBy(latestAdminMessage.getSenderId());
            feedback.setRepliedAt(latestAdminMessage.getCreatedAt());
        }
        return feedback;
    }

    private LambdaQueryWrapper<SupportTicket> legacyFeedbackWrapper() {
        return new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getChannel, LEGACY_FEEDBACK_CHANNEL);
    }

    private void applyLegacyStatusFilter(LambdaQueryWrapper<SupportTicket> wrapper, Integer status) {
        if (status == null) {
            return;
        }
        switch (status) {
            case 0 -> wrapper.eq(SupportTicket::getStatus, SupportTicketService.STATUS_PENDING);
            case 1 -> wrapper.in(SupportTicket::getStatus,
                    List.of(
                            SupportTicketService.STATUS_WAITING_USER,
                            SupportTicketService.STATUS_PROCESSING,
                            SupportTicketService.STATUS_RESOLVED
                    ));
            case 2 -> wrapper.eq(SupportTicket::getStatus, SupportTicketService.STATUS_CLOSED);
            default -> throw new BizException("Invalid legacy feedback status"); // 旧反馈状态不合法
        }
    }

    private int mapSupportStatusToLegacy(Integer supportStatus) {
        if (supportStatus == null || supportStatus == SupportTicketService.STATUS_PENDING) {
            return 0;
        }
        if (supportStatus == SupportTicketService.STATUS_CLOSED) {
            return 2;
        }
        return 1;
    }

    private int mapLegacyStatusToSupportStatus(Integer legacyStatus) {
        if (legacyStatus == null) {
            return SupportTicketService.STATUS_PROCESSING;
        }
        return switch (legacyStatus) {
            case 0 -> SupportTicketService.STATUS_PENDING;
            case 2 -> SupportTicketService.STATUS_CLOSED;
            default -> SupportTicketService.STATUS_PROCESSING;
        };
    }

    private SupportTicket mustGetLegacyTicket(Long ticketId) {
        SupportTicket ticket = supportTicketMapper.selectById(ticketId);
        if (ticket == null || !LEGACY_FEEDBACK_CHANNEL.equalsIgnoreCase(ticket.getChannel())) {
            throw new BizException("Legacy feedback record not found"); // 旧反馈记录不存在
        }
        return ticket;
    }

    private String normalizeCategory(String category) {
        String normalized = trimToNull(category);
        if (normalized == null) {
            return "other";
        }
        normalized = normalized.toLowerCase();
        return switch (normalized) {
            case "account", "security", "deposit", "withdraw", "kyc", "trade", "product", "other" -> normalized;
            case "login", "register", "identity" -> "account";
            case "recharge" -> "deposit";
            case "withdrawal" -> "withdraw";
            default -> "other";
        };
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
