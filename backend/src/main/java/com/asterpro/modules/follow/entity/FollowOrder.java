package com.asterpro.modules.follow.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_follow_order")
public class FollowOrder {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long userId;
    private Integer traderId;
    private BigDecimal amount;
    private Integer maxLeverage;
    /** 1 跟单中 2 已取消 */
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int STATUS_RUNNING = 1;
    public static final int STATUS_CANCELLED = 2;
}
