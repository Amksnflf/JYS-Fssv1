package com.asterpro.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginDTO {

    @NotBlank(message = "Login type cannot be empty") // 登录类型不能为空
    @Pattern(regexp = "phone|email|account", message = "Invalid login type") // 登录类型错误
    private String type;

    /** 三种登录的统一标识：phone 时填手机号、email 时填邮箱、account 时填账号 */
    @NotBlank(message = "Account cannot be empty") // 账号不能为空
    private String identifier;

    /** phone 登录可选填区号 */
    private String countryCode;

    @NotBlank(message = "Password cannot be empty") // 密码不能为空
    private String password;

    /** 启用 Google 二次验证后必填 */
    private String googleCode;
}
