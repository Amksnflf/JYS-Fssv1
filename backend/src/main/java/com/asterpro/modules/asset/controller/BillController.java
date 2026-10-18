package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.entity.AccountLog;
import com.asterpro.modules.asset.service.BillService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/asset/bill")
@RequiredArgsConstructor
public class BillController {

    private final BillService service;
    private final UserService userService;

    @GetMapping("/page")
    public R<Page<AccountLog>> page(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String coin,
            @RequestParam(required = false) String bizType,
            @RequestParam(required = false) Integer accountType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return R.ok(service.page(userService.currentUserId(),
                pageNo, pageSize, coin, bizType, accountType, start, end));
    }
}
