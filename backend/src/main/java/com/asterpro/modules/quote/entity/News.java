package com.asterpro.modules.quote.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_news")
public class News {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String title;
    private String summary;
    private String content;
    private String cover;
    private String author;
    private String authorAvatar;
    private String sourceName;
    private String sourceUrl;
    private String externalId;
    private Integer likeCount;
    private Integer viewCount;
    private String tagCoin;
    private BigDecimal tagChange;
    private String lang;
    private Integer published;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
