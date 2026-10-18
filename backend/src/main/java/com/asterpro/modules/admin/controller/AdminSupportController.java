package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.support.entity.SupportTicket;
import com.asterpro.modules.support.service.SupportConfigService;
import com.asterpro.modules.support.service.SupportTicketService;
import com.asterpro.modules.support.vo.SupportTicketDetailVO;
import com.asterpro.modules.system.entity.SystemConfig;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/support")
@RequiredArgsConstructor
public class AdminSupportController {

    private final SupportTicketService supportTicketService;
    private final SupportConfigService supportConfigService;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    @GetMapping("/ticket/page")
    public R<Page<SupportTicket>> ticketPage(@RequestParam(required = false) String ticketNo,
                                             @RequestParam(required = false) Long userId,
                                             @RequestParam(required = false) String category,
                                             @RequestParam(required = false) Integer status,
                                             @RequestParam(required = false) Long assignedAdminId,
                                             @RequestParam(defaultValue = "1") int pageNo,
                                             @RequestParam(defaultValue = "20") int pageSize) {
        SupportTicketService.AdminTicketQueryDTO dto = new SupportTicketService.AdminTicketQueryDTO();
        dto.setTicketNo(ticketNo);
        dto.setUserId(userId);
        dto.setCategory(category);
        dto.setStatus(status);
        dto.setAssignedAdminId(assignedAdminId);
        dto.setPageNo(pageNo);
        dto.setPageSize(pageSize);
        return R.ok(supportTicketService.pageAdmin(dto));
    }

    @GetMapping("/ticket/{id}")
    public R<SupportTicketDetailVO> ticketDetail(@PathVariable Long id) {
        return R.ok(supportTicketService.adminDetail(id));
    }

    @PostMapping("/ticket/reply")
    public R<SupportTicket> ticketReply(@RequestBody SupportTicketService.AdminReplyDTO dto) {
        SupportTicket ticket = supportTicketService.adminReply(authService.currentAdminId(), dto);
        logService.log(authService.currentAdminId(), "support", "ticket_reply",
                "support_ticket", String.valueOf(ticket.getId()), ticket.getTicketNo());
        return R.ok(ticket);
    }

    @PostMapping("/ticket/status")
    public R<SupportTicket> ticketStatus(@RequestBody SupportTicketService.AdminStatusDTO dto) {
        dto.setOperatorAdminId(authService.currentAdminId());
        SupportTicket ticket = supportTicketService.adminUpdateStatus(dto);
        logService.log(authService.currentAdminId(), "support", "ticket_status",
                "support_ticket", String.valueOf(ticket.getId()), "status=" + ticket.getStatus());
        return R.ok(ticket);
    }

    @PostMapping("/ticket/assign")
    public R<SupportTicket> ticketAssign(@RequestBody SupportTicketService.AdminAssignDTO dto) {
        dto.setOperatorAdminId(authService.currentAdminId());
        SupportTicket ticket = supportTicketService.adminAssign(dto);
        logService.log(authService.currentAdminId(), "support", "ticket_assign",
                "support_ticket", String.valueOf(ticket.getId()), "assignedAdminId=" + ticket.getAssignedAdminId());
        return R.ok(ticket);
    }

    @GetMapping("/config/list")
    public R<List<SystemConfig>> configList() {
        return R.ok(supportConfigService.listSupportConfigs());
    }

    @PostMapping("/config/save")
    public R<SystemConfig> configSave(@RequestBody SystemConfig dto) {
        SystemConfig saved = supportConfigService.saveSupportConfig(dto);
        logService.log(authService.currentAdminId(), "support", "config_save",
                "system_config", String.valueOf(saved.getId()), saved.getConfigKey());
        return R.ok(saved);
    }
}
