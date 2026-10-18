package com.asterpro.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordDTO {

    @NotBlank(message = "Type cannot be empty") // 类型不能为空
    @Pattern(regexp = "phone|email", message = "Invalid type") // 类型错误
    private String type;

    @Size(max = 8, message = "Country code too long") // 国家代码过长
    private String countryCode;

    @NotBlank(message = "Account cannot be empty") // 账号不能为空
    @Size(max = 128, message = "Account too long") // 账号过长
    private String identifier;

    @NotBlank(message = "Verification code cannot be empty") // 验证码不能为空
    private String code;

    @NotBlank(message = "New password cannot be empty") // 新密码不能为空
    @Size(min = 8, max = 32, message = "New password length must be 8-32 characters") // 新密码长度需 8-32 位
    private String newPassword;
}
