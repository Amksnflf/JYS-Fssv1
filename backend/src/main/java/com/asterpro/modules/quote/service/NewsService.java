package com.asterpro.modules.quote.service;

import com.asterpro.modules.quote.entity.News;
import com.asterpro.modules.quote.mapper.NewsMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class NewsService {

    private static final Pattern HTML_PATTERN = Pattern.compile("<[a-zA-Z!/][^>]*>");
    private static final Pattern URL_ONLY_PATTERN = Pattern.compile("^(https?://|www\\.)\\S+$", Pattern.CASE_INSENSITIVE);

    private final NewsMapper mapper;

    public Page<News> page(int pageNo, int pageSize, String lang) {
        LambdaQueryWrapper<News> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(News::getPublished, 1);
        if (lang != null && !lang.isBlank()) {
            wrapper.eq(News::getLang, lang);
        }
        wrapper.orderByDesc(News::getPublishedAt);
        return mapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), wrapper);
    }

    public News detail(Integer id) {
        News news = mapper.selectOne(new LambdaQueryWrapper<News>()
                .eq(News::getId, id)
                .eq(News::getPublished, 1)
                .last("LIMIT 1"));
        if (news != null) {
            news.setViewCount((news.getViewCount() == null ? 0 : news.getViewCount()) + 1);
            mapper.updateById(news);
            news.setContent(stripLinks(news.getContent()));
        }
        return news;
    }

    public News save(News dto) {
        normalize(dto);
        if (dto.getId() != null) {
            mapper.updateById(dto);
        } else {
            mapper.insert(dto);
        }
        return dto;
    }

    private void normalize(News dto) {
        dto.setTitle(trimToNull(dto.getTitle()));
        dto.setSummary(trimToNull(dto.getSummary()));
        dto.setContent(normalizeContent(dto.getContent()));
        dto.setAuthor(trimToNull(dto.getAuthor()));
        dto.setAuthorAvatar(normalizeMediaUrl(dto.getAuthorAvatar()));
        dto.setSourceName(trimToNull(dto.getSourceName()));
        dto.setSourceUrl(trimToNull(dto.getSourceUrl()));
        dto.setCover(normalizeMediaUrl(dto.getCover()));
        if ((dto.getSummary() == null || dto.getSummary().isBlank()) && dto.getContent() != null) {
            dto.setSummary(buildSummaryFromContent(dto.getContent()));
        }
        if (dto.getSourceName() == null) dto.setSourceName("Manual");
        if (dto.getAuthor() == null) dto.setAuthor("Aster Pro");
        if (dto.getLang() == null || dto.getLang().isBlank()) dto.setLang("zh-CN");
        if (dto.getPublished() == null) dto.setPublished(1);
        if (dto.getLikeCount() == null) dto.setLikeCount(0);
        if (dto.getViewCount() == null) dto.setViewCount(0);
        if (dto.getPublishedAt() == null && Integer.valueOf(1).equals(dto.getPublished())) {
            dto.setPublishedAt(LocalDateTime.now());
        }
    }

    private String normalizeContent(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String content = raw.replace("\r\n", "\n").replace('\r', '\n').trim();
        if (looksLikeHtml(content)) {
            return stripLinks(content);
        }
        return plainTextToHtml(content);
    }

    private String stripLinks(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        Element body = doc.body();
        body.select("script, style, noscript, iframe, button, nav, header, footer, svg, form, aside").remove();
        body.select("a").unwrap();
        for (Element image : body.select("img[src]")) {
            String src = normalizeMediaUrl(image.attr("src"));
            if (src == null || src.startsWith("data:")) {
                image.remove();
                continue;
            }
            image.attr("src", src);
            image.removeAttr("srcset");
            image.removeAttr("sizes");
        }
        body.select("p, li, div, blockquote, span, figcaption, section, article").removeIf(node -> {
            String text = node.text();
            return text != null && isNoiseText(text);
        });
        body.select("*").forEach(element -> {
            element.removeAttr("style");
            element.removeAttr("onclick");
            element.removeAttr("onload");
            element.removeAttr("target");
            element.removeAttr("rel");
            element.removeAttr("href");
            if (!"img".equals(element.tagName())) {
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
        String cleaned = Jsoup.clean(body.html(), "", safelist, outputSettings).trim();
        return cleaned.isBlank() ? null : cleaned;
    }

    private String plainTextToHtml(String text) {
        List<String> parts = new ArrayList<>();
        List<String> lines = new ArrayList<>();
        for (String rawLine : text.split("\n")) {
            String line = rawLine == null ? "" : rawLine.trim();
            if (line.isBlank()) {
                appendParagraph(parts, lines);
                continue;
            }
            if (!isNoiseText(line)) {
                lines.add(line);
            }
        }
        appendParagraph(parts, lines);
        return parts.isEmpty() ? null : String.join("", parts);
    }

    private void appendParagraph(List<String> parts, List<String> lines) {
        if (lines.isEmpty()) {
            return;
        }
        List<String> escapedLines = new ArrayList<>();
        for (String line : lines) {
            escapedLines.add(escapeHtml(line));
        }
        parts.add("<p>" + String.join("<br />", escapedLines) + "</p>");
        lines.clear();
    }

    private String buildSummaryFromContent(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String text = Jsoup.parse(content).text().replaceAll("\\s+", " ").trim();
        if (text.isBlank()) {
            return null;
        }
        return text.length() <= 120 ? text : text.substring(0, 120) + "...";
    }

    private boolean looksLikeHtml(String value) {
        return HTML_PATTERN.matcher(value).find();
    }

    private boolean isNoiseText(String text) {
        if (text == null) {
            return false;
        }
        String normalized = text.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return false;
        }
        String lower = normalized.toLowerCase();
        return normalized.contains("原文链接")
                || normalized.contains("点击查看原文")
                || normalized.contains("点击阅读全文")
                || normalized.contains("阅读原文")
                || normalized.contains("相关阅读")
                || normalized.contains("相关推荐")
                || normalized.contains("推荐阅读")
                || normalized.contains("原文地址")
                || normalized.contains("查看全文")
                || normalized.contains("更多详情")
                || lower.startsWith("related:")
                || lower.startsWith("related ")
                || lower.contains("utm_source=rss_feed")
                || URL_ONLY_PATTERN.matcher(normalized).matches();
    }

    private String normalizeMediaUrl(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        String normalized = trimmed
                .replace("\\/", "/")
                .replace("&amp;", "&")
                .replace("\n", "")
                .replace("\r", "");
        if (normalized.startsWith("data:")) {
            return null;
        }
        if (normalized.startsWith("//")) {
            return "https:" + normalized;
        }
        int apiUploadsIndex = normalized.indexOf("/api/uploads/");
        if (apiUploadsIndex >= 0) {
            return normalized.substring(apiUploadsIndex + 4);
        }
        int uploadsIndex = normalized.indexOf("/uploads/");
        if (uploadsIndex >= 0) {
            return normalized.substring(uploadsIndex);
        }
        return normalized.replaceAll("\\?utm_[^\\s\"']*", "");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
