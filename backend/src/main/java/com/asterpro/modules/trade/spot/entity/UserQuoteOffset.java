package com.asterpro.modules.trade.spot.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_user_quote_offset")
public class UserQuoteOffset {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    /** 为空时对所有交易对生效 */
    private String symbol;
    /** 1 百分比 2 绝对值 */
    private Integer offsetType;
    private BigDecimal offsetValue;
    private Integer enabled;
    private String remark;
    private Long operatorId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
