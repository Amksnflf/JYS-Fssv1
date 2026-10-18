package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_verify_code")
public class VerifyCode {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String target;
    private Integer targetType;
    private String scene;
    private String code;
    private LocalDateTime expiresAt;
    private Integer used;
    private LocalDateTime createdAt;
}
