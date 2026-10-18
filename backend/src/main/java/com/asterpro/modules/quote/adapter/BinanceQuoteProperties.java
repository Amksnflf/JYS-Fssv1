package com.asterpro.modules.quote.adapter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "binance.quote")
public class BinanceQuoteProperties {

    private boolean enabled = true;
    private String restUrl = "https://api.binance.com";
    private long timeoutMs = 5000;
}
