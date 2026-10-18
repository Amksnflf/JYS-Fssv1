package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.entity.DepositChannelConfig;
import com.asterpro.modules.asset.entity.DepositOrder;
import com.asterpro.modules.asset.service.DepositChannelService;
import com.asterpro.modules.asset.service.DepositService;
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
@RequestMapping("/asset/deposit")
@RequiredArgsConstructor
public class DepositController {

    private final DepositService service;
    private final DepositChannelService channelService;
    private final UserService userService;

    @PostMapping("/submit")
    public R<DepositOrder> submit(@Valid @RequestBody DepositSubmitDTO dto) {
        return R.ok(service.submit(userService.currentUserId(),
                dto.getCoin(), dto.getChain(), dto.getAmount(),
                dto.getTxHash(), dto.getFromAddress(), dto.getToAddress(), dto.getScreenshotUrl()));
    }

    @PostMapping("/udun/order")
    public R<DepositOrder> createUdunOrder(@RequestBody UdunOrderDTO dto) {
        return R.ok(service.createUdunOrder(userService.currentUserId(), dto.getCoin(), dto.getChain(), dto.getAmount()));
    }

    @GetMapping("/mode")
    public R<DepositChannelConfig> mode(@RequestParam String coin,
                                        @RequestParam(required = false) String chain) {
        return R.ok(channelService.resolve(coin, chain));
    }

    @GetMapping("/my")
    public R<Page<DepositOrder>> myPage(@RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize,
                                        @RequestParam(required = false) Integer status) {
        return R.ok(service.myPage(userService.currentUserId(), pageNo, pageSize, status));
    }

    @GetMapping("/order/{orderNo}")
    public R<DepositOrder> detail(@org.springframework.web.bind.annotation.PathVariable String orderNo) {
        return R.ok(service.userOrder(userService.currentUserId(), orderNo));
    }

    @Data
    public static class DepositSubmitDTO {
        @NotBlank(message = "币种不能为空")
        private String coin;
        private String chain;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
        @NotBlank(message = "交易哈希不能为空")
        private String txHash;
        @NotBlank(message = "付款地址不能为空")
        private String fromAddress;
        private String toAddress;
        private String screenshotUrl;
    }

    @Data
    public static class UdunOrderDTO {
        @NotBlank(message = "币种不能为空")
        private String coin;
        private String chain;
        private BigDecimal amount;
    }
}
