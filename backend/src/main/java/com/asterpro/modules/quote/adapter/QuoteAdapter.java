package com.asterpro.modules.quote.adapter;

import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public interface QuoteAdapter {

    String source();

    default boolean isEnabled() {
        return true;
    }

    BigDecimal getLatestPrice(String symbol);

    QuoteTick getQuoteTick(String symbol);

    default Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        Map<String, QuoteTick> result = new LinkedHashMap<>();
        if (symbols == null) return result;
        for (String symbol : symbols) {
            if (symbol == null || symbol.isBlank()) continue;
            QuoteTick tick = getQuoteTick(symbol);
            if (tick != null) {
                result.put(symbol, tick);
            }
        }
        return result;
    }

    List<KlineBar> getKline(String symbol, String period, int limit);

    QuoteDepthVO getDepth(String symbol);

    QuoteStats24hVO getStats24h(String symbol);

    List<QuoteTradeVO> getLatestTrades(String symbol, int limit);
}
