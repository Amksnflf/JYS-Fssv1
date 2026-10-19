package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.entity.WithdrawOrder;
import com.asterpro.modules.asset.service.WithdrawService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/asset/withdraw")
@RequiredArgsConstructor
public class WithdrawController {

    private final WithdrawService service;
    private final UserService userService;

    @PostMapping("/submit")
    public R<WithdrawOrder> submit(@Valid @RequestBody WithdrawSubmitDTO dto) {
        return R.ok(service.submit(userService.currentUserId(),
                dto.getCoin(), dto.getChain(), dto.getAmount(),
                dto.getToAddress(), dto.getMemo(), dto.getPayPassword()));
    }

    @GetMapping("/my")
    public R<Page<WithdrawOrder>> myPage(@RequestParam(defaultValue = "1") int pageNo,
                                         @RequestParam(defaultValue = "20") int pageSize,
                                         @RequestParam(required = false) Integer status) {
        return R.ok(service.myPage(userService.currentUserId(), pageNo, pageSize, status));
    }

    @Data
    public static class WithdrawSubmitDTO {
        @NotBlank(message = "币种不能为空")
        private String coin;
        private String chain;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
        @NotBlank(message = "提现地址不能为空")
        private String toAddress;
        private String memo;
        @NotBlank(message = "交易密码不能为空")
        private String payPassword;
    }
}
