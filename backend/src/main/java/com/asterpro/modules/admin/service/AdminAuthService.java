package com.asterpro.modules.admin.service;

import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PasswordUtil;
import com.asterpro.common.util.RequestUtil;
import com.asterpro.modules.admin.auth.StpAdminUtil;
import com.asterpro.modules.admin.entity.AdminRole;
import com.asterpro.modules.admin.entity.AdminUser;
import com.asterpro.modules.admin.mapper.AdminRoleMapper;
import com.asterpro.modules.admin.mapper.AdminUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private static final int MAX_LOGIN_FAILS = 5;
    private static final int LOCK_MINUTES = 15;

    private final AdminUserMapper userMapper;
    private final AdminRoleMapper roleMapper;

    public LoginVO login(String username, String password) {
        AdminUser u = userMapper.selectOne(new LambdaQueryWrapper<AdminUser>()
                .eq(AdminUser::getUsername, username).last("LIMIT 1"));
        if (u == null) throw new BizException("Invalid username or password"); // 账号或密码错误
        if (u.getStatus() != null && u.getStatus() == 0) throw new BizException("Account is disabled"); // 账号已停用
        LocalDateTime now = LocalDateTime.now();
        if (u.getLockedUntil() != null && u.getLockedUntil().isAfter(now)) {
            throw new BizException("Too many failed login attempts, please try again later"); // 登录失败次数过多，请稍后再试
        }
        boolean passwordOk = PasswordUtil.matches(password, u.getPassword());
        if (!passwordOk) {
            int fails = (u.getLoginFailCount() == null ? 0 : u.getLoginFailCount()) + 1;
            u.setLoginFailCount(fails);
            if (fails >= MAX_LOGIN_FAILS) {
                u.setLockedUntil(now.plusMinutes(LOCK_MINUTES));
            }
            userMapper.updateById(u);
            throw new BizException("Invalid username or password"); // 账号或密码错误
        }
        u.setLoginFailCount(0);
        u.setLockedUntil(null);
        u.setLastLoginAt(now);
        u.setLastLoginIp(RequestUtil.ip());
        userMapper.updateById(u);

        StpAdminUtil.login(u.getId());
        return toLoginVO(u);
    }

    public LoginVO currentAdminVO() {
        return toLoginVO(currentAdmin());
    }

    private LoginVO toLoginVO(AdminUser u) {
        LoginVO vo = new LoginVO();
        vo.setToken(StpAdminUtil.getTokenValue());
        vo.setTokenName(StpAdminUtil.getTokenName());
        vo.setAdminId(u.getId());
        vo.setUsername(u.getUsername());
        vo.setNickname(u.getNickname());
        vo.setAvatar(u.getAvatar());
        if (u.getRoleId() != null) {
            AdminRole role = roleMapper.selectById(u.getRoleId());
            if (role != null) {
                vo.setRoleCode(role.getCode());
                vo.setRoleName(role.getName());
                vo.setPermissions(role.getPermissions());
            }
        }
        return vo;
    }

    public AdminUser currentAdmin() {
        long id = StpAdminUtil.getLoginIdAsLong();
        AdminUser u = userMapper.selectById(id);
        if (u == null) throw new BizException("Admin not found"); // 管理员不存在
        return u;
    }

    public Long currentAdminId() {
        return StpAdminUtil.getLoginIdAsLong();
    }

    public void logout() {
        StpAdminUtil.logout();
    }

    @Data
    public static class LoginVO {
        private String token;
        private String tokenName;
        private Long adminId;
        private String username;
        private String nickname;
        private String avatar;
        private String roleCode;
        private String roleName;
        private String permissions;
    }
}
