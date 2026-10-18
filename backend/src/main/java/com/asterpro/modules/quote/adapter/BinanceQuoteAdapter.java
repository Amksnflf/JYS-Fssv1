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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class BinanceQuoteAdapter implements QuoteAdapter {

    private final BinanceQuoteProperties properties;

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
        return "binance";
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
        JSONObject json = getObject("/api/v3/ticker/24hr", Map.of("symbol", normalizeSymbol(symbol)));
        return toTick(json, symbol);
    }

    @Override
    public Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        Map<String, QuoteTick> result = new LinkedHashMap<>();
        List<String> normalized = symbols == null ? List.of() : symbols.stream()
                .filter(StrUtil::isNotBlank)
                .map(this::normalizeSymbol)
                .distinct()
                .toList();
        if (normalized.isEmpty()) return result;
        JSONArray array = getArray("/api/v3/ticker/24hr", Map.of("symbols", JSON.toJSONString(normalized)));
        if (array == null) return result;
        for (int i = 0; i < array.size(); i++) {
            JSONObject json = array.getJSONObject(i);
            QuoteTick tick = toTick(json, json.getString("symbol"));
            if (tick != null && StrUtil.isNotBlank(tick.getSymbol())) {
                result.put(tick.getSymbol(), tick);
            }
        }
        return result;
    }

    @Override
    public List<KlineBar> getKline(String symbol, String period, int limit) {
        JSONArray array = getArray("/api/v3/klines", Map.of(
                "symbol", normalizeSymbol(symbol),
                "interval", normalizePeriod(period),
                "limit", String.valueOf(limit)
        ));
        if (array == null) return List.of();
        List<KlineBar> bars = new ArrayList<>(array.size());
        for (int i = 0; i < array.size(); i++) {
            JSONArray row = array.getJSONArray(i);
            if (row == null || row.size() < 6) continue;
            bars.add(new KlineBar(
                    row.getLongValue(0),
                    decimal(row.getString(1)),
                    decimal(row.getString(2)),
                    decimal(row.getString(3)),
                    decimal(row.getString(4)),
                    decimal(row.getString(5))
            ));
        }
        return bars;
    }

    @Override
    public QuoteDepthVO getDepth(String symbol) {
        QuoteDepthVO vo = new QuoteDepthVO();
        vo.setSymbol(symbol);
        vo.setTs(System.currentTimeMillis());
        JSONObject json = getObject("/api/v3/depth", Map.of(
                "symbol", normalizeSymbol(symbol),
                "limit", "50"
        ));
        if (json == null) return vo;
        vo.setBids(parseLevels(json.getJSONArray("bids")));
        vo.setAsks(parseLevels(json.getJSONArray("asks")));
        return vo;
    }

    @Override
    public QuoteStats24hVO getStats24h(String symbol) {
        QuoteStats24hVO vo = new QuoteStats24hVO();
        vo.setSymbol(symbol);
        vo.setTs(System.currentTimeMillis());
        JSONObject json = getObject("/api/v3/ticker/24hr", Map.of("symbol", normalizeSymbol(symbol)));
        if (json == null || !json.containsKey("lastPrice")) return vo;
        vo.setOpen(decimal(json.getString("openPrice")));
        vo.setHigh(decimal(json.getString("highPrice")));
        vo.setLow(decimal(json.getString("lowPrice")));
        vo.setClose(decimal(json.getString("lastPrice")));
        vo.setChange(decimal(json.getString("priceChangePercent")));
        vo.setVolume(decimal(json.getString("volume")));
        vo.setAmount(decimal(json.getString("quoteVolume")));
        vo.setTs(json.containsKey("closeTime") ? json.getLongValue("closeTime") : System.currentTimeMillis());
        return vo;
    }

    @Override
    public List<QuoteTradeVO> getLatestTrades(String symbol, int limit) {
        JSONArray array = getArray("/api/v3/trades", Map.of(
                "symbol", normalizeSymbol(symbol),
                "limit", String.valueOf(Math.max(1, Math.min(limit, 100)))
        ));
        if (array == null) return List.of();
        List<QuoteTradeVO> trades = new ArrayList<>(array.size());
        for (int i = 0; i < array.size(); i++) {
            JSONObject row = array.getJSONObject(i);
            if (row == null) continue;
            QuoteTradeVO trade = new QuoteTradeVO();
            trade.setSymbol(symbol);
            trade.setPrice(decimal(row.getString("price")));
            trade.setVolume(decimal(row.getString("qty")));
            trade.setSide(row.getBooleanValue("isBuyerMaker") ? "sell" : "buy");
            trade.setTs(row.containsKey("time") ? row.getLongValue("time") : System.currentTimeMillis());
            trades.add(trade);
        }
        return trades;
    }

    private QuoteTick toTick(JSONObject json, String symbol) {
        if (json == null || !json.containsKey("lastPrice")) return null;
        return new QuoteTick(
                symbol,
                decimal(json.getString("lastPrice")),
                decimal(json.getString("priceChangePercent")),
                decimal(json.getString("quoteVolume")),
                json.containsKey("closeTime") ? json.getLongValue("closeTime") : System.currentTimeMillis()
        );
    }

    private List<QuoteDepthVO.Level> parseLevels(JSONArray rows) {
        List<QuoteDepthVO.Level> levels = new ArrayList<>();
        if (rows == null) return levels;
        for (int i = 0; i < rows.size(); i++) {
            JSONArray row = rows.getJSONArray(i);
            if (row == null || row.size() < 2) continue;
            QuoteDepthVO.Level level = new QuoteDepthVO.Level();
            level.setPrice(decimal(row.getString(0)));
            level.setVolume(decimal(row.getString(1)));
            levels.add(level);
        }
        return levels;
    }

    private JSONObject getObject(String path, Map<String, String> params) {
        String body = execute(path, params);
        if (StrUtil.isBlank(body)) return null;
        try {
            JSONObject json = JSON.parseObject(body);
            if (json != null && json.containsKey("code") && !json.containsKey("lastPrice")) {
                log.debug("Binance {} rejected request: {}", path, json);
                return null;
            }
            return json;
        } catch (Exception e) {
            log.debug("Binance {} parse object error: {}", path, e.getMessage());
            return null;
        }
    }

    private JSONArray getArray(String path, Map<String, String> params) {
        String body = execute(path, params);
        if (StrUtil.isBlank(body)) return null;
        try {
            return JSON.parseArray(body);
        } catch (Exception e) {
            log.debug("Binance {} parse array error: {}", path, e.getMessage());
            return null;
        }
    }

    private String execute(String path, Map<String, String> params) {
        if (!isEnabled()) return null;
        String url = buildUrl(path, params);
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                log.debug("Binance request failed, path={}, code={}", path, response.code());
                return null;
            }
            return response.body().string();
        } catch (Exception e) {
            log.debug("Binance request error, path={}, msg={}", path, e.getMessage());
            return null;
        }
    }

    private String buildUrl(String path, Map<String, String> params) {
        StringBuilder url = new StringBuilder(StrUtil.removeSuffix(properties.getRestUrl(), "/")).append(path);
        if (params != null && !params.isEmpty()) {
            url.append("?");
            boolean first = true;
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if (entry.getValue() == null) continue;
                if (!first) url.append("&");
                first = false;
                url.append(entry.getKey())
                        .append("=")
                        .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            }
        }
        return url.toString();
    }

    private String normalizeSymbol(String symbol) {
        return symbol == null ? "" : symbol.trim().toUpperCase();
    }

    private String normalizePeriod(String period) {
        return switch (period) {
            case "1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w", "1M" -> period;
            default -> "1m";
        };
    }

    private BigDecimal decimal(String value) {
        try {
            return new BigDecimal(StrUtil.blankToDefault(value, "0"));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }
}
