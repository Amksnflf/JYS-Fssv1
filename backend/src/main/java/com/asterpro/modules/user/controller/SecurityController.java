package com.asterpro.modules.user.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.service.SecurityService;
import com.asterpro.modules.user.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/security")
@RequiredArgsConstructor
public class SecurityController {

    private final UserService userService;
    private final SecurityService securityService;

    @PostMapping("/login-password")
    public R<Void> changeLoginPwd(@RequestBody ChangePwdDTO dto) {
        securityService.changeLoginPassword(userService.currentUserId(), dto.getOldPassword(), dto.getNewPassword());
        return R.ok();
    }

    @PostMapping("/pay-password")
    public R<Void> setPayPwd(@RequestBody ChangePwdDTO dto) {
        securityService.setPayPassword(userService.currentUserId(), dto.getOldPassword(), dto.getNewPassword());
        return R.ok();
    }

    @PostMapping("/bind-email")
    public R<Void> bindEmail(@RequestBody BindEmailDTO dto) {
        securityService.bindEmail(userService.currentUserId(), dto.getEmail(), dto.getCode());
        return R.ok();
    }

    @GetMapping("/google/prepare")
    public R<Map<String, String>> prepareGoogle() {
        return R.ok(securityService.prepareGoogle(userService.currentUserId()));
    }

    @PostMapping("/google/enable")
    public R<Void> enableGoogle(@RequestBody GoogleDTO dto) {
        securityService.enableGoogle(userService.currentUserId(), dto.getSecret(), dto.getCode());
        return R.ok();
    }

    @PostMapping("/google/disable")
    public R<Void> disableGoogle(@RequestBody GoogleDTO dto) {
        securityService.disableGoogle(userService.currentUserId(), dto.getCode());
        return R.ok();
    }

    @Data
    public static class ChangePwdDTO {
        private String oldPassword;
        private String newPassword;
    }

    @Data
    public static class BindEmailDTO {
        private String email;
        private String code;
    }

    @Data
    public static class GoogleDTO {
        private String secret;
        private String code;
    }
}
