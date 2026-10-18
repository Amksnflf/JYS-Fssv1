package com.asterpro.modules.trade.spot.service;

import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.spot.entity.UserQuoteOffset;
import com.asterpro.modules.trade.spot.mapper.UserQuoteOffsetMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * 用户级行情偏移：
 * - 仅影响指定用户在前端看到的价格 + 该用户下单时使用的成交价
 * - 不污染 AllTick 原始价 / 平台 PnL 报表
 *
 * 匹配优先级：精确 symbol > 全局（symbol 为 NULL）
 */
@Service
@RequiredArgsConstructor
public class QuoteOffsetService {

    private final UserQuoteOffsetMapper mapper;

    /** 取该用户对该 symbol 的有效偏移；null 表示无偏移 */
    public UserQuoteOffset find(Long userId, String symbol) {
        String normalized = SymbolService.normalizeSymbol(symbol);
        LambdaQueryWrapper<UserQuoteOffset> w = new LambdaQueryWrapper<>();
        w.eq(UserQuoteOffset::getUserId, userId).eq(UserQuoteOffset::getEnabled, 1);
        List<UserQuoteOffset> list = mapper.selectList(w);
        UserQuoteOffset bySymbol = null, global = null;
        for (UserQuoteOffset o : list) {
            if (o.getSymbol() == null || o.getSymbol().isBlank()) global = o;
            else if (normalized != null && normalized.equals(o.getSymbol())) bySymbol = o;
        }
        return bySymbol != null ? bySymbol : global;
    }

    /**
     * 把原始价应用偏移
     * - 1 百分比：price × (1 + value/100)
     * - 2 绝对值：price + value
     */
    public BigDecimal apply(BigDecimal raw, UserQuoteOffset offset) {
        if (raw == null || offset == null) return raw;
        BigDecimal v = offset.getOffsetValue();
        if (v == null || v.signum() == 0) return raw;
        if (offset.getOffsetType() != null && offset.getOffsetType() == 2) {
            BigDecimal r = raw.add(v);
            return r.signum() <= 0 ? raw : r.setScale(8, RoundingMode.HALF_UP);
        }
        BigDecimal factor = BigDecimal.ONE.add(v.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP));
        BigDecimal r = raw.multiply(factor);
        return r.signum() <= 0 ? raw : r.setScale(8, RoundingMode.HALF_UP);
    }

    /** 一步取偏移并应用 */
    public BigDecimal applyForUser(Long userId, String symbol, BigDecimal raw) {
        return apply(raw, find(userId, symbol));
    }
}
