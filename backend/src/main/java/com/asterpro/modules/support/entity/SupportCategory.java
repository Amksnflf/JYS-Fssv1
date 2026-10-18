package com.asterpro.modules.support.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_support_category")
public class SupportCategory {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String categoryKey;
    private String categoryName;
    private String parentKey;
    private Integer enabled;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
