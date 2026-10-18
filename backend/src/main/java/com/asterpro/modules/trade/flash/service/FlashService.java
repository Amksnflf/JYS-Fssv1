package com.asterpro.modules.trade.flash.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.CoinService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.trade.flash.dto.FlashQuoteVO;
import com.asterpro.modules.trade.flash.entity.FlashOrder;
import com.asterpro.modules.trade.flash.mapper.FlashOrderMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.Set;

/**
 * 闪兑：
 * - 任意币 → 任意币（必须有 quote_symbol 才能定价；USDT/USDC/DAI 视为 1 USD）
 * - 报价：rate = priceFrom / priceTo （即 1 fromCoin 可换多少 toCoin）
 * - 手续费：从 toAmount 中扣（默认 0.1%，可在 application.yml 调）
 * - 扣 fromCoin 从 fromAccount，加 toCoin 到 toAccount（同账户体系：spot/trade/finance）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlashService {

    private static final Set<String> USD_PEGGED = new HashSet<>();
    static {
        USD_PEGGED.add("USDT");
        USD_PEGGED.add("USDC");
        USD_PEGGED.add("DAI");
    }

    private final FlashOrderMapper orderMapper;
    private final CoinService coinService;
    private final AccountService accountService;
    private final SettlementService settlementService;

    @Value("${flash.fee-rate:0.001}")
    private BigDecimal feeRate;

    /** 报价（不落库） */
    public FlashQuoteVO quote(String fromCoin, String toCoin, BigDecimal fromAmount) {
//        log.info("260813001 flash quote start fromCoin={} toCoin={} fromAmount={}", fromCoin, toCoin, fromAmount);
        if (StrUtil.isBlank(fromCoin) || StrUtil.isBlank(toCoin)) {
//            log.warn("260813001 flash quote invalid coin fromCoin={} toCoin={}", fromCoin, toCoin);
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        if (fromCoin.equalsIgnoreCase(toCoin)) {
//            log.warn("260813001 flash quote same coin coin={}", fromCoin);
            throw new BizException("Cannot exchange to the same coin"); // 不能兑换为相同币种
        }
        if (fromAmount == null || fromAmount.signum() <= 0) {
//            log.warn("260813001 flash quote invalid amount fromAmount={}", fromAmount);
            throw new BizException("Please enter exchange amount"); // 请输入兑换数量
        }

        BigDecimal priceFrom = priceUsd(fromCoin);
        BigDecimal priceTo = priceUsd(toCoin);
//        log.info("260813001 flash quote prices fromCoin={} priceFrom={} toCoin={} priceTo={}",
//                fromCoin, priceFrom, toCoin, priceTo);
        if (priceFrom.signum() <= 0 || priceTo.signum() <= 0) {
//            log.warn("260813001 flash quote unavailable fromCoin={} priceFrom={} toCoin={} priceTo={}",
//                    fromCoin, priceFrom, toCoin, priceTo);
            throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
        }

        Coin to = coinService.findByCode(toCoin);
        int decimals = to != null && to.getDecimals() != null ? to.getDecimals() : 8;
        decimals = Math.min(decimals, 8);

        BigDecimal rate = priceFrom.divide(priceTo, 18, RoundingMode.HALF_UP);
        BigDecimal toAmountGross = fromAmount.multiply(rate);
        BigDecimal toAmountNet = toAmountGross
                .multiply(BigDecimal.ONE.subtract(feeRate))
                .setScale(decimals, RoundingMode.DOWN);
//        log.info("260813001 flash quote calculated fromCoin={} toCoin={} rate={} gross={} net={} decimals={} feeRate={}",
//                fromCoin, toCoin, rate, toAmountGross, toAmountNet, decimals, feeRate);

        FlashQuoteVO vo = new FlashQuoteVO();
        vo.setFromCoin(fromCoin);
        vo.setToCoin(toCoin);
        vo.setFromAmount(fromAmount);
        vo.setToAmount(toAmountNet);
        vo.setRate(rate.setScale(8, RoundingMode.HALF_UP));
        vo.setFeeRate(feeRate);
        vo.setQuoteTs(System.currentTimeMillis());
        return vo;
    }

    /** 下单：再次取价，不能依赖前端传过来的 rate（防作弊）。带滑点保护 */
    @Transactional
    public FlashOrder convert(Long userId, int fromAccount, int toAccount,
                              String fromCoin, String toCoin, BigDecimal fromAmount,
                              BigDecimal expectedToAmount, BigDecimal maxSlippage) {
        FlashQuoteVO q = quote(fromCoin, toCoin, fromAmount);

        if (expectedToAmount != null && expectedToAmount.signum() > 0) {
            BigDecimal slippageLimit = (maxSlippage != null && maxSlippage.signum() > 0)
                    ? maxSlippage : new BigDecimal("0.01");
            BigDecimal diff = expectedToAmount.subtract(q.getToAmount()).abs();
            BigDecimal ratio = diff.divide(expectedToAmount, 6, RoundingMode.HALF_UP);
            if (ratio.compareTo(slippageLimit) > 0) {
                throw new BizException("Market volatility too high, please refresh quote and retry"); // 行情波动过大，请刷新报价后重试
            }
        }

        accountService.decrease(userId, fromAccount, fromCoin, fromAmount,
                "flash", "OUT", "闪兑支出");
        accountService.increase(userId, toAccount, toCoin, q.getToAmount(),
                "flash", "IN", "闪兑收入");

        FlashOrder o = new FlashOrder();
        o.setOrderNo("F" + IdUtil.getSnowflakeNextIdStr());
        o.setUserId(userId);
        o.setFromAccount(fromAccount);
        o.setToAccount(toAccount);
        o.setFromCoin(fromCoin);
        o.setToCoin(toCoin);
        o.setFromAmount(fromAmount);
        o.setToAmount(q.getToAmount());
        o.setRate(q.getRate());
        o.setFeeRate(q.getFeeRate());
        orderMapper.insert(o);
        return o;
    }

    public Page<FlashOrder> myHistory(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<FlashOrder> w = new LambdaQueryWrapper<>();
        w.eq(FlashOrder::getUserId, userId).orderByDesc(FlashOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }

    /** 获取某币种的 USD 价 */
    private BigDecimal priceUsd(String coin) {
        String normalizedCoin = coin == null ? null : coin.trim().toUpperCase();
//        log.info("260813001 flash priceUsd start coin={} normalizedCoin={}", coin, normalizedCoin);
        if (normalizedCoin != null && USD_PEGGED.contains(normalizedCoin)) {
//            log.info("260813001 flash priceUsd pegged coin={} price={}", normalizedCoin, BigDecimal.ONE);
            return BigDecimal.ONE;
        }
        Coin c = coinService.findByCode(coin);
//        log.info("260813001 flash priceUsd coin lookup coin={} found={} quoteSymbol={} decimals={}",
//                coin, c != null, c == null ? null : c.getQuoteSymbol(), c == null ? null : c.getDecimals());
        if (c == null || StrUtil.isBlank(c.getQuoteSymbol())) {
//            log.warn("260813001 flash priceUsd unsupported coin={} found={} quoteSymbol={}",
//                    coin, c != null, c == null ? null : c.getQuoteSymbol());
            throw new BizException("Coin " + coin + " is not supported for flash exchange"); // 币种暂不支持闪兑
        }
        BigDecimal price = settlementService.requireUsdPrice(coin);
//        log.info("260813001 flash priceUsd result coin={} quoteSymbol={} price={}",
//                coin, c.getQuoteSymbol(), price);
        return price;
    }

    public static int parseAccount(String acc) {
        if ("spot".equalsIgnoreCase(acc)) return Account.SPOT;
        if ("trade".equalsIgnoreCase(acc)) return Account.TRADE;
        if ("finance".equalsIgnoreCase(acc)) return Account.FINANCE;
        throw new BizException(ResultCode.PARAM_ERROR);
    }
}
