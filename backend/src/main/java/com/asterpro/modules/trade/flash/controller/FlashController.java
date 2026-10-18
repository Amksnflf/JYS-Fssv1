package com.asterpro.modules.trade.flash.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.trade.flash.dto.FlashQuoteVO;
import com.asterpro.modules.trade.flash.entity.FlashOrder;
import com.asterpro.modules.trade.flash.service.FlashService;
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
@RequestMapping("/flash")
@RequiredArgsConstructor
public class FlashController {

    private final FlashService service;
    private final UserService userService;

    @PostMapping("/quote")
    public R<FlashQuoteVO> quote(@Valid @RequestBody QuoteDTO dto) {
        return R.ok(service.quote(dto.getFromCoin(), dto.getToCoin(), dto.getFromAmount()));
    }

    @PostMapping("/convert")
    public R<FlashOrder> convert(@Valid @RequestBody ConvertDTO dto) {
        return R.ok(service.convert(
                userService.currentUserId(),
                FlashService.parseAccount(dto.getFromAccount()),
                FlashService.parseAccount(dto.getToAccount()),
                dto.getFromCoin(),
                dto.getToCoin(),
                dto.getFromAmount(),
                dto.getExpectedToAmount(),
                dto.getMaxSlippage()
        ));
    }

    @GetMapping("/my")
    public R<Page<FlashOrder>> my(@RequestParam(defaultValue = "1") int pageNo,
                                  @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(service.myHistory(userService.currentUserId(), pageNo, pageSize));
    }

    @Data
    public static class QuoteDTO {
        @NotBlank(message = "转出币种不能为空")
        private String fromCoin;
        @NotBlank(message = "转入币种不能为空")
        private String toCoin;
        @NotNull(message = "数量不能为空")
        private BigDecimal fromAmount;
    }

    @Data
    public static class ConvertDTO {
        @NotBlank(message = "转出账户不能为空")
        private String fromAccount;  // spot/trade/finance
        @NotBlank(message = "转入账户不能为空")
        private String toAccount;
        @NotBlank(message = "转出币种不能为空")
        private String fromCoin;
        @NotBlank(message = "转入币种不能为空")
        private String toCoin;
        @NotNull(message = "数量不能为空")
        private BigDecimal fromAmount;
        /** 客户端报价时的预期到账金额，用于滑点保护（可选） */
        private BigDecimal expectedToAmount;
        /** 允许的最大滑点比率，默认 1% */
        private BigDecimal maxSlippage;
    }
}
