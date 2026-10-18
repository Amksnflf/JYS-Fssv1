package com.asterpro.modules.quote;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;
import com.asterpro.modules.quote.service.SymbolService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * AllTick 行情客户端：
 * - REST 拉最新价 / K 线
 * - WebSocket 长连接订阅多 symbol 实时价（带心跳与自动重连）
 * - 价格写 Redis quote:{symbol}（TTL 10s）
 * - 24h 涨跌幅基于真实 K 线缓存的 quote:open24h:{symbol} 计算
 * - 触发 PriceUpdateEvent，由 QuotePushService 转发给前端 WS
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AllTickClient {

    private final AllTickProperties props;
    private final StringRedisTemplate redis;
    private final ApplicationEventPublisher events;
    private final SymbolService symbolService;

    public static final String QUOTE_KEY_PREFIX = "quote:";
    public static final String QUOTE_VOLUME_KEY_PREFIX = "quote:volume:";
    public static final String OPEN24H_PREFIX = "quote:open24h:";
    public static final Duration QUOTE_TTL = Duration.ofSeconds(30);
    public static final Duration OPEN24H_TTL = Duration.ofHours(25);

    private OkHttpClient http;
    private WebSocket ws;
    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(2, r -> {
                Thread t = new Thread(r, "alltick-scheduler");
                t.setDaemon(true);
                return t;
            });

    /** 最近一次向站内 WS 发布 tick 的时间。最新价只来自 WSS，不做 REST 兜底。 */
    private final Map<String, Long> lastPublishAt = new ConcurrentHashMap<>();
    private final Map<String, Deque<QuoteTradeVO>> latestTrades = new ConcurrentHashMap<>();
    private final AtomicBoolean reconnectScheduled = new AtomicBoolean(false);
    private final AtomicInteger wsSeq = new AtomicInteger(1);
    private final AtomicInteger reconnectAttempts = new AtomicInteger(0);
    private volatile boolean stopped = false;
    private volatile List<String> currentSubscribedSymbols = List.of();
    private ScheduledFuture<?> heartbeatTask;

    @PostConstruct
    public void init() {
        this.http = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();

        log.info("AllTickClient initialized, restUrl={}, wsUrl={}, fallbackSubscribe={}",
                props.getRestUrl(), props.getWsUrl(), props.getSubscribeSymbols());

        if (tokenConfigured()) {
            connectWebSocket();
        } else {
            log.error("AllTick token not configured. Quote data will be unavailable until ALLTICK_TOKEN is set.");
        }

        // 每 60s 从真实 K 线同步 24h 开盘价。
        scheduler.scheduleAtFixedRate(this::refreshSubscriptions, 15, 30, TimeUnit.SECONDS);
        scheduler.scheduleAtFixedRate(this::ensureOpen24h, 0, 60, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void shutdown() {
        stopped = true;
        try { if (ws != null) ws.close(1000, "shutdown"); } catch (Exception ignored) {}
        cancelHeartbeat();
        scheduler.shutdownNow();
    }

    public boolean tokenConfigured() {
        String tk = props.getToken();
        return StrUtil.isNotBlank(tk) && !"YOUR_ALLTICK_TOKEN_HERE".equals(tk);
    }

    public List<String> subscribeSymbols() {
        LinkedHashSet<String> symbols = new LinkedHashSet<>(symbolService.listSourceSymbolsForSource("alltick"));
        if (symbols.isEmpty() && StrUtil.isNotBlank(props.getSubscribeSymbols())) {
            Arrays.stream(props.getSubscribeSymbols().split(","))
                    .map(String::trim)
                    .filter(StrUtil::isNotBlank)
                    .forEach(symbols::add);
        }
        return new ArrayList<>(symbols);
    }

    // ============================================================
    //                   公开查询接口
    // ============================================================

    /** 获取最新价：只读 WSS 写入的 Redis 缓存，不使用 REST 兜底。 */
    public BigDecimal getLatestPrice(String symbol) {
        String cached = redis.opsForValue().get(QUOTE_KEY_PREFIX + symbol);
        if (StrUtil.isNotBlank(cached)) {
            try { return new BigDecimal(cached); } catch (Exception ignored) {}
        }
        return null;
    }

    /** 获取最新 tick（含 24h 涨跌） */
    public QuoteTick getQuoteTick(String symbol) {
        BigDecimal price = getLatestPrice(symbol);
        if (price == null) return null;
        BigDecimal change = compute24hChange(symbol, price);
        return new QuoteTick(symbol, price, change, getCachedVolume(symbol), System.currentTimeMillis());
    }

    /** 批量获取最新 tick：只读 WSS 写入的 Redis 缓存。 */
    public Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        for (String symbol : symbols) {
            if (StrUtil.isNotBlank(symbol)) codes.add(symbol.trim());
        }
        if (codes.isEmpty()) return Map.of();

        Map<String, BigDecimal> prices = new HashMap<>();
        for (String code : codes) {
            String cached = redis.opsForValue().get(QUOTE_KEY_PREFIX + code);
            if (StrUtil.isNotBlank(cached)) {
                try {
                    prices.put(code, new BigDecimal(cached));
                } catch (Exception ignored) {
                    // 缓存异常时跳过，等待下一次 WSS 推送刷新。
                }
            }
        }

        Map<String, QuoteTick> ticks = new HashMap<>();
        prices.forEach((code, price) ->
                ticks.put(code, new QuoteTick(code, price, compute24hChange(code, price), getCachedVolume(code), System.currentTimeMillis())));
        return ticks;
    }

    /** 获取真实 K 线；接口不可用时返回空列表。 */
    public List<KlineBar> getKline(String symbol, String period, int limit) {
        if (!tokenConfigured()) return List.of();
        List<KlineBar> bars = fetchKlineFromRemote(symbol, period, limit);
        return bars == null ? List.of() : bars;
    }

    /** 获取真实盘口；接口不可用时返回空盘口，前端展示 --。 */
    public QuoteDepthVO getDepth(String symbol) {
        QuoteDepthVO empty = new QuoteDepthVO();
        empty.setSymbol(symbol);
        empty.setTs(System.currentTimeMillis());
        if (!tokenConfigured()) return empty;
        try {
            String query = JSON.toJSONString(JSONObject.of(
                    "trace", String.valueOf(System.currentTimeMillis()),
                    "data", JSONObject.of(
                            "symbol_list", List.of(JSONObject.of("code", symbol))
                    )
            ));
            String url = props.getRestUrl() + "/depth-tick"
                    + "?token=" + props.getToken()
                    + "&query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            Request req = new Request.Builder().url(url).get().build();
            try (Response resp = http.newCall(req).execute()) {
                if (!resp.isSuccessful() || resp.body() == null) return empty;
                JSONObject json = JSON.parseObject(resp.body().string());
                JSONObject data = json.getJSONObject("data");
                JSONArray ticks = data == null ? null : data.getJSONArray("tick_list");
                if (ticks == null || ticks.isEmpty()) return empty;
                JSONObject tick = ticks.getJSONObject(0);
                QuoteDepthVO vo = new QuoteDepthVO();
                vo.setSymbol(tick.getString("code"));
                vo.setTs(parseLong(tick.getString("tick_time"), System.currentTimeMillis()));
                vo.setBids(parseDepthLevels(tick.getJSONArray("bids")));
                vo.setAsks(parseDepthLevels(tick.getJSONArray("asks")));
                return vo;
            }
        } catch (Exception e) {
            log.warn("getDepth {} error: {}", symbol, e.getMessage());
            return empty;
        }
    }

    /** 用真实 1m K 线聚合近 24h 统计；不可用时返回 null 字段。 */
    public QuoteStats24hVO getStats24h(String symbol) {
        QuoteStats24hVO vo = new QuoteStats24hVO();
        vo.setSymbol(symbol);
        vo.setTs(System.currentTimeMillis());
        if (!tokenConfigured()) return vo;
        List<KlineBar> bars = fetchKlineFromRemote(symbol, "1m", 1000);
        if (bars == null || bars.isEmpty()) return vo;

        long since = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        List<KlineBar> recent = bars.stream()
                .filter(b -> b.getTime() >= since)
                .sorted(Comparator.comparingLong(KlineBar::getTime))
                .toList();
        if (recent.isEmpty()) return vo;

        BigDecimal high = recent.stream().map(KlineBar::getHigh).max(BigDecimal::compareTo).orElse(null);
        BigDecimal low = recent.stream().map(KlineBar::getLow).min(BigDecimal::compareTo).orElse(null);
        BigDecimal volume = recent.stream()
                .map(b -> b.getVolume() == null ? BigDecimal.ZERO : b.getVolume())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal amount = recent.stream()
                .map(b -> {
                    BigDecimal v = b.getVolume() == null ? BigDecimal.ZERO : b.getVolume();
                    BigDecimal c = b.getClose() == null ? BigDecimal.ZERO : b.getClose();
                    return v.multiply(c);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal open = recent.get(0).getOpen();
        BigDecimal close = recent.get(recent.size() - 1).getClose();
        BigDecimal change = BigDecimal.ZERO;
        if (open != null && open.signum() != 0 && close != null) {
            change = close.subtract(open)
                    .divide(open, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        vo.setOpen(open);
        vo.setHigh(high);
        vo.setLow(low);
        vo.setClose(close);
        vo.setChange(change);
        vo.setVolume(volume);
        vo.setAmount(amount);
        return vo;
    }

    public List<QuoteTradeVO> getLatestTrades(String symbol, int limit) {
        Deque<QuoteTradeVO> trades = latestTrades.get(symbol);
        if (trades == null || trades.isEmpty()) return List.of();
        return trades.stream().limit(Math.max(1, Math.min(limit, 100))).toList();
    }

    /** AllTick K 线 REST：周期映射 1m=1, 5m=2, 15m=3, 30m=4, 1h=5, 2h=6, 4h=7, 1d=8, 1w=9, 1M=10 */
    public List<KlineBar> fetchKlineFromRemote(String symbol, String period, int limit) {
        try {
            int kType = mapPeriod(period);
            String query = JSON.toJSONString(JSONObject.of(
                    "trace", String.valueOf(System.currentTimeMillis()),
                    "data", JSONObject.of(
                            "code", symbol,
                            "kline_type", kType,
                            "kline_timestamp_end", 0,
                            "query_kline_num", limit,
                            "adjust_type", 0
                    )
            ));
            String url = props.getRestUrl() + "/kline"
                    + "?token=" + props.getToken()
                    + "&query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);

            Request req = new Request.Builder().url(url).get().build();
            try (Response resp = http.newCall(req).execute()) {
                if (!resp.isSuccessful() || resp.body() == null) return null;
                JSONObject json = JSON.parseObject(resp.body().string());
                JSONObject data = json.getJSONObject("data");
                if (data == null) return null;
                JSONArray list = data.getJSONArray("kline_list");
                if (list == null) return null;
                List<KlineBar> bars = new ArrayList<>(list.size());
                for (int i = 0; i < list.size(); i++) {
                    JSONObject k = list.getJSONObject(i);
                    long ts = k.getLongValue("timestamp") * 1000L;
                    String vol = k.getString("volume");
                    bars.add(new KlineBar(ts,
                            new BigDecimal(k.getString("open_price")),
                            new BigDecimal(k.getString("high_price")),
                            new BigDecimal(k.getString("low_price")),
                            new BigDecimal(k.getString("close_price")),
                            new BigDecimal(StrUtil.isBlank(vol) ? "0" : vol)));
                }
                return bars;
            }
        } catch (Exception e) {
            log.warn("fetchKlineFromRemote {} {} error: {}", symbol, period, e.getMessage());
            return null;
        }
    }

    private int mapPeriod(String p) {
        return switch (p) {
            case "1m" -> 1;
            case "5m" -> 2;
            case "15m" -> 3;
            case "30m" -> 4;
            case "1h" -> 5;
            case "2h" -> 6;
            case "4h" -> 7;
            case "1d" -> 8;
            case "1w" -> 9;
            case "1M" -> 10;
            default -> 1;
        };
    }

    // ============================================================
    //                  AllTick WebSocket
    // ============================================================

    private void connectWebSocket() {
        String url = buildWsUrl();
        Request req = new Request.Builder().url(url).build();
        ws = http.newWebSocket(req, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket socket, Response response) {
                reconnectScheduled.set(false);
                reconnectAttempts.set(0);
                log.info("AllTick WS connected");
                startHeartbeat(socket);
                subscribeAll(socket);
            }

            @Override
            public void onMessage(WebSocket socket, String text) {
                handleWsMessage(text);
            }

            @Override
            public void onFailure(WebSocket socket, Throwable t, Response response) {
                log.warn("AllTick WS failure: {}", t.getMessage());
                cancelHeartbeat();
                scheduleReconnect();
            }

            @Override
            public void onClosed(WebSocket socket, int code, String reason) {
                log.info("AllTick WS closed: {} {}", code, reason);
                cancelHeartbeat();
                scheduleReconnect();
            }
        });
    }

    private String buildWsUrl() {
        String baseUrl = StrUtil.removeSuffix(props.getWsUrl().trim(), "/");
        return baseUrl
                + "?token="
                + URLEncoder.encode(props.getToken(), StandardCharsets.UTF_8);
    }

    private void subscribeAll(WebSocket socket) {
        currentSubscribedSymbols = subscribeSymbols();
        subscribeSymbols(socket, currentSubscribedSymbols);
    }

    private void subscribeSymbols(WebSocket socket, Collection<String> symbols) {
        List<JSONObject> codes = new ArrayList<>();
        for (String s : symbols) {
            codes.add(JSONObject.of("code", s));
        }
        if (codes.isEmpty()) {
            log.info("AllTick WS active subscription pool is empty, skip subscribe");
            return;
        }
        JSONObject sub = JSONObject.of(
                "cmd_id", 22004,
                "seq_id", nextWsSeq(),
                "trace", newTrace(),
                "data", JSONObject.of("symbol_list", codes)
        );
        socket.send(sub.toString());
        log.info("AllTick WS subscribe sent, symbols={}", codes.size());
    }

    private void startHeartbeat(WebSocket socket) {
        cancelHeartbeat();
        heartbeatTask = scheduler.scheduleAtFixedRate(() -> {
            if (stopped || ws != socket) return;
            JSONObject heartbeat = JSONObject.of(
                    "cmd_id", 22000,
                    "seq_id", nextWsSeq(),
                    "trace", newTrace(),
                    "data", JSONObject.of()
            );
            if (!socket.send(heartbeat.toString())) {
                log.warn("AllTick WS heartbeat send failed");
                cancelHeartbeat();
                scheduleReconnect();
            }
        }, 10, 10, TimeUnit.SECONDS);
    }

    private void cancelHeartbeat() {
        ScheduledFuture<?> task = heartbeatTask;
        if (task != null) {
            task.cancel(false);
            heartbeatTask = null;
        }
    }

    private int nextWsSeq() {
        int seq = wsSeq.getAndUpdate(n -> n >= 1_000_000_000 ? 1 : n + 1);
        return seq <= 0 ? 1 : seq;
    }

    private String newTrace() {
        return UUID.randomUUID() + "-" + System.currentTimeMillis();
    }

    private void handleWsMessage(String text) {
        try {
            JSONObject msg = JSON.parseObject(text);
            Integer ret = msg.getInteger("ret");
            Integer cmdId = msg.getInteger("cmd_id");
            if (ret != null && ret != 200) {
                log.warn("AllTick WS response error, cmd_id={}, ret={}, msg={}", cmdId, ret, msg.getString("msg"));
                return;
            }
            if (Integer.valueOf(22005).equals(cmdId)) {
                log.info("AllTick WS subscribed successfully");
                return;
            }
            if (Integer.valueOf(22001).equals(cmdId)) {
                return;
            }

            JSONObject data = msg.getJSONObject("data");
            if (data == null) return;

            JSONArray tickList = data.getJSONArray("tick_list");
            if (tickList != null) {
                for (int i = 0; i < tickList.size(); i++) {
                    JSONObject item = tickList.getJSONObject(i);
                    writeAndPublishFromJson(item);
                }
                return;
            }

            String code = data.getString("code");
            String price = data.getString("price");
            if (StrUtil.isNotBlank(code) && StrUtil.isNotBlank(price)) {
                writeAndPublishFromJson(data);
            }
        } catch (Exception e) {
            log.debug("AllTick WS parse error: {}", e.getMessage());
        }
    }

    private void scheduleReconnect() {
        if (stopped) return;
        if (!reconnectScheduled.compareAndSet(false, true)) return;
        int attempt = reconnectAttempts.incrementAndGet();
        long baseDelay = Math.max(1000L, props.getReconnectIntervalMs());
        long maxDelay = Math.max(baseDelay, props.getReconnectMaxIntervalMs());
        long delay = Math.min(maxDelay, baseDelay * (1L << Math.min(attempt - 1, 10)));
        scheduler.schedule(() -> {
            if (stopped) return;
            log.info("AllTick WS reconnecting, attempt={}, delayMs={}", attempt, delay);
            try {
                reconnectScheduled.set(false);
                connectWebSocket();
            } catch (Exception e) {
                reconnectScheduled.set(false);
                log.warn("AllTick WS reconnect error, attempt={}: {}", attempt, e.getMessage());
                scheduleReconnect();
            }
        }, delay, TimeUnit.MILLISECONDS);
    }

    private void refreshSubscriptions() {
        try {
            if (stopped) return;
            List<String> previous = currentSubscribedSymbols;
            List<String> target = subscribeSymbols();
            if (sameSymbols(previous, target)) {
                return;
            }
            currentSubscribedSymbols = target;
            WebSocket currentWs = ws;
            if (currentWs != null) {
                log.info("AllTick WS active pool changed, reconnecting. oldSize={}, newSize={}",
                        previous.size(), target.size());
                try {
                    currentWs.close(1000, "active-pool-refresh");
                } catch (Exception e) {
                    log.debug("AllTick WS close for active pool refresh failed: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("refreshSubscriptions error: {}", e.getMessage());
        }
    }

    private void writeAndPublishFromJson(JSONObject item) {
        if (item == null) return;
        String code = item.getString("code");
        String price = item.getString("price");
        if (StrUtil.isBlank(price)) {
            price = item.getString("last_price");
        }
        if (StrUtil.isNotBlank(code) && StrUtil.isNotBlank(price)) {
            writePrice(code, new BigDecimal(price));
            writeVolume(code, parseQuoteVolume(item));
            recordLatestTrade(item);
            publishTick(code);
        }
    }

    private List<QuoteDepthVO.Level> parseDepthLevels(JSONArray arr) {
        List<QuoteDepthVO.Level> rows = new ArrayList<>();
        if (arr == null) return rows;
        for (int i = 0; i < arr.size(); i++) {
            JSONObject item = arr.getJSONObject(i);
            String price = item.getString("price");
            String volume = item.getString("volume");
            if (StrUtil.isBlank(price)) continue;
            QuoteDepthVO.Level row = new QuoteDepthVO.Level();
            row.setPrice(new BigDecimal(price));
            row.setVolume(new BigDecimal(StrUtil.blankToDefault(volume, "0")));
            rows.add(row);
        }
        return rows;
    }

    private void recordLatestTrade(JSONObject item) {
        String code = item.getString("code");
        String price = item.getString("price");
        if (StrUtil.isBlank(price)) price = item.getString("last_price");
        if (StrUtil.isBlank(code) || StrUtil.isBlank(price)) return;
        String volume = StrUtil.blankToDefault(item.getString("volume"), "0");
        QuoteTradeVO trade = new QuoteTradeVO();
        trade.setSymbol(code);
        trade.setPrice(new BigDecimal(price));
        trade.setVolume(new BigDecimal(volume));
        trade.setSide(normalizeTradeSide(item.getString("trade_direction")));
        trade.setTs(parseLong(item.getString("tick_time"), System.currentTimeMillis()));

        Deque<QuoteTradeVO> deque = latestTrades.computeIfAbsent(code, k -> new ConcurrentLinkedDeque<>());
        QuoteTradeVO first = deque.peekFirst();
        if (first != null && first.getTs() == trade.getTs()
                && first.getPrice().compareTo(trade.getPrice()) == 0
                && first.getVolume().compareTo(trade.getVolume()) == 0) {
            return;
        }
        deque.addFirst(trade);
        while (deque.size() > 100) {
            deque.pollLast();
        }
    }

    private String normalizeTradeSide(String raw) {
        if (StrUtil.isBlank(raw)) return "unknown";
        String v = raw.trim().toLowerCase();
        if ("1".equals(v) || "buy".equals(v) || "b".equals(v)) return "buy";
        if ("2".equals(v) || "sell".equals(v) || "s".equals(v)) return "sell";
        return "unknown";
    }

    private long parseLong(String raw, long fallback) {
        if (StrUtil.isBlank(raw)) return fallback;
        try {
            return Long.parseLong(raw);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private void ensureOpen24h() {
        try {
            if (!tokenConfigured()) return;
            for (String symbol : subscribeSymbols()) {
                String key = OPEN24H_PREFIX + symbol;
                if (!Boolean.TRUE.equals(redis.hasKey(key))) {
                    BigDecimal open = fetchOpen24h(symbol);
                    if (open != null) {
                        redis.opsForValue().set(key, open.toPlainString(), OPEN24H_TTL);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("ensureOpen24h error: {}", e.getMessage());
        }
    }

    private boolean sameSymbols(List<String> left, List<String> right) {
        return new LinkedHashSet<>(left).equals(new LinkedHashSet<>(right));
    }

    private void writePrice(String symbol, BigDecimal price) {
        redis.opsForValue().set(QUOTE_KEY_PREFIX + symbol, price.toPlainString(), QUOTE_TTL);
    }

    private void writeVolume(String symbol, BigDecimal volume) {
        redis.opsForValue().set(QUOTE_VOLUME_KEY_PREFIX + symbol, volume.toPlainString(), QUOTE_TTL);
    }

    private BigDecimal getCachedVolume(String symbol) {
        String cached = redis.opsForValue().get(QUOTE_VOLUME_KEY_PREFIX + symbol);
        if (StrUtil.isNotBlank(cached)) {
            try { return new BigDecimal(cached); } catch (Exception ignored) {}
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal parseQuoteVolume(JSONObject item) {
        String value = item.getString("turnover");
        if (StrUtil.isBlank(value)) value = item.getString("volume");
        try {
            return new BigDecimal(StrUtil.blankToDefault(value, "0"));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private void publishTick(String symbol) {
        QuoteTick tick = getQuoteTick(symbol);
        if (tick != null) {
            lastPublishAt.put(symbol, System.currentTimeMillis());
            events.publishEvent(tick);
        }
    }

    private BigDecimal compute24hChange(String symbol, BigDecimal current) {
        String openStr = redis.opsForValue().get(OPEN24H_PREFIX + symbol);
        if (StrUtil.isBlank(openStr)) return BigDecimal.ZERO;
        try {
            BigDecimal open = new BigDecimal(openStr);
            if (open.signum() == 0) return BigDecimal.ZERO;
            return current.subtract(open)
                    .divide(open, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal fetchOpen24h(String symbol) {
        List<KlineBar> bars = fetchKlineFromRemote(symbol, "1m", 1000);
        if (bars == null || bars.isEmpty()) return null;
        long since = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        return bars.stream()
                .filter(b -> b.getTime() >= since)
                .sorted(Comparator.comparingLong(KlineBar::getTime))
                .map(KlineBar::getOpen)
                .filter(v -> v != null && v.signum() > 0)
                .findFirst()
                .orElse(null);
    }

}
