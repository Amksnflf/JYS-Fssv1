package com.asterpro.modules.trade.perp.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.trade.perp.dto.PositionVO;
import com.asterpro.modules.trade.perp.entity.PerpOrder;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.service.PerpService;
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
@RequestMapping("/perp")
@RequiredArgsConstructor
public class PerpController {

    private final PerpService perpService;
    private final UserService userService;

    @PostMapping("/order")
    public R<PerpOrder> open(@Valid @RequestBody OpenDTO dto) {
        return R.ok(perpService.open(
                userService.currentUserId(),
                dto.getSymbol(),
                dto.getSide(),
                dto.getOrderType(),
                dto.getMarginMode() == null ? 1 : dto.getMarginMode(),
                dto.getLeverage() == null ? 1 : dto.getLeverage(),
                dto.getPrice(),
                dto.getAmount(),
                dto.getTakeProfitPrice(),
                dto.getStopLossPrice()
        ));
    }

    @PostMapping("/position/{id}/close")
    public R<Void> close(@PathVariable Long id) {
        perpService.close(userService.currentUserId(), id);
        return R.ok();
    }

    @GetMapping("/position/my")
    public R<List<PositionVO>> myPositions() {
        return R.ok(perpService.myPositions(userService.currentUserId()));
    }

    @GetMapping("/order/my")
    public R<Page<PerpOrder>> orderPage(@RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize,
                                        @RequestParam(required = false) String symbol) {
        return R.ok(perpService.orderPage(userService.currentUserId(), pageNo, pageSize, symbol));
    }

    @GetMapping("/position/history")
    public R<Page<PerpPosition>> historyPosition(@RequestParam(defaultValue = "1") int pageNo,
                                                 @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(perpService.historyPositionPage(userService.currentUserId(), pageNo, pageSize));
    }

    @Data
    public static class OpenDTO {
        @NotBlank(message = "交易对不能为空")
        private String symbol;
        /** 1 开多 2 开空 */
        @NotNull(message = "方向不能为空")
        private Integer side;
        /** 1 限价 2 市价 */
        @NotNull(message = "订单类型不能为空")
        private Integer orderType;
        /** 1 逐仓 2 全仓 */
        private Integer marginMode;
        private Integer leverage;
        private BigDecimal price;
        @NotNull(message = "数量不能为空")
        private BigDecimal amount;
        private BigDecimal takeProfitPrice;
        private BigDecimal stopLossPrice;
    }
}
