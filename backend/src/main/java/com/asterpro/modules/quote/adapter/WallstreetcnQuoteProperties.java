package com.asterpro.modules.quote.adapter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "wallstreetcn.quote")
public class WallstreetcnQuoteProperties {

    private boolean enabled = true;
    private String baseUrl = "https://api-ddc-wscn.awtmt.com";
    private long timeoutMs = 5000;
}
