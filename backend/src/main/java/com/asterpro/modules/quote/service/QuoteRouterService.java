package com.asterpro.modules.quote.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.modules.quote.adapter.QuoteAdapter;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;
import com.asterpro.modules.quote.entity.Symbol;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@Slf4j
@Service
public class QuoteRouterService {

    private static final Set<String> HTX_SWAP_ROUTE_CODES = Set.of(
            "XAGUSDT", "XAUTUSDT", "XAUUSDT", "XPDUSDT", "XPTUSDT", "COPPERUSDT",
            "USOILUSDT", "BRENTOILUSDT", "NATGASUSDT",
            "DRAMUSDT", "SPX500USDT", "NASDAQ100USDT", "QQQUSDT", "EWJUSDT", "EWYUSDT", "SPYUSDT",
            "SNDKUSDT", "MUUSDT", "AMDUSDT", "TSLAXUSDT", "NVDAUSDT", "GMEUSDT",
            "ANTHROPICUSDT", "MSTRXUSDT", "OPENAIUSDT", "CRCLXUSDT", "INTCXUSDT", "LITEUSDT",
            "METAUSDT", "USARUSDT", "BABAUSDT", "PLTRXUSDT", "MSFTUSDT", "TSMUSDT",
            "AAPLUSDT", "GOOGLUSDT", "AMZNXUSDT", "COINXUSDT", "HOODXUSDT"
    );

    private final SymbolService symbolService;
    private final Map<String, QuoteAdapter> adapterMap;

    public QuoteRouterService(SymbolService symbolService, List<QuoteAdapter> adapters) {
        this.symbolService = symbolService;
        Map<String, QuoteAdapter> map = new LinkedHashMap<>();
        for (QuoteAdapter adapter : adapters) {
            map.put(adapter.source(), adapter);
        }
        this.adapterMap = Collections.unmodifiableMap(map);
    }

    public BigDecimal getLatestPrice(String requestSymbol) {
        QuoteTick tick = getQuoteTick(requestSymbol);
        return tick == null ? null : tick.getPrice();
    }

    public BigDecimal getPublicLatestPrice(String requestSymbol) {
        QuoteTick tick = getPublicQuoteTick(requestSymbol);
        return tick == null ? null : tick.getPrice();
    }

    public BigDecimal getLatestPrice(Symbol symbol) {
        QuoteTick tick = getQuoteTick(symbol);
        return tick == null ? null : tick.getPrice();
    }

    public QuoteTick getQuoteTick(String requestSymbol) {
        return routeSingleTick(resolveRoute(requestSymbol, RouteKind.PRICE));
    }

    public QuoteTick getQuoteTick(Symbol symbol) {
        if (symbol == null) return null;
        return routeSingleTick(resolveRoute(symbol, resolveClientCode(symbol), RouteKind.PRICE));
    }

    public QuoteTick getPublicQuoteTick(String requestSymbol) {
        return routeSingleTick(resolveRoute(requestSymbol, RouteKind.PUBLIC_TICK));
    }

    public QuoteTick getPublicQuoteTick(Symbol symbol) {
        if (symbol == null) return null;
        return routeSingleTick(resolveRoute(symbol, resolveClientCode(symbol), RouteKind.PUBLIC_TICK));
    }

    public Map<String, QuoteTick> getQuoteTicks(Collection<String> requestSymbols) {
        List<QuoteRoute> routes = new ArrayList<>();
        if (requestSymbols != null) {
            for (String requestSymbol : requestSymbols) {
                if (StrUtil.isBlank(requestSymbol)) continue;
                routes.add(resolveRoute(requestSymbol, RouteKind.PRICE));
            }
        }
        return fetchTicks(routes);
    }

    public Map<String, QuoteTick> getPublicQuoteTicks(Collection<String> requestSymbols) {
        List<QuoteRoute> routes = new ArrayList<>();
        if (requestSymbols != null) {
            for (String requestSymbol : requestSymbols) {
                if (StrUtil.isBlank(requestSymbol)) continue;
                routes.add(resolveRoute(requestSymbol, RouteKind.PUBLIC_TICK));
            }
        }
        return fetchTicks(routes);
    }

    public Map<String, QuoteTick> getQuoteTicksBySymbols(List<Symbol> symbols) {
        List<QuoteRoute> routes = new ArrayList<>();
        if (symbols != null) {
            for (Symbol symbol : symbols) {
                if (symbol == null) continue;
                routes.add(resolveRoute(symbol, resolveClientCode(symbol), RouteKind.PRICE));
            }
        }
        return fetchTicks(routes);
    }

    public Map<String, QuoteTick> getPublicQuoteTicksBySymbols(List<Symbol> symbols) {
        List<QuoteRoute> routes = new ArrayList<>();
        if (symbols != null) {
            for (Symbol symbol : symbols) {
                if (symbol == null) continue;
                routes.add(resolveRoute(symbol, resolveClientCode(symbol), RouteKind.PUBLIC_TICK));
            }
        }
        return fetchTicks(routes);
    }

    public QuoteTick getWsTick(String requestSymbol) {
        return routeSingleTick(resolveRoute(requestSymbol, RouteKind.WS));
    }

    public Map<String, QuoteTick> getWsTicks(Collection<String> requestSymbols) {
        List<QuoteRoute> routes = new ArrayList<>();
        if (requestSymbols != null) {
            for (String requestSymbol : requestSymbols) {
                if (StrUtil.isBlank(requestSymbol)) continue;
                routes.add(resolveRoute(requestSymbol, RouteKind.WS));
            }
        }
        return fetchTicks(routes);
    }

    public List<KlineBar> getKline(String requestSymbol, String period, int limit) {
        QuoteRoute route = resolveRoute(requestSymbol, RouteKind.KLINE);
        return executeListFallback(route, adapter -> adapter.getKline(route.primarySymbol(), period, limit), adapter -> adapter.getKline(route.backupSymbol(), period, limit));
    }

    public QuoteDepthVO getDepth(String requestSymbol) {
        QuoteRoute route = resolveRoute(requestSymbol, RouteKind.DEPTH);
        QuoteDepthVO vo = executeObjectFallback(route, adapter -> adapter.getDepth(route.primarySymbol()), adapter -> adapter.getDepth(route.backupSymbol()), this::hasDepth);
        if (vo == null) {
            vo = new QuoteDepthVO();
        }
        vo.setSymbol(route.externalSymbol());
        if (vo.getTs() <= 0) vo.setTs(System.currentTimeMillis());
        return vo;
    }

    public QuoteStats24hVO getStats24h(String requestSymbol) {
        QuoteRoute route = resolveRoute(requestSymbol, RouteKind.STATS);
        QuoteStats24hVO vo = executeObjectFallback(route, adapter -> adapter.getStats24h(route.primarySymbol()), adapter -> adapter.getStats24h(route.backupSymbol()), this::hasStats);
        if (vo == null) {
            vo = new QuoteStats24hVO();
        }
        vo.setSymbol(route.externalSymbol());
        if (vo.getTs() <= 0) vo.setTs(System.currentTimeMillis());
        return vo;
    }

    public QuoteStats24hVO getPublicStats24h(String requestSymbol) {
        QuoteRoute route = resolveRoute(requestSymbol, RouteKind.PUBLIC_STATS);
        QuoteStats24hVO vo = executeObjectFallback(route, adapter -> adapter.getStats24h(route.primarySymbol()), adapter -> adapter.getStats24h(route.backupSymbol()), this::hasStats);
        if (vo == null) {
            vo = new QuoteStats24hVO();
        }
        vo.setSymbol(route.externalSymbol());
        if (vo.getTs() <= 0) vo.setTs(System.currentTimeMillis());
        return vo;
    }

    public List<QuoteTradeVO> getLatestTrades(String requestSymbol, int limit) {
        QuoteRoute route = resolveRoute(requestSymbol, RouteKind.TRADE);
        List<QuoteTradeVO> trades = executeListFallback(route, adapter -> adapter.getLatestTrades(route.primarySymbol(), limit), adapter -> adapter.getLatestTrades(route.backupSymbol(), limit));
        List<QuoteTradeVO> normalized = new ArrayList<>(trades.size());
        for (QuoteTradeVO trade : trades) {
            if (trade == null) continue;
            QuoteTradeVO row = new QuoteTradeVO();
            row.setSymbol(route.externalSymbol());
            row.setPrice(trade.getPrice());
            row.setVolume(trade.getVolume());
            row.setSide(trade.getSide());
            row.setTs(trade.getTs());
            normalized.add(row);
        }
        return normalized;
    }

    public String resolveClientCode(Symbol symbol) {
        if (symbol == null) return null;
        if (StrUtil.isNotBlank(symbol.getWsSymbol())) return normalizeClientCode(symbol.getWsSymbol());
        if (StrUtil.isNotBlank(symbol.getPrimarySymbol())) return normalizeClientCode(symbol.getPrimarySymbol());
        if (StrUtil.isNotBlank(symbol.getAlltickCode())) return normalizeClientCode(symbol.getAlltickCode());
        if (StrUtil.isNotBlank(symbol.getSymbol())) return normalizeClientCode(symbol.getSymbol().replace("-", ""));
        return null;
    }

    public Map<String, String> explainRoute(Symbol symbol, String requestSymbol) {
        Map<String, String> route = new LinkedHashMap<>();
        if (symbol == null && StrUtil.isBlank(requestSymbol)) {
            return route;
        }
        putRoute(route, "price", resolveRoute(symbol, requestSymbol, RouteKind.PRICE));
        putRoute(route, "publicTick", resolveRoute(symbol, requestSymbol, RouteKind.PUBLIC_TICK));
        putRoute(route, "kline", resolveRoute(symbol, requestSymbol, RouteKind.KLINE));
        putRoute(route, "depth", resolveRoute(symbol, requestSymbol, RouteKind.DEPTH));
        putRoute(route, "trade", resolveRoute(symbol, requestSymbol, RouteKind.TRADE));
        putRoute(route, "ws", resolveRoute(symbol, requestSymbol, RouteKind.WS));
        putRoute(route, "publicStats", resolveRoute(symbol, requestSymbol, RouteKind.PUBLIC_STATS));
        return route;
    }

    private Map<String, QuoteTick> fetchTicks(List<QuoteRoute> routes) {
        Map<String, QuoteTick> result = new LinkedHashMap<>();
        if (routes.isEmpty()) return result;

        Map<String, List<QuoteRoute>> primaryGroups = groupRoutes(routes, QuoteRoute::primarySource);
        Map<String, Map<String, QuoteTick>> primaryTicks = fetchGroupTicks(primaryGroups, QuoteRoute::primarySymbol);
        List<QuoteRoute> fallbackRoutes = new ArrayList<>();

        for (QuoteRoute route : routes) {
            QuoteTick tick = adaptTick(primaryTicks.get(route.primarySource()), route.primarySymbol(), route.externalSymbol());
            if (hasTick(tick)) {
                result.put(route.externalSymbol(), tick);
            } else if (route.hasBackup()) {
                fallbackRoutes.add(route);
            }
        }

        Map<String, List<QuoteRoute>> backupGroups = groupRoutes(fallbackRoutes, QuoteRoute::backupSource);
        Map<String, Map<String, QuoteTick>> backupTicks = fetchGroupTicks(backupGroups, QuoteRoute::backupSymbol);
        for (QuoteRoute route : fallbackRoutes) {
            if (result.containsKey(route.externalSymbol())) continue;
            QuoteTick tick = adaptTick(backupTicks.get(route.backupSource()), route.backupSymbol(), route.externalSymbol());
            if (hasTick(tick)) {
                result.put(route.externalSymbol(), tick);
            }
        }
        return result;
    }

    private QuoteTick routeSingleTick(QuoteRoute route) {
        QuoteTick tick = executeObjectFallback(route, adapter -> adapter.getQuoteTick(route.primarySymbol()), adapter -> adapter.getQuoteTick(route.backupSymbol()), this::hasTick);
        if (tick == null) return null;
        return copyTick(tick, route.externalSymbol());
    }

    private <T> T executeObjectFallback(
            QuoteRoute route,
            Function<QuoteAdapter, T> primaryCall,
            Function<QuoteAdapter, T> backupCall,
            Function<T, Boolean> checker) {
        T primary = execute(route.primarySource(), primaryCall);
        if (Boolean.TRUE.equals(checker.apply(primary))) {
            return primary;
        }
        if (!route.hasBackup()) {
            return primary;
        }
        T backup = execute(route.backupSource(), backupCall);
        return Boolean.TRUE.equals(checker.apply(backup)) ? backup : primary;
    }

    private <T> List<T> executeListFallback(
            QuoteRoute route,
            Function<QuoteAdapter, List<T>> primaryCall,
            Function<QuoteAdapter, List<T>> backupCall) {
        List<T> primary = execute(route.primarySource(), primaryCall);
        if (hasList(primary)) {
            return primary;
        }
        if (!route.hasBackup()) {
            return primary == null ? List.of() : primary;
        }
        List<T> backup = execute(route.backupSource(), backupCall);
        return hasList(backup) ? backup : (primary == null ? List.of() : primary);
    }

    private <T> T execute(String source, Function<QuoteAdapter, T> call) {
        QuoteAdapter adapter = adapterMap.get(source);
        if (adapter == null || !adapter.isEnabled()) {
            return null;
        }
        try {
            return call.apply(adapter);
        } catch (Exception e) {
            log.debug("Quote adapter {} request failed: {}", source, e.getMessage());
            return null;
        }
    }

    private Map<String, List<QuoteRoute>> groupRoutes(List<QuoteRoute> routes, Function<QuoteRoute, String> sourceGetter) {
        Map<String, List<QuoteRoute>> groups = new LinkedHashMap<>();
        for (QuoteRoute route : routes) {
            String source = sourceGetter.apply(route);
            if (StrUtil.isBlank(source)) continue;
            groups.computeIfAbsent(source, key -> new ArrayList<>()).add(route);
        }
        return groups;
    }

    private Map<String, Map<String, QuoteTick>> fetchGroupTicks(
            Map<String, List<QuoteRoute>> groups,
            Function<QuoteRoute, String> symbolGetter) {
        Map<String, Map<String, QuoteTick>> groupedTicks = new LinkedHashMap<>();
        for (Map.Entry<String, List<QuoteRoute>> entry : groups.entrySet()) {
            QuoteAdapter adapter = adapterMap.get(entry.getKey());
            if (adapter == null || !adapter.isEnabled()) continue;
            LinkedHashSet<String> sourceSymbols = new LinkedHashSet<>();
            for (QuoteRoute route : entry.getValue()) {
                String sourceSymbol = symbolGetter.apply(route);
                if (StrUtil.isNotBlank(sourceSymbol)) {
                    sourceSymbols.add(sourceSymbol);
                }
            }
            if (sourceSymbols.isEmpty()) continue;
            try {
                groupedTicks.put(entry.getKey(), adapter.getQuoteTicks(sourceSymbols));
            } catch (Exception e) {
                log.debug("Quote adapter {} batch request failed: {}", entry.getKey(), e.getMessage());
            }
        }
        return groupedTicks;
    }

    private QuoteTick adaptTick(Map<String, QuoteTick> ticks, String routeSymbol, String externalSymbol) {
        if (ticks == null || StrUtil.isBlank(routeSymbol)) return null;
        QuoteTick tick = ticks.get(routeSymbol);
        if (tick == null) {
            tick = ticks.get(normalizeClientCode(routeSymbol));
        }
        return copyTick(tick, externalSymbol);
    }

    private QuoteTick copyTick(QuoteTick tick, String symbol) {
        if (tick == null) return null;
        return new QuoteTick(
                symbol,
                tick.getPrice(),
                tick.getChange() == null ? BigDecimal.ZERO : tick.getChange(),
                tick.getVolume() == null ? BigDecimal.ZERO : tick.getVolume(),
                tick.getTs()
        );
    }

    private void putRoute(Map<String, String> route, String prefix, QuoteRoute resolved) {
        if (route == null || resolved == null) return;
        route.put(prefix + "Source", resolved.primarySource());
        route.put(prefix + "Symbol", resolved.primarySymbol());
        route.put(prefix + "BackupSource", resolved.backupSource());
        route.put(prefix + "BackupSymbol", resolved.backupSymbol());
    }

    private QuoteRoute resolveRoute(String requestSymbol, RouteKind routeKind) {
        Symbol symbol = resolveSymbol(requestSymbol);
        return resolveRoute(symbol, requestSymbol, routeKind);
    }

    private QuoteRoute resolveRoute(Symbol symbol, String requestSymbol, RouteKind routeKind) {
        String externalSymbol = StrUtil.isNotBlank(requestSymbol)
                ? normalizeClientCode(requestSymbol)
                : resolveClientCode(symbol);
        String fallbackCode = symbol != null ? defaultSourceSymbol(symbol) : normalizeClientCode(requestSymbol);
        String primarySource = resolveSource(symbol, routeKind.sourceGetter(), defaultPrimarySource(symbol, fallbackCode));
        String primarySymbol = resolveSymbolCode(symbol, routeKind.symbolGetter(), fallbackCode);
        String backupSource = resolveBackupSource(symbol, primarySource);
        String backupSymbol = resolveSymbolCode(symbol, Symbol::getBackupSymbol, primarySymbol);
        return new QuoteRoute(externalSymbol, primarySource, primarySymbol, backupSource, backupSymbol);
    }

    private Symbol resolveSymbol(String requestSymbol) {
        if (StrUtil.isBlank(requestSymbol)) return null;
        Symbol symbol = symbolService.findBySymbol(null, requestSymbol);
        if (symbol != null) return symbol;
        return symbolService.findByRoutingCode(requestSymbol.trim());
    }

    private String resolveSource(Symbol symbol, Function<Symbol, String> getter, String fallback) {
        if (symbol == null || getter == null) return fallback;
        String value = getter.apply(symbol);
        return StrUtil.isBlank(value) ? fallback : value.trim().toLowerCase();
    }

    private String resolveBackupSource(Symbol symbol, String primarySource) {
        if (symbol == null) {
            return "binance".equals(primarySource) ? "htx" : null;
        }
        String backup = resolveSource(symbol, Symbol::getBackupSource, null);
        if (StrUtil.isNotBlank(backup)) return backup;
        return "crypto".equalsIgnoreCase(symbol.getCategory()) && "binance".equals(primarySource) ? "htx" : null;
    }

    private String resolveSymbolCode(Symbol symbol, Function<Symbol, String> getter, String fallback) {
        if (symbol == null || getter == null) return normalizeRouteCode(fallback);
        String value = getter.apply(symbol);
        if (StrUtil.isNotBlank(value)) return normalizeRouteCode(value);
        return normalizeRouteCode(fallback);
    }

    private String defaultPrimarySource(Symbol symbol, String fallbackCode) {
        if (symbol != null) {
            return defaultPrimarySourceByCategory(symbol.getCategory());
        }
        if (looksLikeHtxSwapCode(fallbackCode)) {
            return "htx_swap";
        }
        if (looksLikeForexCode(fallbackCode)) {
            return "wallstreetcn";
        }
        return looksLikeCryptoCode(fallbackCode) ? "binance" : "alltick";
    }

    private String defaultSourceSymbol(Symbol symbol) {
        if (symbol == null) return null;
        if (StrUtil.isNotBlank(symbol.getPrimarySymbol())) return symbol.getPrimarySymbol();
        if (StrUtil.isNotBlank(symbol.getAlltickCode())) return symbol.getAlltickCode();
        if (StrUtil.isNotBlank(symbol.getSymbol())) return symbol.getSymbol().replace("-", "");
        return null;
    }

    private boolean looksLikeCryptoCode(String code) {
        if (StrUtil.isBlank(code)) return false;
        String normalized = normalizeClientCode(code);
        return normalized.endsWith("USDT")
                || normalized.endsWith("USDC")
                || normalized.endsWith("BTC")
                || normalized.endsWith("ETH");
    }

    private boolean looksLikeHtxSwapCode(String code) {
        if (StrUtil.isBlank(code)) return false;
        return HTX_SWAP_ROUTE_CODES.contains(normalizeClientCode(code));
    }

    private boolean looksLikeForexCode(String code) {
        if (StrUtil.isBlank(code)) return false;
        String normalized = normalizeClientCode(code);
        return normalized.endsWith("JPY")
                || normalized.endsWith("CNH")
                || normalized.endsWith("CHF")
                || normalized.endsWith("CAD")
                || normalized.endsWith("NZD")
                || normalized.endsWith("HKD")
                || normalized.endsWith("SEK")
                || normalized.endsWith("NOK")
                || normalized.endsWith("TRY")
                || normalized.endsWith("MXN")
                || normalized.endsWith("DKK")
                || normalized.startsWith("EUR")
                || normalized.startsWith("GBP")
                || normalized.startsWith("AUD")
                || normalized.startsWith("USD");
    }

    private String defaultPrimarySourceByCategory(String category) {
        if ("crypto".equalsIgnoreCase(category)) {
            return "binance";
        }
        if ("forex".equalsIgnoreCase(category)) {
            return "wallstreetcn";
        }
        if ("metal".equalsIgnoreCase(category)
                || "commodity".equalsIgnoreCase(category)
                || "index".equalsIgnoreCase(category)
                || "stock".equalsIgnoreCase(category)) {
            return "htx_swap";
        }
        return "alltick";
    }

    private boolean hasTick(QuoteTick tick) {
        return tick != null && tick.getPrice() != null;
    }

    private boolean hasDepth(QuoteDepthVO depth) {
        return depth != null && ((!depth.getBids().isEmpty()) || (!depth.getAsks().isEmpty()));
    }

    private boolean hasStats(QuoteStats24hVO stats) {
        return stats != null && (stats.getClose() != null || stats.getHigh() != null || stats.getLow() != null);
    }

    private boolean hasList(List<?> rows) {
        return rows != null && !rows.isEmpty();
    }

    private String normalizeClientCode(String code) {
        return code == null ? null : code.trim().replace("-", "").toUpperCase();
    }

    private String normalizeRouteCode(String code) {
        return code == null ? null : code.trim();
    }

    private record QuoteRoute(
            String externalSymbol,
            String primarySource,
            String primarySymbol,
            String backupSource,
            String backupSymbol
    ) {
        private boolean hasBackup() {
            return StrUtil.isNotBlank(backupSource) && StrUtil.isNotBlank(backupSymbol);
        }
    }

    private enum RouteKind {
        PRICE(Symbol::getPrimarySource, Symbol::getPrimarySymbol),
        PUBLIC_TICK(Symbol::getWsSource, Symbol::getWsSymbol),
        KLINE(Symbol::getKlineSource, Symbol::getKlineSymbol),
        DEPTH(Symbol::getDepthSource, Symbol::getDepthSymbol),
        TRADE(Symbol::getTradeSource, Symbol::getTradeSymbol),
        WS(Symbol::getWsSource, Symbol::getWsSymbol),
        STATS(Symbol::getPrimarySource, Symbol::getPrimarySymbol),
        PUBLIC_STATS(Symbol::getKlineSource, Symbol::getKlineSymbol);

        private final Function<Symbol, String> sourceGetter;
        private final Function<Symbol, String> symbolGetter;

        RouteKind(Function<Symbol, String> sourceGetter, Function<Symbol, String> symbolGetter) {
            this.sourceGetter = sourceGetter;
            this.symbolGetter = symbolGetter;
        }

        public Function<Symbol, String> sourceGetter() {
            return sourceGetter;
        }

        public Function<Symbol, String> symbolGetter() {
            return symbolGetter;
        }
    }
}
