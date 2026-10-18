package com.asterpro.modules.user.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.dto.ForgotPasswordDTO;
import com.asterpro.modules.user.dto.LoginDTO;
import com.asterpro.modules.user.dto.LoginVO;
import com.asterpro.modules.user.dto.RegisterDTO;
import com.asterpro.modules.user.dto.SendCodeDTO;
import com.asterpro.modules.user.service.AuthService;
import com.asterpro.modules.user.service.VerifyCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final VerifyCodeService verifyCodeService;

    @PostMapping("/send-code")
    public R<Void> sendCode(@Valid @RequestBody SendCodeDTO dto) {
        int type = "phone".equals(dto.getTargetType()) ? 1 : 2;
        String target = "phone".equals(dto.getTargetType())
                ? (dto.getCountryCode() == null ? "" : dto.getCountryCode()) + dto.getTarget()
                : dto.getTarget();
        verifyCodeService.send(target, type, dto.getScene());
        return R.ok();
    }

    @PostMapping("/register")
    public R<LoginVO> register(@Valid @RequestBody RegisterDTO dto) {
        return R.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public R<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return R.ok(authService.login(dto));
    }

    @PostMapping("/logout")
    public R<Void> logout() {
        authService.logout();
        return R.ok();
    }

    @PostMapping("/forgot-password")
    public R<Void> forgotPassword(@Valid @RequestBody ForgotPasswordDTO dto) {
        authService.forgotPassword(dto);
        return R.ok();
    }
}
