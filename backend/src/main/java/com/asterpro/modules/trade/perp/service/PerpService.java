package com.asterpro.modules.trade.perp.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.PageUtil;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.perp.dto.PositionVO;
import com.asterpro.modules.trade.perp.entity.PerpOrder;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.event.PerpClosedEvent;
import com.asterpro.modules.trade.perp.event.PerpOpenedEvent;
import com.asterpro.modules.trade.perp.mapper.PerpOrderMapper;
import com.asterpro.modules.trade.perp.mapper.PerpPositionMapper;
import com.asterpro.modules.trade.spot.service.QuoteOffsetService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PerpService {

    private final PerpOrderMapper orderMapper;
    private final PerpPositionMapper positionMapper;
    private final SymbolService symbolService;
    private final AccountService accountService;
    private final SettlementService settlementService;
    private final QuoteOffsetService offsetService;
    private final ApplicationEventPublisher eventPublisher;

    public PerpOrder open(Long userId, String symbolCode, int side, int orderType, int marginMode,
                          int leverage, BigDecimal price, BigDecimal amount,
                          BigDecimal takeProfit, BigDecimal stopLoss) {
        return openInternal(userId, symbolCode, side, orderType, marginMode,
                leverage, price, amount, takeProfit, stopLoss, null);
    }

    @Transactional
    public PerpOrder openInternal(Long userId, String symbolCode, int side, int orderType, int marginMode,
                                  int leverage, BigDecimal price, BigDecimal amount,
                                  BigDecimal takeProfit, BigDecimal stopLoss,
                                  String sourceOrderNo) {
        Symbol symbolEntity = null;
        try {
            if (side != PerpOrder.SIDE_OPEN_LONG && side != PerpOrder.SIDE_OPEN_SHORT) {
                throw new BizException(ResultCode.PARAM_ERROR);
            }
            symbolEntity = symbolService.findBySymbol("perp", symbolCode);
            if (symbolEntity == null) {
                throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
            }
            validateSymbolConfig(symbolEntity);

            String symbol = symbolEntity.getSymbol();
            int pricePrecision = normalizePrecision(symbolEntity.getPricePrecision(), 5);
            BigDecimal minAmount = normalizeMinAmount(symbolEntity.getMinAmount());
            BigDecimal feeRate = normalizeFeeRate(symbolEntity.getTakerFee());
            int maxLeverage = normalizeMaxLeverage(symbolEntity.getMaxLeverage());

            if (leverage < 1 || leverage > maxLeverage) {
                throw new BizException("Leverage out of range"); // 杠杆倍数超出范围
            }
            if (amount == null || amount.signum() <= 0) {
                throw new BizException("Please enter amount"); // 请输入数量
            }
            if (amount.compareTo(minAmount) < 0) {
                throw new BizException("Amount below minimum order " + minAmount.toPlainString()); // 低于最小下单量
            }

            BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
            if (rawPrice == null || rawPrice.signum() <= 0) {
                throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
            }
            BigDecimal currentPrice = offsetService.applyForUser(userId, symbol, rawPrice)
                    .setScale(pricePrecision, RoundingMode.HALF_UP);

            BigDecimal dealPrice;
            if (orderType == PerpOrder.TYPE_MARKET) {
                dealPrice = currentPrice;
            } else {
                if (price == null || price.signum() <= 0) {
                    throw new BizException("Please enter limit order price"); // 请输入限价单价格
                }
                BigDecimal slippage = price.subtract(currentPrice).abs()
                        .divide(currentPrice, 6, RoundingMode.HALF_UP);
                if (slippage.compareTo(BigDecimal.valueOf(0.05)) > 0) {
                    throw new BizException("Limit price deviates more than 5% from market price, please adjust price"); // 限价偏离市价超过 5%，请调整价格
                }
                dealPrice = price.setScale(pricePrecision, RoundingMode.HALF_UP);
            }

            int posSide = side == PerpOrder.SIDE_OPEN_LONG ? PerpPosition.SIDE_LONG : PerpPosition.SIDE_SHORT;
            PerpPosition reverse = positionMapper.selectOne(new LambdaQueryWrapper<PerpPosition>()
                    .eq(PerpPosition::getUserId, userId)
                    .eq(PerpPosition::getSymbol, symbol)
                    .eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN)
                    .ne(PerpPosition::getSide, posSide)
                    .last("LIMIT 1"));
            if (reverse != null) {
                throw new BizException("Reverse position exists, please close it first before opening new direction"); // 已有反向持仓，请先平仓后再开新方向
            }

            BigDecimal notionalQuote = amount.multiply(dealPrice).setScale(8, RoundingMode.HALF_UP);
            BigDecimal marginQuote = notionalQuote.divide(BigDecimal.valueOf(leverage), 8, RoundingMode.HALF_UP);
            BigDecimal feeQuote = notionalQuote.multiply(feeRate).setScale(8, RoundingMode.HALF_UP);
            BigDecimal margin = settlementService.convertQuoteToSettlement(symbolEntity, marginQuote).setScale(8, RoundingMode.HALF_UP);
            BigDecimal fee = settlementService.convertQuoteToSettlement(symbolEntity, feeQuote).setScale(8, RoundingMode.HALF_UP);
            String settlementCoin = settlementService.settlementCoin(symbolEntity);

            accountService.decrease(userId, Account.TRADE, settlementCoin,
                    margin.add(fee), "perp", "OPEN", "合约开仓保证金+手续费");

            PerpPosition sameSide = positionMapper.selectOne(new LambdaQueryWrapper<PerpPosition>()
                    .eq(PerpPosition::getUserId, userId)
                    .eq(PerpPosition::getSymbol, symbol)
                    .eq(PerpPosition::getSide, posSide)
                    .eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN)
                    .last("LIMIT 1"));

            PerpPosition position;
            if (sameSide != null) {
                BigDecimal newAmount = sameSide.getAmount().add(amount);
                BigDecimal newOpenPrice = sameSide.getAmount().multiply(sameSide.getOpenPrice())
                        .add(amount.multiply(dealPrice))
                        .divide(newAmount, pricePrecision, RoundingMode.HALF_UP);
                sameSide.setAmount(newAmount);
                sameSide.setOpenPrice(newOpenPrice);
                sameSide.setMargin(sameSide.getMargin().add(margin));
                sameSide.setLeverage(leverage);
                sameSide.setLiqPrice(calcLiqPrice(newOpenPrice, leverage, posSide));
                if (takeProfit != null) {
                    sameSide.setTakeProfitPrice(takeProfit);
                }
                if (stopLoss != null) {
                    sameSide.setStopLossPrice(stopLoss);
                }
                positionMapper.updateById(sameSide);
                position = sameSide;
            } else {
                position = new PerpPosition();
                position.setUserId(userId);
                position.setSymbol(symbol);
                position.setSide(posSide);
                position.setMarginMode(marginMode);
                position.setLeverage(leverage);
                position.setAmount(amount);
                position.setOpenPrice(dealPrice);
                position.setMargin(margin);
                position.setRealizedPnl(BigDecimal.ZERO);
                position.setLiqPrice(calcLiqPrice(dealPrice, leverage, posSide));
                position.setTakeProfitPrice(takeProfit);
                position.setStopLossPrice(stopLoss);
                position.setStatus(PerpPosition.STATUS_OPEN);
                position.setSourceOrderNo(sourceOrderNo);
                positionMapper.insert(position);
            }

            PerpOrder order = new PerpOrder();
            order.setOrderNo("P" + IdUtil.getSnowflakeNextIdStr());
            order.setUserId(userId);
            order.setSymbol(symbol);
            order.setSide(side);
            order.setOrderType(orderType);
            order.setMarginMode(marginMode);
            order.setLeverage(leverage);
            order.setPrice(dealPrice);
            order.setAmount(amount);
            order.setDealPrice(dealPrice);
            order.setMargin(margin);
            order.setFee(fee);
            order.setTakeProfitPrice(takeProfit);
            order.setStopLossPrice(stopLoss);
            order.setStatus(PerpOrder.STATUS_FILLED);
            order.setPositionId(position.getId());
            order.setSourceOrderNo(sourceOrderNo);
            orderMapper.insert(order);

            eventPublisher.publishEvent(new PerpOpenedEvent(
                    userId, order.getOrderNo(), symbol, side, marginMode, leverage,
                    amount, dealPrice, takeProfit, stopLoss, sourceOrderNo));
            return order;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("Perp openInternal failed: userId={}, symbolCode={}, side={}, orderType={}, marginMode={}, leverage={}, price={}, amount={}, takeProfit={}, stopLoss={}, sourceOrderNo={}, resolvedSymbol={}, baseCoin={}, quoteCoin={}, settlementCoin={}, pricePrecision={}, amountPrecision={}, minAmount={}, maxLeverage={}, takerFee={}",
                    userId,
                    symbolCode,
                    side,
                    orderType,
                    marginMode,
                    leverage,
                    price,
                    amount,
                    takeProfit,
                    stopLoss,
                    sourceOrderNo,
                    symbolEntity == null ? null : symbolEntity.getSymbol(),
                    symbolEntity == null ? null : symbolEntity.getBaseCoin(),
                    symbolEntity == null ? null : symbolEntity.getQuoteCoin(),
                    symbolEntity == null ? null : settlementService.settlementCoin(symbolEntity),
                    symbolEntity == null ? null : symbolEntity.getPricePrecision(),
                    symbolEntity == null ? null : symbolEntity.getAmountPrecision(),
                    symbolEntity == null ? null : symbolEntity.getMinAmount(),
                    symbolEntity == null ? null : symbolEntity.getMaxLeverage(),
                    symbolEntity == null ? null : symbolEntity.getTakerFee(),
                    e);
            throw e;
        }
    }

    @Transactional
    public void close(Long userId, Long positionId) {
        PerpPosition pos = positionMapper.selectById(positionId);
        if (pos == null) {
            throw new BizException(ResultCode.ORDER_NOT_EXIST);
        }
        if (!pos.getUserId().equals(userId)) {
            throw new BizException("No permission to operate"); // 无权操作
        }
        if (pos.getStatus() != PerpPosition.STATUS_OPEN) {
            throw new BizException("Position already closed"); // 仓位已平
        }
        Symbol symbolEntity = symbolService.findBySymbol("perp", pos.getSymbol());
        if (symbolEntity == null) {
            throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
        }
        BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
        if (rawPrice == null || rawPrice.signum() <= 0) {
            throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
        }
        BigDecimal mark = offsetService.applyForUser(userId, pos.getSymbol(), rawPrice)
                .setScale(normalizePrecision(symbolEntity.getPricePrecision(), 5), RoundingMode.HALF_UP);
        settle(pos, symbolEntity, mark, false, "用户主动平仓");
    }

    @Transactional
    public void settle(PerpPosition pos, Symbol symbolEntity, BigDecimal mark,
                       boolean liquidated, String reason) {
        int targetStatus = liquidated ? PerpPosition.STATUS_LIQUIDATED : PerpPosition.STATUS_CLOSED;
        int rows = positionMapper.update(null, new LambdaUpdateWrapper<PerpPosition>()
                .eq(PerpPosition::getId, pos.getId())
                .eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN)
                .set(PerpPosition::getStatus, targetStatus)
                .set(PerpPosition::getClosedAt, LocalDateTime.now()));
        if (rows == 0) {
            log.warn("[PerpSettle] skip duplicated settle, positionId={}", pos.getId());
            return;
        }

        BigDecimal pnlQuote = computePnlQuote(pos, mark);
        BigDecimal feeRate = normalizeFeeRate(symbolEntity.getTakerFee());
        BigDecimal feeQuote = pos.getAmount().multiply(mark).multiply(feeRate)
                .setScale(8, RoundingMode.HALF_UP);
        BigDecimal pnl = settlementService.convertQuoteToSettlement(symbolEntity, pnlQuote).setScale(8, RoundingMode.HALF_UP);
        BigDecimal fee = settlementService.convertQuoteToSettlement(symbolEntity, feeQuote).setScale(8, RoundingMode.HALF_UP);

        BigDecimal back = liquidated ? BigDecimal.ZERO : pos.getMargin().add(pnl).subtract(fee);
        if (back.signum() < 0) {
            back = BigDecimal.ZERO;
        }
        if (back.signum() > 0) {
            accountService.increase(pos.getUserId(), Account.TRADE, settlementService.settlementCoin(symbolEntity),
                    back, "perp", "CLOSE-" + pos.getId(), reason);
        }
        positionMapper.update(null, new LambdaUpdateWrapper<PerpPosition>()
                .eq(PerpPosition::getId, pos.getId())
                .set(PerpPosition::getRealizedPnl, pnl.subtract(fee)));
        pos.setRealizedPnl(pnl.subtract(fee));
        pos.setStatus(targetStatus);

        PerpOrder order = new PerpOrder();
        order.setOrderNo("P" + IdUtil.getSnowflakeNextIdStr());
        order.setUserId(pos.getUserId());
        order.setSymbol(pos.getSymbol());
        order.setSide(pos.getSide() == PerpPosition.SIDE_LONG
                ? PerpOrder.SIDE_CLOSE_LONG : PerpOrder.SIDE_CLOSE_SHORT);
        order.setOrderType(PerpOrder.TYPE_MARKET);
        order.setMarginMode(pos.getMarginMode());
        order.setLeverage(pos.getLeverage());
        order.setPrice(mark);
        order.setAmount(pos.getAmount());
        order.setDealPrice(mark);
        order.setMargin(pos.getMargin());
        order.setFee(fee);
        order.setStatus(PerpOrder.STATUS_FILLED);
        order.setPositionId(pos.getId());
        order.setSourceOrderNo(pos.getSourceOrderNo());
        orderMapper.insert(order);

        eventPublisher.publishEvent(new PerpClosedEvent(
                pos.getUserId(), pos.getId(), pos.getSymbol(), mark,
                liquidated, reason, pos.getSourceOrderNo()));
    }

    public BigDecimal computePnlQuote(PerpPosition pos, BigDecimal mark) {
        BigDecimal diff = pos.getSide() == PerpPosition.SIDE_LONG
                ? mark.subtract(pos.getOpenPrice())
                : pos.getOpenPrice().subtract(mark);
        return diff.multiply(pos.getAmount()).setScale(8, RoundingMode.HALF_UP);
    }

    private BigDecimal calcLiqPrice(BigDecimal openPrice, int leverage, int side) {
        BigDecimal pct = BigDecimal.valueOf(0.95).divide(BigDecimal.valueOf(leverage), 8, RoundingMode.HALF_UP);
        if (side == PerpPosition.SIDE_LONG) {
            return openPrice.multiply(BigDecimal.ONE.subtract(pct)).setScale(8, RoundingMode.HALF_UP);
        }
        return openPrice.multiply(BigDecimal.ONE.add(pct)).setScale(8, RoundingMode.HALF_UP);
    }

    public List<PositionVO> myPositions(Long userId) {
        LambdaQueryWrapper<PerpPosition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PerpPosition::getUserId, userId).eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN);
        wrapper.orderByDesc(PerpPosition::getCreatedAt);
        List<PerpPosition> list = positionMapper.selectList(wrapper);
        List<PositionVO> result = new ArrayList<>(list.size());
        for (PerpPosition pos : list) {
            Symbol symbolEntity = symbolService.findBySymbol("perp", pos.getSymbol());
            BigDecimal mark = pos.getOpenPrice();
            if (symbolEntity != null) {
                BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
                if (rawPrice != null && rawPrice.signum() > 0) {
                    mark = offsetService.applyForUser(userId, pos.getSymbol(), rawPrice)
                            .setScale(normalizePrecision(symbolEntity.getPricePrecision(), 5), RoundingMode.HALF_UP);
                }
            }
            BigDecimal pnl = computePnl(symbolEntity, pos, mark);
            PositionVO vo = new PositionVO();
            vo.setId(pos.getId());
            vo.setSymbol(pos.getSymbol());
            vo.setSettlementCoin(symbolEntity == null ? "USDT" : settlementService.settlementCoin(symbolEntity));
            vo.setSide(pos.getSide());
            vo.setMarginMode(pos.getMarginMode());
            vo.setLeverage(pos.getLeverage());
            vo.setAmount(pos.getAmount());
            vo.setOpenPrice(pos.getOpenPrice());
            vo.setMarkPrice(mark);
            vo.setLiqPrice(pos.getLiqPrice());
            vo.setMargin(pos.getMargin());
            vo.setUnrealizedPnl(pnl);
            BigDecimal rate = pos.getMargin().signum() == 0 ? BigDecimal.ZERO
                    : pnl.multiply(BigDecimal.valueOf(100))
                    .divide(pos.getMargin(), 4, RoundingMode.HALF_UP);
            vo.setPnlRate(rate.setScale(2, RoundingMode.HALF_UP));
            vo.setTakeProfitPrice(pos.getTakeProfitPrice());
            vo.setStopLossPrice(pos.getStopLossPrice());
            vo.setCreatedAt(pos.getCreatedAt());
            result.add(vo);
        }
        return result;
    }

    public Page<PerpOrder> orderPage(Long userId, int pageNo, int pageSize, String symbol) {
        LambdaQueryWrapper<PerpOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PerpOrder::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) {
            wrapper.eq(PerpOrder::getSymbol, SymbolService.normalizeSymbol(symbol));
        }
        wrapper.orderByDesc(PerpOrder::getCreatedAt);
        return orderMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
    }

    public Page<PerpPosition> historyPositionPage(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<PerpPosition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PerpPosition::getUserId, userId)
                .ne(PerpPosition::getStatus, PerpPosition.STATUS_OPEN);
        wrapper.orderByDesc(PerpPosition::getClosedAt);
        return positionMapper.selectPage(PageUtil.page(pageNo, pageSize), wrapper);
    }

    public List<PerpPosition> listAllOpen() {
        LambdaQueryWrapper<PerpPosition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN);
        return positionMapper.selectList(wrapper);
    }

    @Transactional
    public void adminSettle(Long positionId, BigDecimal markPrice, boolean liquidated, String reason) {
        PerpPosition pos = positionMapper.selectById(positionId);
        if (pos == null) {
            throw new BizException(ResultCode.ORDER_NOT_EXIST);
        }
        if (pos.getStatus() != PerpPosition.STATUS_OPEN) {
            throw new BizException("Position already ended"); // 仓位已结束
        }
        Symbol symbolEntity = symbolService.findBySymbol("perp", pos.getSymbol());
        if (symbolEntity == null) {
            throw new BizException(ResultCode.SYMBOL_NOT_EXIST);
        }
        BigDecimal mark = markPrice;
        if (mark == null || mark.signum() <= 0) {
            BigDecimal rawPrice = settlementService.latestDisplayPrice(symbolEntity);
            if (rawPrice == null || rawPrice.signum() <= 0) {
                throw new BizException(ResultCode.QUOTE_UNAVAILABLE);
            }
            mark = rawPrice.setScale(normalizePrecision(symbolEntity.getPricePrecision(), 5), RoundingMode.HALF_UP);
        }
        settle(pos, symbolEntity, mark, liquidated, reason == null || reason.isBlank() ? "后台仓位干预" : reason);
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

    private int normalizeMaxLeverage(Integer maxLeverage) {
        if (maxLeverage == null || maxLeverage < 1) {
            return 1;
        }
        return maxLeverage;
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

    private BigDecimal computePnl(Symbol symbolEntity, PerpPosition pos, BigDecimal mark) {
        BigDecimal quotePnl = computePnlQuote(pos, mark);
        if (symbolEntity == null) {
            return quotePnl;
        }
        return settlementService.convertQuoteToSettlement(symbolEntity, quotePnl).setScale(8, RoundingMode.HALF_UP);
    }
}
