package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_login_log")
public class UserLoginLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String ip;
    private String ua;
    private String device;
    private String location;
    private Integer success;
    private LocalDateTime createdAt;
}
