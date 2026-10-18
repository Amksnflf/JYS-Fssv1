package com.asterpro.modules.quote.adapter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "htx.swap")
public class HtxSwapQuoteProperties {

    private boolean enabled = true;
    private String restUrl = "https://api.hbdm.com";
    private long timeoutMs = 5000;
}
