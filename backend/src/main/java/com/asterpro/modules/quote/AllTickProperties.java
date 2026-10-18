package com.asterpro.modules.quote;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "alltick")
public class AllTickProperties {

    private String restUrl;
    private String wsUrl;
    private String token;
    private String subscribeSymbols;
    private long reconnectIntervalMs = 5000;
    private long reconnectMaxIntervalMs = 30000;
}
