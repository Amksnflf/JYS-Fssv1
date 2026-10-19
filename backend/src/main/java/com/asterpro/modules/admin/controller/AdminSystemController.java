package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PasswordUtil;
import com.asterpro.modules.admin.auth.StpAdminUtil;
import com.asterpro.modules.admin.entity.AdminRole;
import com.asterpro.modules.admin.entity.AdminUser;
import com.asterpro.modules.admin.mapper.AdminRoleMapper;
import com.asterpro.modules.admin.mapper.AdminUserMapper;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.admin.service.AdminPermissionService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/system")
@RequiredArgsConstructor
public class AdminSystemController {

    private final AdminUserMapper adminUserMapper;
    private final AdminRoleMapper adminRoleMapper;
    private final AdminAuthService authService;
    private final AdminLogService logService;
    private final AdminPermissionService permissionService;

    @GetMapping("/admin/page")
    public R<Page<AdminUser>> adminPage(@RequestParam(required = false) String keyword,
                                        @RequestParam(required = false) Integer status,
                                        @RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<AdminUser> w = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            w.and(q -> q.like(AdminUser::getUsername, keyword)
                    .or().like(AdminUser::getNickname, keyword));
        }
        if (status != null) w.eq(AdminUser::getStatus, status);
        w.orderByDesc(AdminUser::getId);
        Page<AdminUser> page = adminUserMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w);
        page.getRecords().forEach(u -> u.setPassword(null));
        return R.ok(page);
    }

    @PostMapping("/admin/save")
    public R<AdminUser> saveAdmin(@RequestBody AdminUserDTO dto) {
        validateAdminUser(dto);
        Long opId = authService.currentAdminId();
        if (dto.getId() != null && dto.getId().equals(opId) && dto.getStatus() != null && dto.getStatus() == 0) {
            throw new BizException("Cannot disable current logged-in admin"); // 不能停用当前登录管理员
        }
        AdminUser u;
        if (dto.getId() != null) {
            u = adminUserMapper.selectById(dto.getId());
            if (u == null) return R.fail("管理员不存在");
            u.setUsername(dto.getUsername().trim());
            u.setNickname(dto.getNickname());
            u.setAvatar(dto.getAvatar());
            u.setRoleId(dto.getRoleId());
            if (dto.getStatus() != null) {
                u.setStatus(dto.getStatus());
            }
            if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                u.setPassword(PasswordUtil.hash(dto.getPassword()));
            }
            adminUserMapper.updateById(u);
            if (dto.getStatus() != null && dto.getStatus() == 0) {
                StpAdminUtil.kickout(dto.getId());
            }
        } else {
            if (dto.getPassword() == null || dto.getPassword().isBlank()) {
                throw new BizException("Password is required for new admin"); // 新增管理员必须设置密码
            }
            u = new AdminUser();
            u.setUsername(dto.getUsername().trim());
            u.setPassword(PasswordUtil.hash(dto.getPassword()));
            u.setNickname(dto.getNickname());
            u.setAvatar(dto.getAvatar());
            u.setRoleId(dto.getRoleId());
            u.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
            adminUserMapper.insert(u);
        }
        logService.log(opId, "system", "admin_save", "admin_user",
                String.valueOf(u.getId()), u.getUsername());
        permissionService.clearPermissionCache(u.getId());
        u.setPassword(null);
        return R.ok(u);
    }

    @PostMapping("/admin/{id}/status")
    public R<Void> setAdminStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        if (dto == null || !isValidStatus(dto.getStatus())) {
            return R.fail("管理员状态不合法");
        }
        Long opId = authService.currentAdminId();
        if (id.equals(opId) && dto.getStatus() == 0) {
            return R.fail("Cannot disable current logged-in admin"); // 不能停用当前登录管理员
        }
        AdminUser u = adminUserMapper.selectById(id);
        if (u == null) return R.fail("管理员不存在");
        u.setStatus(dto.getStatus());
        adminUserMapper.updateById(u);
        if (dto.getStatus() == 0) {
            StpAdminUtil.kickout(id);
        }
        logService.log(opId, "system", "admin_status",
                "admin_user", String.valueOf(id), String.valueOf(dto.getStatus()));
        permissionService.clearPermissionCache(id);
        return R.ok();
    }

    @PostMapping("/admin/{id}/reset-password")
    public R<Void> resetPassword(@PathVariable Long id, @RequestBody PasswordDTO dto) {
        AdminUser u = adminUserMapper.selectById(id);
        if (u == null) return R.fail("管理员不存在");
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new BizException("Password cannot be empty"); // 密码不能为空
        }
        u.setPassword(PasswordUtil.hash(dto.getPassword()));
        adminUserMapper.updateById(u);
        logService.log(authService.currentAdminId(), "system", "admin_reset_password",
                "admin_user", String.valueOf(id), null);
        permissionService.clearPermissionCache(id);
        return R.ok();
    }

    @GetMapping("/role/list")
    public R<java.util.List<AdminRole>> roleList() {
        return R.ok(adminRoleMapper.selectList(new LambdaQueryWrapper<AdminRole>()
                .orderByAsc(AdminRole::getId)));
    }

    @PostMapping("/role/save")
    public R<AdminRole> saveRole(@RequestBody AdminRole dto) {
        if (dto.getId() != null) {
            adminRoleMapper.updateById(dto);
        } else {
            adminRoleMapper.insert(dto);
        }
        logService.log(authService.currentAdminId(), "system", "role_save",
                "admin_role", String.valueOf(dto.getId()), dto.getCode());
        permissionService.clearPermissionCache();
        return R.ok(dto);
    }

    @PostMapping("/role/{id}/delete")
    public R<Void> deleteRole(@PathVariable Integer id) {
        long used = adminUserMapper.selectCount(new LambdaQueryWrapper<AdminUser>().eq(AdminUser::getRoleId, id));
        if (used > 0) {
            throw new BizException("This role is assigned to admins and cannot be deleted"); // 该角色已分配管理员，不能删除
        }
        adminRoleMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "system", "role_delete",
                "admin_role", String.valueOf(id), null);
        permissionService.clearPermissionCache();
        return R.ok();
    }

    private void validateAdminUser(AdminUserDTO dto) {
        if (dto == null) {
            throw new BizException("Admin info cannot be empty"); // 管理员信息不能为空
        }
        if (dto.getUsername() == null || dto.getUsername().isBlank()) {
            throw new BizException("Username cannot be empty"); // 用户名不能为空
        }
        if (dto.getRoleId() == null || adminRoleMapper.selectById(dto.getRoleId()) == null) {
            throw new BizException("Please select a valid role"); // 请选择有效角色
        }
        if (dto.getStatus() != null && !isValidStatus(dto.getStatus())) {
            throw new BizException("Invalid admin status"); // 管理员状态不合法
        }
        LambdaQueryWrapper<AdminUser> w = new LambdaQueryWrapper<AdminUser>()
                .eq(AdminUser::getUsername, dto.getUsername().trim());
        if (dto.getId() != null) {
            w.ne(AdminUser::getId, dto.getId());
        }
        if (adminUserMapper.selectCount(w) > 0) {
            throw new BizException("Username already exists"); // 用户名已存在
        }
    }

    private boolean isValidStatus(Integer status) {
        return status != null && (status == 0 || status == 1);
    }

    @Data
    public static class AdminUserDTO {
        private Long id;
        private String username;
        private String password;
        private String nickname;
        private String avatar;
        private Integer roleId;
        private Integer status;
    }

    @Data
    public static class StatusDTO {
        private Integer status;
    }

    @Data
    public static class PasswordDTO {
        private String password;
    }
}
