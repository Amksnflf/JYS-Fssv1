package com.asterpro.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_feedback")
public class Feedback {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String category;
    private String content;
    private String images;
    /** 0 待处理 1 处理中 2 已关闭 */
    private Integer status;
    private String reply;
    private Long repliedBy;
    private LocalDateTime repliedAt;
    private LocalDateTime createdAt;
}
