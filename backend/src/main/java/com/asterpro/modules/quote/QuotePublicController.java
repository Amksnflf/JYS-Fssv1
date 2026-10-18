package com.asterpro.modules.quote;

import com.asterpro.common.api.R;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;
import com.asterpro.modules.quote.service.QuoteRouterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/quote/public")
@RequiredArgsConstructor
public class QuotePublicController {

    private final QuoteRouterService quoteRouterService;

    @GetMapping("/price")
    public R<Map<String, Object>> price(@RequestParam(defaultValue = "BTCUSDT") String symbol) {
        BigDecimal p = quoteRouterService.getPublicLatestPrice(symbol);
        Map<String, Object> data = new HashMap<>();
        data.put("symbol", symbol == null ? null : symbol.trim());
        data.put("price", p == null ? null : p.toPlainString());
        data.put("ts", System.currentTimeMillis());
        return R.ok(data);
    }

    @GetMapping("/tick")
    public R<QuoteTick> tick(@RequestParam String symbol) {
        return R.ok(quoteRouterService.getPublicQuoteTick(symbol));
    }

    /** 批量 ticks，逗号分隔 symbols */
    @GetMapping("/ticks")
    public R<List<QuoteTick>> ticks(@RequestParam String symbols) {
        List<String> requests = new ArrayList<>();
        for (String symbol : symbols.split(",")) {
            String request = symbol.trim();
            if (!request.isEmpty()) requests.add(request);
        }
        List<QuoteTick> list = new ArrayList<>(quoteRouterService.getPublicQuoteTicks(requests).values());
        return R.ok(list);
    }

    @GetMapping("/kline")
    public R<List<KlineBar>> kline(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1m") String period,
            @RequestParam(defaultValue = "200") Integer limit) {
        if (limit == null || limit <= 0 || limit > 1000) limit = 200;
        List<String> allowed = Arrays.asList("1m","5m","15m","30m","1h","2h","4h","1d","1w","1M");
        if (!allowed.contains(period)) period = "1m";
        return R.ok(quoteRouterService.getKline(symbol, period, limit));
    }

    @GetMapping("/depth")
    public R<QuoteDepthVO> depth(@RequestParam String symbol) {
        return R.ok(quoteRouterService.getDepth(symbol));
    }

    @GetMapping("/stats24h")
    public R<QuoteStats24hVO> stats24h(@RequestParam String symbol) {
        return R.ok(quoteRouterService.getPublicStats24h(symbol));
    }

    @GetMapping("/latest-trades")
    public R<List<QuoteTradeVO>> latestTrades(@RequestParam String symbol,
                                              @RequestParam(defaultValue = "30") Integer limit) {
        int safeLimit = limit == null ? 30 : Math.max(1, Math.min(limit, 100));
        return R.ok(quoteRouterService.getLatestTrades(symbol, safeLimit));
    }
}
