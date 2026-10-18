package com.asterpro.modules.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_admin_role")
public class AdminRole {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String name;
    private String code;
    /** JSON 数组 */
    private String permissions;
    private LocalDateTime createdAt;
}
