package com.asterpro.modules.trade.option.mapper;

import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface OptionOrderMapper extends BaseMapper<OptionOrder> {

    @Select("SELECT COALESCE(SUM(profit), 0) FROM t_option_order " +
            "WHERE user_id = #{userId} AND status = 1 " +
            "AND DATE(created_at) = DATE(#{today})")
    BigDecimal sumTodayProfit(@Param("userId") Long userId, @Param("today") LocalDateTime today);
}
