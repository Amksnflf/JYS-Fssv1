package com.asterpro.modules.user.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.dto.KycSubmitDTO;
import com.asterpro.modules.user.entity.UserKyc;
import com.asterpro.modules.user.service.KycService;
import com.asterpro.modules.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/kyc")
@RequiredArgsConstructor
public class KycController {

    private final UserService userService;
    private final KycService kycService;

    @PostMapping("/submit")
    public R<Void> submit(@Valid @RequestBody KycSubmitDTO dto) {
        kycService.submit(userService.currentUserId(), dto);
        return R.ok();
    }

    @GetMapping("/my")
    public R<List<UserKyc>> my() {
        return R.ok(kycService.myKyc(userService.currentUserId()));
    }
}
