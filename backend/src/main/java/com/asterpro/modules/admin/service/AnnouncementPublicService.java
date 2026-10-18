package com.asterpro.modules.admin.service;

import com.asterpro.modules.admin.entity.Announcement;
import com.asterpro.modules.admin.mapper.AnnouncementMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AnnouncementPublicService {

    private static final Pattern HTML_PATTERN = Pattern.compile("<[a-zA-Z!/][^>]*>");
    private static final List<String> FALLBACK_LANGS = List.of("en", "zh-CN", "zh-TW");

    private final AnnouncementMapper announcementMapper;

    public Page<Announcement> page(int pageNo, int pageSize, String lang) {
        Page<Announcement> page = selectPage(pageNo, pageSize, lang);
        if (page.getTotal() > 0 || lang == null || lang.isBlank()) {
            return page;
        }
        for (String fallbackLang : FALLBACK_LANGS) {
            if (fallbackLang.equalsIgnoreCase(lang)) {
                continue;
            }
            Page<Announcement> fallbackPage = selectPage(pageNo, pageSize, fallbackLang);
            if (fallbackPage.getTotal() > 0) {
                return fallbackPage;
            }
        }
        return page;
    }

    public Announcement detail(Integer id) {
        Announcement announcement = announcementMapper.selectOne(new LambdaQueryWrapper<Announcement>()
                .eq(Announcement::getId, id)
                .eq(Announcement::getPublished, 1)
                .last("LIMIT 1"));
        if (announcement != null) {
            announcement.setContent(normalizeContent(announcement.getContent()));
        }
        return announcement;
    }

    private Page<Announcement> selectPage(int pageNo, int pageSize, String lang) {
        LambdaQueryWrapper<Announcement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Announcement::getPublished, 1);
        if (lang != null && !lang.isBlank()) {
            wrapper.eq(Announcement::getLang, lang);
        }
        wrapper.orderByDesc(Announcement::getTop)
                .orderByDesc(Announcement::getPublishedAt)
                .orderByDesc(Announcement::getId);
        return announcementMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), wrapper);
    }

    private String normalizeContent(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String content = raw.replace("\r\n", "\n").replace('\r', '\n').trim();
        if (looksLikeHtml(content)) {
            return sanitizeHtml(content);
        }
        return plainTextToHtml(content);
    }

    private String sanitizeHtml(String html) {
        Document doc = Jsoup.parseBodyFragment(html);
        Element body = doc.body();
        body.select("script, style, noscript, iframe, button, nav, header, footer, svg, form, aside").remove();
        body.select("a").unwrap();
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
            lines.add(line);
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

    private boolean looksLikeHtml(String value) {
        return HTML_PATTERN.matcher(value).find();
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
