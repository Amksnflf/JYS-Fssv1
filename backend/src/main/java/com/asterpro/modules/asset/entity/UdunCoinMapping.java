package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_udun_coin_mapping")
public class UdunCoinMapping {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String coin;
    private String chain;
    private String mainCoinType;
    private String coinType;
    private Integer decimals;
    private Integer enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
