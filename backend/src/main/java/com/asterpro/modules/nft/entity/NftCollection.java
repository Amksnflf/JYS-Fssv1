package com.asterpro.modules.nft.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_nft_collection")
public class NftCollection {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String name;
    private String cover;
    private String banner;
    private String category;
    private String description;
    private String videoUrl;
    private Integer verified;
    private BigDecimal floorPrice;
    private BigDecimal volume;
    private BigDecimal latestPrice;
    private Integer itemCount;
    private Integer isHot;
    private Integer sort;
    private LocalDateTime createdAt;
}
