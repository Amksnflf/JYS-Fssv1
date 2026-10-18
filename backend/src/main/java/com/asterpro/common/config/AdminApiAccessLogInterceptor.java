package com.asterpro.common.config;

import com.asterpro.modules.admin.auth.StpAdminUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
public class AdminApiAccessLogInterceptor implements HandlerInterceptor {

    private static final String START_TIME_ATTR = "adminApiStartTime";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Object start = request.getAttribute(START_TIME_ATTR);
        long costMs = start instanceof Long startedAt ? System.currentTimeMillis() - startedAt : -1L;
        log.info("admin_api method={} path={} adminId={} status={} costMs={} error={}",
                request.getMethod(),
                request.getRequestURI(),
                currentAdminId(),
                response.getStatus(),
                costMs,
                ex == null ? "" : ex.getClass().getSimpleName());
    }

    private String currentAdminId() {
        try {
            return StpAdminUtil.isLogin() ? String.valueOf(StpAdminUtil.getLoginIdAsLong()) : "-";
        } catch (Exception ignored) {
            return "-";
        }
    }
}
