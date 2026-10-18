package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserInvite;
import com.asterpro.modules.user.mapper.UserInviteMapper;
import com.asterpro.modules.user.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/invite")
@RequiredArgsConstructor
public class AdminInviteController {

    private final UserInviteMapper inviteMapper;
    private final UserMapper userMapper;

    @GetMapping("/stats")
    public R<Map<String, Object>> stats(@RequestParam(required = false) Long parentId) {
        Map<String, Object> m = new HashMap<>();
        LambdaQueryWrapper<UserInvite> base = new LambdaQueryWrapper<>();
        if (parentId != null) base.eq(UserInvite::getParentId, parentId);
        m.put("totalRelations", inviteMapper.selectCount(base));
        for (int level = 1; level <= 3; level++) {
            LambdaQueryWrapper<UserInvite> w = new LambdaQueryWrapper<>();
            if (parentId != null) w.eq(UserInvite::getParentId, parentId);
            w.eq(UserInvite::getLevel, level);
            m.put("level" + level, inviteMapper.selectCount(w));
        }
        return R.ok(m);
    }

    @GetMapping("/relation/page")
    public R<Page<InviteRelationVO>> relationPage(@RequestParam(required = false) Long parentId,
                                                  @RequestParam(required = false) Long userId,
                                                  @RequestParam(required = false) Integer level,
                                                  @RequestParam(defaultValue = "1") int pageNo,
                                                  @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UserInvite> w = new LambdaQueryWrapper<>();
        if (parentId != null) w.eq(UserInvite::getParentId, parentId);
        if (userId != null) w.eq(UserInvite::getUserId, userId);
        if (level != null) w.eq(UserInvite::getLevel, level);
        w.orderByDesc(UserInvite::getId);

        Page<UserInvite> p = inviteMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w);
        List<Long> ids = p.getRecords().stream()
                .flatMap(x -> java.util.stream.Stream.of(x.getUserId(), x.getParentId()))
                .distinct()
                .collect(Collectors.toList());
        Map<Long, User> users = ids.isEmpty()
                ? new HashMap<>()
                : userMapper.selectBatchIds(ids).stream().collect(Collectors.toMap(User::getId, x -> x));

        List<InviteRelationVO> rows = p.getRecords().stream().map(x -> {
            InviteRelationVO vo = new InviteRelationVO();
            vo.setId(x.getId());
            vo.setUserId(x.getUserId());
            vo.setParentId(x.getParentId());
            vo.setLevel(x.getLevel());
            vo.setCreatedAt(String.valueOf(x.getCreatedAt()));
            User child = users.get(x.getUserId());
            User parent = users.get(x.getParentId());
            if (child != null) {
                vo.setUserUid(child.getUid());
                vo.setUserNickname(child.getNickname());
            }
            if (parent != null) {
                vo.setParentUid(parent.getUid());
                vo.setParentNickname(parent.getNickname());
            }
            return vo;
        }).collect(Collectors.toList());

        Page<InviteRelationVO> ret = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        ret.setRecords(rows);
        return R.ok(ret);
    }

    @Data
    public static class InviteRelationVO {
        private Long id;
        private Long userId;
        private String userUid;
        private String userNickname;
        private Long parentId;
        private String parentUid;
        private String parentNickname;
        private Integer level;
        private String createdAt;
    }
}
