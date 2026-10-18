package com.asterpro.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_dynamic")
public class Dynamic {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String content;
    private String images;
    private Integer likeCount;
    private Integer commentCount;
    /** 1 展示 0 隐藏 */
    private Integer status;
    /** 1 置顶 0 普通 */
    private Integer pinned;
    private LocalDateTime createdAt;
}
