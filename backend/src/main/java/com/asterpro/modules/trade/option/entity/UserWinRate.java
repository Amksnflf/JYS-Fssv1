package com.asterpro.modules.trade.option.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_user_win_rate")
public class UserWinRate {

    @TableId(type = IdType.INPUT)
    private Long userId;

    /** 0 默认随机 1 必胜 2 必败 3 概率 */
    private Integer mode;
    /** mode=3 时使用，0-100 */
    private BigDecimal winRate;
    private String remark;
    private Long operatorId;
    private LocalDateTime updatedAt;

    public static final int MODE_RANDOM = 0;
    public static final int MODE_ALWAYS_WIN = 1;
    public static final int MODE_ALWAYS_LOSE = 2;
    public static final int MODE_PROBABILITY = 3;
}
