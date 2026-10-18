package com.asterpro.modules.trade.option.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.asterpro.modules.trade.option.entity.UserWinRate;
import com.asterpro.modules.trade.option.mapper.OptionOrderMapper;
import com.asterpro.modules.trade.option.mapper.UserWinRateMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class OptionService {

    private final OptionOrderMapper orderMapper;
    private final UserWinRateMapper winRateMapper;
    private final SymbolService symbolService;
    private final AccountService accountService;
    private final SettlementService settlementService;


    public static final Map<Integer, BigDecimal> PERIOD_PAYOUT = new HashMap<>();

    static {
        PERIOD_PAYOUT.put(30, new BigDecimal("0.06"));
        PERIOD_PAYOUT.put(60, new BigDecimal("0.08"));
        PERIOD_PAYOUT.put(120, new BigDecimal("0.10"));
        PERIOD_PAYOUT.put(300, new BigDecimal("0.13"));
        PERIOD_PAYOUT.put(600, new BigDecimal("0.15"));
        PERIOD_PAYOUT.put(1800, new BigDecimal("0.17"));
        PERIOD_PAYOUT.put(3600, new BigDecimal("0.19"));
    }

    @Transactional
    public OptionOrder place(Long userId, String symbolCode, int direction,
                             int periodSeconds, BigDecimal amount, LocalDateTime openAt) {
        Symbol symbolEntity = null;
        try {
            if (direction != OptionOrder.DIR_UP && direction != OptionOrder.DIR_DOWN) {
                throw new BizException(ResultCode.PARAM_ERROR);
            }
            BigDecimal payout = PERIOD_PAYOUT.get(periodSeconds);
            if (payout == null) {
                throw new BizException(ResultCode.PARAM_ERROR.getCode(), "Unsupported period"); // 不支持的周期
            }
            if (amount == null || amount.signum() <= 0) {
                throw new BizException("Please enter order amount"); // 请输入下单金额
            }

            symbolEntity = symbolService.findBySymbol("option", symbolCode);
            if (symbolEntity == null) {
                throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
            }
            validateSymbolConfig(symbolEntity);

            int pricePrecision = normalizePrecision(symbolEntity.getPricePrecision(), 5);
            BigDecimal minAmount = normalizeMinAmount(symbolEntity.getMinAmount());
            if (amount.compareTo(minAmount) < 0) {
                throw new BizException("Amount below minimum order amount " + minAmount.toPlainString()); // 低于最小下单金额
            }

            LocalDateTime now = LocalDateTime.now();
            boolean scheduled = openAt != null;
            BigDecimal openPrice = null;
            if (!scheduled) {
                BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
                if (rawPrice == null || rawPrice.signum() <= 0) {
                    throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
                }
                openPrice = rawPrice.setScale(pricePrecision, RoundingMode.HALF_UP);
                openAt = now;
            }

            accountService.decrease(userId, Account.TRADE, settlementService.settlementCoin(symbolEntity),
                    amount, "option", scheduled ? "SCHEDULE" : "OPEN",
                    scheduled ? "期权定时下单" : "期权下单");

            OptionOrder order = new OptionOrder();
            order.setOrderNo("O" + IdUtil.getSnowflakeNextIdStr());
            order.setUserId(userId);
            order.setSymbol(symbolEntity.getSymbol());
            order.setSettlementCoin(settlementService.settlementCoin(symbolEntity));
            order.setDirection(direction);
            order.setPeriodSeconds(periodSeconds);
            order.setPayoutRate(payout);
            order.setAmount(amount);
            order.setOpenAt(openAt);
            order.setOpenPrice(openPrice);
            order.setSettleAt(openAt.plusSeconds(periodSeconds));
            order.setStatus(scheduled ? OptionOrder.STATUS_SCHEDULED : OptionOrder.STATUS_RUNNING);
            orderMapper.insert(order);
            return order;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("Option place failed: userId={}, symbolCode={}, direction={}, periodSeconds={}, amount={}, openAt={}, resolvedSymbol={}, baseCoin={}, quoteCoin={}, settlementCoin={}, pricePrecision={}, amountPrecision={}, minAmount={}, takerFee={}",
                    userId,
                    symbolCode,
                    direction,
                    periodSeconds,
                    amount,
                    openAt,
                    symbolEntity == null ? null : symbolEntity.getSymbol(),
                    symbolEntity == null ? null : symbolEntity.getBaseCoin(),
                    symbolEntity == null ? null : symbolEntity.getQuoteCoin(),
                    symbolEntity == null ? null : settlementService.settlementCoin(symbolEntity),
                    symbolEntity == null ? null : symbolEntity.getPricePrecision(),
                    symbolEntity == null ? null : symbolEntity.getAmountPrecision(),
                    symbolEntity == null ? null : symbolEntity.getMinAmount(),
                    symbolEntity == null ? null : symbolEntity.getTakerFee(),
                    e);
            throw e;
        }
    }

    @Transactional
    public void openScheduled(OptionOrder order) {
        if (order.getStatus() != OptionOrder.STATUS_SCHEDULED) {
            return;
        }
        Symbol symbolEntity = symbolService.findBySymbol("option", order.getSymbol());
        if (symbolEntity == null) {
            log.warn("openScheduled skip orderId={} symbol not found {}", order.getId(), order.getSymbol());
            cancelAndRefund(order, "symbol_missing");
            return;
        }
        BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
        if (rawPrice == null || rawPrice.signum() <= 0) {
            LocalDateTime deadline = order.getOpenAt() == null
                    ? LocalDateTime.now()
                    : order.getOpenAt().plusMinutes(5);
            if (LocalDateTime.now().isAfter(deadline)) {
                cancelAndRefund(order, "quote_unavailable_timeout");
            }
            return;
        }
        order.setOpenPrice(rawPrice.setScale(normalizePrecision(symbolEntity.getPricePrecision(), 5), RoundingMode.HALF_UP));
        order.setSettleAt(LocalDateTime.now().plusSeconds(order.getPeriodSeconds()));
        order.setStatus(OptionOrder.STATUS_RUNNING);
        orderMapper.updateById(order);
    }

    private void cancelAndRefund(OptionOrder order, String reason) {
        Symbol symbolEntity = symbolService.findBySymbol("option", order.getSymbol());
        String settlementCoin = symbolEntity != null
                ? settlementService.settlementCoin(symbolEntity)
                : "USDT";
        accountService.increase(order.getUserId(), Account.TRADE, settlementCoin,
                order.getAmount(), "option", "CANCEL-" + order.getId(), "期权预约取消退款 " + reason);
        order.setStatus(OptionOrder.STATUS_CANCELLED);
        orderMapper.updateById(order);
        log.warn("[Option] cancelAndRefund orderId={} reason={}", order.getId(), reason);
    }

    @Transactional
    public void settle(OptionOrder order) {
        if (order.getStatus() != OptionOrder.STATUS_RUNNING) {
            return;
        }
        Symbol symbolEntity = symbolService.findBySymbol("option", order.getSymbol());
        if (symbolEntity == null) {
            log.warn("settle skip orderId={} symbol not found {}", order.getId(), order.getSymbol());
            return;
        }

        int precision = normalizePrecision(symbolEntity.getPricePrecision(), 5);
        BigDecimal minStep = BigDecimal.ONE.movePointLeft(precision);
        BigDecimal openPrice = order.getOpenPrice();
        boolean betUp = order.getDirection() == OptionOrder.DIR_UP;

        UserWinRate winRate = winRateMapper.selectById(order.getUserId());
        Integer controlMode = (winRate != null) ? winRate.getMode() : null;

        int result;
        BigDecimal settlePrice;

        if (controlMode != null && controlMode != UserWinRate.MODE_RANDOM) {
            // 包赢、包输或控胜率模式：无需拉取真实行情，直接根据开仓价增减
            if (controlMode == UserWinRate.MODE_ALWAYS_WIN) {
                result = OptionOrder.RESULT_WIN;
            } else if (controlMode == UserWinRate.MODE_ALWAYS_LOSE) {
                result = OptionOrder.RESULT_LOSE;
            } else if (controlMode == UserWinRate.MODE_PROBABILITY) {
                double rate = winRate.getWinRate() == null ? 50 : winRate.getWinRate().doubleValue();
                result = ThreadLocalRandom.current().nextDouble(100) < rate
                        ? OptionOrder.RESULT_WIN
                        : OptionOrder.RESULT_LOSE;
            } else {
                result = OptionOrder.RESULT_LOSE;
            }

            BigDecimal adjustment = calculateAdjustment(openPrice, symbolEntity, precision);
            boolean shouldPriceRise = (result == OptionOrder.RESULT_WIN) == betUp;

            settlePrice = shouldPriceRise
                    ? openPrice.add(adjustment)
                    : openPrice.subtract(adjustment);
            settlePrice = settlePrice.setScale(precision, RoundingMode.HALF_UP);

            // 严格保底：确保赢时必符合方向，输时必背离方向
            if (shouldPriceRise && settlePrice.compareTo(openPrice) <= 0) {
                settlePrice = openPrice.add(minStep);
            } else if (!shouldPriceRise && settlePrice.compareTo(openPrice) >= 0) {
                settlePrice = openPrice.subtract(minStep);
            }

            log.info("[OptionControl] settle controlled orderId={}, mode={}, betUp={}, result={}, openPrice={}, adjustment={}, settlePrice={}",
                    order.getId(), controlMode, betUp, result, openPrice, adjustment, settlePrice);
        } else {
            // 真实随机模式：拉取实际行情并对比
            BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
            if (rawPrice == null || rawPrice.signum() <= 0) {
                return;
            }
            settlePrice = rawPrice.setScale(precision, RoundingMode.HALF_UP);
            int cmp = settlePrice.compareTo(openPrice);
            if (cmp == 0) {
                result = OptionOrder.RESULT_DRAW;
            } else {
                boolean priceUp = cmp > 0;
                result = priceUp == betUp ? OptionOrder.RESULT_WIN : OptionOrder.RESULT_LOSE;
            }
        }

        BigDecimal back;
        BigDecimal profit;
        if (result == OptionOrder.RESULT_WIN) {
            profit = order.getAmount().multiply(order.getPayoutRate()).setScale(8, RoundingMode.HALF_UP);
            back = order.getAmount().add(profit);
        } else if (result == OptionOrder.RESULT_LOSE) {
            profit = order.getAmount().negate();
            back = BigDecimal.ZERO;
        } else {
            profit = BigDecimal.ZERO;
            back = order.getAmount();
        }
        if (back.signum() > 0) {
            accountService.increase(order.getUserId(), Account.TRADE, settlementService.settlementCoin(symbolEntity),
                    back, "option", "SETTLE-" + order.getId(),
                    result == OptionOrder.RESULT_WIN ? "期权盈利"
                            : result == OptionOrder.RESULT_DRAW ? "期权走平" : "期权结算");
        }
        order.setSettlePrice(settlePrice);
        order.setResult(result);
        order.setProfit(profit);
        order.setSettlementCoin(settlementService.settlementCoin(symbolEntity));
        order.setStatus(OptionOrder.STATUS_SETTLED);
        orderMapper.updateById(order);
    }

    private BigDecimal calculateAdjustment(BigDecimal openPrice, Symbol symbolEntity, int precision) {
        String sym = symbolEntity.getSymbol() != null ? symbolEntity.getSymbol().toUpperCase() : "";
        BigDecimal minStep = BigDecimal.ONE.movePointLeft(precision);
        BigDecimal adjustment;

        if (sym.contains("BTC")) {
            // BTC: 15.0 ~ 50.0 (50内随机点位)
            double pts = 15.0 + ThreadLocalRandom.current().nextDouble() * 35.0;
            adjustment = BigDecimal.valueOf(pts);
        } else if (sym.contains("ETH")) {
            // ETH: 1.0 ~ 8.0 点
            double pts = 1.0 + ThreadLocalRandom.current().nextDouble() * 7.0;
            adjustment = BigDecimal.valueOf(pts);
        } else {
            // 其他币种：按开仓价比例随机 0.04% ~ 0.32%
            double ratio = 0.00040 + ThreadLocalRandom.current().nextDouble() * 0.00280;
            adjustment = openPrice.abs().multiply(BigDecimal.valueOf(ratio));
        }

        if (adjustment.compareTo(minStep) < 0) {
            adjustment = minStep;
        }
        return adjustment.setScale(precision, RoundingMode.HALF_UP);
    }


    public List<OptionOrder> listDueOrders(int limit) {
        LambdaQueryWrapper<OptionOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(OptionOrder::getStatus, OptionOrder.STATUS_RUNNING)
                .le(OptionOrder::getSettleAt, LocalDateTime.now())
                .orderByAsc(OptionOrder::getSettleAt)
                .last("LIMIT " + Math.max(1, Math.min(limit, 500)));
        return orderMapper.selectList(wrapper);
    }

    public List<OptionOrder> listDueScheduledOrders(int limit) {
        LambdaQueryWrapper<OptionOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(OptionOrder::getStatus, OptionOrder.STATUS_SCHEDULED)
                .le(OptionOrder::getOpenAt, LocalDateTime.now())
                .orderByAsc(OptionOrder::getOpenAt)
                .last("LIMIT " + Math.max(1, Math.min(limit, 500)));
        return orderMapper.selectList(wrapper);
    }

    public List<OptionOrder> myRunning(Long userId) {
        LambdaQueryWrapper<OptionOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(OptionOrder::getUserId, userId)
                .in(OptionOrder::getStatus, OptionOrder.STATUS_RUNNING, OptionOrder.STATUS_SCHEDULED)
                .orderByAsc(OptionOrder::getSettleAt);
        return orderMapper.selectList(wrapper);
    }

    public Page<OptionOrder> myHistory(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<OptionOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(OptionOrder::getUserId, userId)
                .eq(OptionOrder::getStatus, OptionOrder.STATUS_SETTLED)
                .orderByDesc(OptionOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
    }

    private void validateSymbolConfig(Symbol symbol) {
        if (symbol.getBaseCoin() == null || symbol.getBaseCoin().isBlank()
                || symbol.getQuoteCoin() == null || symbol.getQuoteCoin().isBlank()) {
            throw new BizException("Trading pair configuration incomplete, please check base and quote coin settings"); // 交易对配置不完整，请先检查基础币与计价币设置
        }
    }

    private int normalizePrecision(Integer precision, int fallback) {
        if (precision == null || precision < 0) {
            return fallback;
        }
        return Math.min(18, precision);
    }

    private BigDecimal normalizeMinAmount(BigDecimal minAmount) {
        if (minAmount == null || minAmount.signum() < 0) {
            return BigDecimal.ZERO;
        }
        return minAmount;
    }
}
