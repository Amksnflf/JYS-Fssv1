package com.asterpro.modules.finance.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.finance.dto.PortfolioOrderVO;
import com.asterpro.modules.finance.entity.PortfolioOrder;
import com.asterpro.modules.finance.entity.PortfolioProduct;
import com.asterpro.modules.finance.mapper.PortfolioProductMapper;
import com.asterpro.modules.finance.service.PortfolioService;
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
@RequestMapping("/finance/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService service;
    private final PortfolioProductMapper productMapper;
    private final UserService userService;

    @GetMapping("/public/products")
    public R<List<PortfolioProduct>> products() {
        return R.ok(service.listProducts());
    }

    @PostMapping("/subscribe")
    public R<PortfolioOrder> subscribe(@Valid @RequestBody SubscribeDTO dto) {
        return R.ok(service.subscribe(userService.currentUserId(), dto.getProductId(), dto.getAmount()));
    }

    @PostMapping("/redeem/{orderId}")
    public R<PortfolioOrder> redeem(@PathVariable Long orderId) {
        return R.ok(service.redeem(userService.currentUserId(), orderId));
    }

    @GetMapping("/order/my")
    public R<Page<PortfolioOrderVO>> myOrders(@RequestParam(required = false) Integer status,
                                              @RequestParam(defaultValue = "1") int pageNo,
                                              @RequestParam(defaultValue = "20") int pageSize) {
        Page<PortfolioOrder> p = service.myOrders(userService.currentUserId(), status, pageNo, pageSize);
        List<Integer> pids = p.getRecords().stream().map(PortfolioOrder::getProductId).distinct().collect(Collectors.toList());
        Map<Integer, PortfolioProduct> pmap = pids.isEmpty()
                ? new HashMap<>()
                : productMapper.selectBatchIds(pids).stream()
                        .collect(Collectors.toMap(PortfolioProduct::getId, x -> x));
        List<PortfolioOrderVO> rows = p.getRecords().stream().map(o -> {
            PortfolioOrderVO v = PortfolioOrderVO.of(o);
            PortfolioProduct pp = pmap.get(o.getProductId());
            if (pp != null) {
                v.setProductName(pp.getName());
                v.setDurationDays(pp.getDurationDays());
            }
            BigDecimal live = service.liveProfit(o);
            v.setLiveProfit(live);
            if (o.getStatus() == PortfolioOrder.STATUS_HOLDING) v.setTotalProfit(live);
            return v;
        }).collect(Collectors.toList());

        Page<PortfolioOrderVO> ret = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        ret.setRecords(rows);
        return R.ok(ret);
    }

    @Data
    public static class SubscribeDTO {
        @NotNull(message = "产品不能为空")
        private Integer productId;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
    }
}
