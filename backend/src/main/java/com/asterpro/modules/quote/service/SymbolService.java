package com.asterpro.modules.quote.service;

import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.mapper.SymbolMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SymbolService {

    private final SymbolMapper mapper;

    public static String normalizeSymbol(String symbol) {
        if (symbol == null) return null;
        return symbol.trim().replace('_', '-').toUpperCase();
    }

    public List<Symbol> listByType(String tradeType, String category) {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.eq(Symbol::getEnabled, 1);
        w.and(q -> q.eq(Symbol::getSubscribeEnabled, 1)
                .or(wrapper -> wrapper.eq(Symbol::getCategory, "forex")));
        if (tradeType != null && !tradeType.isBlank()) {
            w.eq(Symbol::getTradeType, tradeType);
        }
        if (category != null && !category.isBlank()) {
            w.eq(Symbol::getCategory, category);
        }
        w.orderByDesc(Symbol::getIsHot).orderByAsc(Symbol::getSort);
        return mapper.selectList(w);
    }

    public List<Symbol> listDisplayByType(String tradeType, String category) {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.eq(Symbol::getEnabled, 1);
        if (tradeType != null && !tradeType.isBlank()) {
            w.eq(Symbol::getTradeType, tradeType);
        }
        if (category != null && !category.isBlank()) {
            w.eq(Symbol::getCategory, category);
        }
        w.orderByDesc(Symbol::getIsHot).orderByAsc(Symbol::getSort);
        return mapper.selectList(w);
    }

    public List<Symbol> listActiveSubscriptionSymbols() {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.eq(Symbol::getEnabled, 1);
        w.and(q -> q.eq(Symbol::getSubscribeEnabled, 1)
                .or(wrapper -> wrapper.eq(Symbol::getCategory, "forex")));
        w.orderByAsc(Symbol::getTradeType).orderByAsc(Symbol::getSort).orderByAsc(Symbol::getId);
        return mapper.selectList(w);
    }

    public List<String> listSourceSymbolsForSource(String source) {
        if (source == null || source.isBlank()) return List.of();
        String expectedSource = source.trim().toLowerCase();
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        for (Symbol symbol : listActiveSubscriptionSymbols()) {
            if (tryAddSourceCode(codes, expectedSource, symbol.getWsSource(), symbol.getWsSymbol())) {
                continue;
            }
            if (tryAddSourceCode(codes, expectedSource, symbol.getPrimarySource(), symbol.getPrimarySymbol())) {
                continue;
            }
            tryAddSourceCode(codes, expectedSource, symbol.getKlineSource(), symbol.getKlineSymbol());
        }
        return new ArrayList<>(codes);
    }

    public Symbol findBySymbol(String tradeType, String symbol) {
        String normalized = normalizeSymbol(symbol);
        if (normalized == null || normalized.isBlank()) return null;
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        if (tradeType != null && !tradeType.isBlank()) {
            w.eq(Symbol::getTradeType, tradeType);
        } else {
            w.orderByAsc(Symbol::getTradeType);
        }
        w.eq(Symbol::getSymbol, normalized).last("LIMIT 1");
        List<Symbol> list = mapper.selectList(w);
        return list.isEmpty() ? null : list.get(0);
    }

    public Symbol findActiveBySymbol(String tradeType, String symbol) {
        String normalized = normalizeSymbol(symbol);
        if (normalized == null || normalized.isBlank()) return null;
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.eq(Symbol::getEnabled, 1);
        w.and(q -> q.eq(Symbol::getSubscribeEnabled, 1)
                .or(wrapper -> wrapper.eq(Symbol::getCategory, "forex")));
        if (tradeType != null && !tradeType.isBlank()) {
            w.eq(Symbol::getTradeType, tradeType);
        }
        w.eq(Symbol::getSymbol, normalized).last("LIMIT 1");
        List<Symbol> list = mapper.selectList(w);
        return list.isEmpty() ? null : list.get(0);
    }

    public Symbol findActiveByRequestSymbol(String symbolOrCode) {
        if (symbolOrCode == null || symbolOrCode.isBlank()) return null;
        Symbol symbol = findBySymbol(null, symbolOrCode);
        if (isActiveSubscribed(symbol)) {
            return symbol;
        }
        symbol = findByRoutingCode(symbolOrCode);
        return isActiveSubscribed(symbol) ? symbol : null;
    }

    public Symbol findByRoutingCode(String code) {
        if (code == null || code.isBlank()) return null;
        String normalizedCode = code.trim();
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.and(q -> q.eq(Symbol::getAlltickCode, normalizedCode)
                .or().eq(Symbol::getPrimarySymbol, normalizedCode)
                .or().eq(Symbol::getBackupSymbol, normalizedCode)
                .or().eq(Symbol::getAlltickCode, normalizedCode)
                .or().eq(Symbol::getKlineSymbol, normalizedCode)
                .or().eq(Symbol::getDepthSymbol, normalizedCode)
                .or().eq(Symbol::getTradeSymbol, normalizedCode)
                .or().eq(Symbol::getWsSymbol, normalizedCode));
        w.orderByDesc(Symbol::getEnabled).orderByAsc(Symbol::getTradeType).last("LIMIT 1");
        List<Symbol> list = mapper.selectList(w);
        return list.isEmpty() ? null : list.get(0);
    }

    private boolean tryAddSourceCode(LinkedHashSet<String> codes, String expectedSource, String actualSource, String code) {
        if (actualSource == null || actualSource.isBlank() || code == null || code.isBlank()) return false;
        if (!expectedSource.equalsIgnoreCase(actualSource.trim())) return false;
        codes.add(code.trim());
        return true;
    }

    private boolean isActiveSubscribed(Symbol symbol) {
        return symbol != null
                && Integer.valueOf(1).equals(symbol.getEnabled())
                && (Integer.valueOf(1).equals(symbol.getSubscribeEnabled())
                || "forex".equalsIgnoreCase(symbol.getCategory()));
    }
}
