package com.asterpro.modules.trade.spot.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.asterpro.modules.trade.spot.entity.SpotTrade;
import com.asterpro.modules.trade.spot.service.SpotTradeService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/spot")
@RequiredArgsConstructor
public class SpotController {

    private final SpotTradeService tradeService;
    private final UserService userService;

    @PostMapping("/order")
    public R<SpotOrder> placeOrder(@Valid @RequestBody PlaceOrderDTO dto) {
        return R.ok(tradeService.placeOrder(
                userService.currentUserId(),
                dto.getSymbol(),
                dto.getSide(),
                dto.getOrderType(),
                dto.getPrice(),
                dto.getAmount(),
                dto.getTotalQuote()
        ));
    }

    @PostMapping("/order/{id}/cancel")
    public R<Void> cancel(@PathVariable Long id) {
        tradeService.cancel(userService.currentUserId(), id);
        return R.ok();
    }

    /** 当前委托：未完成 + 部分成交 */
    @GetMapping("/order/open")
    public R<Page<SpotOrder>> open(@RequestParam(defaultValue = "1") int pageNo,
                                   @RequestParam(defaultValue = "20") int pageSize,
                                   @RequestParam(required = false) String symbol) {
        return R.ok(tradeService.orderPage(userService.currentUserId(), pageNo, pageSize, symbol,
                List.of(SpotOrder.STATUS_PENDING, SpotOrder.STATUS_PARTIAL)));
    }

    /** 历史订单：已成交 + 已撤销 */
    @GetMapping("/order/history")
    public R<Page<SpotOrder>> history(@RequestParam(defaultValue = "1") int pageNo,
                                      @RequestParam(defaultValue = "20") int pageSize,
                                      @RequestParam(required = false) String symbol) {
        return R.ok(tradeService.orderPage(userService.currentUserId(), pageNo, pageSize, symbol,
                List.of(SpotOrder.STATUS_FILLED, SpotOrder.STATUS_CANCELLED)));
    }

    @GetMapping("/trade/my")
    public R<Page<SpotTrade>> myTrades(@RequestParam(defaultValue = "1") int pageNo,
                                       @RequestParam(defaultValue = "20") int pageSize,
                                       @RequestParam(required = false) String symbol) {
        return R.ok(tradeService.tradePage(userService.currentUserId(), pageNo, pageSize, symbol));
    }

    @Data
    public static class PlaceOrderDTO {
        @NotBlank(message = "交易对不能为空")
        private String symbol;
        /** 1 买 2 卖 */
        @NotNull(message = "方向不能为空")
        private Integer side;
        /** 1 限价 2 市价 */
        @NotNull(message = "订单类型不能为空")
        private Integer orderType;
        private BigDecimal price;
        private BigDecimal amount;
        /** 市价买入时使用：USDT 金额 */
        private BigDecimal totalQuote;
    }
}
