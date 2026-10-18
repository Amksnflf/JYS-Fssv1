package com.asterpro.modules.follow.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_follow_trader")
public class FollowTrader {
    @TableId(type = IdType.AUTO)
    private Integer id;
    /** 关联真实用户(交易员本人下单时触发跟单) */
    private Long userId;
    private String name;
    private String avatar;
    private String style;
    private BigDecimal winRate;
    private BigDecimal pnlRate;
    private Integer followers;
    /** 展示本金(用于跟单按比例缩放，单位 USDT) */
    private BigDecimal principal;
    private Integer enabled;
    private Integer sort;
    private LocalDateTime createdAt;
}
