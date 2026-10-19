package com.asterpro.modules.admin.auth;

import cn.dev33.satoken.stp.StpLogic;

/**
 * 后台管理员独立的 Sa-Token 登录器（loginType="admin"），与用户端 StpUtil 隔离
 * - tokenName 改为 "Admin-Authorization"，避免与用户端 token 冲突
 */
public final class StpAdminUtil {

    public static final StpLogic LOGIC = new StpLogic("admin") {
        @Override
        public String getTokenName() {
            return "Admin-Authorization";
        }
    };

    private StpAdminUtil() {}

    public static void login(Object id) {
        LOGIC.login(id);
    }

    public static String getTokenValue() {
        return LOGIC.getTokenValue();
    }

    public static String getTokenName() {
        return LOGIC.getTokenName();
    }

    public static long getLoginIdAsLong() {
        return LOGIC.getLoginIdAsLong();
    }

    public static boolean isLogin() {
        return LOGIC.isLogin();
    }

    public static void checkLogin() {
        LOGIC.checkLogin();
    }

    public static void logout() {
        LOGIC.logout();
    }

    public static void logout(Object id) {
        LOGIC.logout(id);
    }

    public static void kickout(Object id) {
        LOGIC.kickout(id);
    }
}
