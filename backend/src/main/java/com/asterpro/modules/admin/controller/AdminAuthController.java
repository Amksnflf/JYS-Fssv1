package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;
    private final AdminLogService logService;

    @PostMapping("/login")
    public R<AdminAuthService.LoginVO> login(@RequestBody LoginDTO dto) {
        if (dto == null || dto.getUsername() == null || dto.getUsername().isBlank()
                || dto.getPassword() == null || dto.getPassword().isBlank()) {
            return R.fail("Please enter username and password"); // 请输入用户名和密码
        }
        AdminAuthService.LoginVO vo = authService.login(dto.getUsername(), dto.getPassword());
        logService.log(vo.getAdminId(), "auth", "login", null, null, dto.getUsername());
        return R.ok(vo);
    }

    @GetMapping("/me")
    public R<AdminAuthService.LoginVO> me() {
        return R.ok(authService.currentAdminVO());
    }

    @PostMapping("/logout")
    public R<Void> logout() {
        Long id = authService.currentAdminId();
        authService.logout();
        logService.log(id, "auth", "logout", null, null, null);
        return R.ok();
    }

    @Data
    public static class LoginDTO {
        private String username;
        private String password;
    }
}
