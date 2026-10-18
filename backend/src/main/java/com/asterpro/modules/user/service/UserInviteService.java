package com.asterpro.modules.user.service;

import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserInvite;
import com.asterpro.modules.user.mapper.UserInviteMapper;
import com.asterpro.modules.user.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserInviteService {

    private final UserMapper userMapper;
    private final UserInviteMapper inviteMapper;

    /**
     * 根据邀请码找到推荐人 id；找不到返回 null
     */
    public Long findInviterIdByCode(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) return null;
        User u = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getInviteCode, inviteCode)
                .last("LIMIT 1"));
        return u == null ? null : u.getId();
    }

    /**
     * 建立 1-3 级邀请关系：直推、间推、三级
     */
    public void buildInviteTree(Long userId, Long parentId) {
        if (parentId == null) return;
        insert(userId, parentId, 1);
        User parent = userMapper.selectById(parentId);
        if (parent != null && parent.getParentId() != null) {
            insert(userId, parent.getParentId(), 2);
            User grand = userMapper.selectById(parent.getParentId());
            if (grand != null && grand.getParentId() != null) {
                insert(userId, grand.getParentId(), 3);
            }
        }
    }

    private void insert(Long userId, Long ancestorId, int level) {
        UserInvite r = new UserInvite();
        r.setUserId(userId);
        r.setParentId(ancestorId);
        r.setLevel(level);
        inviteMapper.insert(r);
    }
}
