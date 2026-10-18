package com.asterpro.modules.user.dto;

import lombok.Data;

@Data
public class UserInfoVO {
    private Long userId;
    private String uid;
    private String account;
    private String nickname;
    private String avatar;
    private String countryCode;
    private String phone;
    private String email;
    private Integer kycLevel;
    private Integer vipLevel;
    private String inviteCode;
    private Boolean phoneBound;
    private Boolean emailBound;
    private Boolean googleEnabled;
    private Boolean payPwdSet;
}
