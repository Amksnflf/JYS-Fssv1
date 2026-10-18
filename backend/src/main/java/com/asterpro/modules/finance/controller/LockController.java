package com.asterpro.modules.finance.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.finance.dto.LockOrderVO;
import com.asterpro.modules.finance.entity.LockOrder;
import com.asterpro.modules.finance.entity.LockProduct;
import com.asterpro.modules.finance.mapper.LockProductMapper;
import com.asterpro.modules.finance.service.LockService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/finance/lock")
@RequiredArgsConstructor
public class LockController {

    private final LockService service;
    private final LockProductMapper productMapper;
    private final UserService userService;

    @GetMapping("/public/products")
    public R<List<LockProduct>> products(@RequestParam(required = false) Integer lockType,
                                         @RequestParam(required = false) String coin) {
        return R.ok(service.listProducts(lockType, coin));
    }

    @PostMapping("/subscribe")
    public R<LockOrder> subscribe(@Valid @RequestBody SubscribeDTO dto) {
        return R.ok(service.subscribe(userService.currentUserId(), dto.getProductId(), dto.getAmount()));
    }

    @PostMapping("/redeem/{orderId}")
    public R<LockOrder> redeem(@org.springframework.web.bind.annotation.PathVariable Long orderId) {
        return R.ok(service.redeem(userService.currentUserId(), orderId));
    }

    @GetMapping("/order/my")
    public R<Page<LockOrderVO>> myOrders(@RequestParam(required = false) Integer status,
                                         @RequestParam(defaultValue = "1") int pageNo,
                                         @RequestParam(defaultValue = "20") int pageSize) {
        Page<LockOrder> p = service.myOrders(userService.currentUserId(), status, pageNo, pageSize);
        // 加产品名 + 实时利息
        List<Integer> pids = p.getRecords().stream().map(LockOrder::getProductId).distinct().collect(Collectors.toList());
        Map<Integer, LockProduct> pmap = pids.isEmpty()
                ? new HashMap<>()
                : productMapper.selectBatchIds(pids).stream()
                        .collect(Collectors.toMap(LockProduct::getId, x -> x));
        List<LockOrderVO> rows = p.getRecords().stream().map(o -> {
            LockOrderVO v = LockOrderVO.of(o);
            LockProduct pp = pmap.get(o.getProductId());
            if (pp != null) {
                v.setProductName(pp.getName());
                v.setLockType(pp.getLockType());
                v.setLockDays(pp.getLockDays());
            }
            BigDecimal live = service.liveInterest(o);
            v.setLiveInterest(live);
            if (o.getStatus() == LockOrder.STATUS_HOLDING) v.setInterest(live);
            return v;
        }).collect(Collectors.toList());

        Page<LockOrderVO> ret = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
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
