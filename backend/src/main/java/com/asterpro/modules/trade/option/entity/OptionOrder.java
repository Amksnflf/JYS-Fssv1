package com.asterpro.modules.trade.option.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_option_order")
public class OptionOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private Long userId;
    private String symbol;
    private String settlementCoin;
    /** 1 买涨 2 买跌 */
    private Integer direction;
    /** 30/60/120/300 秒 */
    private Integer periodSeconds;
    /** 收益率 0.20=20% */
    private BigDecimal payoutRate;
    private BigDecimal amount;
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss+08:00")
    private LocalDateTime openAt;
    private BigDecimal openPrice;
    private BigDecimal settlePrice;
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss+08:00")
    private LocalDateTime settleAt;
    /** 1 赢 2 输 3 平 */
    private Integer result;
    private BigDecimal profit;
    /** 0 进行中 1 已结算 2 待开仓 */
    private Integer status;
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss+08:00")
    private LocalDateTime createdAt;
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss+08:00")
    private LocalDateTime updatedAt;

    public static final int DIR_UP = 1;
    public static final int DIR_DOWN = 2;
    public static final int RESULT_WIN = 1;
    public static final int RESULT_LOSE = 2;
    public static final int RESULT_DRAW = 3;
    public static final int STATUS_RUNNING = 0;
    public static final int STATUS_SETTLED = 1;
    public static final int STATUS_SCHEDULED = 2;
    public static final int STATUS_CANCELLED = 3;

    /** 提供预约开仓绝对毫秒时间戳（按东八区计算） */
    public Long getOpenTimestamp() {
        if (openAt == null) return null;
        return openAt.atZone(java.time.ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli();
    }

    /** 提供精确的绝对毫秒时间戳（按东八区计算），彻底消除客户端跨时区倒计时偏差 */
    public Long getSettleTimestamp() {
        if (settleAt == null) return null;
        return settleAt.atZone(java.time.ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli();
    }

    /** 提供服务端剩余秒数，客户端无需自行计算时间差 */
    public Long getRemainingSeconds() {
        if (settleAt == null || status != STATUS_RUNNING) return 0L;
        long remain = java.time.Duration.between(LocalDateTime.now(), settleAt).getSeconds();
        return Math.max(0L, remain);
    }
}
