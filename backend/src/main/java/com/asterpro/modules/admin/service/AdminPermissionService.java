package com.asterpro.modules.admin.service;

import com.alibaba.fastjson2.JSON;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.admin.entity.AdminRole;
import com.asterpro.modules.admin.entity.AdminUser;
import com.asterpro.modules.admin.mapper.AdminRoleMapper;
import com.asterpro.modules.admin.mapper.AdminUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Arrays;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminPermissionService {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final long PERMISSION_CACHE_TTL_MS = 60_000L;

    private static final List<String> AUTHENTICATED_PATHS = List.of(
            "/admin/auth/me",
            "/admin/auth/logout",
            "/admin/content/coin/list",
            "/admin/content/symbol/list",
            "/admin/upload/**"
    );

    private static final List<Map.Entry<String, String>> PATH_PERMISSIONS = List.of(
            Map.entry("/admin/stats/dashboard", "dashboard:view"),
            Map.entry("/admin/stats/daily", "report:view"),
            Map.entry("/admin/stats/risk", "report:view"),
            Map.entry("/admin/stats/admin-log/**", "system:log"),
            Map.entry("/admin/user/*/security/reset-*", "user:security"),
            Map.entry("/admin/user/*/security/unbind", "user:security"),
            Map.entry("/admin/user/kyc/**", "user:kyc"),
            Map.entry("/admin/user/page", "user:view"),
            Map.entry("/admin/user/*", "user:view"),
            Map.entry("/admin/user/**", "user:*"),
            Map.entry("/admin/asset/deposit-address/**", "asset:deposit-address"),
            Map.entry("/admin/asset/user-deposit-address/**", "asset:deposit-address"),
            Map.entry("/admin/asset/deposit-channel/**", "asset:deposit-address"),
            Map.entry("/admin/asset/udun-config/**", "asset:deposit-address"),
            Map.entry("/admin/asset/udun-coin/**", "asset:deposit-address"),
            Map.entry("/admin/asset/udun-callback/**", "asset:deposit-address"),
            Map.entry("/admin/asset/account/**", "asset:view"),
            Map.entry("/admin/asset/bill/**", "asset:view"),
            Map.entry("/admin/asset/transfer/**", "asset:view"),
            Map.entry("/admin/asset/user-address/*/delete", "asset:address"),
            Map.entry("/admin/asset/user-address/*/whitelist", "asset:address"),
            Map.entry("/admin/asset/user-address/**", "asset:view"),
            Map.entry("/admin/asset/deposit/**", "asset:audit"),
            Map.entry("/admin/asset/withdraw/**", "asset:audit"),
            Map.entry("/admin/asset/adjust", "asset:adjust"),
            Map.entry("/admin/trade/offset/**", "control:offset"),
            Map.entry("/admin/trade/winrate/**", "control:winrate"),
            Map.entry("/admin/trade/perp/position/**/force-*", "trade:intervene"),
            Map.entry("/admin/trade/spot/*/cancel", "trade:cancel"),
            Map.entry("/admin/trade/perp/order/*/cancel", "trade:cancel"),
            Map.entry("/admin/trade/option/*/cancel", "trade:cancel"),
            Map.entry("/admin/trade/**", "trade:view"),
            Map.entry("/admin/content/feedback/**", "content:feedback"),
            Map.entry("/admin/content/coin/**", "content:coin"),
            Map.entry("/admin/content/symbol/**", "content:symbol"),
            Map.entry("/admin/content/**", "content:*"),
            Map.entry("/admin/support/ticket/reply", "support:reply"),
            Map.entry("/admin/support/ticket/status", "support:reply"),
            Map.entry("/admin/support/ticket/assign", "support:assign"),
            Map.entry("/admin/support/config/**", "support:config"),
            Map.entry("/admin/support/**", "support:view"),
            Map.entry("/admin/upload/**", "content:coin"),
            Map.entry("/admin/system/**", "system:*"),
            Map.entry("/admin/invite/**", "report:view"),
            Map.entry("/admin/finance-control/**", "finance-control:*"),
            Map.entry("/admin/ops/loan-order/**", "ops:loan"),
            Map.entry("/admin/ops/nft-order/**", "ops:nft"),
            Map.entry("/admin/ops/follow-*/**", "ops:follow"),
            Map.entry("/admin/ops/dynamic/**", "ops:dynamic"),
            Map.entry("/admin/ops/risk-rule/**", "ops:risk"),
            Map.entry("/admin/ops/i18n/**", "ops:i18n"),
            Map.entry("/admin/ops/config/**", "ops:config"),
            Map.entry("/admin/ops/**", "ops:*")
    );

    private final AdminUserMapper userMapper;
    private final AdminRoleMapper roleMapper;
    private final ConcurrentHashMap<Long, PermissionCache> permissionCache = new ConcurrentHashMap<>();

    public void checkPath(String path) {
        if (isAuthenticatedPath(path)) return;
        String permission = permissionFor(path);
        if (permission == null) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        if (!hasPermission(permission)) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
    }

    public boolean hasPermission(String permission) {
        return matchPermission(permissionsOf(com.asterpro.modules.admin.auth.StpAdminUtil.getLoginIdAsLong()), permission);
    }

    public Set<String> permissionsOf(AdminUser user) {
        if (user == null || (user.getStatus() != null && user.getStatus() == 0) || user.getRoleId() == null) return Set.of();
        AdminRole role = roleMapper.selectById(user.getRoleId());
        if (role == null) return Set.of();
        return parsePermissions(role.getPermissions());
    }

    public Set<String> permissionsOf(Long adminId) {
        long now = System.currentTimeMillis();
        PermissionCache cached = permissionCache.get(adminId);
        if (cached != null && cached.expiresAt() > now) {
            return cached.permissions();
        }
        AdminUser user = userMapper.selectById(adminId);
        if (user == null || user.getRoleId() == null || (user.getStatus() != null && user.getStatus() == 0)) {
            permissionCache.remove(adminId);
            return Set.of();
        }
        Set<String> permissions = permissionsOf(user);
        permissionCache.put(adminId, new PermissionCache(permissions, now + PERMISSION_CACHE_TTL_MS));
        return permissions;
    }

    public void clearPermissionCache() {
        permissionCache.clear();
    }

    public void clearPermissionCache(Long adminId) {
        if (adminId != null) permissionCache.remove(adminId);
    }

    private String permissionFor(String path) {
        return PATH_PERMISSIONS.stream()
                .filter(e -> MATCHER.match(e.getKey(), path))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private boolean isAuthenticatedPath(String path) {
        return AUTHENTICATED_PATHS.stream().anyMatch(p -> MATCHER.match(p, path));
    }

    private Set<String> parsePermissions(String permissions) {
        if (permissions == null || permissions.isBlank()) return Set.of();
        try {
            return JSON.parseArray(permissions, String.class).stream()
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toSet());
        } catch (Exception ignored) {
            return Arrays.stream(permissions.split("[,\\n]"))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toSet());
        }
    }

    private boolean matchPermission(Set<String> owned, String required) {
        if (owned.contains("*") || owned.contains(required)) return true;
        int idx = required.indexOf(':');
        return idx > 0 && owned.contains(required.substring(0, idx) + ":*");
    }

    private record PermissionCache(Set<String> permissions, long expiresAt) {
    }
}
