package com.asterpro.modules.admin.controller;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PasswordUtil;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserKyc;
import com.asterpro.modules.user.entity.UserLoginLog;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.entity.UserWallet;
import com.asterpro.modules.user.mapper.UserKycMapper;
import com.asterpro.modules.user.mapper.UserLoginLogMapper;
import com.asterpro.modules.user.mapper.UserMapper;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import com.asterpro.modules.user.mapper.UserWalletMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/admin/user")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserMapper userMapper;
    private final UserKycMapper kycMapper;
    private final UserSecurityMapper securityMapper;
    private final UserWalletMapper walletMapper;
    private final UserLoginLogMapper loginLogMapper;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    @GetMapping("/page")
    public R<Page<User>> page(@RequestParam(required = false) String keyword,
                              @RequestParam(required = false) Integer status,
                              @RequestParam(required = false) Integer kycLevel,
                              @RequestParam(defaultValue = "1") int pageNo,
                              @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim();
            wrapper.and(q -> {
                q.like(User::getUid, kw)
                        .or().like(User::getAccount, kw)
                        .or().like(User::getEmail, kw)
                        .or().like(User::getPhone, kw)
                        .or().like(User::getNickname, kw);
                if (StrUtil.isNumeric(kw)) {
                    try {
                        q.or().eq(User::getId, Long.parseLong(kw));
                    } catch (NumberFormatException ignored) {
                    }
                }
            });
        }
        if (status != null) {
            wrapper.eq(User::getStatus, status);
        }
        if (kycLevel != null) {
            wrapper.eq(User::getKycLevel, kycLevel);
        }
        wrapper.orderByDesc(User::getId);
        return R.ok(userMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), wrapper));
    }

    @GetMapping("/{id}")
    public R<UserDTO> get(@PathVariable Long id) {
        User user = userMapper.selectById(id);
        return R.ok(user == null ? null : UserDTO.from(user));
    }

    @PostMapping("/{id}/profile")
    public R<UserDTO> updateProfile(@PathVariable Long id, @RequestBody UpdateProfileDTO dto) {
        User user = userMapper.selectById(id);
        if (user == null) {
            return R.fail("User does not exist"); // 用户不存在
        }

        String nickname = normalizeNullable(dto.getNickname());
        String email = normalizeNullable(dto.getEmail());
        String phone = normalizeNullable(dto.getPhone());
        String countryCode = phone == null ? null : normalizeNullable(dto.getCountryCode());

        validateProfile(nickname, email, countryCode, phone);
        ensureUniqueEmail(id, email);
        ensureUniquePhone(id, countryCode, phone);

        user.setNickname(nickname);
        user.setEmail(email);
        user.setCountryCode(countryCode);
        user.setPhone(phone);
        userMapper.updateById(user);

        UserSecurity security = ensureSecurity(id);
        security.setEmailBound(email == null ? 0 : 1);
        security.setPhoneBound(phone == null ? 0 : 1);
        securityMapper.updateById(security);

        logService.log(authService.currentAdminId(), "user", "update_profile",
                "user", String.valueOf(id),
                "nickname=" + safeLogValue(nickname)
                        + " email=" + safeLogValue(email)
                        + " countryCode=" + safeLogValue(countryCode)
                        + " phone=" + safeLogValue(phone));
        return R.ok(UserDTO.from(userMapper.selectById(id)));
    }

    @GetMapping("/{id}/security")
    public R<UserSecurity> security(@PathVariable Long id) {
        UserSecurity security = securityMapper.selectById(id);
        if (security != null) {
            security.setLoginPassword(null);
            security.setPayPassword(null);
            security.setGoogleSecret(null);
        }
        return R.ok(security);
    }

    @PostMapping("/{id}/security/reset-login-password")
    public R<Void> resetLoginPassword(@PathVariable Long id, @RequestBody PasswordDTO dto) {
        UserSecurity security = ensureSecurity(id);
        requirePassword(dto.getPassword());
        security.setLoginPassword(PasswordUtil.hash(dto.getPassword()));
        security.setWrongPwdCount(0);
        security.setLockUntil(null);
        securityMapper.updateById(security);
        logService.log(authService.currentAdminId(), "user", "reset_login_password",
                "user", String.valueOf(id), null);
        return R.ok();
    }

    @PostMapping("/{id}/security/reset-pay-password")
    public R<Void> resetPayPassword(@PathVariable Long id, @RequestBody PasswordDTO dto) {
        UserSecurity security = ensureSecurity(id);
        requirePassword(dto.getPassword());
        security.setPayPassword(PasswordUtil.hash(dto.getPassword()));
        securityMapper.updateById(security);
        logService.log(authService.currentAdminId(), "user", "reset_pay_password",
                "user", String.valueOf(id), null);
        return R.ok();
    }

    @PostMapping("/{id}/security/unbind")
    public R<Void> unbindSecurity(@PathVariable Long id, @RequestBody SecurityActionDTO dto) {
        UserSecurity security = ensureSecurity(id);
        if (dto.getReason() == null || dto.getReason().isBlank()) {
            return R.fail("Please enter operation reason"); // 请填写操作原因
        }
        String type = dto.getType();
        if ("google".equals(type)) {
            security.setGoogleEnabled(0);
            security.setGoogleSecret(null);
        } else if ("phone".equals(type)) {
            security.setPhoneBound(0);
        } else if ("email".equals(type)) {
            security.setEmailBound(0);
        } else {
            return R.fail("Unsupported unbind type"); // 不支持的解绑类型
        }
        securityMapper.updateById(security);
        logService.log(authService.currentAdminId(), "user", "security_unbind",
                "user", String.valueOf(id), "type=" + type + " reason=" + dto.getReason());
        return R.ok();
    }

    @GetMapping("/{id}/wallet/list")
    public R<java.util.List<UserWallet>> wallets(@PathVariable Long id) {
        return R.ok(walletMapper.selectList(new LambdaQueryWrapper<UserWallet>()
                .eq(UserWallet::getUserId, id)
                .orderByDesc(UserWallet::getId)));
    }

    @GetMapping("/{id}/login-log/page")
    public R<Page<UserLoginLog>> loginLogs(@PathVariable Long id,
                                           @RequestParam(defaultValue = "1") int pageNo,
                                           @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(loginLogMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize),
                new LambdaQueryWrapper<UserLoginLog>()
                        .eq(UserLoginLog::getUserId, id)
                        .orderByDesc(UserLoginLog::getId)));
    }

    @PostMapping("/{id}/status")
    public R<Void> setStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        User user = userMapper.selectById(id);
        if (user == null) {
            return R.fail("User does not exist"); // 用户不存在
        }
        if (dto.getStatus() == null || (dto.getStatus() != 0 && dto.getStatus() != 1)) {
            return R.fail("Invalid user status"); // 用户状态不合法
        }
        if (dto.getReason() == null || dto.getReason().isBlank()) {
            return R.fail("Please enter operation reason"); // 请填写操作原因
        }
        user.setStatus(dto.getStatus());
        userMapper.updateById(user);
        if (dto.getStatus() == 0) {
            StpUtil.logout(id);
        }
        logService.log(authService.currentAdminId(), "user", "set_status",
                "user", String.valueOf(id), "status=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @GetMapping("/kyc/page")
    public R<Page<UserKyc>> kycPage(@RequestParam(required = false) Integer auditStatus,
                                    @RequestParam(defaultValue = "1") int pageNo,
                                    @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UserKyc> wrapper = new LambdaQueryWrapper<>();
        if (auditStatus != null) {
            wrapper.eq(UserKyc::getAuditStatus, auditStatus);
        }
        wrapper.orderByDesc(UserKyc::getId);
        return R.ok(kycMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), wrapper));
    }

    @PostMapping("/kyc/{id}/audit")
    public R<Void> kycAudit(@PathVariable Long id, @RequestBody KycAuditDTO dto) {
        if (dto == null || dto.getPass() == null) {
            return R.fail("Please select audit result"); // 请选择审核结果
        }
        if (!dto.getPass() && (dto.getRemark() == null || dto.getRemark().isBlank())) {
            return R.fail("Please enter audit remark when rejecting"); // 驳回时请填写审核备注
        }

        UserKyc kyc = kycMapper.selectById(id);
        if (kyc == null) {
            return R.fail("KYC record does not exist"); // KYC 记录不存在
        }

        Long adminId = authService.currentAdminId();
        kyc.setAuditStatus(dto.getPass() ? 1 : 2);
        kyc.setAuditRemark(dto.getRemark());
        kyc.setAuditedBy(adminId);
        kyc.setAuditedAt(LocalDateTime.now());
        kycMapper.updateById(kyc);

        if (dto.getPass()) {
            User user = userMapper.selectById(kyc.getUserId());
            if (user != null) {
                user.setKycLevel(kyc.getLevel());
                userMapper.updateById(user);
            }
        }

        logService.log(adminId, "user", "kyc_audit", "user_kyc",
                String.valueOf(id), "pass=" + dto.getPass());
        return R.ok();
    }

    @Data
    public static class StatusDTO {
        private Integer status;
        private String reason;
    }

    @Data
    public static class UserDTO {
        private Long id;
        private String uid;
        private String account;
        private String nickname;
        private String avatar;
        private String countryCode;
        private String phone;
        private String email;
        private Integer status;
        private Integer vipLevel;
        private Integer kycLevel;
        private String inviteCode;
        private Long parentId;
        private LocalDateTime lastLoginAt;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        static UserDTO from(User user) {
            UserDTO dto = new UserDTO();
            dto.setId(user.getId());
            dto.setUid(user.getUid());
            dto.setAccount(user.getAccount());
            dto.setNickname(user.getNickname());
            dto.setAvatar(user.getAvatar());
            dto.setCountryCode(user.getCountryCode());
            dto.setPhone(user.getPhone());
            dto.setEmail(user.getEmail());
            dto.setStatus(user.getStatus());
            dto.setVipLevel(user.getVipLevel());
            dto.setKycLevel(user.getKycLevel());
            dto.setInviteCode(user.getInviteCode());
            dto.setParentId(user.getParentId());
            dto.setLastLoginAt(user.getLastLoginAt());
            dto.setCreatedAt(user.getCreatedAt());
            dto.setUpdatedAt(user.getUpdatedAt());
            return dto;
        }
    }

    @Data
    public static class UpdateProfileDTO {
        private String nickname;
        private String countryCode;
        private String phone;
        private String email;
    }

    @Data
    public static class KycAuditDTO {
        private Boolean pass;
        private String remark;
    }

    @Data
    public static class PasswordDTO {
        private String password;
    }

    @Data
    public static class SecurityActionDTO {
        private String type;
        private String reason;
    }

    private UserSecurity ensureSecurity(Long userId) {
        UserSecurity security = securityMapper.selectById(userId);
        if (security == null) {
            security = new UserSecurity();
            security.setUserId(userId);
            security.setGoogleEnabled(0);
            security.setPhoneBound(0);
            security.setEmailBound(0);
            security.setWrongPwdCount(0);
            securityMapper.insert(security);
        }
        return security;
    }

    private void requirePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new BizException("Password cannot be empty"); // 密码不能为空
        }
        if (password.length() < 6) {
            throw new BizException("Password length cannot be less than 6 characters"); // 密码长度不能少于 6 位
        }
    }

    private void validateProfile(String nickname, String email, String countryCode, String phone) {
        if (nickname != null && nickname.length() > 64) {
            throw new BizException("Nickname length cannot exceed 64 characters"); // 昵称长度不能超过 64 位
        }
        if (email != null) {
            if (email.length() > 128) {
                throw new BizException("Email length cannot exceed 128 characters"); // 邮箱长度不能超过 128 位
            }
            int at = email.indexOf('@');
            if (at <= 0 || at >= email.length() - 1) {
                throw new BizException("Invalid email format"); // 邮箱格式不正确
            }
        }
        if (phone != null) {
            if (countryCode == null) {
                throw new BizException("Country code is required when entering phone number"); // 填写手机号时必须同时填写区号
            }
            if (countryCode.length() > 8) {
                throw new BizException("Country code length cannot exceed 8 characters"); // 区号长度不能超过 8 位
            }
            if (phone.length() > 32) {
                throw new BizException("Phone number length cannot exceed 32 characters"); // 手机号长度不能超过 32 位
            }
        }
    }

    private void ensureUniqueEmail(Long userId, String email) {
        if (email == null) {
            return;
        }
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, email)
                .ne(User::getId, userId));
        if (count != null && count > 0) {
            throw new BizException("Email is already used by another user"); // 邮箱已被其他用户占用
        }
    }

    private void ensureUniquePhone(Long userId, String countryCode, String phone) {
        if (phone == null) {
            return;
        }
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getCountryCode, countryCode)
                .eq(User::getPhone, phone)
                .ne(User::getId, userId));
        if (count != null && count > 0) {
            throw new BizException("Phone number is already used by another user"); // 手机号已被其他用户占用
        }
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String safeLogValue(String value) {
        return value == null ? "-" : value;
    }
}
