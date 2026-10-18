package com.asterpro.modules.asset.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.AccountLog;
import com.asterpro.modules.asset.mapper.AccountLogMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BillService {

    private final AccountLogMapper mapper;

    public Page<AccountLog> page(Long userId, int pageNo, int pageSize,
                                 String coin, String bizType, Integer accountType,
                                 LocalDateTime start, LocalDateTime end) {
        LambdaQueryWrapper<AccountLog> w = new LambdaQueryWrapper<>();
        w.eq(AccountLog::getUserId, userId);
        if (StrUtil.isNotBlank(coin)) w.eq(AccountLog::getCoin, coin);
        if (StrUtil.isNotBlank(bizType)) w.eq(AccountLog::getBizType, bizType);
        if (accountType != null) w.eq(AccountLog::getAccountType, accountType);
        if (start != null) w.ge(AccountLog::getCreatedAt, start);
        if (end != null) w.le(AccountLog::getCreatedAt, end);
        w.orderByDesc(AccountLog::getCreatedAt);
        return mapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
