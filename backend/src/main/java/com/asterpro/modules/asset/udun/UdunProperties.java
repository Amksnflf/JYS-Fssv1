package com.asterpro.modules.asset.udun;

import lombok.Data;
import org.springframework.stereotype.Component;

@Data
@Component
public class UdunProperties {

    private Boolean enabled = false;
    private String gatewayUrl = "https://openapi.uduncloud.com";
    private String merchantId;
    private String signKey;
    private String callbackUrl = "http://127.0.0.1:7777/api/callback/udun/transaction";
    private Integer addressExpireMinutes = 60;
    private Integer connectTimeoutSeconds = 10;
    private Integer readTimeoutSeconds = 20;
}
