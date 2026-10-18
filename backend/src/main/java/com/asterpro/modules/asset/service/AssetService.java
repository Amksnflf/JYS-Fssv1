package com.asterpro.modules.asset.service;

import com.asterpro.modules.asset.dto.AccountVO;
import com.asterpro.modules.asset.dto.AssetOverviewVO;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.trade.option.mapper.OptionOrderMapper;
import com.asterpro.modules.trade.spot.mapper.SpotOrderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 总览：把三账户余额汇总，按币种估值（× 最新 USDT 价）。
 */
@Service
@RequiredArgsConstructor
public class AssetService {

    private final AccountService accountService;
    private final CoinService coinService;
    private final SettlementService settlementService;
    private final OptionOrderMapper optionOrderMapper;
    private final SpotOrderMapper spotOrderMapper;

    public AssetOverviewVO overview(Long userId) {
        // 确保关键币种账户存在
        for (String c : new String[]{"USDT"}) {
            accountService.getOrCreate(userId, Account.SPOT, c);
            accountService.getOrCreate(userId, Account.TRADE, c);
            accountService.getOrCreate(userId, Account.FINANCE, c);
        }

        List<Account> all = accountService.listByUser(userId);
        Map<String, Coin> coinMap = new HashMap<>();
        for (Coin c : coinService.listAll()) coinMap.put(c.getCode(), c);
        Map<String, BigDecimal> resolvedPriceCache = new HashMap<>();
        Map<String, BigDecimal> usdPriceCache = new HashMap<>();

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal spotTotal = BigDecimal.ZERO;
        BigDecimal tradeTotal = BigDecimal.ZERO;
        BigDecimal financeTotal = BigDecimal.ZERO;

        // 聚合：每币种总余额
        Map<String, BigDecimal> coinTotal = new HashMap<>();
        List<AccountVO> accountList = new ArrayList<>(all.size());

        for (Account a : all) {
            BigDecimal balance = a.getAvailable().add(a.getFrozen());
            BigDecimal price = priceOf(a.getCoin(), coinMap, resolvedPriceCache, usdPriceCache);
            BigDecimal value = balance.multiply(price).setScale(4, RoundingMode.HALF_UP);

            AccountVO vo = new AccountVO();
            vo.setAccountType(a.getAccountType());
            vo.setCoin(a.getCoin());
            vo.setAvailable(a.getAvailable());
            vo.setFrozen(a.getFrozen());
            vo.setValuation(value);
            vo.setPrice(price);
            accountList.add(vo);

            total = total.add(value);
            switch (a.getAccountType()) {
                case Account.SPOT -> spotTotal = spotTotal.add(value);
                case Account.TRADE -> tradeTotal = tradeTotal.add(value);
                case Account.FINANCE -> financeTotal = financeTotal.add(value);
                default -> {}
            }
            coinTotal.merge(a.getCoin(), balance, BigDecimal::add);
        }

        AssetOverviewVO vo = new AssetOverviewVO();
        vo.setTotalUsd(total.setScale(2, RoundingMode.HALF_UP));
        vo.setSpotTotalUsd(spotTotal.setScale(2, RoundingMode.HALF_UP));
        vo.setTradeTotalUsd(tradeTotal.setScale(2, RoundingMode.HALF_UP));
        vo.setFinanceTotalUsd(financeTotal.setScale(2, RoundingMode.HALF_UP));
        vo.setAccounts(accountList);

        // 币种汇总（用于「资产总览」列表）
        List<AccountVO> coinSummary = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : coinTotal.entrySet()) {
            String coin = e.getKey();
            BigDecimal price = priceOf(coin, coinMap, resolvedPriceCache, usdPriceCache);
            BigDecimal valuation = e.getValue().multiply(price).setScale(4, RoundingMode.HALF_UP);
            
            AccountVO row = new AccountVO();
            row.setAccountType(0);
            row.setCoin(coin);
            row.setAvailable(e.getValue());
            row.setFrozen(BigDecimal.ZERO);
            row.setPrice(price);
            row.setValuation(valuation);
            
            // 计算累计盈亏
            BigDecimal totalProfit = spotOrderMapper.sumProfitByUserIdAndCoin(userId, coin.toLowerCase(), price);
            if (totalProfit == null) {
                totalProfit = BigDecimal.ZERO;
            }
            row.setTotalProfit(totalProfit.setScale(4, RoundingMode.HALF_UP));
            
            // 计算跌涨幅 = 累计盈亏 / 当前估值 * 100
            BigDecimal profitRate = BigDecimal.ZERO;
            if (valuation.compareTo(BigDecimal.ZERO) > 0) {
                profitRate = totalProfit.divide(valuation, 6, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, RoundingMode.HALF_UP);
            }
            row.setProfitRate(profitRate);
            
            coinSummary.add(row);
        }
        coinSummary.sort((a, b) -> b.getValuation().compareTo(a.getValuation()));
        vo.setCoinSummary(coinSummary);
        
        // 计算今日盈亏
        BigDecimal todayProfit = optionOrderMapper.sumTodayProfit(userId, LocalDateTime.now());
        vo.setTodayProfit(todayProfit != null ? todayProfit.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        
        return vo;
    }

    /** 币种最新价（USDT 计价），USDT/USDC/DAI 视作 1 */
    private BigDecimal priceOf(
            String coinCode,
            Map<String, Coin> coinMap,
            Map<String, BigDecimal> resolvedPriceCache,
            Map<String, BigDecimal> usdPriceCache
    ) {
        if (coinCode == null || coinCode.isBlank()) {
            return BigDecimal.ZERO;
        }
        BigDecimal cached = resolvedPriceCache.get(coinCode);
        if (cached != null) {
            return cached;
        }
        if ("USDT".equalsIgnoreCase(coinCode)) {
            resolvedPriceCache.put(coinCode, BigDecimal.ONE);
            return BigDecimal.ONE;
        }
        Coin c = coinMap.get(coinCode);
        if (c == null || c.getQuoteSymbol() == null) {
            if ("USDC".equalsIgnoreCase(coinCode) || "DAI".equalsIgnoreCase(coinCode)) {
                resolvedPriceCache.put(coinCode, BigDecimal.ONE);
                return BigDecimal.ONE;
            }
            resolvedPriceCache.put(coinCode, BigDecimal.ZERO);
            return BigDecimal.ZERO;
        }
        BigDecimal resolved = settlementService.usdPriceOf(coinCode, usdPriceCache);
        resolvedPriceCache.put(coinCode, resolved);
        return resolved;
    }
}
