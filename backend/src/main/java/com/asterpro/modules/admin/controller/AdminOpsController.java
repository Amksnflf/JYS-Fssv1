package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.finance.entity.LoanOrder;
import com.asterpro.modules.finance.mapper.LoanOrderMapper;
import com.asterpro.modules.follow.entity.FollowOrder;
import com.asterpro.modules.follow.entity.FollowTrader;
import com.asterpro.modules.follow.mapper.FollowOrderMapper;
import com.asterpro.modules.follow.mapper.FollowTraderMapper;
import com.asterpro.modules.nft.entity.NftOrder;
import com.asterpro.modules.nft.mapper.NftOrderMapper;
import com.asterpro.modules.system.entity.Dynamic;
import com.asterpro.modules.system.entity.I18nDict;
import com.asterpro.modules.system.entity.RiskRule;
import com.asterpro.modules.system.entity.SystemConfig;
import com.asterpro.modules.system.mapper.DynamicMapper;
import com.asterpro.modules.system.mapper.I18nDictMapper;
import com.asterpro.modules.system.mapper.RiskRuleMapper;
import com.asterpro.modules.system.mapper.SystemConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/admin/ops")
@RequiredArgsConstructor
public class AdminOpsController {

    private final LoanOrderMapper loanOrderMapper;
    private final NftOrderMapper nftOrderMapper;
    private final FollowTraderMapper followTraderMapper;
    private final FollowOrderMapper followOrderMapper;
    private final DynamicMapper dynamicMapper;
    private final RiskRuleMapper riskRuleMapper;
    private final I18nDictMapper i18nDictMapper;
    private final SystemConfigMapper systemConfigMapper;
    private final AccountService accountService;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    @GetMapping("/loan-order/page")
    public R<Page<LoanOrder>> loanOrderPage(@RequestParam(required = false) Long userId,
                                            @RequestParam(required = false) Integer status,
                                            @RequestParam(required = false) String coin,
                                            @RequestParam(defaultValue = "1") int pageNo,
                                            @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<LoanOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(LoanOrder::getUserId, userId);
        if (status != null) w.eq(LoanOrder::getStatus, status);
        if (coin != null && !coin.isBlank()) w.eq(LoanOrder::getCoin, coin);
        w.orderByDesc(LoanOrder::getId);
        return R.ok(loanOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @Transactional
    @PostMapping("/loan-order/{id}/status")
    public R<Void> loanOrderStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        requireReason(dto);
        requireStatusInRange(dto.getStatus(), 0, 5);
        LoanOrder order = loanOrderMapper.selectById(id);
        if (order == null) return R.fail("Loan order does not exist"); // 借币订单不存在
        Integer oldStatus = order.getStatus();
        Integer newStatus = dto.getStatus();
        if (oldStatus != null && oldStatus.equals(newStatus)) {
            return R.ok();
        }
        int updated = loanOrderMapper.update(null, new LambdaUpdateWrapper<LoanOrder>()
                .eq(LoanOrder::getId, id)
                .eq(oldStatus != null, LoanOrder::getStatus, oldStatus)
                .set(LoanOrder::getStatus, newStatus)
                .set(newStatus == LoanOrder.STATUS_REPAID, LoanOrder::getRepaidAt, LocalDateTime.now()));
        if (updated == 0) {
            return R.fail("Order status has changed, please refresh and retry");
        }
        boolean wasBorrowing = oldStatus != null && (oldStatus == LoanOrder.STATUS_BORROWING || oldStatus == 0);
        boolean isRepaid = newStatus == LoanOrder.STATUS_REPAID || (oldStatus != null && oldStatus == 0 && newStatus == 1);
        if (wasBorrowing && order.getCollateralAmount() != null && order.getCollateralAmount().signum() > 0) {
            String collateralCoin = "USDT";
            Account acc = accountService.getOrCreate(order.getUserId(), Account.SPOT, collateralCoin);
            BigDecimal frozen = acc.getFrozen() == null ? BigDecimal.ZERO : acc.getFrozen();
            if (isRepaid) {
                if (frozen.compareTo(order.getCollateralAmount()) >= 0) {
                    accountService.unfreeze(order.getUserId(), Account.SPOT, collateralCoin,
                            order.getCollateralAmount(), "loan", "ADMIN-RELEASE-" + order.getId(), "后台结清借币释放抵押");
                } else {
                    if (frozen.signum() > 0) {
                        accountService.unfreeze(order.getUserId(), Account.SPOT, collateralCoin,
                                frozen, "loan", "ADMIN-RELEASE-" + order.getId(), "后台结清借币释放抵押");
                    }
                    BigDecimal diff = order.getCollateralAmount().subtract(frozen);
                    if (diff.signum() > 0) {
                        accountService.increase(order.getUserId(), Account.SPOT, collateralCoin,
                                diff, "loan", "ADMIN-RELEASE-" + order.getId(), "后台结清借币退还抵押");
                    }
                }
            } else if (newStatus == LoanOrder.STATUS_LIQUIDATED && frozen.signum() > 0) {
                BigDecimal deduct = frozen.min(order.getCollateralAmount());
                accountService.deductFrozen(order.getUserId(), Account.SPOT, collateralCoin,
                        deduct, "loan", "ADMIN-LIQUIDATE-" + order.getId(), "后台清算借币扣除抵押");
            }
        }
        logService.log(authService.currentAdminId(), "ops", "loan_order_status",
                "loan_order", String.valueOf(id), "status=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @GetMapping("/nft-order/page")
    public R<Page<NftOrder>> nftOrderPage(@RequestParam(required = false) Long buyerId,
                                          @RequestParam(required = false) Long sellerId,
                                          @RequestParam(required = false) Integer status,
                                          @RequestParam(defaultValue = "1") int pageNo,
                                          @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<NftOrder> w = new LambdaQueryWrapper<>();
        if (buyerId != null) w.eq(NftOrder::getBuyerId, buyerId);
        if (sellerId != null) w.eq(NftOrder::getSellerId, sellerId);
        if (status != null) w.eq(NftOrder::getStatus, status);
        w.orderByDesc(NftOrder::getId);
        return R.ok(nftOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @Transactional
    @PostMapping("/nft-order/{id}/status")
    public R<Void> nftOrderStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        requireReason(dto);
        requireStatusInRange(dto.getStatus(), 0, 5);
        NftOrder order = nftOrderMapper.selectById(id);
        if (order == null) return R.fail("NFT order does not exist"); // NFT 订单不存在
        Integer oldStatus = order.getStatus();
        Integer newStatus = dto.getStatus();
        if (oldStatus != null && oldStatus.equals(newStatus)) {
            return R.ok();
        }
        int updated = nftOrderMapper.update(null, new LambdaUpdateWrapper<NftOrder>()
                .eq(NftOrder::getId, id)
                .eq(oldStatus != null, NftOrder::getStatus, oldStatus)
                .set(NftOrder::getStatus, newStatus)
                .set(NftOrder::getRemark, dto.getReason()));
        if (updated == 0) {
            return R.fail("Order status has changed, please refresh and retry");
        }
        if (oldStatus != null && oldStatus == 1 && (newStatus == 2 || newStatus == 3)
                && order.getBuyerId() != null && order.getPrice() != null && order.getPrice().signum() > 0) {
            String payCoin = (order.getCoin() != null && !order.getCoin().isBlank()) ? order.getCoin() : "USDT";
            accountService.increase(order.getBuyerId(), Account.SPOT, payCoin,
                    order.getPrice(), "nft", "ADMIN-REFUND-" + order.getId(), "后台取消/退款NFT订单退回资金");
        }
        logService.log(authService.currentAdminId(), "ops", "nft_order_status",
                "nft_order", String.valueOf(id), "status=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @PostMapping("/nft-order/{id}/delete")
    public R<Void> deleteNftOrder(@PathVariable Long id, @RequestBody(required = false) StatusDTO dto) {
        nftOrderMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "nft_order_delete",
                "nft_order", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @GetMapping("/follow-trader/page")
    public R<Page<FollowTrader>> followTraderPage(@RequestParam(required = false) Integer enabled,
                                                  @RequestParam(defaultValue = "1") int pageNo,
                                                  @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<FollowTrader> w = new LambdaQueryWrapper<>();
        if (enabled != null) w.eq(FollowTrader::getEnabled, enabled);
        w.orderByAsc(FollowTrader::getSort).orderByDesc(FollowTrader::getId);
        return R.ok(followTraderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/follow-trader/save")
    public R<FollowTrader> saveFollowTrader(@RequestBody FollowTrader dto) {
        normalizeFollowTrader(dto);
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getFollowers() == null) dto.setFollowers(0);
        if (dto.getSort() == null) dto.setSort(0);
        if (dto.getId() != null) followTraderMapper.updateById(dto);
        else followTraderMapper.insert(dto);
        logService.log(authService.currentAdminId(), "ops", "follow_trader_save",
                "follow_trader", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/follow-trader/{id}/status")
    public R<Void> followTraderStatus(@PathVariable Integer id, @RequestBody StatusDTO dto) {
        requireReason(dto);
        requireStatusInRange(dto.getStatus(), 0, 1);
        FollowTrader trader = followTraderMapper.selectById(id);
        if (trader == null) return R.fail("Trader does not exist"); // 交易员不存在
        trader.setEnabled(dto.getStatus());
        followTraderMapper.updateById(trader);
        logService.log(authService.currentAdminId(), "ops", "follow_trader_status",
                "follow_trader", String.valueOf(id), "enabled=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @PostMapping("/follow-trader/{id}/delete")
    public R<Void> deleteFollowTrader(@PathVariable Integer id, @RequestBody(required = false) StatusDTO dto) {
        followTraderMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "follow_trader_delete",
                "follow_trader", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @GetMapping("/follow-order/page")
    public R<Page<FollowOrder>> followOrderPage(@RequestParam(required = false) Long userId,
                                                @RequestParam(required = false) Integer traderId,
                                                @RequestParam(required = false) Integer status,
                                                @RequestParam(defaultValue = "1") int pageNo,
                                                @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<FollowOrder> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(FollowOrder::getUserId, userId);
        if (traderId != null) w.eq(FollowOrder::getTraderId, traderId);
        if (status != null) w.eq(FollowOrder::getStatus, status);
        w.orderByDesc(FollowOrder::getId);
        return R.ok(followOrderMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @Transactional
    @PostMapping("/follow-order/{id}/status")
    public R<Void> followOrderStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        requireReason(dto);
        requireStatusInRange(dto.getStatus(), 0, 5);
        FollowOrder order = followOrderMapper.selectById(id);
        if (order == null) return R.fail("Follow order does not exist"); // 跟单关系不存在
        Integer oldStatus = order.getStatus();
        Integer newStatus = dto.getStatus();
        if (oldStatus != null && oldStatus.equals(newStatus)) {
            return R.ok();
        }
        int updated = followOrderMapper.update(null, new LambdaUpdateWrapper<FollowOrder>()
                .eq(FollowOrder::getId, id)
                .eq(oldStatus != null, FollowOrder::getStatus, oldStatus)
                .set(FollowOrder::getStatus, newStatus));
        if (updated == 0) {
            return R.fail("Order status has changed, please refresh and retry");
        }
        if (oldStatus != null && oldStatus == FollowOrder.STATUS_RUNNING && newStatus == FollowOrder.STATUS_CANCELLED) {
            if (order.getAmount() != null && order.getAmount().signum() > 0) {
                accountService.increase(order.getUserId(), Account.TRADE, "USDT",
                        order.getAmount(), "follow", "ADMIN-CANCEL-" + order.getId(), "后台取消跟单释放资金");
            }
            if (order.getTraderId() != null) {
                FollowTrader trader = followTraderMapper.selectById(order.getTraderId());
                if (trader != null) {
                    int next = (trader.getFollowers() == null ? 0 : trader.getFollowers()) - 1;
                    trader.setFollowers(Math.max(0, next));
                    followTraderMapper.updateById(trader);
                }
            }
        }
        logService.log(authService.currentAdminId(), "ops", "follow_order_status",
                "follow_order", String.valueOf(id), "status=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @GetMapping("/dynamic/page")
    public R<Page<Dynamic>> dynamicPage(@RequestParam(required = false) Long userId,
                                        @RequestParam(required = false) Integer status,
                                        @RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<Dynamic> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(Dynamic::getUserId, userId);
        if (status != null) w.eq(Dynamic::getStatus, status);
        w.orderByDesc(Dynamic::getPinned).orderByDesc(Dynamic::getId);
        return R.ok(dynamicMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/dynamic/save")
    public R<Dynamic> saveDynamic(@RequestBody Dynamic dto) {
        if (dto.getStatus() == null) dto.setStatus(1);
        if (dto.getPinned() == null) dto.setPinned(0);
        if (dto.getLikeCount() == null) dto.setLikeCount(0);
        if (dto.getCommentCount() == null) dto.setCommentCount(0);
        if (dto.getId() != null) dynamicMapper.updateById(dto);
        else dynamicMapper.insert(dto);
        logService.log(authService.currentAdminId(), "ops", "dynamic_save",
                "dynamic", String.valueOf(dto.getId()), dto.getContent());
        return R.ok(dto);
    }

    @PostMapping("/dynamic/{id}/status")
    public R<Void> dynamicStatus(@PathVariable Long id, @RequestBody StatusDTO dto) {
        requireReason(dto);
        if (dto.getStatus() != null) requireStatusInRange(dto.getStatus(), 0, 1);
        if (dto.getPinned() != null) requireStatusInRange(dto.getPinned(), 0, 1);
        Dynamic dynamic = dynamicMapper.selectById(id);
        if (dynamic == null) return R.fail("Dynamic does not exist"); // 动态不存在
        if (dto.getStatus() != null) dynamic.setStatus(dto.getStatus());
        if (dto.getPinned() != null) dynamic.setPinned(dto.getPinned());
        dynamicMapper.updateById(dynamic);
        logService.log(authService.currentAdminId(), "ops", "dynamic_status",
                "dynamic", String.valueOf(id), "status=" + dto.getStatus() + " pinned=" + dto.getPinned() + " reason=" + dto.getReason());
        return R.ok();
    }

    @PostMapping("/dynamic/{id}/delete")
    public R<Void> deleteDynamic(@PathVariable Long id, @RequestBody(required = false) StatusDTO dto) {
        dynamicMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "dynamic_delete",
                "dynamic", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @GetMapping("/risk-rule/page")
    public R<Page<RiskRule>> riskRulePage(@RequestParam(required = false) String code,
                                          @RequestParam(required = false) Integer enabled,
                                          @RequestParam(defaultValue = "1") int pageNo,
                                          @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<RiskRule> w = new LambdaQueryWrapper<>();
        if (code != null && !code.isBlank()) w.like(RiskRule::getCode, code);
        if (enabled != null) w.eq(RiskRule::getEnabled, enabled);
        w.orderByDesc(RiskRule::getId);
        return R.ok(riskRuleMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/risk-rule/save")
    public R<RiskRule> saveRiskRule(@RequestBody RiskRule dto) {
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getId() != null) riskRuleMapper.updateById(dto);
        else riskRuleMapper.insert(dto);
        logService.log(authService.currentAdminId(), "ops", "risk_rule_save",
                "risk_rule", String.valueOf(dto.getId()), dto.getCode());
        return R.ok(dto);
    }

    @PostMapping("/risk-rule/{id}/delete")
    public R<Void> deleteRiskRule(@PathVariable Integer id, @RequestBody(required = false) StatusDTO dto) {
        riskRuleMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "risk_rule_delete",
                "risk_rule", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @GetMapping("/i18n/page")
    public R<Page<I18nDict>> i18nPage(@RequestParam(required = false) String dictKey,
                                      @RequestParam(required = false) String lang,
                                      @RequestParam(required = false) String module,
                                      @RequestParam(defaultValue = "1") int pageNo,
                                      @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<I18nDict> w = new LambdaQueryWrapper<>();
        if (dictKey != null && !dictKey.isBlank()) w.like(I18nDict::getDictKey, dictKey);
        if (lang != null && !lang.isBlank()) w.eq(I18nDict::getLang, lang);
        if (module != null && !module.isBlank()) w.eq(I18nDict::getModule, module);
        w.orderByDesc(I18nDict::getId);
        return R.ok(i18nDictMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/i18n/save")
    public R<I18nDict> saveI18n(@RequestBody I18nDict dto) {
        if (dto.getId() != null) i18nDictMapper.updateById(dto);
        else i18nDictMapper.insert(dto);
        logService.log(authService.currentAdminId(), "ops", "i18n_save",
                "i18n", String.valueOf(dto.getId()), dto.getDictKey() + "/" + dto.getLang());
        return R.ok(dto);
    }

    @PostMapping("/i18n/{id}/delete")
    public R<Void> deleteI18n(@PathVariable Integer id, @RequestBody(required = false) StatusDTO dto) {
        i18nDictMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "i18n_delete",
                "i18n", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @GetMapping("/config/page")
    public R<Page<SystemConfig>> configPage(@RequestParam(required = false) String configKey,
                                            @RequestParam(required = false) String module,
                                            @RequestParam(defaultValue = "1") int pageNo,
                                            @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<SystemConfig> w = new LambdaQueryWrapper<>();
        if (configKey != null && !configKey.isBlank()) w.like(SystemConfig::getConfigKey, configKey);
        if (module != null && !module.isBlank()) w.eq(SystemConfig::getModule, module);
        w.orderByDesc(SystemConfig::getId);
        return R.ok(systemConfigMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/config/save")
    public R<SystemConfig> saveConfig(@RequestBody SystemConfig dto) {
        if (dto.getId() != null) systemConfigMapper.updateById(dto);
        else systemConfigMapper.insert(dto);
        logService.log(authService.currentAdminId(), "ops", "config_save",
                "system_config", String.valueOf(dto.getId()), dto.getConfigKey());
        return R.ok(dto);
    }

    @PostMapping("/config/{id}/delete")
    public R<Void> deleteConfig(@PathVariable Integer id, @RequestBody(required = false) StatusDTO dto) {
        systemConfigMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "ops", "config_delete",
                "system_config", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    @lombok.Data
    public static class StatusDTO {
        private Integer status;
        private Integer pinned;
        private String reason;
    }

    private void requireReason(StatusDTO dto) {
        if (dto == null || dto.getReason() == null || dto.getReason().isBlank()) {
            throw new com.asterpro.common.exception.BizException("Please enter operation reason"); // 请填写操作原因
        }
    }

    private void requireStatusInRange(Integer status, int min, int max) {
        if (status == null || status < min || status > max) {
            throw new com.asterpro.common.exception.BizException("Invalid status value"); // 状态值不合法
        }
    }

    private void normalizeFollowTrader(FollowTrader dto) {
        if (dto == null) return;
        if (dto.getName() != null) dto.setName(dto.getName().trim());
        if (dto.getStyle() != null) dto.setStyle(dto.getStyle().trim());
        if (dto.getAvatar() != null) dto.setAvatar(normalizeLocalImagePath(dto.getAvatar()));
    }

    private String normalizeLocalImagePath(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return null;
        if (normalized.startsWith("/api/uploads/")) return normalized.substring(4);
        if (normalized.startsWith("api/uploads/")) return "/" + normalized.substring(4);
        if (normalized.startsWith("/uploads/")) return normalized;
        if (normalized.startsWith("uploads/")) return "/" + normalized;

        int apiUploadsIndex = normalized.indexOf("/api/uploads/");
        if (apiUploadsIndex >= 0) return normalized.substring(apiUploadsIndex + 4);

        int uploadsIndex = normalized.indexOf("/uploads/");
        if (uploadsIndex >= 0) return normalized.substring(uploadsIndex);

        return normalized;
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
