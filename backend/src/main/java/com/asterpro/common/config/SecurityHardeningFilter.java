package com.asterpro.common.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHardeningFilter implements Filter {

    private static final List<String> BLOCKED_USER_AGENTS = List.of(
            "sqlmap", "nikto", "nmap", "masscan", "zgrab", "nuclei",
            "acunetix", "nessus", "xray", "awvs", "dirbuster", "gobuster", "python-httpx"
    );

    private static final List<String> BLOCKED_URI_FRAGMENTS = List.of(
            "/.env", "/.git", "/actuator", "/swagger", "/v3/api-docs",
            "/druid", "/phpmyadmin", "/wp-admin"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpReq && response instanceof HttpServletResponse httpResp) {
            httpResp.setHeader("X-Content-Type-Options", "nosniff");
            httpResp.setHeader("X-Frame-Options", "DENY");
            httpResp.setHeader("X-XSS-Protection", "1; mode=block");
            httpResp.setHeader("Referrer-Policy", "no-referrer");
            httpResp.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
            httpResp.setHeader("Server", "WebServer");

            String ua = httpReq.getHeader("User-Agent");
            if (ua != null) {
                String lowerUa = ua.toLowerCase();
                for (String blockedUa : BLOCKED_USER_AGENTS) {
                    if (lowerUa.contains(blockedUa)) {
                        httpResp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        return;
                    }
                }
            }

            String uri = httpReq.getRequestURI();
            if (uri != null) {
                String lowerUri = uri.toLowerCase();
                for (String fragment : BLOCKED_URI_FRAGMENTS) {
                    if (lowerUri.contains(fragment)) {
                        httpResp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        return;
                    }
                }
            }
        }
        chain.doFilter(request, response);
    }
}
