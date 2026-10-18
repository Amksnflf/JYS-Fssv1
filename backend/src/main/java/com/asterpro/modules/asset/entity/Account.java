package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_account")
public class Account {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    /** 1 现货 2 交易 3 理财 */
    private Integer accountType;
    private String coin;
    private BigDecimal available;
    private BigDecimal frozen;
    @Version
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final int SPOT = 1;
    public static final int TRADE = 2;
    public static final int FINANCE = 3;
}
