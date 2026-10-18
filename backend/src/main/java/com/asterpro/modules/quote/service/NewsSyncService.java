package com.asterpro.modules.quote.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.modules.quote.NewsSourceProperties;
import com.asterpro.modules.quote.entity.News;
import com.asterpro.modules.quote.mapper.NewsMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.jsoup.safety.Safelist;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsSyncService {

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Shanghai");
    private static final String AUTO_FALLBACK_MARKER = "data-auto-news-fallback=\"1\"";
    private static final String OKX_GENERIC_COVER = "https://www.okx.com/cdn/assets/imgs/244/84D446EF6A65AF94.jpeg";
    private static final String[] ARTICLE_SELECTORS = {
            "[class*=post__content]",
            "[class*=post-content]",
            "[class*=article-content]",
            "[class*=articleContent]",
            "[class*=rich-text]",
            "[class*=richText]",
            "[class*=markdown]",
            "[class*=content]",
            "article",
            "main article",
            "main [class*=article]",
            "main [class*=content]",
            "main",
            "section"
    };

    private final NewsMapper newsMapper;
    private final NewsSourceProperties properties;

    @PostConstruct
    public void syncOnStartup() {
        if (!properties.isEnabled() || !properties.isSyncOnStartup()) {
            return;
        }
        try {
            syncRemoteNews();
        } catch (Exception e) {
            log.warn("initial news sync failed", e);
        }
    }

    @Scheduled(fixedDelayString = "${news-source.sync-interval-ms:900000}", initialDelay = 120000L)
    public void scheduledSync() {
        if (!properties.isEnabled()) {
            return;
        }
        try {
            syncRemoteNews();
        } catch (Exception e) {
            log.warn("scheduled news sync failed", e);
        }
    }

    public SyncResult syncRemoteNews() {
        int fetched = 0;
        int inserted = 0;
        int processed = 0;

        List<RemoteNewsRow> primaryRows = fetchPrimaryRows();
        fetched += primaryRows.size();
        SyncCount primaryCount = saveRows(primaryRows);
        inserted += primaryCount.inserted();
        processed += primaryCount.processed();

        if (properties.isSecondaryEnabled()) {
            List<RemoteNewsRow> secondaryRows = fetchSecondaryRows();
            fetched += secondaryRows.size();
            SyncCount secondaryCount = saveRows(secondaryRows);
            inserted += secondaryCount.inserted();
            processed += secondaryCount.processed();
        }

        return new SyncResult(fetched, inserted, processed);
    }

    private SyncCount saveRows(List<RemoteNewsRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return new SyncCount(0, 0);
        }
        int inserted = 0;
        int processed = 0;
        for (RemoteNewsRow row : rows) {
            if (row == null || isBlank(row.externalId()) || isBlank(row.title())) {
                continue;
            }
            News existing = newsMapper.selectOne(new LambdaQueryWrapper<News>()
                    .eq(News::getExternalId, row.externalId())
                    .last("LIMIT 1"));
            boolean created = existing == null;
            News target = created ? new News() : existing;
            mergeRemoteRow(target, row, created);
            if (created) {
                newsMapper.insert(target);
                inserted++;
            } else {
                newsMapper.updateById(target);
            }
            processed++;
        }
        return new SyncCount(inserted, processed);
    }

    private List<RemoteNewsRow> fetchPrimaryRows() {
        HttpUrl url = HttpUrl.parse(properties.getApiUrl());
        if (url == null) {
            throw new IllegalStateException("invalid news source api url: " + properties.getApiUrl());
        }
        HttpUrl requestUrl = url.newBuilder()
                .setQueryParameter("page", "1")
                .setQueryParameter("pageSize", String.valueOf(Math.max(1, properties.getPageSize())))
                .build();

        Request request = new Request.Builder()
                .url(requestUrl)
                .header("User-Agent", "Mozilla/5.0")
                .header("Accept", "application/json")
                .header("Accept-Language", firstNonBlank(properties.getAcceptLanguage(), "zh-CN"))
                .build();

        try (Response response = http().newCall(request).execute()) {
            String body = response.body() == null ? "" : response.body().string();
            if (!response.isSuccessful()) {
                throw new IllegalStateException("news source http " + response.code());
            }
            JSONObject json = JSON.parseObject(body);
            if (json == null) {
                return List.of();
            }

            JSONArray data = json.getJSONArray("data");
            List<JSONObject> rows = new ArrayList<>();
            if (data != null) {
                rows.addAll(flattenRows(data));
            } else {
                JSONObject payload = json.getJSONObject("data");
                if (payload != null) {
                    JSONArray list = payload.getJSONArray("announcements");
                    if (list != null) {
                        rows.addAll(flattenRows(list));
                    }
                }
            }
            List<RemoteNewsRow> mapped = new ArrayList<>();
            for (JSONObject row : rows) {
                RemoteNewsRow mappedRow = mapPrimaryRow(row);
                if (mappedRow != null) {
                    mapped.add(mappedRow);
                }
            }
            return mapped;
        } catch (IOException e) {
            throw new IllegalStateException("news source request failed", e);
        }
    }

    private List<RemoteNewsRow> fetchSecondaryRows() {
        String feedUrl = properties.getSecondaryApiUrl();
        if (isBlank(feedUrl)) {
            return List.of();
        }

        Request request = new Request.Builder()
                .url(feedUrl)
                .header("User-Agent", "Mozilla/5.0")
                .header("Accept", "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8")
                .header("Accept-Language", firstNonBlank(properties.getAcceptLanguage(), "zh-CN"))
                .build();

        try (Response response = http().newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                return List.of();
            }
            String xml = response.body().string();
            if (isBlank(xml)) {
                return List.of();
            }

            Document doc = Jsoup.parse(xml, "", Parser.xmlParser());
            List<RemoteNewsRow> rows = new ArrayList<>();
            int limit = Math.max(1, properties.getPageSize());
            int count = 0;
            for (Element item : doc.select("channel > item")) {
                RemoteNewsRow row = mapSecondaryItem(item);
                if (row != null) {
                    rows.add(row);
                    count++;
                }
                if (count >= limit) {
                    break;
                }
            }
            return rows;
        } catch (Exception e) {
            log.warn("secondary news sync failed", e);
            return List.of();
        }
    }

    private RemoteNewsRow mapPrimaryRow(JSONObject row) {
        if (row == null) {
            return null;
        }
        String externalId = firstNonBlank(
                row.getString("annId"),
                row.getString("id"),
                row.getString("slug"),
                row.getString("pTime")
        );
        String title = firstNonBlank(
                row.getString("title"),
                row.getString("annTitle"),
                row.getString("name")
        );
        if (isBlank(externalId) || isBlank(title)) {
            return null;
        }
        String summary = firstNonBlank(
                row.getString("summary"),
                row.getString("annDesc"),
                row.getString("description"),
                title
        );
        String sourceUrl = buildPrimarySourceUrl(row);
        String directContent = firstNonBlank(
                row.getString("content"),
                row.getString("annContent"),
                row.getString("body")
        );
        String cover = normalizeCover(firstNonBlank(
                row.getString("cover"),
                row.getString("imgUrl"),
                row.getString("imageUrl")
        ));
        String author = firstNonBlank(
                row.getString("author"),
                properties.getSourceName(),
                "Aster Pro"
        );
        String sourceName = firstNonBlank(row.getString("sourceName"), properties.getSourceName());
        String lang = normalizeLang(firstNonBlank(
                row.getString("lang"),
                row.getString("locale"),
                row.getString("language"),
                properties.getAcceptLanguage(),
                "zh-CN"
        ));
        LocalDateTime publishedAt = parsePublishedAt(
                firstNonBlank(
                        row.getString("publishedAt"),
                        row.getString("annTime"),
                        row.getString("cTime"),
                        row.getString("pTime"),
                        row.getString("ts")
                )
        );
        String tagCoin = firstNonBlank(row.getString("tagCoin"), row.getString("instId"), row.getString("coin"));
        BigDecimal tagChange = parseBigDecimal(firstNonBlank(row.getString("tagChange"), row.getString("change")));

        return new RemoteNewsRow(
                externalId,
                title,
                summary,
                directContent,
                cover,
                null,
                author,
                sourceName,
                sourceUrl,
                lang,
                publishedAt,
                tagCoin,
                tagChange
        );
    }

    private RemoteNewsRow mapSecondaryItem(Element item) {
        if (item == null) {
            return null;
        }
        String externalId = firstNonBlank(
                textOf(item, "guid"),
                textOf(item, "link"),
                textOf(item, "title")
        );
        String title = firstNonBlank(textOf(item, "title"));
        if (isBlank(externalId) || isBlank(title)) {
            return null;
        }
        String sourceUrl = normalizeUrl(firstNonBlank(textOf(item, "link"), textOf(item, "guid")));
        String descriptionHtml = firstNonBlank(textOf(item, "description"));
        String summary = extractRssSummary(descriptionHtml, title);
        String cover = normalizeCover(firstNonBlank(
                attrOf(item, "media|content", "url"),
                attrOf(item, "enclosure", "url"),
                firstDescriptionImage(descriptionHtml)
        ));
        String author = normalizeAuthor(firstNonBlank(
                textOf(item, "dc|creator"),
                properties.getSecondarySourceName()
        ));
        LocalDateTime publishedAt = parsePublishedAt(firstNonBlank(
                textOf(item, "pubDate"),
                textOf(item, "atom|updated")
        ));

        return new RemoteNewsRow(
                "ct-" + externalId.trim(),
                title,
                summary,
                null,
                cover,
                null,
                author,
                firstNonBlank(properties.getSecondarySourceName(), "Cointelegraph"),
                sourceUrl,
                normalizeLang(firstNonBlank(properties.getSecondaryLang(), "zh-CN")),
                publishedAt,
                null,
                null
        );
    }

    private void mergeRemoteRow(News target, RemoteNewsRow row, boolean created) {
        ArticleDetail articleDetail = needsArticleFetch(target, created, row.content(), row.cover(), row.sourceUrl())
                ? fetchArticleDetail(row.sourceUrl())
                : null;

        String summary = firstNonBlank(row.summary(), articleDetail == null ? null : articleDetail.summary(), row.title());
        String content = firstNonBlank(
                row.content(),
                articleDetail == null ? null : articleDetail.content(),
                buildFallbackContent(summary)
        );
        String cover = normalizeCover(firstNonBlank(row.cover(), articleDetail == null ? null : articleDetail.cover()));
        String authorAvatar = normalizeAvatar(firstNonBlank(row.authorAvatar(), articleDetail == null ? null : articleDetail.authorAvatar()));
        String author = firstNonBlank(row.author(), articleDetail == null ? null : articleDetail.author(), row.sourceName(), "Aster Pro");

        target.setExternalId(row.externalId());
        if (created || isBlank(target.getTitle())) target.setTitle(row.title());
        if (created || isBlank(target.getSummary())) target.setSummary(summary);
        if (created || shouldReplaceContent(target.getContent())) target.setContent(content);
        if (created || shouldReplaceCover(target.getCover())) target.setCover(cover);
        if (created || isBlank(target.getAuthor())) target.setAuthor(author);
        if (created || isBlank(target.getAuthorAvatar())) target.setAuthorAvatar(authorAvatar);
        if (created || isBlank(target.getSourceName())) target.setSourceName(row.sourceName());
        if (created || isBlank(target.getSourceUrl())) target.setSourceUrl(row.sourceUrl());
        if (created || isBlank(target.getLang())) target.setLang(row.lang());
        if (created || target.getPublished() == null) target.setPublished(1);
        if (created || target.getPublishedAt() == null) target.setPublishedAt(row.publishedAt());
        target.setLikeCount(defaultInt(target.getLikeCount(), 0));
        target.setViewCount(defaultInt(target.getViewCount(), 0));
        if (created || isBlank(target.getTagCoin())) target.setTagCoin(row.tagCoin());
        if (created || target.getTagChange() == null) target.setTagChange(row.tagChange());
    }

    private List<JSONObject> flattenRows(JSONArray items) {
        List<JSONObject> rows = new ArrayList<>();
        if (items == null || items.isEmpty()) {
            return rows;
        }
        for (int i = 0; i < items.size(); i++) {
            JSONObject item = items.getJSONObject(i);
            if (item == null) {
                continue;
            }
            JSONArray details = item.getJSONArray("details");
            if (details != null && !details.isEmpty()) {
                for (int j = 0; j < details.size(); j++) {
                    JSONObject detail = details.getJSONObject(j);
                    if (detail != null) {
                        rows.add(detail);
                    }
                }
                continue;
            }
            rows.add(item);
        }
        return rows;
    }

    private OkHttpClient http() {
        return new OkHttpClient.Builder()
                .connectTimeout(Duration.ofMillis(properties.getTimeoutMs()))
                .readTimeout(Duration.ofMillis(properties.getTimeoutMs()))
                .build();
    }

    private String buildFallbackContent(String summary) {
        List<String> parts = new ArrayList<>();
        parts.add("<div " + AUTO_FALLBACK_MARKER + ">");
        if (!isBlank(summary)) {
            parts.add("<p>" + escapeHtml(summary) + "</p>");
        }
        parts.add("</div>");
        return String.join("", parts);
    }

    private String buildPrimarySourceUrl(JSONObject row) {
        String direct = firstNonBlank(
                row.getString("sourceUrl"),
                row.getString("url"),
                row.getString("link"),
                row.getString("annUrl")
        );
        if (!isBlank(direct)) {
            return direct;
        }
        String slug = firstNonBlank(row.getString("slug"), row.getString("annSlug"));
        if (isBlank(slug) || isBlank(properties.getArticleBaseUrl())) {
            return null;
        }
        return properties.getArticleBaseUrl().replaceAll("/+$", "") + "/" + slug.replaceAll("^/+", "");
    }

    private boolean needsArticleFetch(News target, boolean created, String directContent, String cover, String sourceUrl) {
        if (isBlank(sourceUrl)) {
            return false;
        }
        if (!isBlank(directContent) && !isBlank(cover) && !created) {
            return shouldRefreshGeneratedContent(target.getContent()) || isBlank(target.getAuthorAvatar());
        }
        if (created) {
            return true;
        }
        if (isBlank(target.getCover()) || isBlank(target.getAuthorAvatar())) {
            return true;
        }
        return shouldRefreshGeneratedContent(target.getContent());
    }

    private boolean shouldRefreshGeneratedContent(String content) {
        if (isBlank(content)) {
            return true;
        }
        String lower = content.toLowerCase();
        return content.contains(AUTO_FALLBACK_MARKER)
                || content.contains("原文链接")
                || content.contains("鍘熸枃")
                || lower.contains("utm_source=rss_feed");
    }

    private boolean shouldReplaceContent(String content) {
        return isBlank(content) || shouldRefreshGeneratedContent(content);
    }

    private boolean shouldReplaceCover(String cover) {
        return isBlank(cover) || isGenericCover(cover);
    }

    private ArticleDetail fetchArticleDetail(String sourceUrl) {
        if (isBlank(sourceUrl)) {
            return null;
        }

        Request request = new Request.Builder()
                .url(sourceUrl)
                .header("User-Agent", "Mozilla/5.0")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", firstNonBlank(properties.getAcceptLanguage(), "zh-CN"))
                .build();

        try (Response response = http().newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                return null;
            }
            String html = response.body().string();
            if (isBlank(html)) {
                return null;
            }
            Document doc = Jsoup.parse(html, sourceUrl);
            String summary = firstNonBlank(
                    selectMeta(doc, "meta[name=description]"),
                    selectMeta(doc, "meta[property=og:description]"),
                    extractBodyTextMeta(doc)
            );
            String cover = normalizeCover(firstNonBlank(
                    selectMeta(doc, "meta[property=og:image]"),
                    selectMeta(doc, "meta[name=twitter:image]"),
                    firstContentImage(doc)
            ));
            String author = normalizeAuthor(firstNonBlank(
                    selectMeta(doc, "meta[name=author]"),
                    textOfFirst(doc, "[class*=author]"),
                    textOfFirst(doc, "[data-testid*=author]")
            ));
            String authorAvatar = normalizeAvatar(firstNonBlank(
                    avatarFromJsonBlob(html),
                    attrOfFirst(doc, "[class*=author] img[src]", "src"),
                    attrOfFirst(doc, "[data-testid*=author] img[src]", "src"),
                    attrOfFirst(doc, "meta[property=profile:username]", "content")
            ));
            String content = extractArticleContent(doc, html, sourceUrl);
            return new ArticleDetail(content, cover, summary, author, authorAvatar);
        } catch (Exception e) {
            log.debug("fetch article detail failed: {}", sourceUrl, e);
            return null;
        }
    }

    private String extractArticleContent(Document doc, String html, String sourceUrl) {
        String cointelegraphBody = cointelegraphBodyFromJson(html);
        if (!isBlank(cointelegraphBody)) {
            return sanitizeArticleHtml(cointelegraphBody, sourceUrl);
        }

        Element best = null;
        int bestScore = 0;
        for (String selector : ARTICLE_SELECTORS) {
            for (Element candidate : doc.select(selector)) {
                int score = scoreContentCandidate(candidate);
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
        }
        if (best == null || bestScore < 80) {
            return null;
        }
        return sanitizeArticleHtml(best.html(), sourceUrl);
    }

    private String sanitizeArticleHtml(String html, String sourceUrl) {
        if (isBlank(html)) {
            return null;
        }
        Document fragment = Jsoup.parseBodyFragment(html, sourceUrl);
        Element body = fragment.body();
        if (body == null) {
            return null;
        }
        body.select("script, style, noscript, iframe, button, nav, header, footer, svg, form, aside").remove();
        body.select("a").unwrap();
        for (Element image : body.select("img[src]")) {
            String src = normalizeUrl(firstNonBlank(image.absUrl("src"), image.attr("src")));
            if (isBlank(src) || src.startsWith("data:")) {
                image.remove();
                continue;
            }
            image.attr("src", src);
            image.removeAttr("srcset");
            image.removeAttr("sizes");
        }
        body.select("*").forEach(element -> {
            element.removeAttr("style");
            element.removeAttr("onclick");
            element.removeAttr("onload");
            element.removeAttr("target");
            element.removeAttr("rel");
            element.removeAttr("href");
            if (!element.tagName().equals("img")) {
                element.removeAttr("class");
            }
        });

        Safelist safelist = Safelist.none()
                .addTags("p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote",
                        "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
                        "section", "article", "figure", "figcaption", "img", "code", "pre", "span", "div")
                .addAttributes("img", "src", "alt", "title")
                .addAttributes("th", "colspan", "rowspan")
                .addAttributes("td", "colspan", "rowspan");

        Document.OutputSettings outputSettings = new Document.OutputSettings();
        outputSettings.prettyPrint(false);
        String cleaned = Jsoup.clean(body.html(), sourceUrl, safelist, outputSettings).trim();
        return isBlank(cleaned) ? null : cleaned;
    }

    private int scoreContentCandidate(Element element) {
        if (element == null) {
            return 0;
        }
        String text = element.text();
        if (isBlank(text)) {
            return 0;
        }
        int paragraphCount = element.select("p").size();
        int imageCount = element.select("img").size();
        int listCount = element.select("li").size();
        int headingCount = element.select("h1, h2, h3").size();
        int lengthScore = Math.min(text.length(), 2000);
        return lengthScore + paragraphCount * 80 + listCount * 20 + imageCount * 40 + headingCount * 20;
    }

    private String selectMeta(Document doc, String selector) {
        if (doc == null) {
            return null;
        }
        Element meta = doc.selectFirst(selector);
        return meta == null ? null : firstNonBlank(meta.attr("content"));
    }

    private String firstContentImage(Document doc) {
        if (doc == null) {
            return null;
        }
        for (Element image : doc.select("article img[src], main img[src], img[src]")) {
            String src = normalizeCover(firstNonBlank(image.absUrl("src"), image.attr("src")));
            if (!isBlank(src) && !src.startsWith("data:")) {
                return src;
            }
        }
        return null;
    }

    private String firstDescriptionImage(String html) {
        if (isBlank(html)) {
            return null;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        Element image = doc.selectFirst("img[src]");
        if (image == null) {
            return null;
        }
        return normalizeUrl(firstNonBlank(image.absUrl("src"), image.attr("src")));
    }

    private String extractRssSummary(String html, String title) {
        if (isBlank(html)) {
            return title;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        doc.select("img").remove();
        String text = doc.text();
        return firstNonBlank(text, title);
    }

    private String cointelegraphBodyFromJson(String html) {
        return firstJsonField(html, "\"bodyText\":\"", "\"");
    }

    private String avatarFromJsonBlob(String html) {
        String avatar = firstJsonField(html, "\"author\":{\"id\":", "\"avatar\":\"");
        if (isBlank(avatar)) {
            avatar = firstJsonField(html, "\"author\":{\"avatar\":\"", "\"");
        }
        return decodeJsonString(avatar);
    }

    private String extractBodyTextMeta(Document doc) {
        return firstNonBlank(
                textOfFirst(doc, "[class*=lead]"),
                textOfFirst(doc, "[class*=summary]")
        );
    }

    private String firstJsonField(String html, String anchorPrefix, String fieldPrefix) {
        if (isBlank(html) || isBlank(fieldPrefix)) {
            return null;
        }
        int start = 0;
        if (!isBlank(anchorPrefix)) {
            start = html.indexOf(anchorPrefix);
            if (start < 0) {
                return null;
            }
        }
        int fieldIndex = html.indexOf(fieldPrefix, start);
        if (fieldIndex < 0) {
            return null;
        }
        int valueStart = fieldIndex + fieldPrefix.length();
        StringBuilder sb = new StringBuilder();
        boolean escaping = false;
        for (int i = valueStart; i < html.length(); i++) {
            char ch = html.charAt(i);
            if (escaping) {
                sb.append(ch);
                escaping = false;
                continue;
            }
            if (ch == '\\') {
                escaping = true;
                sb.append(ch);
                continue;
            }
            if (ch == '"') {
                break;
            }
            sb.append(ch);
        }
        return decodeJsonString(sb.toString());
    }

    private String decodeJsonString(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return JSON.parseObject("{\"v\":\"" + value + "\"}").getString("v");
        } catch (Exception e) {
            return value
                    .replace("\\u003C", "<")
                    .replace("\\u003E", ">")
                    .replace("\\u002F", "/")
                    .replace("\\\"", "\"")
                    .replace("\\n", "\n");
        }
    }

    private String normalizeCover(String cover) {
        if (isBlank(cover)) {
            return null;
        }
        String normalized = normalizeUrl(cover);
        return isGenericCover(normalized) ? null : normalized;
    }

    private String normalizeAvatar(String avatar) {
        if (isBlank(avatar)) {
            return null;
        }
        String normalized = normalizeUrl(avatar);
        if (isBlank(normalized) || normalized.startsWith("data:")) {
            return null;
        }
        String lower = normalized.toLowerCase();
        boolean looksLikeImage = lower.matches(".*\\.(png|jpg|jpeg|gif|webp|svg)(\\?.*)?$")
                || lower.contains("/uploads/")
                || lower.contains("avatar")
                || lower.contains("profile")
                || lower.contains("pravatar");
        return looksLikeImage ? normalized : null;
    }

    private String normalizeUrl(String value) {
        if (isBlank(value)) {
            return null;
        }
        String normalized = value.trim()
                .replace("\\/", "/")
                .replace("&amp;", "&")
                .replace("\n", "")
                .replace("\r", "");
        return normalized.replaceAll("\\?utm_[^\\s\"']*", "");
    }

    private boolean isGenericCover(String cover) {
        if (isBlank(cover)) {
            return false;
        }
        return OKX_GENERIC_COVER.equalsIgnoreCase(cover.trim());
    }

    private LocalDateTime parsePublishedAt(String value) {
        if (isBlank(value)) {
            return LocalDateTime.now();
        }
        try {
            long millis = Long.parseLong(value);
            if (millis < 1_000_000_000_000L) {
                millis = millis * 1000L;
            }
            return LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZONE_ID);
        } catch (NumberFormatException ignore) {
            // continue with string parsing fallbacks
        }
        try {
            return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).withZoneSameInstant(ZONE_ID).toLocalDateTime();
        } catch (DateTimeParseException ignore) {
            // continue
        }
        try {
            return ZonedDateTime.parse(value).withZoneSameInstant(ZONE_ID).toLocalDateTime();
        } catch (DateTimeParseException ignore) {
            // continue
        }
        try {
            return LocalDateTime.parse(value.replace(" ", "T"));
        } catch (Exception ignore) {
            return LocalDateTime.now();
        }
    }

    private String normalizeLang(String value) {
        if (isBlank(value)) {
            return "zh-CN";
        }
        String lower = value.trim().toLowerCase();
        return switch (lower) {
            case "zh-hk", "zh-tw", "tc", "tw", "zh-hant" -> "zh-TW";
            case "zh-cn", "zh", "cn", "sc" -> "zh-CN";
            case "en-us", "en" -> "en";
            default -> value.trim();
        };
    }

    private String normalizeAuthor(String value) {
        if (isBlank(value)) {
            return null;
        }
        String normalized = value.trim()
                .replace("Cointelegraph by", "")
                .replace("Cointelegraph 作者", "")
                .replace("by", "")
                .trim();
        return normalized.isBlank() ? null : normalized;
    }

    private Integer defaultInt(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private BigDecimal parseBigDecimal(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String textOf(Element parent, String selector) {
        if (parent == null) {
            return null;
        }
        Element element = parent.selectFirst(selector);
        return element == null ? null : firstNonBlank(element.text(), element.html());
    }

    private String attrOf(Element parent, String selector, String attr) {
        if (parent == null) {
            return null;
        }
        Element element = parent.selectFirst(selector);
        if (element == null) {
            return null;
        }
        return normalizeUrl(firstNonBlank(element.absUrl(attr), element.attr(attr)));
    }

    private String textOfFirst(Document doc, String selector) {
        if (doc == null) {
            return null;
        }
        Element element = doc.selectFirst(selector);
        return element == null ? null : firstNonBlank(element.text());
    }

    private String attrOfFirst(Document doc, String selector, String attr) {
        if (doc == null) {
            return null;
        }
        Element element = doc.selectFirst(selector);
        if (element == null) {
            return null;
        }
        return normalizeUrl(firstNonBlank(element.absUrl(attr), element.attr(attr)));
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private record RemoteNewsRow(
            String externalId,
            String title,
            String summary,
            String content,
            String cover,
            String authorAvatar,
            String author,
            String sourceName,
            String sourceUrl,
            String lang,
            LocalDateTime publishedAt,
            String tagCoin,
            BigDecimal tagChange
    ) {
    }

    private record ArticleDetail(String content, String cover, String summary, String author, String authorAvatar) {
    }

    private record SyncCount(int inserted, int processed) {
    }

    public record SyncResult(int fetched, int inserted, int processed) {
    }
}
