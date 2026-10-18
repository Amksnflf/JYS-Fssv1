package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_account_log")
public class AccountLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Integer accountType;
    private String coin;
    /** deposit/withdraw/spot/perp/option/flash/transfer/lock/loan/admin_adjust */
    private String bizType;
    private String bizId;
    /** 正数加 负数减 */
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String remark;
    private LocalDateTime createdAt;
}
