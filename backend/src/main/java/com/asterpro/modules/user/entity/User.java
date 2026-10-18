package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String uid;
    private String account;
    private String nickname;
    private String avatar;
    private String countryCode;
    private String phone;
    private String email;
    private Integer status;
    private Integer vipLevel;
    private Integer kycLevel;
    private String inviteCode;
    private Long parentId;
    private String registerIp;
    private LocalDateTime lastLoginAt;
    private String lastLoginIp;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
