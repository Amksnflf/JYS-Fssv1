package com.asterpro.modules.user.dto;

import lombok.Data;

@Data
public class LoginVO {
    private String token;
    private String tokenName;
    private Long userId;
    private String uid;
    private String nickname;
    private String avatar;
    private Integer kycLevel;
    private Integer vipLevel;
    private String inviteCode;
    private Boolean googleEnabled;
}
