package com.asterpro.modules.support.service;

import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.support.entity.SupportCategory;
import com.asterpro.modules.support.entity.SupportTicket;
import com.asterpro.modules.support.entity.SupportTicketMessage;
import com.asterpro.modules.support.mapper.SupportCategoryMapper;
import com.asterpro.modules.support.mapper.SupportTicketMapper;
import com.asterpro.modules.support.mapper.SupportTicketMessageMapper;
import com.asterpro.modules.support.vo.SupportTicketDetailVO;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class SupportTicketService {

    public static final int STATUS_PENDING = 0;
    public static final int STATUS_WAITING_USER = 1;
    public static final int STATUS_PROCESSING = 2;
    public static final int STATUS_RESOLVED = 3;
    public static final int STATUS_CLOSED = 4;

    public static final int SENDER_USER = 1;
    public static final int SENDER_ADMIN = 2;
    public static final int SENDER_SYSTEM = 3;

    private final SupportTicketMapper supportTicketMapper;
    private final SupportTicketMessageMapper supportTicketMessageMapper;
    private final SupportCategoryMapper supportCategoryMapper;
    private final SupportConfigService supportConfigService;
    private final UserService userService;

    public List<SupportCategory> enabledCategories() {
        return supportCategoryMapper.selectList(new LambdaQueryWrapper<SupportCategory>()
                .eq(SupportCategory::getEnabled, 1)
                .orderByAsc(SupportCategory::getSort)
                .orderByAsc(SupportCategory::getId));
    }

    @Transactional
    public SupportTicket createTicket(Long userId, CreateTicketDTO dto) {
        if (dto == null) {
            throw new BizException("Ticket parameters cannot be empty"); // 工单参数不能为空
        }
        String category = normalizeCategory(dto.getCategory());
        String content = trimToNull(dto.getContent());
        if (content == null) {
            throw new BizException("Please enter ticket content"); // 请输入工单内容
        }
        String subject = trimToNull(dto.getSubject());
        if (subject == null) {
            subject = content.length() > 40 ? content.substring(0, 40) : content;
        }
        User user = userService.mustGetUser(userId);
        SupportTicket ticket = new SupportTicket();
        ticket.setTicketNo(nextTicketNo());
        ticket.setUserId(userId);
        ticket.setUserUid(user.getUid());
        ticket.setUserAccount(user.getAccount());
        ticket.setSource(defaultString(dto.getSource(), "web"));
        ticket.setChannel(defaultString(dto.getChannel(), "ticket"));
        ticket.setCategory(category);
        ticket.setSubcategory(trimToNull(dto.getSubcategory()));
        ticket.setSubject(subject);
        ticket.setPriority(normalizePriority(dto.getPriority()));
        ticket.setStatus(STATUS_PENDING);
        ticket.setLastRepliedByType(SENDER_USER);
        ticket.setLastReplyAt(LocalDateTime.now());
        ticket.setRiskLevel(dto.getRiskLevel() == null ? 0 : Math.max(dto.getRiskLevel(), 0));
        ticket.setRelatedOrderNo(trimToNull(dto.getRelatedOrderNo()));
        ticket.setRelatedSymbol(trimToNull(dto.getRelatedSymbol()));
        ticket.setRelatedCoin(trimToNull(dto.getRelatedCoin()));
        ticket.setRelatedChain(trimToNull(dto.getRelatedChain()));
        ticket.setLang(trimToNull(dto.getLang()));
        ticket.setDeviceInfo(trimToNull(dto.getDeviceInfo()));
        ticket.setRemark(trimToNull(dto.getRemark()));
        supportTicketMapper.insert(ticket);

        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderType(SENDER_USER);
        message.setSenderId(userId);
        message.setMessageType(defaultString(dto.getMessageType(), "text"));
        message.setContent(content);
        message.setAttachments(trimToNull(dto.getAttachments()));
        message.setInternalOnly(0);
        supportTicketMessageMapper.insert(message);
        return supportTicketMapper.selectById(ticket.getId());
    }

    public Page<SupportTicket> pageMyTickets(Long userId, Integer status, Integer pageNo, Integer pageSize) {
        LambdaQueryWrapper<SupportTicket> wrapper = new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getUserId, userId);
        if (status != null) {
            wrapper.eq(SupportTicket::getStatus, status);
        }
        wrapper.orderByDesc(SupportTicket::getLastReplyAt).orderByDesc(SupportTicket::getId);
        return supportTicketMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
    }

    public SupportTicketDetailVO myTicketDetail(Long userId, Long id) {
        SupportTicket ticket = ownedTicket(userId, id);
        return detail(ticket, false);
    }

    @Transactional
    public SupportTicket userReply(Long userId, Long ticketId, ReplyDTO dto) {
        SupportTicket ticket = ownedTicket(userId, ticketId);
        if (ticket.getStatus() != null && ticket.getStatus() == STATUS_CLOSED) {
            throw new BizException("Ticket is closed, cannot reply"); // 工单已关闭，无法继续回复
        }
        String content = trimToNull(dto == null ? null : dto.getContent());
        String attachments = trimToNull(dto == null ? null : dto.getAttachments());
        if (content == null && attachments == null) {
            throw new BizException("Reply content cannot be empty"); // 回复内容不能为空
        }
        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticketId);
        message.setSenderType(SENDER_USER);
        message.setSenderId(userId);
        message.setMessageType(defaultString(dto == null ? null : dto.getMessageType(), attachments != null && content == null ? "image" : "text"));
        message.setContent(content);
        message.setAttachments(attachments);
        message.setInternalOnly(0);
        supportTicketMessageMapper.insert(message);

        ticket.setLastRepliedByType(SENDER_USER);
        ticket.setLastReplyAt(LocalDateTime.now());
        if (ticket.getStatus() == null || ticket.getStatus() == STATUS_PENDING || ticket.getStatus() == STATUS_WAITING_USER || ticket.getStatus() == STATUS_RESOLVED) {
            ticket.setStatus(STATUS_PROCESSING);
        }
        supportTicketMapper.updateById(ticket);
        return supportTicketMapper.selectById(ticketId);
    }

    @Transactional
    public SupportTicket closeTicket(Long userId, Long ticketId) {
        SupportTicket ticket = ownedTicket(userId, ticketId);
        ticket.setStatus(STATUS_CLOSED);
        ticket.setLastRepliedByType(SENDER_USER);
        ticket.setLastReplyAt(LocalDateTime.now());
        supportTicketMapper.updateById(ticket);

        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticketId);
        message.setSenderType(SENDER_SYSTEM);
        message.setSenderId(userId);
        message.setMessageType("system");
        message.setContent("用户关闭工单");
        message.setInternalOnly(0);
        supportTicketMessageMapper.insert(message);
        return supportTicketMapper.selectById(ticketId);
    }

    public Page<SupportTicket> pageAdmin(AdminTicketQueryDTO dto) {
        LambdaQueryWrapper<SupportTicket> wrapper = new LambdaQueryWrapper<>();
        if (dto != null) {
            if (dto.getStatus() != null) {
                wrapper.eq(SupportTicket::getStatus, dto.getStatus());
            }
            if (trimToNull(dto.getCategory()) != null) {
                wrapper.eq(SupportTicket::getCategory, trimToNull(dto.getCategory()));
            }
            if (trimToNull(dto.getTicketNo()) != null) {
                wrapper.eq(SupportTicket::getTicketNo, trimToNull(dto.getTicketNo()));
            }
            if (dto.getUserId() != null) {
                wrapper.eq(SupportTicket::getUserId, dto.getUserId());
            }
            if (dto.getAssignedAdminId() != null) {
                wrapper.eq(SupportTicket::getAssignedAdminId, dto.getAssignedAdminId());
            }
        }
        wrapper.orderByDesc(SupportTicket::getLastReplyAt).orderByDesc(SupportTicket::getId);
        return supportTicketMapper.selectPage(PageUtil.page(dto == null ? null : dto.getPageNo(), dto == null ? null : dto.getPageSize()), wrapper);
    }

    public SupportTicketDetailVO adminDetail(Long id) {
        return detail(mustGetTicket(id), true);
    }

    @Transactional
    public SupportTicket adminReply(Long adminId, AdminReplyDTO dto) {
        SupportTicket ticket = mustGetTicket(dto.getTicketId());
        String content = trimToNull(dto.getContent());
        String attachments = trimToNull(dto.getAttachments());
        if (content == null && attachments == null) {
            throw new BizException("Reply content cannot be empty"); // 回复内容不能为空
        }
        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderType(SENDER_ADMIN);
        message.setSenderId(adminId);
        message.setMessageType(defaultString(dto.getMessageType(), attachments != null && content == null ? "image" : "text"));
        message.setContent(content);
        message.setAttachments(attachments);
        message.setInternalOnly(dto.getInternalOnly() != null && dto.getInternalOnly() == 1 ? 1 : 0);
        supportTicketMessageMapper.insert(message);

        if (message.getInternalOnly() == 0) {
            ticket.setStatus(STATUS_WAITING_USER);
            ticket.setLastRepliedByType(SENDER_ADMIN);
            ticket.setLastReplyAt(LocalDateTime.now());
        }
        if (dto.getAssignedAdminId() != null) {
            ticket.setAssignedAdminId(dto.getAssignedAdminId());
        } else if (ticket.getAssignedAdminId() == null) {
            ticket.setAssignedAdminId(adminId);
        }
        supportTicketMapper.updateById(ticket);
        return supportTicketMapper.selectById(ticket.getId());
    }

    @Transactional
    public SupportTicket adminUpdateStatus(AdminStatusDTO dto) {
        SupportTicket ticket = mustGetTicket(dto.getTicketId());
        Integer status = dto.getStatus();
        if (status == null || status < STATUS_PENDING || status > STATUS_CLOSED) {
            throw new BizException("Invalid ticket status"); // 工单状态不合法
        }
        ticket.setStatus(status);
        if (trimToNull(dto.getRemark()) != null) {
            ticket.setRemark(trimToNull(dto.getRemark()));
        }
        ticket.setLastReplyAt(LocalDateTime.now());
        supportTicketMapper.updateById(ticket);

        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderType(SENDER_SYSTEM);
        message.setSenderId(dto.getOperatorAdminId());
        message.setMessageType("system");
        message.setContent("工单状态更新为 " + status);
        message.setInternalOnly(0);
        supportTicketMessageMapper.insert(message);
        return supportTicketMapper.selectById(ticket.getId());
    }

    @Transactional
    public SupportTicket adminAssign(AdminAssignDTO dto) {
        SupportTicket ticket = mustGetTicket(dto.getTicketId());
        ticket.setAssignedAdminId(dto.getAssignedAdminId());
        ticket.setAssignedGroup(trimToNull(dto.getAssignedGroup()));
        supportTicketMapper.updateById(ticket);

        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderType(SENDER_SYSTEM);
        message.setSenderId(dto.getOperatorAdminId());
        message.setMessageType("system");
        message.setContent("工单已重新指派");
        message.setInternalOnly(1);
        supportTicketMessageMapper.insert(message);
        return supportTicketMapper.selectById(ticket.getId());
    }

    private SupportTicketDetailVO detail(SupportTicket ticket, boolean includeInternalOnly) {
        LambdaQueryWrapper<SupportTicketMessage> messageWrapper = new LambdaQueryWrapper<SupportTicketMessage>()
                .eq(SupportTicketMessage::getTicketId, ticket.getId());
        if (!includeInternalOnly) {
            messageWrapper.eq(SupportTicketMessage::getInternalOnly, 0);
        }
        messageWrapper.orderByAsc(SupportTicketMessage::getId);
        List<SupportTicketMessage> messages = supportTicketMessageMapper.selectList(messageWrapper);
        SupportTicketDetailVO vo = new SupportTicketDetailVO();
        vo.setTicket(ticket);
        vo.setMessages(messages);
        return vo;
    }

    private SupportTicket ownedTicket(Long userId, Long id) {
        SupportTicket ticket = supportTicketMapper.selectOne(new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getId, id)
                .eq(SupportTicket::getUserId, userId)
                .last("LIMIT 1"));
        if (ticket == null) {
            throw new BizException("Ticket not found"); // 工单不存在
        }
        return ticket;
    }

    private SupportTicket mustGetTicket(Long id) {
        SupportTicket ticket = supportTicketMapper.selectById(id);
        if (ticket == null) {
            throw new BizException("Ticket not found"); // 工单不存在
        }
        return ticket;
    }

    private String normalizeCategory(String category) {
        String normalized = trimToNull(category);
        if (normalized == null) {
            normalized = "other";
        }
        SupportCategory supportCategory = supportCategoryMapper.selectOne(new LambdaQueryWrapper<SupportCategory>()
                .eq(SupportCategory::getCategoryKey, normalized)
                .eq(SupportCategory::getEnabled, 1)
                .last("LIMIT 1"));
        if (supportCategory == null) {
            throw new BizException("Ticket category not found"); // 工单分类不存在
        }
        return normalized;
    }

    private int normalizePriority(Integer priority) {
        if (priority == null) {
            return supportConfigService.defaultPriority();
        }
        return Math.min(Math.max(priority, 1), 4);
    }

    private String nextTicketNo() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        for (int i = 0; i < 5; i++) {
            String ticketNo = "TK" + LocalDateTime.now().format(formatter)
                    + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
            Long count = supportTicketMapper.selectCount(new LambdaQueryWrapper<SupportTicket>()
                    .eq(SupportTicket::getTicketNo, ticketNo));
            if (count == null || count == 0) {
                return ticketNo;
            }
        }
        throw new BizException("Failed to generate ticket number, please retry later"); // 生成工单号失败，请稍后重试
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultString(String value, String defaultValue) {
        String trimmed = trimToNull(value);
        return trimmed == null ? defaultValue : trimmed;
    }

    @Data
    public static class CreateTicketDTO {
        private String source;
        private String channel;
        private String category;
        private String subcategory;
        private String subject;
        private Integer priority;
        private Integer riskLevel;
        private String relatedOrderNo;
        private String relatedSymbol;
        private String relatedCoin;
        private String relatedChain;
        private String lang;
        private String deviceInfo;
        private String remark;
        private String messageType;
        private String content;
        private String attachments;
    }

    @Data
    public static class ReplyDTO {
        private String messageType;
        private String content;
        private String attachments;
    }

    @Data
    public static class AdminTicketQueryDTO {
        private String ticketNo;
        private Long userId;
        private String category;
        private Integer status;
        private Long assignedAdminId;
        private Integer pageNo;
        private Integer pageSize;
    }

    @Data
    public static class AdminReplyDTO {
        private Long ticketId;
        private String messageType;
        private String content;
        private String attachments;
        private Integer internalOnly;
        private Long assignedAdminId;
    }

    @Data
    public static class AdminStatusDTO {
        private Long ticketId;
        private Integer status;
        private String remark;
        private Long operatorAdminId;
    }

    @Data
    public static class AdminAssignDTO {
        private Long ticketId;
        private Long assignedAdminId;
        private String assignedGroup;
        private Long operatorAdminId;
    }
}
