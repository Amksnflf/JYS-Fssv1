package com.asterpro.modules.quote.adapter;

import com.asterpro.modules.quote.AllTickClient;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteDepthVO;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.dto.QuoteTradeVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AllTickQuoteAdapter implements QuoteAdapter {

    private final AllTickClient allTickClient;

    @Override
    public String source() {
        return "alltick";
    }

    @Override
    public boolean isEnabled() {
        return allTickClient.tokenConfigured();
    }

    @Override
    public BigDecimal getLatestPrice(String symbol) {
        return allTickClient.getLatestPrice(symbol);
    }

    @Override
    public QuoteTick getQuoteTick(String symbol) {
        return allTickClient.getQuoteTick(symbol);
    }

    @Override
    public Map<String, QuoteTick> getQuoteTicks(Collection<String> symbols) {
        return allTickClient.getQuoteTicks(symbols);
    }

    @Override
    public List<KlineBar> getKline(String symbol, String period, int limit) {
        return allTickClient.getKline(symbol, period, limit);
    }

    @Override
    public QuoteDepthVO getDepth(String symbol) {
        return allTickClient.getDepth(symbol);
    }

    @Override
    public QuoteStats24hVO getStats24h(String symbol) {
        return allTickClient.getStats24h(symbol);
    }

    @Override
    public List<QuoteTradeVO> getLatestTrades(String symbol, int limit) {
        return allTickClient.getLatestTrades(symbol, limit);
    }
}
