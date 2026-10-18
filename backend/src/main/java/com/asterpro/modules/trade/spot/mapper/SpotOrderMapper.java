package com.asterpro.modules.trade.spot.mapper;

import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;

public interface SpotOrderMapper extends BaseMapper<SpotOrder> {
    /**
     * 计算指定用户指定币种的累计盈亏
     * 买入：盈亏 = (当前估值 - 买入成本) = 数量 * (当前价格 - 买入均价)
     * 卖出：盈亏 = (卖出收入 - 当前估值) = 数量 * (卖出均价 - 当前价格)
     * 综合盈亏 = 所有买入盈亏 + 所有卖出盈亏
     */
    @Select("SELECT COALESCE(" +
            "SUM(CASE " +
            "    WHEN side = 1 THEN deal_amount * (#{currentPrice} - deal_price) " + // 买入：(当前价-买入价)*数量
            "    WHEN side = 2 THEN deal_amount * (deal_price - #{currentPrice}) " + // 卖出：(卖出价-当前价)*数量
            "    ELSE 0 " +
            "END), 0) " +
            "FROM t_spot_order " +
            "WHERE user_id = #{userId} " +
            "AND symbol LIKE CONCAT(#{coin}, '%') " +
            "AND status = 2") // 仅统计已成交订单
    BigDecimal sumProfitByUserIdAndCoin(@Param("userId") Long userId, @Param("coin") String coin, @Param("currentPrice") BigDecimal currentPrice);
}
