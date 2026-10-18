package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_security")
public class UserSecurity {

    @TableId
    private Long userId;

    private String loginPassword;
    private String payPassword;
    private String googleSecret;
    private Integer googleEnabled;
    private Integer phoneBound;
    private Integer emailBound;
    private Integer wrongPwdCount;
    private LocalDateTime lockUntil;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
