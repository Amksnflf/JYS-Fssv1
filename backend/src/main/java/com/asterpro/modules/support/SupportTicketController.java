package com.asterpro.modules.support;

import com.asterpro.common.api.R;
import com.asterpro.modules.support.entity.SupportCategory;
import com.asterpro.modules.support.entity.SupportTicket;
import com.asterpro.modules.support.service.SupportTicketService;
import com.asterpro.modules.support.vo.SupportTicketDetailVO;
import com.asterpro.modules.user.service.UserService;
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
@RequestMapping("/support")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService supportTicketService;
    private final UserService userService;

    @GetMapping("/ticket/categories")
    public R<List<SupportCategory>> categories() {
        return R.ok(supportTicketService.enabledCategories());
    }

    @PostMapping("/ticket/create")
    public R<SupportTicket> create(@RequestBody SupportTicketService.CreateTicketDTO dto) {
        return R.ok(supportTicketService.createTicket(userService.currentUserId(), dto));
    }

    @GetMapping("/ticket/my")
    public R<Page<SupportTicket>> my(@RequestParam(defaultValue = "1") int pageNo,
                                     @RequestParam(defaultValue = "20") int pageSize,
                                     @RequestParam(required = false) Integer status) {
        return R.ok(supportTicketService.pageMyTickets(userService.currentUserId(), status, pageNo, pageSize));
    }

    @GetMapping("/ticket/{id}")
    public R<SupportTicketDetailVO> detail(@PathVariable Long id) {
        return R.ok(supportTicketService.myTicketDetail(userService.currentUserId(), id));
    }

    @PostMapping("/ticket/{id}/reply")
    public R<SupportTicket> reply(@PathVariable Long id, @RequestBody SupportTicketService.ReplyDTO dto) {
        return R.ok(supportTicketService.userReply(userService.currentUserId(), id, dto));
    }

    @PostMapping("/ticket/{id}/close")
    public R<SupportTicket> close(@PathVariable Long id) {
        return R.ok(supportTicketService.closeTicket(userService.currentUserId(), id));
    }
}
