package com.asterpro.modules.finance.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.finance.dto.LoanOrderVO;
import com.asterpro.modules.finance.entity.LoanOrder;
import com.asterpro.modules.finance.entity.LoanProduct;
import com.asterpro.modules.finance.service.LoanService;
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
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/finance/loan")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService service;
    private final UserService userService;

    @GetMapping("/public/products")
    public R<List<LoanProduct>> products() {
        return R.ok(service.listProducts());
    }

    @PostMapping("/estimate")
    public R<BigDecimal> estimate(@Valid @RequestBody BorrowDTO dto) {
        LoanProduct p = service.mustGet(dto.getProductId());
        return R.ok(service.estimateCollateral(p, dto.getBorrowAmount()));
    }

    @PostMapping("/borrow")
    public R<LoanOrder> borrow(@Valid @RequestBody BorrowDTO dto) {
        return R.ok(service.borrow(userService.currentUserId(), dto.getProductId(),
                dto.getBorrowAmount(), dto.getLockDays()));
    }

    @PostMapping("/repay/{orderId}")
    public R<LoanOrder> repay(@PathVariable Long orderId) {
        return R.ok(service.repay(userService.currentUserId(), orderId));
    }

    @GetMapping("/order/my")
    public R<Page<LoanOrderVO>> myOrders(@RequestParam(required = false) Integer status,
                                         @RequestParam(defaultValue = "1") int pageNo,
                                         @RequestParam(defaultValue = "20") int pageSize) {
        Page<LoanOrder> p = service.myOrders(userService.currentUserId(), status, pageNo, pageSize);
        List<LoanOrderVO> rows = p.getRecords().stream().map(o -> {
            LoanOrderVO v = LoanOrderVO.of(o);
            BigDecimal live = service.liveInterest(o);
            v.setLiveInterest(live);
            v.setRepayAmount(o.getBorrowAmount().add(live));
            if (o.getStatus() == LoanOrder.STATUS_BORROWING) v.setTotalInterest(live);
            return v;
        }).collect(Collectors.toList());
        Page<LoanOrderVO> ret = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        ret.setRecords(rows);
        return R.ok(ret);
    }

    @Data
    public static class BorrowDTO {
        @NotNull(message = "产品不能为空")
        private Integer productId;
        @NotNull(message = "借币金额不能为空")
        private BigDecimal borrowAmount;
        @NotNull(message = "借币期限不能为空")
        private Integer lockDays;
    }
}
