package com.asterpro.modules.asset.udun;

import lombok.Data;

@Data
public class UdunRuntimeConfig {
    private Boolean enabled;
    private String gatewayUrl;
    private String merchantId;
    private String signKey;
    private String callbackUrl;
    private Integer addressExpireMinutes;
    private Integer connectTimeoutSeconds;
    private Integer readTimeoutSeconds;
}
