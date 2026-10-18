package com.asterpro.modules.trade.option.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.trade.option.entity.OptionOrder;
import com.asterpro.modules.trade.option.service.OptionService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.asterpro.common.exception.BizException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/option")
@RequiredArgsConstructor
public class OptionController {

    private final OptionService service;
    private final UserService userService;

    /** 部署版本探针 */
    @GetMapping("/public/version")
    public R<String> version() {
        return R.ok("20261015-v1");
    }

    /** 周期-收益率配置 */
    @GetMapping("/public/periods")
    public R<List<Map<String, Object>>> periods() {
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        OptionService.PERIOD_PAYOUT.forEach((sec, rate) -> {
            Map<String, Object> r = new HashMap<>();
            r.put("seconds", sec);
            r.put("payoutRate", rate);
            rows.add(r);
        });
        rows.sort((a, b) -> ((Integer) a.get("seconds")).compareTo((Integer) b.get("seconds")));
        return R.ok(rows);
    }

    @PostMapping("/order")
    public R<OptionOrder> place(@Valid @RequestBody PlaceDTO dto) {
        return R.ok(service.place(
                userService.currentUserId(),
                dto.getSymbol(),
                dto.getDirection(),
                dto.getPeriodSeconds(),
                dto.getAmount(),
                dto.openAt()
        ));
    }

    @GetMapping("/order/running")
    public R<List<OptionOrder>> running() {
        return R.ok(service.myRunning(userService.currentUserId()));
    }

    @GetMapping("/order/history")
    public R<Page<OptionOrder>> history(@RequestParam(value = "pageNo", defaultValue = "1") int pageNo,
                                        @RequestParam(value = "pageSize", defaultValue = "20") int pageSize) {
        return R.ok(service.myHistory(userService.currentUserId(), pageNo, pageSize));
    }

    @Data
    public static class PlaceDTO {
        @NotBlank(message = "交易对不能为空")
        private String symbol;
        /** 1 买涨 2 买跌 */
        @NotNull(message = "方向不能为空")
        private Integer direction;
        /** 30/60/120/300/600/1800/3600 */
        @NotNull(message = "周期不能为空")
        private Integer periodSeconds;
        @NotNull(message = "金额不能为空")
        private BigDecimal amount;
        /** yyyy-MM-dd HH:mm:ss；为空表示立即交易 */
        private String scheduledAt;

        LocalDateTime openAt() {
            if (scheduledAt == null || scheduledAt.isBlank()) return null;
            String s = scheduledAt.trim();
            ZoneId serverZone = ZoneId.of("Asia/Shanghai");
            LocalDateTime parsed;
            try {
                // 1. 纯数字时间戳 (秒或毫秒)
                if (s.matches("^\\d{10,13}$")) {
                    long ts = Long.parseLong(s);
                    if (ts < 10000000000L) ts *= 1000;
                    return Instant.ofEpochMilli(ts).atZone(serverZone).toLocalDateTime();
                }
                // 2. 带时区或以 Z 结尾或带偏移的 ISO-8601 (如 2026-10-15T18:16:00.000Z 或 2026-10-15T14:16:00-04:00)
                if (s.endsWith("Z") || s.contains("+") || (s.contains("T") && s.indexOf("-", 10) > 0)) {
                    Instant instant = OffsetDateTime.parse(s).toInstant();
                    return instant.atZone(serverZone).toLocalDateTime();
                }
                // 3. 不带时区的字符串 (可能是 "2026-10-15 14:16:00" 或 "2026-10-15T14:16:00")
                String normalized = s.replace('T', ' ');
                if (normalized.length() == 16) {
                    normalized += ":00";
                }
                parsed = LocalDateTime.parse(normalized, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            } catch (Exception e) {
                try {
                    parsed = LocalDateTime.parse(s);
                } catch (Exception ex) {
                    throw new BizException(400, "Invalid scheduled time format: " + s);
                }
            }

            // 4. 跨时区偏差智能对齐：
            // 如果客户端发送的是无时区的当地时间（例如美东时间 14:16，而服务端是北京时间 02:16），
            // 则 parsed 会比服务端当前时间早整整 12 小时（或其它时区偏差）。
            // 用户在前端界面选择定时交易，只会选择当前时间之后（或因操作延迟在几十秒内），绝不可能跨越几个小时甚至十几个小时预约到过去。
            // 因此若 parsed 早于当前时间超过30分钟，自动按整半小时/整小时将时区偏差对齐到北京时间。
            LocalDateTime now = LocalDateTime.now(serverZone);
            if (parsed.isBefore(now.minusMinutes(30))) {
                long diffMinutes = Duration.between(parsed, now).toMinutes();
                long offsetHalfHours = Math.round(diffMinutes / 30.0);
                if (offsetHalfHours > 0) {
                    parsed = parsed.plusMinutes(offsetHalfHours * 30);
                }
            }
            return parsed;
        }
    }
}
