package com.asterpro.modules.nft.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_nft_item")
public class NftItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer collectionId;
    private String name;
    private String image;
    private String tokenNo;
    private String contractAddress;
    private String network;
    private String tokenCode;
    private String tokenStandard;
    private BigDecimal royaltyRate;
    private BigDecimal usdPrice;
    private String attributesJson;
    private BigDecimal price;
    private String coin;
    private Long ownerId;
    /** 1 在售 2 已售 3 下架 */
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int STATUS_ON_SALE = 1;
    public static final int STATUS_SOLD = 2;
}
