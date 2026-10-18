package com.asterpro.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "upload")
public class UploadProperties {

    private String rootDir = "storage/uploads";
    private String publicPath = "/uploads";
    private long maxImageSizeBytes = 5L * 1024 * 1024;
}
