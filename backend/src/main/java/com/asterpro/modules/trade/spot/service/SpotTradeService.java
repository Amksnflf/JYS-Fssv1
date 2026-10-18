package com.asterpro.modules.trade.spot.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.QuoteRouterService;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.asterpro.modules.trade.spot.entity.SpotTrade;
import com.asterpro.modules.trade.spot.mapper.SpotOrderMapper;
import com.asterpro.modules.trade.spot.mapper.SpotTradeMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpotTradeService {

    private final SpotOrderMapper orderMapper;
    private final SpotTradeMapper tradeMapper;
    private final SymbolService symbolService;
    private final QuoteRouterService quoteRouterService;
    private final AccountService accountService;
    private final SettlementService settlementService;
    private final QuoteOffsetService offsetService;

    @Transactional
    public SpotOrder placeOrder(Long userId, String symbolCode, int side, int orderType,
                                BigDecimal price, BigDecimal amount, BigDecimal totalQuote) {
        Symbol symbol = null;
        try {
            if (side != SpotOrder.SIDE_BUY && side != SpotOrder.SIDE_SELL) {
                throw new BizException(ResultCode.PARAM_ERROR);
            }
            symbol = symbolService.findActiveBySymbol("spot", symbolCode);
            if (symbol == null) {
                throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
            }
            validateSymbolConfig(symbol);

            int pricePrecision = normalizePrecision(symbol.getPricePrecision(), 2);
            int amountPrecision = normalizePrecision(symbol.getAmountPrecision(), 4);
            BigDecimal minAmount = normalizeMinAmount(symbol.getMinAmount());

            BigDecimal rawPrice = quoteRouterService.getLatestPrice(symbol);
            if (rawPrice == null || rawPrice.signum() <= 0) {
                throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
            }
            BigDecimal currentPrice = offsetService.applyForUser(userId, symbol.getSymbol(), rawPrice)
                    .setScale(pricePrecision, RoundingMode.HALF_UP);

            boolean immediate;
            BigDecimal dealPrice;
            if (orderType == SpotOrder.TYPE_MARKET) {
                immediate = true;
                dealPrice = currentPrice;
            } else {
                if (price == null || price.signum() <= 0) {
                    throw new BizException("Please enter limit price"); // 请输入限价价格
                }
                immediate = side == SpotOrder.SIDE_BUY
                        ? price.compareTo(currentPrice) >= 0
                        : price.compareTo(currentPrice) <= 0;
                dealPrice = currentPrice;
            }

            BigDecimal orderAmount;
            BigDecimal orderTotalQuote;
            if (orderType == SpotOrder.TYPE_MARKET && side == SpotOrder.SIDE_BUY) {
                if (totalQuote == null || totalQuote.signum() <= 0) {
                    throw new BizException("Please enter buy amount"); // 请输入买入金额
                }
                orderTotalQuote = normalizeBuyInput(symbol, totalQuote);
                orderAmount = orderTotalQuote.divide(dealPrice, amountPrecision, RoundingMode.DOWN);
                if (orderAmount.signum() <= 0) {
                    throw new BizException("Buy amount too small"); // 买入金额过小
                }
                if (orderAmount.compareTo(minAmount) < 0) {
                    throw new BizException("Amount below minimum order " + minAmount.toPlainString()); // 低于最小下单量
                }
            } else {
                if (amount == null || amount.signum() <= 0) {
                    throw new BizException("Please enter amount"); // 请输入数量
                }
                if (amount.compareTo(minAmount) < 0) {
                    throw new BizException("Amount below minimum order " + minAmount.toPlainString()); // 低于最小下单量
                }
                orderAmount = amount.setScale(amountPrecision, RoundingMode.DOWN);
                BigDecimal totalBase = orderType == SpotOrder.TYPE_MARKET
                        ? dealPrice
                        : (immediate ? dealPrice : price);
                orderTotalQuote = orderAmount.multiply(totalBase).setScale(8, RoundingMode.HALF_UP);
            }

            BigDecimal limitPrice = orderType == SpotOrder.TYPE_MARKET
                    ? dealPrice
                    : price.setScale(pricePrecision, RoundingMode.HALF_UP);

            SpotOrder order = new SpotOrder();
            order.setOrderNo("S" + IdUtil.getSnowflakeNextIdStr());
            order.setUserId(userId);
            order.setSymbol(symbol.getSymbol());
            order.setSide(side);
            order.setOrderType(orderType);
            order.setPrice(limitPrice);
            order.setAmount(orderAmount);
            order.setTotal(orderTotalQuote);
            order.setDealAmount(BigDecimal.ZERO);
            order.setDealTotal(BigDecimal.ZERO);
            order.setStatus(SpotOrder.STATUS_PENDING);
            order.setFee(BigDecimal.ZERO);
            orderMapper.insert(order);

            if (immediate) {
                fillOrder(order, symbol, dealPrice, amountPrecision);
            } else if (side == SpotOrder.SIDE_BUY) {
                accountService.freeze(userId, Account.SPOT, settlementCoin(symbol),
                        quoteToSettlement(symbol, orderTotalQuote), "spot", order.getOrderNo(), "限价买单冻结");
            } else {
                accountService.freeze(userId, Account.SPOT, symbol.getBaseCoin(),
                        orderAmount, "spot", order.getOrderNo(), "限价卖单冻结");
            }
            return order;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("Spot placeOrder failed: userId={}, symbolCode={}, side={}, orderType={}, price={}, amount={}, totalQuote={}, resolvedSymbol={}, baseCoin={}, quoteCoin={}, settlementCoin={}, pricePrecision={}, amountPrecision={}, minAmount={}, takerFee={}",
                    userId,
                    symbolCode,
                    side,
                    orderType,
                    price,
                    amount,
                    totalQuote,
                    symbol == null ? null : symbol.getSymbol(),
                    symbol == null ? null : symbol.getBaseCoin(),
                    symbol == null ? null : symbol.getQuoteCoin(),
                    symbol == null ? null : settlementCoin(symbol),
                    symbol == null ? null : symbol.getPricePrecision(),
                    symbol == null ? null : symbol.getAmountPrecision(),
                    symbol == null ? null : symbol.getMinAmount(),
                    symbol == null ? null : symbol.getTakerFee(),
                    e);
            throw e;
        }
    }

    private void fillOrder(SpotOrder order, Symbol symbol, BigDecimal dealPrice, int amountPrecision) {
        BigDecimal feeRate = normalizeFeeRate(symbol.getTakerFee());
        BigDecimal amount = order.getAmount();
        BigDecimal totalQuote = amount.multiply(dealPrice).setScale(8, RoundingMode.HALF_UP);
        order.setTotal(totalQuote);

        BigDecimal fee;
        String feeCoin;
        if (order.getSide() == SpotOrder.SIDE_BUY) {
            accountService.decrease(order.getUserId(), Account.SPOT, settlementCoin(symbol),
                    quoteToSettlement(symbol, totalQuote), "spot", order.getOrderNo(), "现货买入扣款");
            fee = amount.multiply(feeRate).setScale(amountPrecision, RoundingMode.HALF_UP);
            feeCoin = symbol.getBaseCoin();
            BigDecimal received = amount.subtract(fee);
            if (received.signum() > 0) {
                accountService.increase(order.getUserId(), Account.SPOT, symbol.getBaseCoin(),
                        received, "spot", order.getOrderNo(), "现货买入到账");
            }
        } else {
            accountService.decrease(order.getUserId(), Account.SPOT, symbol.getBaseCoin(),
                    amount, "spot", order.getOrderNo(), "现货卖出扣币");
            BigDecimal feeQuote = totalQuote.multiply(feeRate).setScale(8, RoundingMode.HALF_UP);
            fee = quoteToSettlement(symbol, feeQuote);
            feeCoin = settlementCoin(symbol);
            BigDecimal receivedSettlement = quoteToSettlement(symbol, totalQuote.subtract(feeQuote));
            if (receivedSettlement.signum() > 0) {
                accountService.increase(order.getUserId(), Account.SPOT, settlementCoin(symbol),
                        receivedSettlement, "spot", order.getOrderNo(), "现货卖出到账");
            }
        }

        order.setDealAmount(amount);
        order.setDealTotal(totalQuote);
        order.setDealPrice(dealPrice);
        order.setFee(fee);
        order.setFeeCoin(feeCoin);
        order.setStatus(SpotOrder.STATUS_FILLED);
        orderMapper.updateById(order);

        SpotTrade trade = new SpotTrade();
        trade.setTradeNo("ST" + IdUtil.getSnowflakeNextIdStr());
        trade.setOrderId(order.getId());
        trade.setUserId(order.getUserId());
        trade.setSymbol(order.getSymbol());
        trade.setSide(order.getSide());
        trade.setPrice(dealPrice);
        trade.setAmount(amount);
        trade.setTotal(totalQuote);
        trade.setFee(fee);
        tradeMapper.insert(trade);
    }

    @Transactional
    public void cancel(Long userId, Long orderId) {
        SpotOrder order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BizException(ResultCode.ORDER_NOT_EXIST);
        }
        if (!order.getUserId().equals(userId)) {
            throw new BizException("No permission to operate"); // 无权操作
        }
        if (order.getStatus() != SpotOrder.STATUS_PENDING) {
            throw new BizException("Only pending orders can be cancelled"); // 仅可撤销待成交订单
        }
        Symbol symbol = symbolService.findBySymbol("spot", order.getSymbol());
        if (symbol == null) {
            throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
        }
        if (order.getSide() == SpotOrder.SIDE_BUY) {
            accountService.unfreeze(userId, Account.SPOT, settlementCoin(symbol),
                    quoteToSettlement(symbol, order.getTotal()), "spot", order.getOrderNo(), "限价买单撤销退回");
        } else {
            accountService.unfreeze(userId, Account.SPOT, symbol.getBaseCoin(),
                    order.getAmount(), "spot", order.getOrderNo(), "限价卖单撤销退回");
        }
        order.setStatus(SpotOrder.STATUS_CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        orderMapper.updateById(order);
    }

    public Page<SpotOrder> orderPage(Long userId, int pageNo, int pageSize,
                                     String symbol, List<Integer> statuses) {
        LambdaQueryWrapper<SpotOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SpotOrder::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) {
            wrapper.eq(SpotOrder::getSymbol, SymbolService.normalizeSymbol(symbol));
        }
        if (statuses != null && !statuses.isEmpty()) {
            wrapper.in(SpotOrder::getStatus, statuses);
        }
        wrapper.orderByDesc(SpotOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
    }

    public Page<SpotTrade> tradePage(Long userId, int pageNo, int pageSize, String symbol) {
        LambdaQueryWrapper<SpotTrade> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SpotTrade::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) {
            wrapper.eq(SpotTrade::getSymbol, SymbolService.normalizeSymbol(symbol));
        }
        wrapper.orderByDesc(SpotTrade::getCreatedAt);
        return tradeMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
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

    private BigDecimal normalizeFeeRate(BigDecimal feeRate) {
        if (feeRate == null || feeRate.signum() < 0) {
            return BigDecimal.ZERO;
        }
        return feeRate;
    }

    private BigDecimal normalizeBuyInput(Symbol symbol, BigDecimal totalInput) {
        if (!settlementService.isForex(symbol)) {
            return totalInput;
        }
        return settlementService.convertSettlementToQuote(symbol, totalInput).setScale(8, RoundingMode.HALF_UP);
    }

    private BigDecimal quoteToSettlement(Symbol symbol, BigDecimal quoteAmount) {
        return settlementService.convertQuoteToSettlement(symbol, quoteAmount).setScale(8, RoundingMode.HALF_UP);
    }

    private String settlementCoin(Symbol symbol) {
        return settlementService.settlementCoin(symbol);
    }
}
