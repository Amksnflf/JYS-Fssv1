package com.asterpro.modules.quote.ws;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.QuoteRouterService;
import com.asterpro.modules.quote.service.SymbolService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 自建 /ws/quote 行情推送：
 * 客户端发送 {"action":"sub","symbols":["BTCUSDT","ETHUSDT"]} 订阅
 * 服务端推送 {"type":"tick","symbol":"...","price":"...","change":"...","ts":...}
 *
 * 当前改为后端统一轮询订阅池，再按客户端订阅关系向站内 WS 转发。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuoteWebSocketHandler extends TextWebSocketHandler {

    private final QuoteRouterService quoteRouterService;
    private final SymbolService symbolService;

    /** sessionId -> session */
    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    /** sessionId -> subscribed symbols */
    private final ConcurrentHashMap<String, Set<String>> subs = new ConcurrentHashMap<>();
    /** symbol -> last payload signature */
    private final ConcurrentHashMap<String, String> lastBroadcastSignature = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "quote-ws-poller");
        t.setDaemon(true);
        return t;
    });

    @PostConstruct
    public void init() {
        scheduler.scheduleAtFixedRate(this::pollAndBroadcast, 1, 1, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void destroy() {
        scheduler.shutdownNow();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        subs.put(session.getId(), ConcurrentHashMap.newKeySet());
        send(session, JSONObject.of("type", "welcome", "ts", System.currentTimeMillis()).toString());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JSONObject msg = JSON.parseObject(message.getPayload());
            String action = msg.getString("action");
            if ("ping".equals(action)) {
                send(session, JSONObject.of("type", "pong", "ts", System.currentTimeMillis()).toString());
                return;
            }
            if ("sub".equals(action) || "unsub".equals(action)) {
                Set<String> set = subs.computeIfAbsent(session.getId(), k -> ConcurrentHashMap.newKeySet());
                var arr = msg.getJSONArray("symbols");
                if (arr == null) return;
                for (int i = 0; i < arr.size(); i++) {
                    String sym = arr.getString(i);
                    if (sym == null) continue;
                    String normalized = normalizeSymbol(sym);
                    if (normalized.isBlank()) continue;
                    if ("sub".equals(action)) {
                        Symbol activeSymbol = symbolService.findActiveByRequestSymbol(normalized);
                        if (activeSymbol == null) continue;
                        String wsCode = quoteRouterService.resolveClientCode(activeSymbol);
                        if (wsCode == null || wsCode.isBlank()) continue;
                        set.add(wsCode);
                        // 立即回推一次最新价
                        QuoteTick tick = quoteRouterService.getWsTick(wsCode);
                        if (tick != null) sendTick(session, tick);
                    } else {
                        set.remove(normalized);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("ws message parse error: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        subs.remove(session.getId());
    }

    private void pollAndBroadcast() {
        try {
            Set<String> symbols = ConcurrentHashMap.newKeySet();
            for (Set<String> values : subs.values()) {
                symbols.addAll(values);
            }
            if (symbols.isEmpty()) return;

            for (QuoteTick tick : quoteRouterService.getWsTicks(symbols).values()) {
                if (tick == null || tick.getPrice() == null) continue;
                String signature = tick.getPrice().toPlainString()
                        + "|"
                        + tick.getChange().toPlainString()
                        + "|"
                        + tick.getVolume().toPlainString();
                String previous = lastBroadcastSignature.put(tick.getSymbol(), signature);
                if (signature.equals(previous)) continue;
                broadcastTick(tick);
            }
        } catch (Exception e) {
            log.debug("quote ws poll error: {}", e.getMessage());
        }
    }

    private void broadcastTick(QuoteTick tick) {
        for (var entry : subs.entrySet()) {
            if (!entry.getValue().contains(tick.getSymbol())) continue;
            WebSocketSession session = sessions.get(entry.getKey());
            if (session != null && session.isOpen()) {
                sendTick(session, tick);
            }
        }
    }

    private void sendTick(WebSocketSession s, QuoteTick tick) {
        JSONObject o = new JSONObject();
        o.put("type", "tick");
        o.put("symbol", tick.getSymbol());
        o.put("price", tick.getPrice().toPlainString());
        o.put("change", tick.getChange().toPlainString());
        o.put("volume", tick.getVolume().toPlainString());
        o.put("ts", tick.getTs());
        send(s, o.toString());
    }

    private void send(WebSocketSession s, String text) {
        try {
            synchronized (s) {
                if (s.isOpen()) s.sendMessage(new TextMessage(text));
            }
        } catch (Exception e) {
            log.debug("ws send error: {}", e.getMessage());
        }
    }

    private String normalizeSymbol(String symbol) {
        return symbol.trim().replace("-", "").toUpperCase();
    }
}
