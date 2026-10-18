package com.asterpro.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterDTO {

    /** phone / email / account */
    @NotBlank(message = "Registration type cannot be empty") // 注册类型不能为空
    @Pattern(regexp = "phone|email|account", message = "Invalid registration type") // 注册类型错误
    private String type;

    @Size(max = 8, message = "Country code too long") // 国家代码过长
    private String countryCode;

    @Size(max = 32, message = "Phone number too long") // 手机号过长
    private String phone;

    @Size(max = 128, message = "Email too long") // 邮箱过长
    private String email;

    @Size(max = 64, message = "Account can be at most 64 characters") // 账号最多 64 位
    private String account;

    @NotBlank(message = "Password cannot be empty") // 密码不能为空
    @Size(min = 8, max = 32, message = "Password length must be 8-32 characters") // 密码长度需 8-32 位
    private String password;

    /** 手机/邮箱注册时必填，账号注册可不填 */
    private String code;

    private String inviteCode;
}
