package com.asterpro.modules.follow.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.follow.entity.FollowOrder;
import com.asterpro.modules.follow.entity.FollowTrader;
import com.asterpro.modules.follow.service.FollowService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService service;
    private final UserService userService;

    @GetMapping("/public/traders")
    public R<List<FollowTrader>> traders() {
        return R.ok(service.traders());
    }

    @PostMapping("/start")
    public R<FollowOrder> start(@RequestBody StartDTO dto) {
        return R.ok(service.start(userService.currentUserId(), dto.getTraderId(), dto.getAmount(), dto.getMaxLeverage()));
    }

    @PostMapping("/cancel/{orderId}")
    public R<FollowOrder> cancel(@PathVariable Long orderId) {
        return R.ok(service.cancel(userService.currentUserId(), orderId));
    }

    @GetMapping("/my")
    public R<Page<FollowOrder>> my(@RequestParam(required = false) Integer status,
                                   @RequestParam(defaultValue = "1") int pageNo,
                                   @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(service.myOrders(userService.currentUserId(), status, pageNo, pageSize));
    }

    @Data
    public static class StartDTO {
        private Integer traderId;
        private BigDecimal amount;
        private Integer maxLeverage;
    }
}
