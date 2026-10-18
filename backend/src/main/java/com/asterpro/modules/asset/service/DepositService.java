package com.asterpro.modules.asset.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.entity.DepositChannelConfig;
import com.asterpro.modules.asset.entity.DepositOrder;
import com.asterpro.modules.asset.entity.UdunCoinMapping;
import com.asterpro.modules.asset.mapper.DepositOrderMapper;
import com.asterpro.modules.asset.mapper.UdunCoinMappingMapper;
import com.asterpro.modules.asset.udun.UdunClient;
import com.asterpro.modules.asset.udun.UdunRuntimeConfig;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.alibaba.fastjson2.JSONObject;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DepositService {

    private final DepositOrderMapper mapper;
    private final CoinService coinService;
    private final AccountService accountService;
    private final DepositChannelService channelService;
    private final UdunConfigService udunConfigService;
    private final UdunCoinMappingMapper udunCoinMappingMapper;
    private final UdunClient udunClient;

    @Transactional
    public DepositOrder submit(Long userId, String coinCode, String chain,
                               BigDecimal amount, String txHash,
                               String fromAddress, String toAddress, String screenshotUrl) {
        Coin coin = coinService.mustGet(coinCode);
        if (coin.getDepositEnabled() == null || coin.getDepositEnabled() != 1) {
            throw new BizException(ResultCode.COIN_DISABLED);
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        if (coin.getMinDeposit() != null && amount.compareTo(coin.getMinDeposit()) < 0) {
            throw new BizException("Amount below minimum deposit " + coin.getMinDeposit().toPlainString()); // 低于最小充值金额
        }
        if (!coinService.isSupportedChain(coinCode, chain)) {
            throw new BizException("Deposit network not supported"); // 充值网络不支持
        }
        if (StrUtil.isBlank(txHash)) {
            throw new BizException("Please enter on-chain transaction hash"); // 请输入链上交易哈希
        }
        String orderChain = StrUtil.isBlank(chain) ? coin.getChain() : chain;
        if (StrUtil.isBlank(toAddress)) {
            throw new BizException("No available deposit address, please contact customer service"); // 暂无可用充值地址，请联系客服
        }
//        if (!coinService.isPlatformDepositAddress(coinCode, orderChain, toAddress)) {
//            throw new BizException("Please select the correct receiving address"); // 请选择正确的收款地址
//        }
//        if (StrUtil.isBlank(fromAddress) || !coinService.looksLikeChainAddress(orderChain, fromAddress)) {
//            throw new BizException("Please enter the correct sender address"); // 请输入正确的付款地址
//        }
        String normalizedTxHash = StrUtil.trim(txHash);
//        Long existed = mapper.selectCount(new LambdaQueryWrapper<DepositOrder>()
//                .eq(DepositOrder::getCoin, coinCode)
//                .eq(DepositOrder::getChain, orderChain)
//                .eq(DepositOrder::getTxHash, normalizedTxHash));
//        if (existed != null && existed > 0) {
//            throw new BizException(ResultCode.PARAM_ERROR.getCode(), "This transaction hash has already been submitted, please do not submit again"); // 该链上交易哈希已提交，请勿重复提交
//        }

        DepositOrder o = new DepositOrder();
        o.setOrderNo("D" + IdUtil.getSnowflakeNextIdStr());
        o.setUserId(userId);
        o.setCoin(coinCode);
        o.setChain(orderChain);
        o.setAmount(amount);
        o.setChannel(DepositChannelConfig.MODE_MANUAL);
        o.setTxHash(normalizedTxHash);
        o.setFromAddress(fromAddress);
        o.setToAddress(toAddress);
        o.setScreenshotUrl(screenshotUrl);
        o.setStatus(0);
        try {
            mapper.insert(o);
        } catch (DuplicateKeyException e) {
            throw new BizException(ResultCode.PARAM_ERROR.getCode(), "This transaction hash has already been submitted, please do not submit again"); // 该链上交易哈希已提交，请勿重复提交
        }
        return o;
    }

    @Transactional
    public DepositOrder createUdunOrder(Long userId, String coinCode, String chain, BigDecimal expectedAmount) {
        Coin coin = coinService.mustGet(coinCode);
        if (coin.getDepositEnabled() == null || coin.getDepositEnabled() != 1) {
            throw new BizException(ResultCode.COIN_DISABLED);
        }
        String orderChain = StrUtil.isBlank(chain) ? coin.getChain() : chain;
        DepositChannelConfig channel = channelService.resolve(coinCode, orderChain);
        if (channel.getUdunEnabled() == null || channel.getUdunEnabled() != 1) {
            throw new BizException("Auto deposit not enabled for this coin"); // 当前币种暂未开启自动充值
        }
        if (expectedAmount != null && expectedAmount.signum() > 0) {
            if (coin.getMinDeposit() != null && expectedAmount.compareTo(coin.getMinDeposit()) < 0) {
                throw new BizException("Amount below minimum deposit " + coin.getMinDeposit().toPlainString()); // 低于最小充值金额
            }
            if (channel.getMinAmount() != null && expectedAmount.compareTo(channel.getMinAmount()) < 0) {
                throw new BizException("Amount below auto deposit minimum " + channel.getMinAmount().toPlainString()); // 低于自动充值最小金额
            }
            if (channel.getMaxAmount() != null && expectedAmount.compareTo(channel.getMaxAmount()) > 0) {
                throw new BizException("Amount exceeds auto deposit maximum " + channel.getMaxAmount().toPlainString()); // 高于自动充值最大金额
            }
        }
        UdunCoinMapping mapping = findUdunMapping(coinCode, orderChain);
        String orderNo = "D" + IdUtil.getSnowflakeNextIdStr();
        JSONObject result = udunClient.createAddress(mapping.getMainCoinType(), orderNo);
        JSONObject data = result.getJSONObject("data");
        String address = data == null ? null : data.getString("address");
        if (StrUtil.isBlank(address)) {
            throw new BizException("Udun did not return deposit address"); // 优盾未返回充值地址
        }

        DepositOrder o = new DepositOrder();
        o.setOrderNo(orderNo);
        o.setUserId(userId);
        o.setCoin(coinCode);
        o.setChain(orderChain);
        o.setAmount(expectedAmount == null || expectedAmount.signum() <= 0 ? BigDecimal.ZERO : expectedAmount);
        o.setExpectedAmount(expectedAmount);
        o.setChannel(DepositChannelConfig.MODE_UDUN);
        o.setMainCoinType(mapping.getMainCoinType());
        o.setCoinType(mapping.getCoinType());
        o.setToAddress(address);
        o.setStatus(3);
        UdunRuntimeConfig runtimeConfig = udunConfigService.current();
        o.setExpireAt(LocalDateTime.now().plusMinutes(runtimeConfig.getAddressExpireMinutes()));
        mapper.insert(o);
        return o;
    }

    @Transactional
    public void handleUdunDeposit(String address, String mainCoinType, String coinType, String amountRaw,
                                  String decimalsRaw, String txId, String tradeId, String blockHigh) {
        if (StrUtil.hasBlank(address, coinType, amountRaw, decimalsRaw, txId)) {
            throw new BizException("Udun callback parameters incomplete"); // 优盾回调参数不完整
        }
        DepositOrder handled = mapper.selectOne(new LambdaQueryWrapper<DepositOrder>()
                .eq(DepositOrder::getChannel, DepositChannelConfig.MODE_UDUN)
                .eq(DepositOrder::getTxHash, txId)
                .eq(DepositOrder::getCoinType, coinType)
                .eq(DepositOrder::getStatus, 1)
                .last("LIMIT 1"));
        if (handled != null) {
            return;
        }
        Integer decimals = Integer.valueOf(decimalsRaw);
        BigDecimal actualAmount = new BigDecimal(amountRaw).divide(BigDecimal.TEN.pow(decimals), decimals, RoundingMode.DOWN)
                .stripTrailingZeros();
        DepositOrder order = mapper.selectOne(new LambdaQueryWrapper<DepositOrder>()
                .eq(DepositOrder::getChannel, DepositChannelConfig.MODE_UDUN)
                .eq(DepositOrder::getToAddress, address)
                .eq(DepositOrder::getCoinType, coinType)
                .in(DepositOrder::getStatus, 3, 5, 6)
                .orderByDesc(DepositOrder::getId)
                .last("LIMIT 1"));
        if (order == null) {
            throw new BizException("No matching Udun deposit order found"); // 未匹配到优盾充值订单
        }
        int rows = mapper.update(null, new LambdaUpdateWrapper<DepositOrder>()
                .eq(DepositOrder::getId, order.getId())
                .in(DepositOrder::getStatus, 3, 5, 6)
                .set(DepositOrder::getStatus, 1)
                .set(DepositOrder::getAmount, actualAmount)
                .set(DepositOrder::getActualAmount, actualAmount)
                .set(DepositOrder::getTxHash, txId)
                .set(DepositOrder::getChannelTradeId, tradeId)
                .set(DepositOrder::getBlockHigh, blockHigh)
                .set(DepositOrder::getAuditedAt, LocalDateTime.now())
                .set(DepositOrder::getAuditRemark, "优盾回调自动上分"));
        if (rows == 0) return;
        accountService.increase(order.getUserId(), Account.SPOT, order.getCoin(),
                actualAmount, "deposit", order.getOrderNo(), "优盾充值自动上分");
    }

    public Page<DepositOrder> myPage(Long userId, int pageNo, int pageSize, Integer status) {
        LambdaQueryWrapper<DepositOrder> w = new LambdaQueryWrapper<>();
        w.eq(DepositOrder::getUserId, userId);
        if (status != null) w.eq(DepositOrder::getStatus, status);
        w.orderByDesc(DepositOrder::getCreatedAt);
        return mapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }

    public DepositOrder userOrder(Long userId, String orderNo) {
        DepositOrder order = mapper.selectOne(new LambdaQueryWrapper<DepositOrder>()
                .eq(DepositOrder::getUserId, userId)
                .eq(DepositOrder::getOrderNo, orderNo)
                .last("LIMIT 1"));
        if (order == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        return order;
    }

    /** 管理后台审核通过：上分到现货账户。CAS 防止并发重复加余额 */
    @Transactional
    public void approve(Long orderId, Long auditorId, String remark) {
        DepositOrder o = mapper.selectById(orderId);
        if (o == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        if (o.getStatus() != 0) throw new BizException("Order already processed"); // 订单已处理
        int rows = mapper.update(null, new LambdaUpdateWrapper<DepositOrder>()
                .eq(DepositOrder::getId, orderId)
                .eq(DepositOrder::getStatus, 0)
                .set(DepositOrder::getStatus, 1)
                .set(DepositOrder::getAuditedBy, auditorId)
                .set(DepositOrder::getAuditedAt, LocalDateTime.now())
                .set(DepositOrder::getAuditRemark, remark));
        if (rows == 0) throw new BizException("Order already processed"); // 订单已处理
        accountService.increase(o.getUserId(), Account.SPOT, o.getCoin(),
                o.getAmount(), "deposit", o.getOrderNo(), "充值上分");
    }

    @Transactional
    public void reject(Long orderId, Long auditorId, String remark) {
        DepositOrder o = mapper.selectById(orderId);
        if (o == null) throw new BizException(ResultCode.ORDER_NOT_EXIST);
        if (o.getStatus() != 0) throw new BizException("Order already processed"); // 订单已处理
        int rows = mapper.update(null, new LambdaUpdateWrapper<DepositOrder>()
                .eq(DepositOrder::getId, orderId)
                .eq(DepositOrder::getStatus, 0)
                .set(DepositOrder::getStatus, 2)
                .set(DepositOrder::getAuditedBy, auditorId)
                .set(DepositOrder::getAuditedAt, LocalDateTime.now())
                .set(DepositOrder::getAuditRemark, remark));
        if (rows == 0) throw new BizException("Order already processed"); // 订单已处理
    }

    public Page<DepositOrder> adminPage(int pageNo, int pageSize, Integer status, Long userId, String coin) {
        LambdaQueryWrapper<DepositOrder> w = new LambdaQueryWrapper<>();
        if (status != null) w.eq(DepositOrder::getStatus, status);
        if (userId != null) w.eq(DepositOrder::getUserId, userId);
        if (StrUtil.isNotBlank(coin)) w.eq(DepositOrder::getCoin, coin);
        w.orderByDesc(DepositOrder::getCreatedAt);
        return mapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }

    private UdunCoinMapping findUdunMapping(String coin, String chain) {
        UdunCoinMapping mapping = udunCoinMappingMapper.selectOne(new LambdaQueryWrapper<UdunCoinMapping>()
                .eq(UdunCoinMapping::getCoin, coin)
                .eq(UdunCoinMapping::getChain, chain)
                .eq(UdunCoinMapping::getEnabled, 1)
                .last("LIMIT 1"));
        if (mapping == null) {
            throw new BizException("Udun coin mapping not configured"); // 未配置优盾币种映射
        }
        return mapping;
    }
}
