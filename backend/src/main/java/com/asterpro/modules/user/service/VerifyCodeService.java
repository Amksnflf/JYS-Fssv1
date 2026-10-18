package com.asterpro.modules.user.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.CodeGen;
import com.asterpro.modules.user.entity.VerifyCode;
import com.asterpro.modules.user.mapper.VerifyCodeMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.mail.MailProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class VerifyCodeService {

    private final VerifyCodeMapper mapper;
    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    private static final int EXPIRES_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    public void send(String target, int targetType, String scene) {
        if (StrUtil.isBlank(target)) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        if (targetType != 2) {
            throw new BizException(400, "Currently only email verification code is supported"); // 当前仅支持邮箱验证码
        }
        if (StrUtil.isBlank(mailProperties.getHost()) || StrUtil.isBlank(mailProperties.getUsername())) {
            throw new BizException(500, "Email service not configured"); // 邮件服务未配置
        }
        VerifyCode last = mapper.selectOne(new LambdaQueryWrapper<VerifyCode>()
                .eq(VerifyCode::getTarget, target)
                .eq(VerifyCode::getScene, scene)
                .orderByDesc(VerifyCode::getId)
                .last("LIMIT 1"));
        if (last != null && last.getCreatedAt() != null
                && last.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
            throw new BizException(429, "Sending too frequently, please try again later"); // 发送过于频繁，请稍后再试
        }
        String code = CodeGen.verifyCode();
        sendEmailCode(target, code, scene);

        VerifyCode entity = new VerifyCode();
        entity.setTarget(target);
        entity.setTargetType(targetType);
        entity.setScene(scene);
        entity.setCode(code);
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRES_MINUTES));
        entity.setUsed(0);
        mapper.insert(entity);
    }

    private void sendEmailCode(String target, String code, String scene) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(StrUtil.blankToDefault(mailProperties.getProperties().get("mail.from"), mailProperties.getUsername()));
        message.setTo(target);
        message.setSubject("Aster Pro Verification Code"); // Aster Pro 验证码
        message.setText("Your Aster Pro verification code is: " + code + "\n\nScene: " + scene + "\nValid for: " + EXPIRES_MINUTES + " minutes."); // 您的 Aster Pro 验证码是：...场景：...有效期：...分钟。
        mailSender.send(message);
    }

    /**
     * 校验验证码并标记为已用。失败抛业务异常。
     */
    public void verifyAndConsume(String target, String scene, String code) {
        if (StrUtil.isBlank(code)) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        VerifyCode vc = mapper.selectOne(new LambdaQueryWrapper<VerifyCode>()
                .eq(VerifyCode::getTarget, target)
                .eq(VerifyCode::getScene, scene)
                .eq(VerifyCode::getUsed, 0)
                .orderByDesc(VerifyCode::getId)
                .last("LIMIT 1"));
        if (vc == null
                || !code.equals(vc.getCode())
                || vc.getExpiresAt() == null
                || vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        mapper.update(null, new LambdaUpdateWrapper<VerifyCode>()
                .eq(VerifyCode::getId, vc.getId())
                .set(VerifyCode::getUsed, 1));
    }
}
