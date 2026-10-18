package com.asterpro.modules.user.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.dto.LoginVO;
import com.asterpro.modules.user.service.WalletAuthService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth/wallet")
@RequiredArgsConstructor
public class WalletAuthController {

    private final WalletAuthService walletAuthService;

    @GetMapping("/nonce")
    public R<Map<String, String>> nonce(@RequestParam String address,
                                        @RequestParam(required = false) String chain) {
        String nonce = walletAuthService.generateNonce(address, chain);
        Map<String, String> data = new HashMap<>();
        data.put("nonce", nonce);
        return R.ok(data);
    }

    @PostMapping("/login")
    public R<LoginVO> login(@RequestBody WalletLoginDTO dto) {
        return R.ok(walletAuthService.loginByWallet(
                dto.getWalletType(), dto.getChain(), dto.getAddress(), dto.getSignature()));
    }

    @Data
    public static class WalletLoginDTO {
        private String walletType;
        private String chain;
        private String address;
        private String signature;
    }
}
