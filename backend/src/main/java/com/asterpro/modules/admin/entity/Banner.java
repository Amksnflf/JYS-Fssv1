package com.asterpro.modules.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_banner")
public class Banner {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String title;
    private String image;
    private String link;
    private String position;
    private String lang;
    private Integer enabled;
    private Integer sort;
    private LocalDateTime createdAt;
}
