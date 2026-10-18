package com.asterpro.modules.quote;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "news-source")
public class NewsSourceProperties {

    /**
     * Enable scheduled import from the remote announcement/news source.
     */
    private boolean enabled = true;

    /**
     * Logical source name shown in admin/frontend.
     */
    private String sourceName = "OKX";

    /**
     * Remote API endpoint for announcements.
     */
    private String apiUrl = "https://www.okx.com/api/v5/support/announcements";

    /**
     * Optional public site prefix used to construct readable detail URLs.
     */
    private String articleBaseUrl = "https://www.okx.com/help";

    /**
     * Request timeout for the remote source.
     */
    private long timeoutMs = 8000L;

    /**
     * Preferred language header for the remote announcement API.
     */
    private String acceptLanguage = "zh-CN";

    /**
     * Maximum announcements fetched per sync.
     */
    private int pageSize = 20;

    /**
     * Automatic sync interval in milliseconds.
     */
    private long syncIntervalMs = 900_000L;

    /**
     * Whether to perform an automatic sync soon after application startup.
     */
    private boolean syncOnStartup = true;

    /**
     * Optional secondary image-rich news feed, usually RSS based.
     */
    private boolean secondaryEnabled = true;

    /**
     * Display name for the secondary feed.
     */
    private String secondarySourceName = "Cointelegraph";

    /**
     * RSS or API URL for the secondary feed.
     */
    private String secondaryApiUrl = "https://cointelegraph.com/rss";

    /**
     * Logical language tag stored for the secondary feed records.
     */
    private String secondaryLang = "zh-CN";
}
