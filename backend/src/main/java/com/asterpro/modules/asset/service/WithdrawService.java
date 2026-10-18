package com.asterpro.modules.asset.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.entity.UserAddress;
import com.asterpro.modules.asset.entity.WithdrawOrder;
import com.asterpro.modules.asset.mapper.UserAddressMapper;
import com.asterpro.modules.asset.mapper.WithdrawOrderMapper;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import com.asterpro.common.util.PasswordUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WithdrawService {

    private final WithdrawOrderMapper mapper;
    private final CoinService coinService;
    private final AccountService accountService;
    private final UserSecurityMapper securityMapper;
    private final UserAddressMapper userAddressMapper;

    @Transactional
    public WithdrawOrder submit(Long userId, String coinCode, String chain,
                                BigDecimal amount, String toAddress, String memo,
                                String payPassword) {
        Coin coin = coinService.mustGet(coinCode);
        if (coin.getWithdrawEnabled() == null || coin.getWithdrawEnabled() != 1) {
            throw new BizException(ResultCode.WITHDRAW_DISABLED);
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        if (coin.getMinWithdraw() != null && amount.compareTo(coin.getMinWithdraw()) < 0) {
            throw new BizException("Amount below minimum withdrawal " + coin.getMinWithdraw().toPlainString()); // 低于最小提现金额
        }
        if (StrUtil.isBlank(toAddress)) {
            throw new BizException("Please enter withdrawal address"); // 请输入提现地址
        }
        String orderChain = StrUtil.isBlank(chain) ? coin.getChain() : chain;
        if (!coinService.isSupportedChain(coinCode, orderChain)) {
            throw new BizException("Withdrawal network not supported"); // 提现网络不支持
        }
//        if (!coinService.looksLikeChainAddress(orderChain, toAddress)) {
//            throw new BizException("提现地址格式错误");
//        }

        String trimmedAddress = toAddress.trim();
        UserAddress book = userAddressMapper.selectOne(new LambdaQueryWrapper<UserAddress>()
                .eq(UserAddress::getUserId, userId)
                .eq(UserAddress::getCoin, coinCode)
                .eq(UserAddress::getChain, orderChain)
                .eq(UserAddress::getAddress, trimmedAddress)
                .last("LIMIT 1"));
        if (book == null) {
            throw new BizException("Please add this withdrawal address to address book first"); // 请先在地址簿中添加该提币地址
        }

//        UserSecurity sec = securityMapper.selectById(userId);
//        if (sec == null || StrUtil.isBlank(sec.getPayPassword())) {
//            throw new BizException("请先设置交易密码");
//        }
//        if (StrUtil.isBlank(payPassword) || !PasswordUtil.matches(payPassword, sec.getPayPassword())) {
//            throw new BizException(ResultCode.PAY_PWD_ERROR);
//        }

        BigDecimal fee = coin.getWithdrawFee() == null ? BigDecimal.ZERO : coin.getWithdrawFee();
        BigDecimal total = amount.add(fee);

        String orderNo = "W" + IdUtil.getSnowflakeNextIdStr();
        accountService.freeze(userId, Account.SPOT, coinCode, total,
                "withdraw", orderNo, "提现冻结（含手续费）");

        WithdrawOrder o = new WithdrawOrder();
        o.setOrderNo(orderNo);
        o.setUserId(userId);
        o.setCoin(coinCode);
        o.setChain(orderChain);
        o.setAmount(amount);
        o.setFee(fee);
        o.setToAddress(toAddress);
        o.setMemo(memo);
        o.setStatus(0);
        mapper.insert(o);
        return o;
    }

    public Page<WithdrawOrder> myPage(Long userId, int pageNo, int pageSize, Integer status) {
        LambdaQueryWrapper<WithdrawOrder> w = new LambdaQueryWrapper<>();
        w.eq(WithdrawOrder::getUserId, userId);
        if (status != null) w.eq(WithdrawOrder::getStatus, status);
        w.orderByDesc(WithdrawOrder::getCreatedAt);
        return mapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }

    /** 管理后台：标记打款成功 */
    @Transactional
    public void markPaid(Long orderId, Long auditorId, String txHash) {
        WithdrawOrder o = mapper.selectById(orderId);
        if (o == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        if (o.getStatus() == 2 || o.getStatus() == 3) throw new BizException("Order already in final state"); // 订单已终态
        o.setStatus(2);
        o.setTxHash(txHash);
        o.setAuditedBy(auditorId);
        o.setAuditedAt(LocalDateTime.now());
        mapper.updateById(o);
        BigDecimal total = o.getAmount().add(o.getFee() == null ? BigDecimal.ZERO : o.getFee());
        accountService.deductFrozen(o.getUserId(), Account.SPOT, o.getCoin(), total,
                "withdraw", o.getOrderNo(), "提现打款完成");
    }

    /** 管理后台：通过初审，进入线下/链上打款处理中 */
    @Transactional
    public void markProcessing(Long orderId, Long auditorId, String remark) {
        WithdrawOrder o = mapper.selectById(orderId);
        if (o == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        if (o.getStatus() == 2 || o.getStatus() == 3) throw new BizException("Order already in final state"); // 订单已终态
        o.setStatus(1);
        o.setAuditRemark(remark);
        o.setAuditedBy(auditorId);
        o.setAuditedAt(LocalDateTime.now());
        mapper.updateById(o);
    }

    /** 管理后台：驳回 → 退回资金 */
    @Transactional
    public void reject(Long orderId, Long auditorId, String remark) {
        WithdrawOrder o = mapper.selectById(orderId);
        if (o == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        if (o.getStatus() == 2 || o.getStatus() == 3) throw new BizException("Order already in final state"); // 订单已终态
        o.setStatus(3);
        o.setAuditRemark(remark);
        o.setAuditedBy(auditorId);
        o.setAuditedAt(LocalDateTime.now());
        mapper.updateById(o);
        BigDecimal back = o.getAmount().add(o.getFee() == null ? BigDecimal.ZERO : o.getFee());
        accountService.unfreeze(o.getUserId(), Account.SPOT, o.getCoin(), back,
                "withdraw", o.getOrderNo(), "提现驳回解冻");
    }

    public Page<WithdrawOrder> adminPage(int pageNo, int pageSize, Integer status, Long userId, String coin) {
        LambdaQueryWrapper<WithdrawOrder> w = new LambdaQueryWrapper<>();
        if (status != null) w.eq(WithdrawOrder::getStatus, status);
        if (userId != null) w.eq(WithdrawOrder::getUserId, userId);
        if (StrUtil.isNotBlank(coin)) w.eq(WithdrawOrder::getCoin, coin);
        w.orderByDesc(WithdrawOrder::getCreatedAt);
        return mapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }
}
