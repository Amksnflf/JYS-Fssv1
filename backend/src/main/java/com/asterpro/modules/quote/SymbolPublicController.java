package com.asterpro.modules.quote;

import com.asterpro.common.api.R;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.PublicSymbolListService;
import com.asterpro.modules.quote.service.QuoteRouterService;
import com.asterpro.modules.quote.service.SymbolService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/symbol/public")
@RequiredArgsConstructor
public class SymbolPublicController {

    private final SymbolService symbolService;
    private final QuoteRouterService quoteRouterService;
    private final PublicSymbolListService publicSymbolListService;

    @GetMapping("/list")
    public R<List<Map<String, Object>>> list(
            @RequestParam(defaultValue = "spot") String tradeType,
            @RequestParam(defaultValue = "crypto") String category,
            @RequestParam(defaultValue = "active") String scope,
            @RequestParam(defaultValue = "false") boolean light) {
        return R.ok(publicSymbolListService.list(tradeType, category, scope, light));
    }

    @GetMapping("/rank")
    public R<Map<String, List<Map<String, Object>>>> rank(
            @RequestParam(defaultValue = "spot") String tradeType,
            @RequestParam(defaultValue = "5") Integer limit) {
        int safeLimit = limit == null ? 5 : Math.max(1, Math.min(limit, 100));
        List<Symbol> symbols = symbolService.listByType(tradeType, "crypto");
        Map<String, QuoteTick> ticks = quoteRouterService.getQuoteTicksBySymbols(symbols);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Symbol symbol : symbols) {
            String code = quoteRouterService.resolveClientCode(symbol);
            QuoteTick tick = code == null ? null : ticks.get(code);
            if (tick == null) continue;

            Map<String, Object> row = new HashMap<>();
            row.put("symbol", symbol.getSymbol());
            row.put("baseCoin", symbol.getBaseCoin());
            row.put("price", tick.getPrice() == null ? null : tick.getPrice().toPlainString());
            row.put("change", tick.getChange() == null ? "0" : tick.getChange().toPlainString());
            row.put("changePrecision", normalizeChangePrecision(symbol.getChangePrecision()));
            row.put("changeNum", tick.getChange() == null ? BigDecimal.ZERO : tick.getChange());
            rows.add(row);
        }

        rows.sort((a, b) -> ((BigDecimal) b.get("changeNum")).compareTo((BigDecimal) a.get("changeNum")));
        List<Map<String, Object>> gainers = new ArrayList<>(rows.subList(0, Math.min(safeLimit, rows.size())));
        rows.sort((a, b) -> ((BigDecimal) a.get("changeNum")).compareTo((BigDecimal) b.get("changeNum")));
        List<Map<String, Object>> losers = new ArrayList<>(rows.subList(0, Math.min(safeLimit, rows.size())));
        gainers.forEach(item -> item.remove("changeNum"));
        losers.forEach(item -> item.remove("changeNum"));

        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        result.put("gainers", gainers);
        result.put("losers", losers);
        return R.ok(result);
    }

    private int normalizeChangePrecision(Integer precision) {
        if (precision == null) return 2;
        return Math.max(0, Math.min(6, precision));
    }
}
