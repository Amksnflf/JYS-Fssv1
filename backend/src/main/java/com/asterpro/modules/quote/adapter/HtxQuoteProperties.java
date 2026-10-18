package com.asterpro.modules.quote.adapter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "htx.quote")
public class HtxQuoteProperties {

    private boolean enabled = true;
    private String restUrl = "https://api.huobi.pro";
    private long timeoutMs = 5000;
}
