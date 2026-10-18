package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.entity.AdminLog;
import com.asterpro.modules.admin.mapper.AdminLogMapper;
import com.asterpro.modules.asset.entity.DepositOrder;
import com.asterpro.modules.asset.entity.WithdrawOrder;
import com.asterpro.modules.asset.mapper.DepositOrderMapper;
import com.asterpro.modules.asset.mapper.WithdrawOrderMapper;
import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.asterpro.modules.trade.option.mapper.OptionOrderMapper;
import com.asterpro.modules.trade.perp.entity.PerpOrder;
import com.asterpro.modules.trade.perp.entity.PerpPosition;
import com.asterpro.modules.trade.perp.mapper.PerpOrderMapper;
import com.asterpro.modules.trade.perp.mapper.PerpPositionMapper;
import com.asterpro.modules.trade.spot.entity.SpotOrder;
import com.asterpro.modules.trade.spot.mapper.SpotOrderMapper;
import com.asterpro.modules.user.entity.UserKyc;
import com.asterpro.modules.user.mapper.UserKycMapper;
import com.asterpro.modules.user.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private static final long DASHBOARD_CACHE_TTL_MS = 15_000L;

    private final UserMapper userMapper;
    private final UserKycMapper kycMapper;
    private final SpotOrderMapper spotMapper;
    private final OptionOrderMapper optionMapper;
    private final PerpOrderMapper perpOrderMapper;
    private final PerpPositionMapper perpPosMapper;
    private final DepositOrderMapper depositMapper;
    private final WithdrawOrderMapper withdrawMapper;
    private final AdminLogMapper logMapper;
    private volatile DashboardCache dashboardCache;

    @GetMapping("/dashboard")
    public R<Map<String, Object>> dashboard() {
        long now = System.currentTimeMillis();
        DashboardCache cached = dashboardCache;
        if (cached != null && cached.expiresAt() > now) {
            return R.ok(cached.data());
        }
        Map<String, Object> m = new HashMap<>();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        m.put("totalUsers", userMapper.selectCount(null));
        m.put("todayNewUsers", userMapper.selectCount(
                new LambdaQueryWrapper<com.asterpro.modules.user.entity.User>()
                        .ge(com.asterpro.modules.user.entity.User::getCreatedAt, startOfDay)));

        m.put("pendingKyc", kycMapper.selectCount(
                new LambdaQueryWrapper<UserKyc>().eq(UserKyc::getAuditStatus, 0)));
        m.put("pendingDeposit", depositMapper.selectCount(
                new LambdaQueryWrapper<DepositOrder>().eq(DepositOrder::getStatus, 0)));
        m.put("pendingWithdraw", withdrawMapper.selectCount(
                new LambdaQueryWrapper<WithdrawOrder>().eq(WithdrawOrder::getStatus, 0)));

        m.put("openPerpPositions", perpPosMapper.selectCount(
                new LambdaQueryWrapper<PerpPosition>().eq(PerpPosition::getStatus, 1)));
        m.put("runningOptions", optionMapper.selectCount(
                new LambdaQueryWrapper<OptionOrder>().eq(OptionOrder::getStatus, 0)));

        m.put("todaySpotOrders", spotMapper.selectCount(
                new LambdaQueryWrapper<SpotOrder>().ge(SpotOrder::getCreatedAt, startOfDay)));

        dashboardCache = new DashboardCache(Map.copyOf(m), now + DASHBOARD_CACHE_TTL_MS);
        return R.ok(m);
    }

    @GetMapping("/admin-log/page")
    public R<Page<AdminLog>> logPage(@RequestParam(required = false) Long adminId,
                                     @RequestParam(required = false) String module,
                                     @RequestParam(required = false) String action,
                                     @RequestParam(required = false) String targetType,
                                     @RequestParam(required = false) String targetId,
                                     @RequestParam(required = false) String keyword,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
                                     @RequestParam(defaultValue = "1") int pageNo,
                                     @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<AdminLog> w = new LambdaQueryWrapper<>();
        if (adminId != null) w.eq(AdminLog::getAdminId, adminId);
        if (module != null && !module.isBlank()) w.eq(AdminLog::getModule, module);
        if (action != null && !action.isBlank()) w.eq(AdminLog::getAction, action);
        if (targetType != null && !targetType.isBlank()) w.eq(AdminLog::getTargetType, targetType);
        if (targetId != null && !targetId.isBlank()) w.eq(AdminLog::getTargetId, targetId);
        if (startTime != null) w.ge(AdminLog::getCreatedAt, startTime);
        if (endTime != null) w.le(AdminLog::getCreatedAt, endTime);
        if (keyword != null && !keyword.isBlank()) {
            w.and(q -> q.like(AdminLog::getAction, keyword)
                    .or().like(AdminLog::getTargetId, keyword)
                    .or().like(AdminLog::getParams, keyword)
                    .or().like(AdminLog::getIp, keyword));
        }
        w.orderByDesc(AdminLog::getId);
        return R.ok(logMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/daily")
    public R<Map<String, Object>> daily() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        Map<String, Object> m = new HashMap<>();
        m.put("newUsers", userMapper.selectCount(new LambdaQueryWrapper<com.asterpro.modules.user.entity.User>()
                .ge(com.asterpro.modules.user.entity.User::getCreatedAt, start).lt(com.asterpro.modules.user.entity.User::getCreatedAt, end)));
        m.put("spotOrders", spotMapper.selectCount(new LambdaQueryWrapper<SpotOrder>()
                .ge(SpotOrder::getCreatedAt, start).lt(SpotOrder::getCreatedAt, end)));
        m.put("perpOrders", perpOrderMapper.selectCount(new LambdaQueryWrapper<PerpOrder>()
                .ge(PerpOrder::getCreatedAt, start).lt(PerpOrder::getCreatedAt, end)));
        m.put("optionOrders", optionMapper.selectCount(new LambdaQueryWrapper<OptionOrder>()
                .ge(OptionOrder::getCreatedAt, start).lt(OptionOrder::getCreatedAt, end)));
        m.put("deposits", depositMapper.selectCount(new LambdaQueryWrapper<DepositOrder>()
                .ge(DepositOrder::getCreatedAt, start).lt(DepositOrder::getCreatedAt, end)));
        m.put("withdraws", withdrawMapper.selectCount(new LambdaQueryWrapper<WithdrawOrder>()
                .ge(WithdrawOrder::getCreatedAt, start).lt(WithdrawOrder::getCreatedAt, end)));
        return R.ok(m);
    }

    @GetMapping("/risk")
    public R<Map<String, Object>> risk() {
        Map<String, Object> m = new HashMap<>();
        m.put("highLeveragePositions", perpPosMapper.selectPage(new Page<>(1, 20),
                new LambdaQueryWrapper<PerpPosition>()
                        .eq(PerpPosition::getStatus, PerpPosition.STATUS_OPEN)
                        .ge(PerpPosition::getLeverage, 50)
                        .orderByDesc(PerpPosition::getId)).getRecords());
        m.put("pendingWithdraws", withdrawMapper.selectPage(new Page<>(1, 20),
                new LambdaQueryWrapper<WithdrawOrder>()
                        .eq(WithdrawOrder::getStatus, 0)
                        .orderByDesc(WithdrawOrder::getId)).getRecords());
        m.put("runningOptions", optionMapper.selectPage(new Page<>(1, 20),
                new LambdaQueryWrapper<OptionOrder>()
                        .eq(OptionOrder::getStatus, 0)
                        .orderByDesc(OptionOrder::getId)).getRecords());
        return R.ok(m);
    }

    private record DashboardCache(Map<String, Object> data, long expiresAt) {
    }
}
