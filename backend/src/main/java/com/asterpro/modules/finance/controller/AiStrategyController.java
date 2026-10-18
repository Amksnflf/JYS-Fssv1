package com.asterpro.modules.finance.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.finance.dto.AiStrategyOrderVO;
import com.asterpro.modules.finance.entity.AiStrategy;
import com.asterpro.modules.finance.entity.AiStrategyOrder;
import com.asterpro.modules.finance.service.AiStrategyService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.validation.Valid;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/finance/ai")
@RequiredArgsConstructor
public class AiStrategyController {

    private final AiStrategyService service;
    private final UserService userService;

    @GetMapping("/public/strategies")
    public R<List<AiStrategy>> strategies() {
        return R.ok(service.listStrategies());
    }

    @PostMapping("/start")
    public R<AiStrategyOrder> start(@Valid @RequestBody StartDTO dto) {
        return R.ok(service.start(userService.currentUserId(), dto.getStrategyId(), dto.getAmount()));
    }

    @PostMapping("/stop/{orderId}")
    public R<AiStrategyOrder> stop(@PathVariable Long orderId) {
        return R.ok(service.stop(userService.currentUserId(), orderId));
    }

    @GetMapping("/order/my")
    public R<Page<AiStrategyOrderVO>> myOrders(@RequestParam(required = false) Integer status,
                                               @RequestParam(defaultValue = "1") int pageNo,
                                               @RequestParam(defaultValue = "20") int pageSize) {
        Page<AiStrategyOrder> p = service.myOrders(userService.currentUserId(), status, pageNo, pageSize);
        Map<Integer, AiStrategy> smap = new HashMap<>();
        for (AiStrategy s : service.listStrategies()) smap.put(s.getId(), s);
        List<AiStrategyOrderVO> rows = p.getRecords().stream().map(o -> {
            AiStrategyOrderVO v = AiStrategyOrderVO.of(o);
            AiStrategy s = smap.get(o.getStrategyId());
            if (s != null) {
                v.setStrategyName(s.getName());
                v.setStrategyType(s.getStrategyType());
            }
            BigDecimal live = service.liveProfit(o);
            v.setLiveProfit(live);
            if (o.getStatus() == AiStrategyOrder.STATUS_RUNNING) v.setTotalProfit(live);
            return v;
        }).collect(Collectors.toList());
        Page<AiStrategyOrderVO> ret = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        ret.setRecords(rows);
        return R.ok(ret);
    }

    @Data
    public static class StartDTO {
        @NotNull(message = "策略不能为空")
        private Integer strategyId;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
    }
}
