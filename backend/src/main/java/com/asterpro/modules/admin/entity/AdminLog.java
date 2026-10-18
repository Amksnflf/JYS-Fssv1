package com.asterpro.modules.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_admin_log")
public class AdminLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long adminId;
    private String module;
    private String action;
    private String targetType;
    private String targetId;
    private String params;
    private String ip;
    private LocalDateTime createdAt;
}
