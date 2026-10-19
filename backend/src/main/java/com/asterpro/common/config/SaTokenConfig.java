package com.asterpro.common.config;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import com.asterpro.modules.admin.auth.StpAdminUtil;
import com.asterpro.modules.admin.service.AdminPermissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class SaTokenConfig implements WebMvcConfigurer {

    private final AdminPermissionService adminPermissionService;
    private final AdminApiAccessLogInterceptor adminApiAccessLogInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminApiAccessLogInterceptor).addPathPatterns("/admin/**");
        registry.addInterceptor(new SaInterceptor(handler -> {
            // 后台路径：独立 admin token；登录接口放行
            SaRouter
                    .match("/admin/**")
                    .notMatch("/admin/auth/login")
                    .check(r -> {
                        StpAdminUtil.checkLogin();
                        adminPermissionService.checkPath(currentPath());
                    });

            // 用户端
            SaRouter
                .match("/**")
                .notMatch(
                    "/auth/**",
                    "/public/**",
                    "/asset/coin/list",
                    "/finance/loan/estimate",
                    "/support/public/**",
                    "/public/support/**",
                    "/announcement/public/**",
                    "/quote/public/**",
                    "/news/public/**",
                    "/symbol/public/**",
                    "/option/public/**",
                    "/finance/lock/public/**",
                    "/finance/portfolio/public/**",
                    "/finance/loan/public/**",
                    "/finance/ai/public/**",
                    "/nft/public/**",
                    "/follow/public/**",
                    "/dynamic/public/**",
                    "/uploads/**",
                    "/callback/udun/**",
                    "/ws/**",
                    "/admin/**",     // 由上面的 admin 拦截器处理
                    "/error",
                    "/favicon.ico"
                )
                .check(r -> StpUtil.checkLogin());
        })).addPathPatterns("/**");
    }

    private String currentPath() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return "";
        HttpServletRequest request = attrs.getRequest();
        String contextPath = request.getContextPath();
        String uri = request.getRequestURI();
        return contextPath == null || contextPath.isBlank() ? uri : uri.substring(contextPath.length());
    }
}
