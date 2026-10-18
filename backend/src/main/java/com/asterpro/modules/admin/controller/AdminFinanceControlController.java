package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.finance.entity.AiStrategyOrder;
import com.asterpro.modules.finance.entity.LockOrder;
import com.asterpro.modules.finance.entity.PortfolioOrder;
import com.asterpro.modules.finance.mapper.AiStrategyOrderMapper;
import com.asterpro.modules.finance.mapper.LockOrderMapper;
import com.asterpro.modules.finance.mapper.PortfolioOrderMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import java.math.BigDecimal;

@RestController
@RequestMapping("/admin/finance-control")
@RequiredArgsConstructor
public class AdminFinanceControlController {

    private final LockOrderMapper lockOrderMapper;
    private final PortfolioOrderMapper portfolioOrderMapper;
    private final AiStrategyOrderMapper aiStrategyOrderMapper;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    @GetMapping("/lock-order/page")
    public R<Page<LockOrder>> lockOrderPage(@RequestParam(required = false) Long userId,
                                            @RequestParam(required = false) Integer status,
                                            @RequestParam(defaultValue = "1") int pageNo,
                                            @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<LockOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(LockOrder::getUserId, userId);
        if (status != null) w.eq(LockOrder::getStatus, status);
        w.orderByDesc(LockOrder::getId);
        return R.ok(lockOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/portfolio-order/page")
    public R<Page<PortfolioOrder>> portfolioOrderPage(@RequestParam(required = false) Long userId,
                                                      @RequestParam(required = false) Integer status,
                                                      @RequestParam(defaultValue = "1") int pageNo,
                                                      @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<PortfolioOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(PortfolioOrder::getUserId, userId);
        if (status != null) w.eq(PortfolioOrder::getStatus, status);
        w.orderByDesc(PortfolioOrder::getId);
        return R.ok(portfolioOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/ai-order/page")
    public R<Page<AiStrategyOrder>> aiOrderPage(@RequestParam(required = false) Long userId,
                                                @RequestParam(required = false) Integer status,
                                                @RequestParam(defaultValue = "1") int pageNo,
                                                @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<AiStrategyOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(AiStrategyOrder::getUserId, userId);
        if (status != null) w.eq(AiStrategyOrder::getStatus, status);
        w.orderByDesc(AiStrategyOrder::getId);
        return R.ok(aiStrategyOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/lock-order/{id}/profit")
    public R<LockOrder> adjustLockProfit(@PathVariable Long id, @RequestBody ProfitDTO dto) {
        requireReason(dto);
        LockOrder o = lockOrderMapper.selectById(id);
        if (o == null) throw new BizException("Order does not exist"); // 订单不存在
        if (o.getStatus() == null || o.getStatus() != LockOrder.STATUS_HOLDING) {
            throw new BizException("Only holding lock orders can adjust profit"); // 仅持有中的锁仓订单允许调整收益
        }
        o.setInterest(dto.getProfit() == null ? BigDecimal.ZERO : dto.getProfit());
        lockOrderMapper.updateById(o);
        log("lock_profit", id, dto);
        return R.ok(o);
    }

    @PostMapping("/portfolio-order/{id}/profit")
    public R<PortfolioOrder> adjustPortfolioProfit(@PathVariable Long id, @RequestBody ProfitDTO dto) {
        requireReason(dto);
        PortfolioOrder o = portfolioOrderMapper.selectById(id);
        if (o == null) throw new BizException("Order does not exist"); // 订单不存在
        if (o.getStatus() == null || o.getStatus() != PortfolioOrder.STATUS_HOLDING) {
            throw new BizException("Only holding portfolio orders can adjust profit"); // 仅持有中的组合订单允许调整收益
        }
        o.setTotalProfit(dto.getProfit() == null ? BigDecimal.ZERO : dto.getProfit());
        portfolioOrderMapper.updateById(o);
        log("portfolio_profit", id, dto);
        return R.ok(o);
    }

    @PostMapping("/ai-order/{id}/profit")
    public R<AiStrategyOrder> adjustAiProfit(@PathVariable Long id, @RequestBody ProfitDTO dto) {
        requireReason(dto);
        AiStrategyOrder o = aiStrategyOrderMapper.selectById(id);
        if (o == null) throw new BizException("Order does not exist"); // 订单不存在
        if (o.getStatus() == null || o.getStatus() != AiStrategyOrder.STATUS_RUNNING) {
            throw new BizException("Only running AI strategy orders can adjust profit"); // 仅运行中的 AI 策略订单允许调整收益
        }
        o.setTotalProfit(dto.getProfit() == null ? BigDecimal.ZERO : dto.getProfit());
        aiStrategyOrderMapper.updateById(o);
        log("ai_profit", id, dto);
        return R.ok(o);
    }

    private void log(String action, Long id, ProfitDTO dto) {
        logService.log(authService.currentAdminId(), "finance_control", action,
                "finance_order", String.valueOf(id),
                "profit=" + dto.getProfit() + " remark=" + dto.getRemark());
    }

    private void requireReason(ProfitDTO dto) {
        if (dto == null || dto.getRemark() == null || dto.getRemark().isBlank()) {
            throw new BizException("Please enter operation reason"); // 请填写操作原因
        }
    }

    @Data
    public static class ProfitDTO {
        private BigDecimal profit;
        private String remark;
    }
}
