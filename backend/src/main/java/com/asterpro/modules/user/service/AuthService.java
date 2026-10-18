package com.asterpro.modules.user.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.CodeGen;
import com.asterpro.common.util.PasswordUtil;
import com.asterpro.common.util.RequestUtil;
import com.asterpro.modules.user.dto.ForgotPasswordDTO;
import com.asterpro.modules.user.dto.LoginDTO;
import com.asterpro.modules.user.dto.LoginVO;
import com.asterpro.modules.user.dto.RegisterDTO;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserLoginLog;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.mapper.UserLoginLogMapper;
import com.asterpro.modules.user.mapper.UserMapper;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final UserSecurityMapper securityMapper;
    private final UserLoginLogMapper loginLogMapper;
    private final VerifyCodeService verifyCodeService;
    private final UserInviteService inviteService;
    private final GoogleAuthService googleAuthService;

    @Transactional(rollbackFor = Exception.class)
    public LoginVO register(RegisterDTO dto) {
        validateRegisterParams(dto);
        ensureNotDuplicate(dto);

        if ("phone".equals(dto.getType()) || "email".equals(dto.getType())) {
            String target = "phone".equals(dto.getType())
                    ? dto.getCountryCode() + dto.getPhone()
                    : dto.getEmail();
            verifyCodeService.verifyAndConsume(target, "register", dto.getCode());
        }

        Long parentId = inviteService.findInviterIdByCode(dto.getInviteCode());
        if (StrUtil.isNotBlank(dto.getInviteCode()) && parentId == null) {
            throw new BizException(400, "Invalid invite code"); // 邀请码无效
        }

        User user = new User();
        user.setUid(generateUniqueUid());
        user.setNickname(defaultNickname(dto));
        user.setAccount(dto.getAccount());
        user.setCountryCode(dto.getCountryCode());
        user.setPhone(dto.getPhone());
        user.setEmail(dto.getEmail());
        user.setStatus(1);
        user.setVipLevel(0);
        user.setKycLevel(0);
        user.setInviteCode(generateUniqueInviteCode());
        user.setParentId(parentId);
        user.setRegisterIp(RequestUtil.ip());
        userMapper.insert(user);

        UserSecurity sec = new UserSecurity();
        sec.setUserId(user.getId());
        sec.setLoginPassword(PasswordUtil.hash(dto.getPassword()));
        sec.setGoogleEnabled(0);
        sec.setPhoneBound(StrUtil.isNotBlank(dto.getPhone()) ? 1 : 0);
        sec.setEmailBound(StrUtil.isNotBlank(dto.getEmail()) ? 1 : 0);
        sec.setWrongPwdCount(0);
        securityMapper.insert(sec);

        if (parentId != null) {
            inviteService.buildInviteTree(user.getId(), parentId);
        }

        return doLoginAndBuildVO(user, sec);
    }

    public LoginVO login(LoginDTO dto) {
        User user = findUserByLoginIdentifier(dto);
        if (user == null) {
            throw new BizException(ResultCode.USER_PWD_ERROR);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(ResultCode.USER_LOCKED);
        }

        UserSecurity sec = securityMapper.selectById(user.getId());
        if (sec == null || !PasswordUtil.matches(dto.getPassword(), sec.getLoginPassword())) {
            recordLogin(user.getId(), 0);
            throw new BizException(ResultCode.USER_PWD_ERROR);
        }

        if (sec.getGoogleEnabled() != null && sec.getGoogleEnabled() == 1) {
            if (StrUtil.isBlank(dto.getGoogleCode())
                    || !googleAuthService.verify(sec.getGoogleSecret(), dto.getGoogleCode())) {
                throw new BizException(ResultCode.VERIFY_CODE_ERROR);
            }
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.setLastLoginIp(RequestUtil.ip());
        userMapper.updateById(user);
        recordLogin(user.getId(), 1);

        return doLoginAndBuildVO(user, sec);
    }

    public void logout() {
        StpUtil.logout();
    }

    @Transactional(rollbackFor = Exception.class)
    public void forgotPassword(ForgotPasswordDTO dto) {
        if (StrUtil.isBlank(dto.getIdentifier()) || StrUtil.isBlank(dto.getNewPassword())) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        LambdaQueryWrapper<User> q = new LambdaQueryWrapper<>();
        String target;
        if ("phone".equals(dto.getType())) {
            if (StrUtil.isBlank(dto.getCountryCode())) {
                throw new BizException(400, "Please enter country code"); // 请填写区号
            }
            q.eq(User::getCountryCode, dto.getCountryCode()).eq(User::getPhone, dto.getIdentifier());
            target = dto.getCountryCode() + dto.getIdentifier();
        } else if ("email".equals(dto.getType())) {
            q.eq(User::getEmail, dto.getIdentifier());
            target = dto.getIdentifier();
        } else {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        User user = userMapper.selectOne(q.last("LIMIT 1"));
        if (user == null) {
            throw new BizException(ResultCode.USER_NOT_EXIST);
        }
        verifyCodeService.verifyAndConsume(target, "reset_pwd", dto.getCode());

        UserSecurity sec = securityMapper.selectById(user.getId());
        if (sec == null) {
            sec = new UserSecurity();
            sec.setUserId(user.getId());
            sec.setLoginPassword(PasswordUtil.hash(dto.getNewPassword()));
            sec.setGoogleEnabled(0);
            sec.setPhoneBound(StrUtil.isNotBlank(user.getPhone()) ? 1 : 0);
            sec.setEmailBound(StrUtil.isNotBlank(user.getEmail()) ? 1 : 0);
            sec.setWrongPwdCount(0);
            securityMapper.insert(sec);
        } else {
            sec.setLoginPassword(PasswordUtil.hash(dto.getNewPassword()));
            securityMapper.updateById(sec);
        }
        StpUtil.logout(user.getId());
    }

    private LoginVO doLoginAndBuildVO(User user, UserSecurity sec) {
        StpUtil.login(user.getId());
        String token = StpUtil.getTokenValue();

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setTokenName(StpUtil.getTokenName());
        vo.setUserId(user.getId());
        vo.setUid(user.getUid());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setKycLevel(user.getKycLevel());
        vo.setVipLevel(user.getVipLevel());
        vo.setInviteCode(user.getInviteCode());
        vo.setGoogleEnabled(sec.getGoogleEnabled() != null && sec.getGoogleEnabled() == 1);
        return vo;
    }

    private void recordLogin(Long userId, int success) {
        UserLoginLog log = new UserLoginLog();
        log.setUserId(userId);
        log.setIp(RequestUtil.ip());
        log.setUa(RequestUtil.ua());
        log.setSuccess(success);
        loginLogMapper.insert(log);
    }

    private void validateRegisterParams(RegisterDTO dto) {
        switch (dto.getType()) {
            case "phone" -> {
                if (StrUtil.isBlank(dto.getCountryCode()) || StrUtil.isBlank(dto.getPhone())) {
                    throw new BizException(400, "Please enter phone number"); // 请填写手机号
                }
            }
            case "email" -> {
                if (StrUtil.isBlank(dto.getEmail())) {
                    throw new BizException(400, "Please enter email"); // 请填写邮箱
                }
            }
            case "account" -> {
                if (StrUtil.isBlank(dto.getAccount()) || dto.getAccount().length() < 4) {
                    throw new BizException(400, "Account must be at least 4 characters"); // 账号至少 4 位
                }
                if (dto.getAccount().length() > 64) {
                    throw new BizException(400, "Account can be at most 64 characters"); // 账号最多 64 位
                }
                if (dto.getAccount().contains("@")) {
                    throw new BizException(400, "Account cannot contain @, please use email to register"); // 账号不能包含 @，请使用邮箱注册
                }
            }
            default -> throw new BizException(ResultCode.PARAM_ERROR);
        }
    }

    private void ensureNotDuplicate(RegisterDTO dto) {
        LambdaQueryWrapper<User> q = new LambdaQueryWrapper<>();
        switch (dto.getType()) {
            case "phone" -> q.eq(User::getCountryCode, dto.getCountryCode()).eq(User::getPhone, dto.getPhone());
            case "email" -> q.eq(User::getEmail, dto.getEmail());
            case "account" -> q.eq(User::getAccount, dto.getAccount());
        }
        if (userMapper.selectCount(q) > 0) {
            throw new BizException(ResultCode.USER_ALREADY_EXIST);
        }
    }

    private User findUserByLoginIdentifier(LoginDTO dto) {
        LambdaQueryWrapper<User> q = new LambdaQueryWrapper<>();
        switch (dto.getType()) {
            case "phone" -> q.eq(User::getCountryCode, StrUtil.blankToDefault(dto.getCountryCode(), ""))
                    .eq(User::getPhone, dto.getIdentifier());
            case "email" -> q.eq(User::getEmail, dto.getIdentifier());
            case "account" -> q.eq(User::getAccount, dto.getIdentifier());
            default -> { return null; }
        }
        return userMapper.selectOne(q.last("LIMIT 1"));
    }

    private String defaultNickname(RegisterDTO dto) {
        if (StrUtil.isNotBlank(dto.getAccount())) return dto.getAccount();
        if (StrUtil.isNotBlank(dto.getEmail())) return dto.getEmail().split("@")[0];
        if (StrUtil.isNotBlank(dto.getPhone())) {
            String p = dto.getPhone();
            return p.length() <= 4 ? p : "User" + p.substring(p.length() - 4);
        }
        return "User" + System.currentTimeMillis() % 10000;
    }

    private String generateUniqueUid() {
        for (int i = 0; i < 5; i++) {
            String uid = CodeGen.uid();
            if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getUid, uid)) == 0) {
                return uid;
            }
        }
        throw new BizException(ResultCode.SERVER_ERROR);
    }

    private String generateUniqueInviteCode() {
        for (int i = 0; i < 5; i++) {
            String code = CodeGen.inviteCode();
            if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getInviteCode, code)) == 0) {
                return code;
            }
        }
        throw new BizException(ResultCode.SERVER_ERROR);
    }
}
