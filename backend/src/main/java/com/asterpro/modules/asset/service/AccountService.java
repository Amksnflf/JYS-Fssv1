package com.asterpro.modules.asset.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.AccountLog;
import com.asterpro.modules.asset.mapper.AccountLogMapper;
import com.asterpro.modules.asset.mapper.AccountMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * 账户余额加减 + 流水入库
 * 所有方法均需在事务中执行；写流水时使用 MP 乐观锁防止并发覆盖。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountMapper accountMapper;
    private final AccountLogMapper logMapper;

    /** 取或建账户（不抛错） */
    @Transactional
    public Account getOrCreate(Long userId, int accountType, String coin) {
        Account a = find(userId, accountType, coin);
        if (a != null) return a;
        a = new Account();
        a.setUserId(userId);
        a.setAccountType(accountType);
        a.setCoin(coin);
        a.setAvailable(BigDecimal.ZERO);
        a.setFrozen(BigDecimal.ZERO);
        a.setVersion(0L);
        try {
            accountMapper.insert(a);
        } catch (Exception e) {
            // 唯一索引冲突，重新查
            a = find(userId, accountType, coin);
        }
        return a;
    }

    public Account find(Long userId, int accountType, String coin) {
        LambdaQueryWrapper<Account> w = new LambdaQueryWrapper<>();
        w.eq(Account::getUserId, userId)
                .eq(Account::getAccountType, accountType)
                .eq(Account::getCoin, coin)
                .last("LIMIT 1");
        return accountMapper.selectOne(w);
    }

    public List<Account> listByUser(Long userId) {
        LambdaQueryWrapper<Account> w = new LambdaQueryWrapper<>();
        w.eq(Account::getUserId, userId);
        return accountMapper.selectList(w);
    }

    public List<Account> listByUserType(Long userId, int accountType) {
        LambdaQueryWrapper<Account> w = new LambdaQueryWrapper<>();
        w.eq(Account::getUserId, userId).eq(Account::getAccountType, accountType);
        return accountMapper.selectList(w);
    }

    /** 增加可用余额并记账 */
    @Transactional
    public void increase(Long userId, int accountType, String coin,
                         BigDecimal amount, String bizType, String bizId, String remark) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        Account a = lockOrCreate(userId, accountType, coin);
        a.setAvailable(a.getAvailable().add(amount));
        int rows = accountMapper.updateById(a);
        if (rows == 0) {
            // 乐观锁冲突，重试一次
            a = find(userId, accountType, coin);
            a.setAvailable(a.getAvailable().add(amount));
            rows = accountMapper.updateById(a);
            if (rows == 0) throw new BizException("Account busy, please retry"); // 账户繁忙，请重试
        }
        writeLog(userId, accountType, coin, bizType, bizId, amount, a.getAvailable(), remark);
    }

    /** 扣减可用余额并记账（不足抛错） */
    @Transactional
    public void decrease(Long userId, int accountType, String coin,
                         BigDecimal amount, String bizType, String bizId, String remark) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        Account a = lockOrCreate(userId, accountType, coin);
        if (a.getAvailable().compareTo(amount) < 0) {
            throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
        }
        a.setAvailable(a.getAvailable().subtract(amount));
        int rows = accountMapper.updateById(a);
        if (rows == 0) {
            a = find(userId, accountType, coin);
            if (a.getAvailable().compareTo(amount) < 0) {
                throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
            }
            a.setAvailable(a.getAvailable().subtract(amount));
            rows = accountMapper.updateById(a);
            if (rows == 0) throw new BizException("Account busy, please retry"); // 账户繁忙，请重试
        }
        writeLog(userId, accountType, coin, bizType, bizId, amount.negate(), a.getAvailable(), remark);
    }

    /** 冻结可用余额，待业务终态再确认扣减或解冻。 */
    @Transactional
    public void freeze(Long userId, int accountType, String coin,
                       BigDecimal amount, String bizType, String bizId, String remark) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        Account a = lockOrCreate(userId, accountType, coin);
        if (a.getAvailable().compareTo(amount) < 0) {
            throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
        }
        a.setAvailable(a.getAvailable().subtract(amount));
        a.setFrozen(a.getFrozen().add(amount));
        int rows = accountMapper.updateById(a);
        if (rows == 0) throw new BizException("Account busy, please retry"); // 账户繁忙，请重试
        writeLog(userId, accountType, coin, bizType, bizId, amount.negate(), a.getAvailable(), remark);
    }

    @Transactional
    public void unfreeze(Long userId, int accountType, String coin,
                         BigDecimal amount, String bizType, String bizId, String remark) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        Account a = lockOrCreate(userId, accountType, coin);
        if (a.getFrozen().compareTo(amount) < 0) {
            throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
        }
        a.setFrozen(a.getFrozen().subtract(amount));
        a.setAvailable(a.getAvailable().add(amount));
        int rows = accountMapper.updateById(a);
        if (rows == 0) throw new BizException("Account busy, please retry"); // 账户繁忙，请重试
        writeLog(userId, accountType, coin, bizType, bizId, amount, a.getAvailable(), remark);
    }

    @Transactional
    public void deductFrozen(Long userId, int accountType, String coin,
                             BigDecimal amount, String bizType, String bizId, String remark) {
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        Account a = lockOrCreate(userId, accountType, coin);
        if (a.getFrozen().compareTo(amount) < 0) {
            throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
        }
        a.setFrozen(a.getFrozen().subtract(amount));
        int rows = accountMapper.updateById(a);
        if (rows == 0) throw new BizException("Account busy, please retry"); // 账户繁忙，请重试
        writeLog(userId, accountType, coin, bizType, bizId, amount.negate(), a.getAvailable(), remark);
    }

    /** 划转：A 账户 -> B 账户（同币种） */
    @Transactional
    public void transfer(Long userId, int from, int to, String coin, BigDecimal amount, String bizId) {
        if (from == to) throw new BizException("Source and target accounts are the same"); // 源账户与目标账户相同
        decrease(userId, from, coin, amount, "transfer", bizId, "划转出");
        increase(userId, to, coin, amount, "transfer", bizId, "划转入");
    }

    /** 直接调账（管理后台用） */
    @Transactional
    public void adminAdjust(Long userId, int accountType, String coin,
                            BigDecimal delta, Long operatorId, String remark) {
        if (delta == null || delta.signum() == 0) return;
        Account a = lockOrCreate(userId, accountType, coin);
        BigDecimal next = a.getAvailable().add(delta);
        if (next.signum() < 0) throw new BizException(ResultCode.BALANCE_NOT_ENOUGH);
        a.setAvailable(next);
        accountMapper.updateById(a);
        String r = (remark == null ? "" : remark) + "（操作人 " + operatorId + "）";
        writeLog(userId, accountType, coin, "admin_adjust",
                IdUtil.simpleUUID().substring(0, 16), delta, next, r);
    }

    private Account lockOrCreate(Long userId, int accountType, String coin) {
        Account a = find(userId, accountType, coin);
        if (a == null) a = getOrCreate(userId, accountType, coin);
        return a;
    }

    private void writeLog(Long userId, int accountType, String coin,
                          String bizType, String bizId, BigDecimal amount,
                          BigDecimal balanceAfter, String remark) {
        AccountLog l = new AccountLog();
        l.setUserId(userId);
        l.setAccountType(accountType);
        l.setCoin(coin);
        l.setBizType(bizType);
        l.setBizId(bizId);
        l.setAmount(amount);
        l.setBalanceAfter(balanceAfter);
        l.setRemark(remark);
        logMapper.insert(l);
    }
}
