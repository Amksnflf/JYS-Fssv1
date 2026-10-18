package com.asterpro.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_dynamic_like")
public class DynamicLike {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long dynamicId;
    private LocalDateTime createdAt;
}
