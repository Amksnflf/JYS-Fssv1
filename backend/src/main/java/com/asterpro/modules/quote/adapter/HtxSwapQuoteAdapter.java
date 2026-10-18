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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class HtxSwapQuoteAdapter implements QuoteAdapter {

    private final HtxSwapQuoteProperties properties;

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
        return "htx_swap";
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
        JSONObject tick = mergedTick(symbol);
        if (tick == null) return null;
        return new QuoteTick(
                normalizeRouteSymbol(symbol),
                decimal(tick.getString("close")),
                computeChangePercent(decimal(tick.getString("open")), decimal(tick.getString("close"))),
                decimal(firstNonBlank(tick.getString("vol"), tick.getString("amount"))),
                System.currentTimeMillis()
        );
    }

    @Override
    public Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        Map<String, QuoteTick> result = new LinkedHashMap<>();
        if (symbols == null) return result;
        for (String symbol : symbols) {
            if (StrUtil.isBlank(symbol)) continue;
            QuoteTick tick = getQuoteTick(symbol);
            if (tick != null) {
                result.put(tick.getSymbol(), tick);
            }
        }
        return result;
    }

    @Override
    public List<KlineBar> getKline(String symbol, String period, int limit) {
        JSONObject json = getObject("/linear-swap-ex/market/history/kline", Map.of(
                "contract_code", normalizeContractCode(symbol),
                "period", normalizePeriod(period),
                "size", String.valueOf(Math.max(1, Math.min(limit, 2000)))
        ));
        JSONArray array = json == null ? null : json.getJSONArray("data");
        if (array == null) return List.of();
        List<KlineBar> bars = new ArrayList<>(array.size());
        for (int i = 0; i < array.size(); i++) {
            JSONObject row = array.getJSONObject(i);
            if (row == null) continue;
            bars.add(new KlineBar(
                    row.getLongValue("id") * 1000L,
                    decimal(row.getString("open")),
                    decimal(row.getString("high")),
                    decimal(row.getString("low")),
                    decimal(row.getString("close")),
                    decimal(firstNonBlank(row.getString("amount"), row.getString("vol")))
            ));
        }
        bars.sort(Comparator.comparingLong(KlineBar::getTime));
        return bars;
    }

    @Override
    public QuoteDepthVO getDepth(String symbol) {
        QuoteDepthVO vo = new QuoteDepthVO();
        vo.setSymbol(normalizeRouteSymbol(symbol));
        vo.setTs(System.currentTimeMillis());
        JSONObject json = getObject("/linear-swap-ex/market/depth", Map.of(
                "contract_code", normalizeContractCode(symbol),
                "type", "step0"
        ));
        JSONObject tick = json == null ? null : json.getJSONObject("tick");
        if (tick == null) return vo;
        vo.setBids(parseLevels(tick.getJSONArray("bids")));
        vo.setAsks(parseLevels(tick.getJSONArray("asks")));
        vo.setTs(tick.containsKey("ts") ? tick.getLongValue("ts") : vo.getTs());
        return vo;
    }

    @Override
    public QuoteStats24hVO getStats24h(String symbol) {
        QuoteStats24hVO vo = new QuoteStats24hVO();
        vo.setSymbol(normalizeRouteSymbol(symbol));
        vo.setTs(System.currentTimeMillis());
        JSONObject tick = mergedTick(symbol);
        if (tick == null) return vo;
        BigDecimal open = decimal(tick.getString("open"));
        BigDecimal close = decimal(tick.getString("close"));
        vo.setOpen(open);
        vo.setHigh(decimal(tick.getString("high")));
        vo.setLow(decimal(tick.getString("low")));
        vo.setClose(close);
        vo.setChange(computeChangePercent(open, close));
        vo.setVolume(decimal(firstNonBlank(tick.getString("amount"), tick.getString("vol"))));
        vo.setAmount(decimal(firstNonBlank(tick.getString("vol"), tick.getString("amount"))));
        return vo;
    }

    @Override
    public List<QuoteTradeVO> getLatestTrades(String symbol, int limit) {
        JSONObject json = getObject("/linear-swap-ex/market/history/trade", Map.of(
                "contract_code", normalizeContractCode(symbol),
                "size", String.valueOf(Math.max(1, Math.min(limit, 100)))
        ));
        JSONArray groups = json == null ? null : json.getJSONArray("data");
        if (groups == null) return List.of();
        List<QuoteTradeVO> trades = new ArrayList<>();
        for (int i = 0; i < groups.size(); i++) {
            JSONObject group = groups.getJSONObject(i);
            JSONArray rows = group == null ? null : group.getJSONArray("data");
            if (rows == null) continue;
            for (int j = 0; j < rows.size(); j++) {
                JSONObject row = rows.getJSONObject(j);
                if (row == null) continue;
                QuoteTradeVO trade = new QuoteTradeVO();
                trade.setSymbol(normalizeRouteSymbol(symbol));
                trade.setPrice(decimal(row.getString("price")));
                trade.setVolume(decimal(row.getString("amount")));
                trade.setSide(StrUtil.blankToDefault(row.getString("direction"), "unknown"));
                trade.setTs(row.containsKey("ts") ? row.getLongValue("ts") : System.currentTimeMillis());
                trades.add(trade);
                if (trades.size() >= limit) {
                    return trades;
                }
            }
        }
        return trades;
    }

    private JSONObject mergedTick(String symbol) {
        JSONObject json = getObject("/linear-swap-ex/market/detail/merged", Map.of(
                "contract_code", normalizeContractCode(symbol)
        ));
        return json == null ? null : json.getJSONObject("tick");
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
            if (json != null && !"ok".equalsIgnoreCase(json.getString("status"))) {
                log.debug("HTX swap {} rejected request: {}", path, json);
                return null;
            }
            return json;
        } catch (Exception e) {
            log.debug("HTX swap {} parse error: {}", path, e.getMessage());
            return null;
        }
    }

    private String execute(String path, Map<String, String> params) {
        if (!isEnabled()) return null;
        String url = buildUrl(path, params);
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                log.debug("HTX swap request failed, path={}, code={}", path, response.code());
                return null;
            }
            return response.body().string();
        } catch (Exception e) {
            log.debug("HTX swap request error, path={}, msg={}", path, e.getMessage());
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

    private String normalizeContractCode(String symbol) {
        if (symbol == null) return "";
        String normalized = symbol.trim().replace("_", "-").toUpperCase();
        if (normalized.contains("-")) {
            return normalized;
        }
        if (normalized.endsWith("USDT")) {
            return normalized.substring(0, normalized.length() - 4) + "-USDT";
        }
        if (normalized.endsWith("USDC")) {
            return normalized.substring(0, normalized.length() - 4) + "-USDC";
        }
        if (normalized.endsWith("USD")) {
            return normalized.substring(0, normalized.length() - 3) + "-USD";
        }
        return normalized;
    }

    private String normalizeRouteSymbol(String symbol) {
        return symbol == null ? null : symbol.trim().replace("-", "").toUpperCase();
    }

    private String normalizePeriod(String period) {
        return switch (period) {
            case "1m" -> "1min";
            case "5m" -> "5min";
            case "15m" -> "15min";
            case "30m" -> "30min";
            case "1h" -> "60min";
            case "2h" -> "120min";
            case "4h" -> "4hour";
            case "1d" -> "1day";
            case "1w" -> "1week";
            case "1M" -> "1mon";
            default -> "1min";
        };
    }

    private String firstNonBlank(String first, String second) {
        return StrUtil.isNotBlank(first) ? first : second;
    }

    private BigDecimal decimal(String value) {
        try {
            return new BigDecimal(StrUtil.blankToDefault(value, "0"));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal computeChangePercent(BigDecimal open, BigDecimal close) {
        if (open == null || close == null || open.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return close.subtract(open)
                .divide(open, 6, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
