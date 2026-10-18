package com.asterpro.modules.quote.service;

import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.mapper.CoinMapper;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.dto.QuoteMetaVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.entity.Symbol;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublicSymbolListService {

    private static final long LIGHT_CACHE_TTL_MS = 15_000L;
    private static final List<ListRequest> PREWARM_REQUESTS = List.of(
            new ListRequest("spot", "crypto", "all"),
            new ListRequest("spot", "forex", "all"),
            new ListRequest("perp", "crypto", "active"),
            new ListRequest("perp", "forex", "active"),
            new ListRequest("option", "crypto", "active"),
            new ListRequest("option", "forex", "active"),
            new ListRequest("spot", "metal", "all"),
            new ListRequest("spot", "commodity", "all"),
            new ListRequest("spot", "index", "all"),
            new ListRequest("spot", "stock", "all"),
            new ListRequest("perp", "metal", "active"),
            new ListRequest("perp", "commodity", "active"),
            new ListRequest("perp", "index", "active"),
            new ListRequest("perp", "stock", "active"),
            new ListRequest("option", "metal", "active"),
            new ListRequest("option", "commodity", "active"),
            new ListRequest("option", "index", "active"),
            new ListRequest("option", "stock", "active")
    );

    private final SymbolService symbolService;
    private final QuoteRouterService quoteRouterService;
    private final CoinMapper coinMapper;
    private final SettlementService settlementService;

    private final Map<String, LightCacheEntry> lightCache = new ConcurrentHashMap<>();
    private final Set<String> refreshingKeys = ConcurrentHashMap.newKeySet();

    @PostConstruct
    public void prewarmLightLists() {
        CompletableFuture.runAsync(() -> {
            for (ListRequest request : PREWARM_REQUESTS) {
                try {
                    refreshLightCache(request);
                } catch (Exception e) {
                    log.debug("Light symbol list prewarm failed for {}: {}", request.cacheKey(), e.getMessage());
                }
            }
        });
    }

    public List<Map<String, Object>> list(String tradeType, String category, String scope, boolean light) {
        if (!light) {
            return buildList(tradeType, category, scope, false);
        }
        ListRequest request = new ListRequest(tradeType, category, scope);
        return getLightList(request);
    }

    @Scheduled(initialDelay = 5000L, fixedDelay = 10000L)
    public void warmLightLists() {
        for (ListRequest request : PREWARM_REQUESTS) {
            refreshLightCacheAsync(request);
        }
    }

    private List<Map<String, Object>> getLightList(ListRequest request) {
        String key = request.cacheKey();
        long now = System.currentTimeMillis();
        LightCacheEntry cached = lightCache.get(key);
        if (cached != null) {
            if (now - cached.fetchedAt() > LIGHT_CACHE_TTL_MS) {
                refreshLightCacheAsync(request);
            }
            return cached.rows();
        }
        return refreshLightCache(request);
    }

    private void refreshLightCacheAsync(ListRequest request) {
        String key = request.cacheKey();
        if (!refreshingKeys.add(key)) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                refreshLightCache(request);
            } catch (Exception e) {
                log.debug("Async light symbol list refresh failed for {}: {}", key, e.getMessage());
            } finally {
                refreshingKeys.remove(key);
            }
        });
    }

    private List<Map<String, Object>> refreshLightCache(ListRequest request) {
        String key = request.cacheKey();
        boolean added = refreshingKeys.add(key);
        try {
            List<Map<String, Object>> rows = buildList(request.tradeType(), request.category(), request.scope(), true);
            lightCache.put(key, new LightCacheEntry(rows, System.currentTimeMillis()));
            return rows;
        } finally {
            if (added) {
                refreshingKeys.remove(key);
            }
        }
    }

    private List<Map<String, Object>> buildList(String tradeType, String category, String scope, boolean light) {
        boolean displayAll = "all".equalsIgnoreCase(scope);
        List<Symbol> symbols = displayAll
                ? symbolService.listDisplayByType(tradeType, category)
                : symbolService.listByType(tradeType, category);
        Map<String, Coin> coinMap = loadCoinMap(symbols);
        Map<String, QuoteTick> ticks = quoteRouterService.getPublicQuoteTicksBySymbols(symbols);
        Map<String, BigDecimal> usdPriceCache = light ? Map.of() : new HashMap<>();
        List<Map<String, Object>> result = new ArrayList<>(symbols.size());
        for (Symbol symbol : symbols) {
            String quoteCode = quoteRouterService.resolveClientCode(symbol);
            QuoteTick tick = quoteCode == null ? null : ticks.get(quoteCode);
            BigDecimal latestPrice = tick == null ? null : tick.getPrice();

            Map<String, Object> row = new HashMap<>();
            row.put("symbol", symbol.getSymbol());
            row.put("baseCoin", symbol.getBaseCoin());
            row.put("quoteCoin", symbol.getQuoteCoin());
            row.put("baseLogo", resolveCoinLogo(coinMap, symbol.getBaseCoin()));
            row.put("quoteLogo", resolveCoinLogo(coinMap, symbol.getQuoteCoin()));
            row.put("category", symbol.getCategory());
            row.put("tradeType", symbol.getTradeType());
            row.put("alltickCode", quoteCode);
            row.put("primarySource", resolvePrimarySource(symbol));
            row.put("depthMode", resolveDepthMode(symbol));
            row.put("tradeMode", resolveTradeMode(symbol));
            row.put("pricePrecision", symbol.getPricePrecision());
            row.put("amountPrecision", symbol.getAmountPrecision());
            row.put("changePrecision", normalizeChangePrecision(symbol.getChangePrecision()));
            row.put("isHot", symbol.getIsHot());
            row.put("maxLeverage", symbol.getMaxLeverage());
            row.put("subscribeEnabled", symbol.getSubscribeEnabled());
            if (!light) {
                QuoteMetaVO settlement = new QuoteMetaVO(
                        settlementService.settlementCoin(symbol),
                        settlementService.latestSettlementPrice(symbol, latestPrice, usdPriceCache)
                );
                row.put("settlementCoin", settlement.getSettlementCoin());
                row.put("settlementPrice", settlement.getSettlementPrice() == null ? null : settlement.getSettlementPrice().toPlainString());
            }
            row.put("price", tick != null && tick.getPrice() != null ? tick.getPrice().toPlainString() : null);
            row.put("change", tick != null && tick.getChange() != null ? tick.getChange().toPlainString() : null);
            row.put("volume", tick != null && tick.getVolume() != null ? tick.getVolume().toPlainString() : null);
            result.add(row);
        }
        return result;
    }

    private int normalizeChangePrecision(Integer precision) {
        if (precision == null) return 2;
        return Math.max(0, Math.min(6, precision));
    }

    private Map<String, Coin> loadCoinMap(List<Symbol> symbols) {
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        for (Symbol symbol : symbols) {
            if (symbol == null) continue;
            addCoinCode(codes, symbol.getBaseCoin());
            addCoinCode(codes, symbol.getQuoteCoin());
        }
        if (codes.isEmpty()) return Map.of();

        LambdaQueryWrapper<Coin> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(Coin::getCode, codes);
        List<Coin> coins = coinMapper.selectList(wrapper);
        Map<String, Coin> result = new HashMap<>(coins.size());
        for (Coin coin : coins) {
            if (coin == null) continue;
            String code = normalizeCoinCode(coin.getCode());
            if (code != null) {
                result.put(code, coin);
            }
        }
        return result;
    }

    private void addCoinCode(LinkedHashSet<String> codes, String code) {
        String normalized = normalizeCoinCode(code);
        if (normalized != null) {
            codes.add(normalized);
        }
    }

    private String resolveCoinLogo(Map<String, Coin> coinMap, String code) {
        Coin coin = coinMap.get(normalizeCoinCode(code));
        return coin == null ? null : coin.getLogo();
    }

    private String resolvePrimarySource(Symbol symbol) {
        if (symbol == null) return null;
        if (notBlank(symbol.getPrimarySource())) return symbol.getPrimarySource().trim().toLowerCase();
        if (isCrypto(symbol)) return "binance";
        if (isForex(symbol)) return "wallstreetcn";
        if (isHtxSwapCategory(symbol)) return "htx_swap";
        return "alltick";
    }

    private String resolveDepthMode(Symbol symbol) {
        if (symbol == null) return null;
        if (isForex(symbol)) return "native";
        if (notBlank(symbol.getDepthMode())) return symbol.getDepthMode().trim().toLowerCase();
        if (isCrypto(symbol)) return "native";
        return isHtxSwapCategory(symbol) ? "native" : "limited";
    }

    private String resolveTradeMode(Symbol symbol) {
        if (symbol == null) return null;
        if (isForex(symbol)) return "native";
        if (notBlank(symbol.getTradeMode())) return symbol.getTradeMode().trim().toLowerCase();
        if (isCrypto(symbol)) return "native";
        return isHtxSwapCategory(symbol) ? "native" : "limited";
    }

    private boolean isCrypto(Symbol symbol) {
        return symbol != null && "crypto".equalsIgnoreCase(symbol.getCategory());
    }

    private boolean isForex(Symbol symbol) {
        return symbol != null && "forex".equalsIgnoreCase(symbol.getCategory());
    }

    private boolean isHtxSwapCategory(Symbol symbol) {
        if (symbol == null) return false;
        String category = symbol.getCategory();
        return "metal".equalsIgnoreCase(category)
                || "commodity".equalsIgnoreCase(category)
                || "index".equalsIgnoreCase(category)
                || "stock".equalsIgnoreCase(category);
    }

    private boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String normalizeCoinCode(String code) {
        if (!notBlank(code)) return null;
        return code.trim().toUpperCase();
    }

    private record LightCacheEntry(List<Map<String, Object>> rows, long fetchedAt) {
    }

    private record ListRequest(String tradeType, String category, String scope) {
        private String cacheKey() {
            return tradeType + "|" + category + "|" + scope;
        }
    }
}
