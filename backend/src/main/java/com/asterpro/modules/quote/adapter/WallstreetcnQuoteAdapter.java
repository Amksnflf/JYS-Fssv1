package com.asterpro.modules.quote.adapter;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class WallstreetcnQuoteAdapter implements QuoteAdapter {

    private static final String SOURCE = "wallstreetcn";
    private static final int PERIOD_1M = 60;
    private static final int PERIOD_5M = 300;
    private static final int PERIOD_15M = 900;
    private static final int PERIOD_30M = 1800;
    private static final int PERIOD_1H = 3600;
    private static final int PERIOD_2H = 7200;
    private static final int PERIOD_4H = 14400;
    private static final int PERIOD_1D = 86400;
    private static final int PERIOD_1W = 604800;
    private static final int PERIOD_1MTH = 2592000;
    private static final String KLINE_FIELDS = "open_px,close_px,high_px,low_px,average_px,px_change,px_change_rate,turnover_volume,turnover_value,tick_at,avg_px,ma2";
    private static final String REAL_FIELDS = "symbol,last_px,px_change,px_change_rate,high_px,low_px,open_px,turnover_volume,turnover_value,update_time";
    private static final Map<String, String> SYMBOL_ALIASES = buildSymbolAliases();

    private final WallstreetcnQuoteProperties properties;

    private OkHttpClient httpClient;

    @PostConstruct
    public void init() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(properties.getTimeoutMs(), TimeUnit.MILLISECONDS)
                .readTimeout(properties.getTimeoutMs(), TimeUnit.MILLISECONDS)
                .build();
    }

    @Override
    public String source() {
        return SOURCE;
    }

    @Override
    public boolean isEnabled() {
        return properties.isEnabled();
    }

    @Override
    public BigDecimal getLatestPrice(String symbol) {
        QuoteTick tick = getQuoteTick(symbol);
        return tick == null ? null : tick.getPrice();
    }

    @Override
    public QuoteTick getQuoteTick(String symbol) {
        QuoteTick tick = fetchRealtimeTicks(List.of(symbol)).get(symbol);
        if (tick != null) {
            return tick;
        }
        WallstreetcnBar latestBar = fetchLatestBar(symbol, PERIOD_1M);
        if (latestBar == null || latestBar.close() == null) {
            return null;
        }
        WallstreetcnBar dailyBar = fetchLatestBar(symbol, PERIOD_1D);
        BigDecimal open = dailyBar != null && dailyBar.open() != null && dailyBar.open().signum() != 0
                ? dailyBar.open()
                : latestBar.open();
        BigDecimal volume = dailyBar != null ? defaultDecimal(dailyBar.turnoverValue()) : BigDecimal.ZERO;
        return new QuoteTick(
                symbol,
                latestBar.close(),
                computeChangePercent(open, latestBar.close()),
                volume,
                latestBar.time()
        );
    }

    @Override
    public Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        return fetchRealtimeTicks(symbols);
    }

    @Override
    public List<KlineBar> getKline(String symbol, String period, int limit) {
        int periodType = normalizePeriod(period);
        List<WallstreetcnBar> bars = fetchBars(symbol, periodType, Math.max(1, Math.min(limit, 500)));
        List<KlineBar> result = new ArrayList<>(bars.size());
        for (WallstreetcnBar bar : bars) {
            if (bar == null || bar.time() <= 0) {
                continue;
            }
            result.add(new KlineBar(
                    bar.time(),
                    defaultDecimal(bar.open()),
                    defaultDecimal(bar.high()),
                    defaultDecimal(bar.low()),
                    defaultDecimal(bar.close()),
                    defaultDecimal(bar.turnoverVolume())
            ));
        }
        result.sort(Comparator.comparingLong(KlineBar::getTime));
        return result;
    }

    @Override
    public QuoteDepthVO getDepth(String symbol) {
        QuoteTick tick = getQuoteTick(symbol);
        QuoteDepthVO vo = new QuoteDepthVO();
        vo.setSymbol(symbol);
        vo.setTs(System.currentTimeMillis());
        if (tick == null || tick.getPrice() == null || tick.getPrice().signum() <= 0) {
            return vo;
        }
        BigDecimal mid = tick.getPrice();
        BigDecimal step = syntheticStep(mid);
        for (int i = 1; i <= 8; i++) {
            QuoteDepthVO.Level bid = new QuoteDepthVO.Level();
            bid.setPrice(mid.subtract(step.multiply(BigDecimal.valueOf(i))).max(BigDecimal.ZERO));
            bid.setVolume(BigDecimal.valueOf(100000L * i));
            vo.getBids().add(bid);

            QuoteDepthVO.Level ask = new QuoteDepthVO.Level();
            ask.setPrice(mid.add(step.multiply(BigDecimal.valueOf(i))));
            ask.setVolume(BigDecimal.valueOf(100000L * i));
            vo.getAsks().add(ask);
        }
        return vo;
    }

    @Override
    public QuoteStats24hVO getStats24h(String symbol) {
        QuoteStats24hVO vo = new QuoteStats24hVO();
        vo.setSymbol(symbol);
        vo.setTs(System.currentTimeMillis());

        QuoteTick realtime = fetchRealtimeTicks(List.of(symbol)).get(symbol);
        WallstreetcnBar latestBar = fetchLatestBar(symbol, PERIOD_1M);
        if ((realtime == null || realtime.getPrice() == null) && (latestBar == null || latestBar.close() == null)) {
            return vo;
        }
        WallstreetcnBar dailyBar = fetchLatestBar(symbol, PERIOD_1D);
        BigDecimal close = realtime != null && realtime.getPrice() != null ? realtime.getPrice() : latestBar.close();
        BigDecimal open = dailyBar != null && dailyBar.open() != null ? dailyBar.open() : latestBar.open();
        vo.setOpen(defaultDecimal(open));
        vo.setHigh(defaultDecimal(dailyBar != null ? dailyBar.high() : latestBar.high()));
        vo.setLow(defaultDecimal(dailyBar != null ? dailyBar.low() : latestBar.low()));
        vo.setClose(defaultDecimal(close));
        vo.setChange(computeChangePercent(open, close));
        vo.setVolume(defaultDecimal(dailyBar != null ? dailyBar.turnoverVolume() : latestBar.turnoverVolume()));
        vo.setAmount(defaultDecimal(dailyBar != null ? dailyBar.turnoverValue() : latestBar.turnoverValue()));
        vo.setTs(realtime != null && realtime.getTs() > 0 ? realtime.getTs() : latestBar.time());
        return vo;
    }

    @Override
    public List<QuoteTradeVO> getLatestTrades(String symbol, int limit) {
        QuoteTick tick = getQuoteTick(symbol);
        if (tick == null || tick.getPrice() == null || tick.getPrice().signum() <= 0) {
            return List.of();
        }
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<QuoteTradeVO> rows = new ArrayList<>(safeLimit);
        BigDecimal step = syntheticStep(tick.getPrice());
        long baseTs = tick.getTs() > 0 ? tick.getTs() : System.currentTimeMillis();
        for (int i = 0; i < safeLimit; i++) {
            QuoteTradeVO trade = new QuoteTradeVO();
            trade.setSymbol(symbol);
            trade.setSide(i % 2 == 0 ? "buy" : "sell");
            BigDecimal offset = step.multiply(BigDecimal.valueOf(i % 5));
            trade.setPrice(i % 2 == 0 ? tick.getPrice().add(offset) : tick.getPrice().subtract(offset).max(BigDecimal.ZERO));
            trade.setVolume(BigDecimal.valueOf(1000L + (long) i * 200));
            trade.setTs(baseTs - i * 1000L);
            rows.add(trade);
        }
        return rows;
    }

    private Map<String, QuoteTick> fetchRealtimeTicks(Collection<String> symbols) {
        if (symbols == null || symbols.isEmpty() || !isEnabled()) {
            return Collections.emptyMap();
        }
        Map<String, String> requestToCanonical = new LinkedHashMap<>();
        List<String> prodCodes = new ArrayList<>();
        for (String symbol : symbols) {
            if (StrUtil.isBlank(symbol)) {
                continue;
            }
            String canonical = resolveCanonicalSymbol(symbol);
            if (StrUtil.isBlank(canonical)) {
                continue;
            }
            requestToCanonical.put(symbol, canonical);
            prodCodes.add(toProdCode(canonical));
        }
        if (prodCodes.isEmpty()) {
            return Collections.emptyMap();
        }
        JSONObject json = getObject("/market/real", Map.of(
                "fields", REAL_FIELDS,
                "prod_code", String.join(",", prodCodes)
        ));
        if (json == null) {
            return Collections.emptyMap();
        }
        JSONObject data = json.getJSONObject("data");
        if (data == null) {
            return Collections.emptyMap();
        }
        JSONArray fields = data.getJSONArray("fields");
        JSONObject snapshot = data.getJSONObject("snapshot");
        if (fields == null || snapshot == null) {
            return Collections.emptyMap();
        }
        Map<String, Integer> indexes = new LinkedHashMap<>();
        for (int i = 0; i < fields.size(); i++) {
            String fieldName = fields.getString(i);
            if (StrUtil.isNotBlank(fieldName)) {
                indexes.put(fieldName, i);
            }
        }
        Map<String, QuoteTick> parsed = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : requestToCanonical.entrySet()) {
            JSONArray row = snapshot.getJSONArray(toProdCode(entry.getValue()));
            if (row == null || row.isEmpty()) {
                continue;
            }
            BigDecimal last = decimal(row, indexes.get("last_px"));
            if (last == null || last.signum() <= 0) {
                continue;
            }
            BigDecimal change = decimal(row, indexes.get("px_change_rate"));
            BigDecimal volume = decimal(row, indexes.get("turnover_value"));
            Long updateTime = longValue(row, indexes.get("update_time"));
            if (change != null) {
                change = change.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            }
            parsed.put(entry.getKey(), new QuoteTick(
                    entry.getKey(),
                    last,
                    defaultDecimal(change),
                    defaultDecimal(volume),
                    updateTime == null ? System.currentTimeMillis() : updateTime * 1000L
            ));
        }
        return parsed;
    }

    private WallstreetcnBar fetchLatestBar(String symbol, int periodType) {
        List<WallstreetcnBar> bars = fetchBars(symbol, periodType, 2);
        return bars.isEmpty() ? null : bars.get(bars.size() - 1);
    }

    private List<WallstreetcnBar> fetchBars(String symbol, int periodType, int limit) {
        String canonicalSymbol = resolveCanonicalSymbol(symbol);
        if (StrUtil.isBlank(canonicalSymbol) || !isEnabled()) {
            return List.of();
        }
        JSONObject json = getObject("/market/kline", Map.of(
                "prod_code", toProdCode(canonicalSymbol),
                "tick_count", String.valueOf(Math.max(1, Math.min(limit, 500))),
                "period_type", String.valueOf(periodType),
                "adjust_price_type", "forward",
                "fields", KLINE_FIELDS
        ));
        if (json == null) {
            return List.of();
        }

        JSONObject data = json.getJSONObject("data");
        if (data == null) {
            return List.of();
        }

        JSONArray fields = data.getJSONArray("fields");
        JSONObject candle = data.getJSONObject("candle");
        JSONObject product = candle == null ? null : candle.getJSONObject(toProdCode(canonicalSymbol));
        JSONArray lines = product == null ? null : product.getJSONArray("lines");
        if (fields == null || lines == null || lines.isEmpty()) {
            return List.of();
        }

        Map<String, Integer> fieldIndexes = new LinkedHashMap<>();
        for (int i = 0; i < fields.size(); i++) {
            String fieldName = fields.getString(i);
            if (StrUtil.isNotBlank(fieldName)) {
                fieldIndexes.put(fieldName, i);
            }
        }

        List<WallstreetcnBar> bars = new ArrayList<>(lines.size());
        for (int i = 0; i < lines.size(); i++) {
            JSONArray row = lines.getJSONArray(i);
            if (row == null || row.isEmpty()) {
                continue;
            }
            Long tickAtSeconds = longValue(row, fieldIndexes.get("tick_at"));
            if (tickAtSeconds == null || tickAtSeconds <= 0) {
                continue;
            }
            bars.add(new WallstreetcnBar(
                    tickAtSeconds * 1000L,
                    decimal(row, fieldIndexes.get("open_px")),
                    decimal(row, fieldIndexes.get("close_px")),
                    decimal(row, fieldIndexes.get("high_px")),
                    decimal(row, fieldIndexes.get("low_px")),
                    decimal(row, fieldIndexes.get("turnover_volume")),
                    decimal(row, fieldIndexes.get("turnover_value"))
            ));
        }
        bars.sort(Comparator.comparingLong(WallstreetcnBar::time));
        return bars;
    }

    private JSONObject getObject(String path, Map<String, String> params) {
        String body = execute(path, params);
        if (StrUtil.isBlank(body)) {
            return null;
        }
        try {
            JSONObject json = JSON.parseObject(body);
            if (json == null || json.getIntValue("code") != 20000) {
                log.debug("WallstreetCN {} rejected request: {}", path, body);
                return null;
            }
            return json;
        } catch (Exception e) {
            log.debug("WallstreetCN {} parse error: {}", path, e.getMessage());
            return null;
        }
    }

    private String execute(String path, Map<String, String> params) {
        String url = buildUrl(path, params);
        Request request = new Request.Builder()
                .url(url)
                .get()
                .header("User-Agent", "Mozilla/5.0")
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                log.debug("WallstreetCN request failed, path={}, code={}", path, response.code());
                return null;
            }
            return response.body().string();
        } catch (Exception e) {
            log.debug("WallstreetCN request error, path={}, msg={}", path, e.getMessage());
            return null;
        }
    }

    private String buildUrl(String path, Map<String, String> params) {
        StringBuilder url = new StringBuilder(StrUtil.removeSuffix(properties.getBaseUrl(), "/")).append(path);
        if (params != null && !params.isEmpty()) {
            url.append("?");
            boolean first = true;
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if (entry.getValue() == null) {
                    continue;
                }
                if (!first) {
                    url.append("&");
                }
                first = false;
                url.append(entry.getKey())
                        .append("=")
                        .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            }
        }
        return url.toString();
    }

    private String resolveCanonicalSymbol(String symbol) {
        if (StrUtil.isBlank(symbol)) {
            return null;
        }
        String normalized = symbol.trim()
                .toUpperCase()
                .replace(".OTC", "")
                .replace("-", "")
                .replace("_", "");
        return SYMBOL_ALIASES.getOrDefault(normalized, normalized);
    }

    private String toProdCode(String canonicalSymbol) {
        return canonicalSymbol + ".OTC";
    }

    private int normalizePeriod(String period) {
        return switch (period) {
            case "1m" -> PERIOD_1M;
            case "5m" -> PERIOD_5M;
            case "15m" -> PERIOD_15M;
            case "30m" -> PERIOD_30M;
            case "1h" -> PERIOD_1H;
            case "2h" -> PERIOD_2H;
            case "4h" -> PERIOD_4H;
            case "1d" -> PERIOD_1D;
            case "1w" -> PERIOD_1W;
            case "1M" -> PERIOD_1MTH;
            default -> PERIOD_1M;
        };
    }

    private BigDecimal decimal(JSONArray row, Integer index) {
        if (index == null || index < 0 || index >= row.size()) {
            return BigDecimal.ZERO;
        }
        return decimal(row.get(index));
    }

    private Long longValue(JSONArray row, Integer index) {
        if (index == null || index < 0 || index >= row.size()) {
            return null;
        }
        Object value = row.get(index);
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal computeChangePercent(BigDecimal open, BigDecimal close) {
        if (open == null || close == null || open.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return close.subtract(open)
                .divide(open, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal syntheticStep(BigDecimal price) {
        if (price == null || price.signum() <= 0) {
            return new BigDecimal("0.0001");
        }
        if (price.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return new BigDecimal("0.01");
        }
        if (price.compareTo(BigDecimal.ONE) >= 0) {
            return new BigDecimal("0.001");
        }
        return new BigDecimal("0.0001");
    }

    private static Map<String, String> buildSymbolAliases() {
        Map<String, String> aliases = new LinkedHashMap<>();
        registerAlias(aliases, "EURUSD", "EURUSD", "EUR-USD");
        registerAlias(aliases, "USDJPY", "USDJPY", "USD-JPY");
        registerAlias(aliases, "GBPUSD", "GBPUSD", "GBP-USD");
        registerAlias(aliases, "AUDUSD", "AUDUSD", "AUD-USD");
        registerAlias(aliases, "USDCNH", "USDCNH", "USD-CNH");
        registerAlias(aliases, "XAUUSD", "XAUUSD", "GOLD", "GOLDUSD", "GOLD-USD");
        registerAlias(aliases, "XAGUSD", "XAGUSD", "SILVER", "SILVERUSD", "SILVER-USD");
        registerAlias(aliases, "XPDUSD", "XPDUSD", "PALLADIUM", "PALLADIUMUSD", "PALLADIUM-USD");
        registerAlias(aliases, "XPTUSD", "XPTUSD", "PLATINUM", "PLATINUMUSD", "PLATINUM-USD");
        registerAlias(aliases, "UKOIL", "BRENT", "BRENTUSD", "UKOIL", "UKOILUSD", "UKOIL-USD");
        registerAlias(aliases, "USOIL", "WTI", "WTIUSD", "USOIL", "USOILUSD", "USOIL-USD");
        registerAlias(aliases, "NGAS", "NGAS", "NGASUSD", "NGAS-USD");
        registerAlias(aliases, "COPPER", "COPPER", "COPPERUSD", "COPPER-USD");
        registerAlias(aliases, "ALUMINUM", "ALUMINUM", "ALUMINUMUSD", "ALUMINUM-USD");
        registerAlias(aliases, "NICKEL", "NICKEL", "NICKELUSD", "NICKEL-USD");
        return aliases;
    }

    private static void registerAlias(Map<String, String> aliases, String canonical, String... keys) {
        for (String key : keys) {
            aliases.put(key.toUpperCase().replace("-", "").replace("_", ""), canonical);
        }
    }

    private record WallstreetcnBar(
            long time,
            BigDecimal open,
            BigDecimal close,
            BigDecimal high,
            BigDecimal low,
            BigDecimal turnoverVolume,
            BigDecimal turnoverValue
    ) {
    }
}
