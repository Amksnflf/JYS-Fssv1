package com.asterpro.modules.user.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PasswordUtil;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.mapper.UserMapper;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final UserMapper userMapper;
    private final UserSecurityMapper securityMapper;
    private final VerifyCodeService verifyCodeService;
    private final GoogleAuthService googleAuthService;

    public void changeLoginPassword(Long userId, String oldPwd, String newPwd) {
        if (StrUtil.isBlank(newPwd) || newPwd.length() < 8) {
            throw new BizException(400, "New password must be at least 8 characters"); // 新密码至少 8 位
        }
        UserSecurity sec = securityMapper.selectById(userId);
        if (sec == null || !PasswordUtil.matches(oldPwd, sec.getLoginPassword())) {
            throw new BizException(ResultCode.USER_PWD_ERROR);
        }
        sec.setLoginPassword(PasswordUtil.hash(newPwd));
        securityMapper.updateById(sec);
        StpUtil.logout(userId);
    }

    public void setPayPassword(Long userId, String oldPayPwd, String newPayPwd) {
        if (StrUtil.isBlank(newPayPwd) || !newPayPwd.matches("\\d{6}")) {
            throw new BizException(400, "Transaction password must be 6 digits"); // 交易密码需为 6 位数字
        }
        UserSecurity sec = securityMapper.selectById(userId);
        if (sec == null) throw new BizException(ResultCode.USER_NOT_EXIST);
        if (StrUtil.isNotBlank(sec.getPayPassword())) {
            if (!PasswordUtil.matches(oldPayPwd, sec.getPayPassword())) {
                throw new BizException(ResultCode.PAY_PWD_ERROR);
            }
        } else if (StrUtil.isBlank(oldPayPwd) || !PasswordUtil.matches(oldPayPwd, sec.getLoginPassword())) {
            throw new BizException(ResultCode.USER_PWD_ERROR.getCode(), "Please verify login password first"); // 请先验证登录密码
        }
        sec.setPayPassword(PasswordUtil.hash(newPayPwd));
        securityMapper.updateById(sec);
    }

    @Transactional(rollbackFor = Exception.class)
    public void bindEmail(Long userId, String email, String code) {
        if (StrUtil.isBlank(email)) throw new BizException(ResultCode.PARAM_ERROR);
        Long exists = userMapper.selectCount(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User>()
                .eq(User::getEmail, email)
                .ne(User::getId, userId));
        if (exists != null && exists > 0) {
            throw new BizException(400, "Email is already bound"); // 邮箱已被绑定
        }
        verifyCodeService.verifyAndConsume(email, "bind_email", code);
        User u = userMapper.selectById(userId);
        if (u == null) throw new BizException(ResultCode.USER_NOT_EXIST);
        u.setEmail(email);
        userMapper.updateById(u);
        UserSecurity sec = securityMapper.selectById(userId);
        if (sec == null) {
            sec = new UserSecurity();
            sec.setUserId(userId);
            sec.setEmailBound(1);
            securityMapper.insert(sec);
        } else {
            sec.setEmailBound(1);
            securityMapper.updateById(sec);
        }
    }

    /** 生成 Google 密钥 + 二维码（未启用前的预备步骤），不写库直到 enable 时确认 */
    public Map<String, String> prepareGoogle(Long userId) {
        User u = userMapper.selectById(userId);
        if (u == null) throw new BizException(ResultCode.USER_NOT_EXIST);
        String secret = googleAuthService.generateSecret();
        String label = StrUtil.isNotBlank(u.getEmail()) ? u.getEmail() : ("UID-" + u.getUid());
        Map<String, String> result = new HashMap<>();
        result.put("secret", secret);
        result.put("otpauthUrl", googleAuthService.buildOtpAuthUrl(secret, label));
        result.put("qrDataUri", googleAuthService.generateQrDataUri(secret, label));
        return result;
    }

    public void enableGoogle(Long userId, String secret, String code) {
        if (!googleAuthService.verify(secret, code)) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        UserSecurity sec = securityMapper.selectById(userId);
        if (sec == null) {
            sec = new UserSecurity();
            sec.setUserId(userId);
            sec.setGoogleSecret(secret);
            sec.setGoogleEnabled(1);
            securityMapper.insert(sec);
        } else {
            sec.setGoogleSecret(secret);
            sec.setGoogleEnabled(1);
            securityMapper.updateById(sec);
        }
    }

    public void disableGoogle(Long userId, String code) {
        UserSecurity sec = securityMapper.selectById(userId);
        if (sec == null || sec.getGoogleEnabled() == null || sec.getGoogleEnabled() == 0) {
            throw new BizException(400, "Google verification not enabled"); // 未启用谷歌验证
        }
        if (!googleAuthService.verify(sec.getGoogleSecret(), code)) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        sec.setGoogleEnabled(0);
        sec.setGoogleSecret(null);
        securityMapper.updateById(sec);
    }
}
