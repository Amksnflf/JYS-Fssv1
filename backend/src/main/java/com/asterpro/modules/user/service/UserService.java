package com.asterpro.modules.user.service;

import cn.dev33.satoken.stp.StpUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.user.dto.UserInfoVO;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.mapper.UserMapper;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final UserSecurityMapper securityMapper;

    public Long currentUserId() {
        return StpUtil.getLoginIdAsLong();
    }

    public User mustGetUser(Long userId) {
        User u = userMapper.selectById(userId);
        if (u == null) throw new BizException(ResultCode.USER_NOT_EXIST);
        return u;
    }

    public UserInfoVO getInfo(Long userId) {
        User u = mustGetUser(userId);
        UserSecurity sec = securityMapper.selectById(userId);
        UserInfoVO vo = new UserInfoVO();
        vo.setUserId(u.getId());
        vo.setUid(u.getUid());
        vo.setAccount(maskAccount(u.getAccount()));
        vo.setNickname(u.getNickname());
        vo.setAvatar(u.getAvatar());
        vo.setCountryCode(u.getCountryCode());
        vo.setPhone(maskPhone(u.getPhone()));
        vo.setEmail(maskEmail(u.getEmail()));
        vo.setKycLevel(u.getKycLevel());
        vo.setVipLevel(u.getVipLevel());
        vo.setInviteCode(u.getInviteCode());
        if (sec != null) {
            vo.setPhoneBound(sec.getPhoneBound() != null && sec.getPhoneBound() == 1);
            vo.setEmailBound(sec.getEmailBound() != null && sec.getEmailBound() == 1);
            vo.setGoogleEnabled(sec.getGoogleEnabled() != null && sec.getGoogleEnabled() == 1);
            vo.setPayPwdSet(sec.getPayPassword() != null && !sec.getPayPassword().isBlank());
        } else {
            vo.setPhoneBound(false);
            vo.setEmailBound(false);
            vo.setGoogleEnabled(false);
            vo.setPayPwdSet(false);
        }
        return vo;
    }

    public void updateProfile(Long userId, String nickname, String avatar) {
        User u = mustGetUser(userId);
        if (nickname != null && !nickname.isBlank()) u.setNickname(nickname);
        if (avatar != null && !avatar.isBlank()) u.setAvatar(avatar);
        userMapper.updateById(u);
    }

    private String maskAccount(String account) {
        if (account == null || account.isBlank()) return account;
        if (account.contains("@")) return maskEmail(account);
        if (account.matches("^\\+?\\d{6,}$")) return maskPhone(account);
        return account;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return phone;
        if (phone.length() < 7) {
            return phone.length() <= 2 ? phone.charAt(0) + "***" : phone.substring(0, 2) + "****";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return email;
        String prefix = email.substring(0, at);
        String suffix = email.substring(at);
        if (prefix.length() <= 2) return prefix.charAt(0) + "***" + suffix;
        return prefix.substring(0, 2) + "***" + suffix;
    }
}
