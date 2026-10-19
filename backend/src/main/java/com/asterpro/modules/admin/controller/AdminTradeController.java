package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.SettlementService;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.trade.flash.entity.FlashOrder;
import com.asterpro.modules.trade.flash.mapper.FlashOrderMapper;
import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.asterpro.modules.trade.option.entity.UserWinRate;
import com.asterpro.modules.trade.option.mapper.OptionOrderMapper;
import com.asterpro.modules.trade.option.mapper.UserWinRateMapper;
import com.asterpro.modules.trade.perp.entity.PerpOrder;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.mapper.PerpOrderMapper;
import com.asterpro.modules.trade.perp.mapper.PerpPositionMapper;
import com.asterpro.modules.trade.perp.service.PerpService;
import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.asterpro.modules.trade.spot.entity.SpotTrade;
import com.asterpro.modules.trade.spot.entity.UserQuoteOffset;
import com.asterpro.modules.trade.spot.mapper.SpotOrderMapper;
import com.asterpro.modules.trade.spot.mapper.SpotTradeMapper;
import com.asterpro.modules.trade.spot.mapper.UserQuoteOffsetMapper;
import com.asterpro.modules.trade.spot.service.SpotTradeService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@RestController
@RequestMapping("/admin/trade")
@RequiredArgsConstructor
public class AdminTradeController {

    private final SpotOrderMapper spotMapper;
    private final SpotTradeMapper spotTradeMapper;
    private final PerpOrderMapper perpMapper;
    private final PerpPositionMapper perpPosMapper;
    private final OptionOrderMapper optionMapper;
    private final FlashOrderMapper flashMapper;
    private final UserQuoteOffsetMapper offsetMapper;
    private final UserWinRateMapper winRateMapper;
    private final SpotTradeService spotTradeService;
    private final PerpService perpService;
    private final SymbolService symbolService;
    private final SettlementService settlementService;
    private final AccountService accountService;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    // ========== 订单总览 ==========

    @GetMapping("/spot/page")
    public R<Page<SpotOrder>> spotPage(@RequestParam(required = false) Long userId,
                                       @RequestParam(required = false) Long orderId,
                                       @RequestParam(required = false) String symbol,
                                       @RequestParam(required = false) Integer status,
                                       @RequestParam(defaultValue = "1") int pageNo,
                                       @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<SpotOrder> w = new LambdaQueryWrapper<>();
        if (orderId != null) w.eq(SpotOrder::getId, orderId);
        if (userId != null) w.eq(SpotOrder::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) w.eq(SpotOrder::getSymbol, SymbolService.normalizeSymbol(symbol));
        if (status != null) w.eq(SpotOrder::getStatus, status);
        w.orderByDesc(SpotOrder::getId);
        return R.ok(spotMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/spot/trade/page")
    public R<Page<SpotTrade>> spotTradePage(@RequestParam(required = false) Long userId,
                                            @RequestParam(required = false) Long orderId,
                                            @RequestParam(required = false) String symbol,
                                            @RequestParam(defaultValue = "1") int pageNo,
                                            @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<SpotTrade> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(SpotTrade::getUserId, userId);
        if (orderId != null) w.eq(SpotTrade::getOrderId, orderId);
        if (symbol != null && !symbol.isBlank()) w.eq(SpotTrade::getSymbol, SymbolService.normalizeSymbol(symbol));
        w.orderByDesc(SpotTrade::getId);
        return R.ok(spotTradeMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/perp/order/page")
    public R<Page<PerpOrder>> perpOrderPage(@RequestParam(required = false) Long userId,
                                            @RequestParam(required = false) Long orderId,
                                            @RequestParam(required = false) String symbol,
                                            @RequestParam(defaultValue = "1") int pageNo,
                                            @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<PerpOrder> w = new LambdaQueryWrapper<>();
        if (orderId != null) w.eq(PerpOrder::getId, orderId);
        if (userId != null) w.eq(PerpOrder::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) w.eq(PerpOrder::getSymbol, SymbolService.normalizeSymbol(symbol));
        w.orderByDesc(PerpOrder::getId);
        return R.ok(perpMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/perp/position/page")
    public R<Page<PerpPosition>> perpPositionPage(@RequestParam(required = false) Long userId,
                                                  @RequestParam(required = false) Integer status,
                                                  @RequestParam(defaultValue = "1") int pageNo,
                                                  @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<PerpPosition> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(PerpPosition::getUserId, userId);
        if (status != null) w.eq(PerpPosition::getStatus, status);
        w.orderByDesc(PerpPosition::getId);
        return R.ok(perpPosMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/option/page")
    public R<Page<OptionOrder>> optionPage(@RequestParam(required = false) Long userId,
                                           @RequestParam(required = false) String symbol,
                                           @RequestParam(required = false) Integer status,
                                           @RequestParam(defaultValue = "1") int pageNo,
                                           @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<OptionOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(OptionOrder::getUserId, userId);
        if (symbol != null && !symbol.isBlank()) w.eq(OptionOrder::getSymbol, SymbolService.normalizeSymbol(symbol));
        if (status != null) w.eq(OptionOrder::getStatus, status);
        w.orderByDesc(OptionOrder::getId);
        return R.ok(optionMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/flash/page")
    public R<Page<FlashOrder>> flashPage(@RequestParam(required = false) Long userId,
                                         @RequestParam(required = false) String fromCoin,
                                         @RequestParam(required = false) String toCoin,
                                         @RequestParam(defaultValue = "1") int pageNo,
                                         @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<FlashOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(FlashOrder::getUserId, userId);
        if (fromCoin != null && !fromCoin.isBlank()) w.eq(FlashOrder::getFromCoin, fromCoin);
        if (toCoin != null && !toCoin.isBlank()) w.eq(FlashOrder::getToCoin, toCoin);
        w.orderByDesc(FlashOrder::getId);
        return R.ok(flashMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @Transactional
    @PostMapping("/spot/{id}/cancel")
    public R<Void> cancelSpot(@PathVariable Long id, @RequestBody(required = false) InterventionDTO dto) {
        requireReason(dto == null ? null : dto.getReason());
        SpotOrder order = spotMapper.selectById(id);
        if (order == null) return R.fail("Spot order does not exist"); // 现货订单不存在
        if (SpotOrder.STATUS_FILLED == order.getStatus() || SpotOrder.STATUS_CANCELLED == order.getStatus()) {
            return R.fail("Current status does not allow cancellation"); // 当前状态不允许撤单
        }
        spotTradeService.cancel(order.getUserId(), id);
        logService.log(authService.currentAdminId(), "trade", "spot_cancel",
                "spot_order", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @PostMapping("/perp/order/{id}/cancel")
    public R<Void> cancelPerpOrder(@PathVariable Long id, @RequestBody(required = false) InterventionDTO dto) {
        requireReason(dto == null ? null : dto.getReason());
        PerpOrder order = perpMapper.selectById(id);
        if (order == null) return R.fail("Perpetual order does not exist"); // 永续委托不存在
        if (order.getStatus() != null && order.getStatus() >= 2) {
            return R.fail("Current status does not allow cancellation"); // 当前状态不允许撤单
        }
        int updated = perpMapper.update(null, new LambdaUpdateWrapper<PerpOrder>()
                .eq(PerpOrder::getId, id)
                .and(w -> w.lt(PerpOrder::getStatus, 2).or().isNull(PerpOrder::getStatus))
                .set(PerpOrder::getStatus, 3)
                .set(PerpOrder::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) return R.fail("Order status has changed, please refresh and try again"); // 订单状态已变化，请刷新后重试
        logService.log(authService.currentAdminId(), "trade", "perp_order_cancel",
                "perp_order", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @Transactional
    @PostMapping("/option/{id}/cancel")
    public R<Void> cancelOption(@PathVariable Long id, @RequestBody(required = false) InterventionDTO dto) {
        requireReason(dto == null ? null : dto.getReason());
        OptionOrder order = optionMapper.selectById(id);
        if (order == null) return R.fail("Option order does not exist"); // 期权订单不存在
        if (OptionOrder.STATUS_SETTLED == order.getStatus() || OptionOrder.STATUS_CANCELLED == order.getStatus()) {
            return R.fail("Current status does not allow cancellation"); // 当前状态不允许取消
        }
        int updated = optionMapper.update(null, new LambdaUpdateWrapper<OptionOrder>()
                .eq(OptionOrder::getId, id)
                .and(w -> w.notIn(OptionOrder::getStatus, OptionOrder.STATUS_SETTLED, OptionOrder.STATUS_CANCELLED)
                        .or().isNull(OptionOrder::getStatus))
                .set(OptionOrder::getStatus, OptionOrder.STATUS_CANCELLED)
                .set(OptionOrder::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) return R.fail("Order status has changed, please refresh and try again"); // 订单状态已变化，请刷新后重试
        if (order.getAmount() != null && order.getAmount().signum() > 0) {
            Symbol symbolEntity = symbolService.findBySymbol("option", order.getSymbol());
            String coin = symbolEntity != null
                    ? settlementService.settlementCoin(symbolEntity)
                    : (order.getSettlementCoin() != null && !order.getSettlementCoin().isBlank() ? order.getSettlementCoin() : "USDT");
            accountService.increase(order.getUserId(), Account.TRADE, coin,
                    order.getAmount(), "option", order.getOrderNo(), "后台取消期权退回本金");
        }
        logService.log(authService.currentAdminId(), "trade", "option_cancel",
                "option_order", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    // ========== 行情偏移（仅影响该用户的展示价 + 现货成交价） ==========

    @GetMapping("/offset/list/{userId}")
    public R<java.util.List<UserQuoteOffset>> offsetList(@PathVariable Long userId) {
        LambdaQueryWrapper<UserQuoteOffset> w = new LambdaQueryWrapper<>();
        w.eq(UserQuoteOffset::getUserId, userId).orderByDesc(UserQuoteOffset::getId);
        return R.ok(offsetMapper.selectList(w));
    }

    @PostMapping("/offset/save")
    public R<UserQuoteOffset> offsetSave(@RequestBody UserQuoteOffset dto) {
        requireReason(dto.getRemark());
        if (dto.getUserId() == null) throw new com.asterpro.common.exception.BizException("Please select user"); // 请选择用户
        if (dto.getOffsetType() == null || (dto.getOffsetType() != 1 && dto.getOffsetType() != 2)) {
            throw new com.asterpro.common.exception.BizException("Invalid offset type"); // 偏移类型不合法
        }
        if (dto.getOffsetValue() == null) throw new com.asterpro.common.exception.BizException("Please enter offset value"); // 请填写偏移值
        Long opId = authService.currentAdminId();
        dto.setOperatorId(opId);
        if (dto.getSymbol() != null && !dto.getSymbol().isBlank()) {
            dto.setSymbol(SymbolService.normalizeSymbol(dto.getSymbol()));
        }
        if (dto.getId() != null) {
            offsetMapper.updateById(dto);
        } else {
            if (dto.getEnabled() == null) dto.setEnabled(1);
            offsetMapper.insert(dto);
        }
        logService.log(opId, "trade", "offset_save", "user",
                String.valueOf(dto.getUserId()),
                "symbol=" + dto.getSymbol() + " type=" + dto.getOffsetType() + " value=" + dto.getOffsetValue());
        return R.ok(dto);
    }

    @PostMapping("/offset/{id}/delete")
    public R<Void> offsetDelete(@PathVariable Long id) {
        UserQuoteOffset o = offsetMapper.selectById(id);
        offsetMapper.deleteById(id);
        if (o != null) {
            logService.log(authService.currentAdminId(), "trade", "offset_delete",
                    "user", String.valueOf(o.getUserId()),
                    "symbol=" + o.getSymbol());
        }
        return R.ok();
    }

    // ========== 期权胜率（必胜/必败/概率） ==========

    @GetMapping("/winrate/{userId}")
    public R<UserWinRate> winRate(@PathVariable Long userId) {
        return R.ok(winRateMapper.selectById(userId));
    }

    @PostMapping("/winrate/save")
    public R<UserWinRate> winRateSave(@RequestBody UserWinRate dto) {
        requireReason(dto.getRemark());
        if (dto.getUserId() == null) throw new com.asterpro.common.exception.BizException("Please select user"); // 请选择用户
        if (dto.getMode() == null || dto.getMode() < UserWinRate.MODE_RANDOM || dto.getMode() > UserWinRate.MODE_PROBABILITY) {
            throw new com.asterpro.common.exception.BizException("Invalid win rate mode"); // 胜率模式不合法
        }
        if (dto.getWinRate() == null
                || dto.getWinRate().compareTo(BigDecimal.ZERO) < 0
                || dto.getWinRate().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new com.asterpro.common.exception.BizException("Win rate must be between 0-100"); // 胜率概率必须在 0-100 之间
        }
        Long opId = authService.currentAdminId();
        dto.setOperatorId(opId);
        dto.setUpdatedAt(LocalDateTime.now());
        UserWinRate exist = winRateMapper.selectById(dto.getUserId());
        if (exist == null) {
            winRateMapper.insert(dto);
        } else {
            winRateMapper.updateById(dto);
        }
        logService.log(opId, "trade", "winrate_save", "user",
                String.valueOf(dto.getUserId()),
                "mode=" + dto.getMode() + " rate=" + dto.getWinRate());
        return R.ok(dto);
    }

    @PostMapping("/perp/position/{id}/force-close")
    public R<Void> forceClose(@PathVariable Long id, @RequestBody(required = false) InterventionDTO dto) {
        String reason = dto == null ? "后台强制平仓" : dto.getReason();
        requireReason(reason);
        BigDecimal markPrice = dto == null ? null : dto.getMarkPrice();
        perpService.adminSettle(id, markPrice, false, reason);
        logService.log(authService.currentAdminId(), "trade", "force_close",
                "perp_position", String.valueOf(id), reason);
        return R.ok();
    }

    @PostMapping("/perp/position/{id}/force-liquidate")
    public R<Void> forceLiquidate(@PathVariable Long id, @RequestBody(required = false) InterventionDTO dto) {
        String reason = dto == null ? "后台强制爆仓" : dto.getReason();
        requireReason(reason);
        BigDecimal markPrice = dto == null ? null : dto.getMarkPrice();
        perpService.adminSettle(id, markPrice, true, reason);
        logService.log(authService.currentAdminId(), "trade", "force_liquidate",
                "perp_position", String.valueOf(id), reason);
        return R.ok();
    }

    @lombok.Data
    public static class InterventionDTO {
        private BigDecimal markPrice;
        private String reason;
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new com.asterpro.common.exception.BizException("Please enter operation reason"); // 请填写操作原因
        }
    }
}
