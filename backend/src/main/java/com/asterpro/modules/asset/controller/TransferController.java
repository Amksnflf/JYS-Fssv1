package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.entity.TransferLog;
import com.asterpro.modules.asset.service.TransferService;
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
@RequestMapping("/asset/transfer")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService service;
    private final UserService userService;

    @PostMapping("")
    public R<TransferLog> transfer(@Valid @RequestBody TransferDTO dto) {
        return R.ok(service.transfer(userService.currentUserId(),
                dto.getFromAccount(), dto.getToAccount(), dto.getCoin(), dto.getAmount()));
    }

    @GetMapping("/my")
    public R<Page<TransferLog>> myPage(@RequestParam(defaultValue = "1") int pageNo,
                                       @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(service.myPage(userService.currentUserId(), pageNo, pageSize));
    }

    @Data
    public static class TransferDTO {
        @NotNull(message = "转出账户不能为空")
        private Integer fromAccount;
        @NotNull(message = "转入账户不能为空")
        private Integer toAccount;
        @NotBlank(message = "币种不能为空")
        private String coin;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
    }
}
