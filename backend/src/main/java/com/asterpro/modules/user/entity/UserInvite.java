package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_invite")
public class UserInvite {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long parentId;
    private Integer level;
    private LocalDateTime createdAt;
}
