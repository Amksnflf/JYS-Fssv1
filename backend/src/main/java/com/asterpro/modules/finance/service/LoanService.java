package com.asterpro.modules.finance.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.CoinService;
import com.asterpro.modules.finance.entity.LoanOrder;
import com.asterpro.modules.finance.entity.LoanProduct;
import com.asterpro.modules.finance.mapper.LoanOrderMapper;
import com.asterpro.modules.finance.mapper.LoanProductMapper;
import com.asterpro.modules.quote.service.QuoteRouterService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanService {

    private static final String COLLATERAL_COIN = "USDT";
    private static final BigDecimal SERVICE_FEE_RATE = new BigDecimal("0.001");

    private final LoanProductMapper productMapper;
    private final LoanOrderMapper orderMapper;
    private final AccountService accountService;
    private final CoinService coinService;
    private final QuoteRouterService quoteRouterService;

    public List<LoanProduct> listProducts() {
        LambdaQueryWrapper<LoanProduct> w = new LambdaQueryWrapper<>();
        w.eq(LoanProduct::getEnabled, 1).orderByAsc(LoanProduct::getId);
        return productMapper.selectList(w);
    }

    public LoanProduct mustGet(Integer id) {
        LoanProduct p = productMapper.selectById(id);
        if (p == null || p.getEnabled() == null || p.getEnabled() == 0) {
            throw new BizException("Loan product not found"); // 借币产品不存在
        }
        return p;
    }

    public BigDecimal estimateCollateral(LoanProduct p, BigDecimal borrowAmount) {
        if (borrowAmount == null || borrowAmount.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }
        BigDecimal borrowUsd = toUsdValue(p.getCoin(), borrowAmount);
        return borrowUsd.divide(p.getCollateralRatio(), 18, RoundingMode.HALF_UP);
    }

    @Transactional
    public LoanOrder borrow(Long userId, Integer productId, BigDecimal borrowAmount, Integer lockDays) {
        if (lockDays == null || lockDays <= 0) {
            throw new BizException("Invalid loan period"); // 借币期限无效
        }
        LoanProduct p = mustGet(productId);
        if (lockDays > p.getMaxDays()) {
            throw new BizException("Exceeds maximum loan period of " + p.getMaxDays() + " days"); // 超过最长借币期限
        }
        BigDecimal collateral = estimateCollateral(p, borrowAmount);
        BigDecimal serviceFee = borrowAmount.multiply(SERVICE_FEE_RATE).setScale(18, RoundingMode.HALF_UP);
        BigDecimal received = borrowAmount.subtract(serviceFee);
        if (received.signum() <= 0) {
            throw new BizException(ResultCode.PARAM_ERROR);
        }

        String orderNo = "B" + IdUtil.getSnowflakeNextIdStr();
        accountService.freeze(userId, Account.SPOT, COLLATERAL_COIN, collateral,
                "loan", orderNo, "借币抵押冻结");
        accountService.increase(userId, Account.TRADE, p.getCoin(), received,
                "loan", orderNo, "借币发放(扣除手续费)");

        LoanOrder o = new LoanOrder();
        o.setOrderNo(orderNo);
        o.setUserId(userId);
        o.setCoin(p.getCoin());
        o.setBorrowAmount(borrowAmount);
        o.setCollateralAmount(collateral);
        o.setDailyRate(p.getDailyRate());
        o.setTotalInterest(BigDecimal.ZERO);
        o.setServiceFee(serviceFee);
        o.setLockDays(lockDays);
        LocalDateTime now = LocalDateTime.now();
        o.setStartAt(now);
        o.setDueAt(now.plusDays(lockDays));
        o.setStatus(LoanOrder.STATUS_BORROWING);
        orderMapper.insert(o);
        return o;
    }

    @Transactional
    public LoanOrder repay(Long userId, Long orderId) {
        LoanOrder o = orderMapper.selectById(orderId);
        if (o == null || !o.getUserId().equals(userId)) {
            throw new BizException("Loan order not found"); // 借币订单不存在
        }
        if (o.getStatus() != LoanOrder.STATUS_BORROWING) {
            throw new BizException("Current status does not allow repayment"); // 当前状态不可还款
        }
        BigDecimal interest = liveInterest(o);
        BigDecimal repayAmount = o.getBorrowAmount().add(interest);
        accountService.decrease(userId, Account.TRADE, o.getCoin(), repayAmount,
                "loan", "REPAY-" + o.getId(), "借币还款(本金+利息)");
        accountService.unfreeze(userId, Account.SPOT, COLLATERAL_COIN, o.getCollateralAmount(),
                "loan", "RELEASE-" + o.getId(), "借币抵押释放");
        o.setTotalInterest(interest);
        o.setRepaidAt(LocalDateTime.now());
        o.setStatus(LoanOrder.STATUS_REPAID);
        orderMapper.updateById(o);
        return o;
    }

    @Transactional
    public int liquidateOverdue(int batchLimit) {
        LambdaQueryWrapper<LoanOrder> w = new LambdaQueryWrapper<>();
        w.eq(LoanOrder::getStatus, LoanOrder.STATUS_BORROWING)
                .le(LoanOrder::getDueAt, LocalDateTime.now())
                .last("LIMIT " + Math.max(1, Math.min(batchLimit, 500)));
        List<LoanOrder> rows = orderMapper.selectList(w);
        int n = 0;
        for (LoanOrder o : rows) {
            try {
                o.setTotalInterest(liveInterest(o));
                accountService.deductFrozen(o.getUserId(), Account.SPOT, COLLATERAL_COIN,
                        o.getCollateralAmount(), "loan", "LIQUIDATE-" + o.getId(), "借币逾期清算");
                o.setStatus(LoanOrder.STATUS_LIQUIDATED);
                orderMapper.updateById(o);
                n++;
            } catch (Exception e) {
                log.warn("liquidate loan order {} err: {}", o.getId(), e.getMessage());
            }
        }
        return n;
    }

    public BigDecimal liveInterest(LoanOrder o) {
        if (o.getStatus() != LoanOrder.STATUS_BORROWING) return o.getTotalInterest();
        long secs = Duration.between(o.getStartAt(), LocalDateTime.now()).getSeconds();
        if (secs <= 0) return BigDecimal.ZERO;
        return o.getBorrowAmount().multiply(o.getDailyRate())
                .multiply(BigDecimal.valueOf(secs))
                .divide(BigDecimal.valueOf(86400L), 18, RoundingMode.HALF_UP);
    }

    public Page<LoanOrder> myOrders(Long userId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<LoanOrder> w = new LambdaQueryWrapper<>();
        w.eq(LoanOrder::getUserId, userId);
        if (status != null) w.eq(LoanOrder::getStatus, status);
        w.orderByDesc(LoanOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), w);
    }

    private BigDecimal toUsdValue(String coinCode, BigDecimal amount) {
        if (COLLATERAL_COIN.equalsIgnoreCase(coinCode) || "USDC".equalsIgnoreCase(coinCode) || "DAI".equalsIgnoreCase(coinCode)) {
            return amount;
        }
        Coin coin = coinService.mustGet(coinCode);
        if (coin.getQuoteSymbol() == null || coin.getQuoteSymbol().isBlank()) {
            throw new BizException("Coin not configured with valuation trading pair"); // 币种未配置估值交易对
        }
        BigDecimal price = quoteRouterService.getLatestPrice(coin.getQuoteSymbol());
        if (price == null || price.signum() <= 0) {
            throw new BizException("Quote unavailable, please retry later"); // 行情不可用，请稍后重试
        }
        return amount.multiply(price);
    }
}
