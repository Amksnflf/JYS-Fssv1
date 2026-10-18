package com.asterpro.common.util;

import cn.hutool.core.util.StrUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class RequestUtil {

    private RequestUtil() {}

    public static HttpServletRequest current() {
        ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attr == null ? null : attr.getRequest();
    }

    public static String ip() {
        HttpServletRequest req = current();
        if (req == null) return null;
        String[] headers = {"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"};
        for (String h : headers) {
            String v = req.getHeader(h);
            if (StrUtil.isNotBlank(v) && !"unknown".equalsIgnoreCase(v)) {
                int comma = v.indexOf(',');
                return comma > 0 ? v.substring(0, comma).trim() : v.trim();
            }
        }
        return req.getRemoteAddr();
    }

    public static String ua() {
        HttpServletRequest req = current();
        return req == null ? null : req.getHeader("User-Agent");
    }
}
