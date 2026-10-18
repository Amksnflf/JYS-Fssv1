package com.asterpro.modules.nft.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_nft_order")
public class NftOrder {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long itemId;
    private Long buyerId;
    private Long sellerId;
    private BigDecimal price;
    private String coin;
    /** 1 完成 2 已取消 3 已退款 */
    private Integer status;
    private String remark;
    private LocalDateTime createdAt;
}
