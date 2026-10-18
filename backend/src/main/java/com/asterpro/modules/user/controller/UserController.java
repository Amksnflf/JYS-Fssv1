package com.asterpro.modules.user.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.dto.UserInfoVO;
import com.asterpro.modules.user.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/info")
    public R<UserInfoVO> info() {
        return R.ok(userService.getInfo(userService.currentUserId()));
    }

    @PostMapping("/profile")
    public R<Void> updateProfile(@RequestBody UpdateProfileDTO dto) {
        userService.updateProfile(userService.currentUserId(), dto.getNickname(), dto.getAvatar());
        return R.ok();
    }

    @Data
    public static class UpdateProfileDTO {
        private String nickname;
        private String avatar;
    }
}
