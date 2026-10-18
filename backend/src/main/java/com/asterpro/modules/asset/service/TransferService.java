package com.asterpro.modules.asset.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.TransferLog;
import com.asterpro.modules.asset.mapper.TransferLogMapper;

import java.util.Set;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferLogMapper logMapper;
    private final AccountService accountService;

    private static final Set<Integer> VALID_ACCOUNTS = Set.of(Account.SPOT, Account.TRADE, Account.FINANCE);

    @Transactional
    public TransferLog transfer(Long userId, int from, int to, String coin, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) throw new BizException("Amount must be greater than 0"); // 金额必须大于 0
        if (!VALID_ACCOUNTS.contains(from) || !VALID_ACCOUNTS.contains(to)) {
            throw new BizException("Invalid account type"); // 账户类型错误
        }
        if (from == to) throw new BizException("Source and target accounts are the same"); // 源账户与目标账户相同
        String orderNo = "T" + IdUtil.getSnowflakeNextIdStr();
        accountService.transfer(userId, from, to, coin, amount, orderNo);
        TransferLog l = new TransferLog();
        l.setOrderNo(orderNo);
        l.setUserId(userId);
        l.setFromAccount(from);
        l.setToAccount(to);
        l.setCoin(coin);
        l.setAmount(amount);
        logMapper.insert(l);
        return l;
    }

    public Page<TransferLog> myPage(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<TransferLog> w = new LambdaQueryWrapper<>();
        w.eq(TransferLog::getUserId, userId).orderByDesc(TransferLog::getCreatedAt);
        return logMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
