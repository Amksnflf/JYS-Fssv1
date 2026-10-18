package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.entity.AccountLog;
import com.asterpro.modules.asset.entity.DepositChannelConfig;
import com.asterpro.modules.asset.entity.DepositAddress;
import com.asterpro.modules.asset.entity.DepositOrder;
import com.asterpro.modules.asset.entity.TransferLog;
import com.asterpro.modules.asset.entity.UdunCallbackLog;
import com.asterpro.modules.asset.entity.UdunCoinMapping;
import com.asterpro.modules.asset.entity.UserAddress;
import com.asterpro.modules.asset.entity.UserDepositAddress;
import com.asterpro.modules.asset.entity.WithdrawOrder;
import com.asterpro.modules.asset.mapper.AccountLogMapper;
import com.asterpro.modules.asset.mapper.AccountMapper;
import com.asterpro.modules.asset.mapper.DepositAddressMapper;
import com.asterpro.modules.asset.mapper.DepositChannelConfigMapper;
import com.asterpro.modules.asset.mapper.DepositOrderMapper;
import com.asterpro.modules.asset.mapper.TransferLogMapper;
import com.asterpro.modules.asset.mapper.UdunCallbackLogMapper;
import com.asterpro.modules.asset.mapper.UdunCoinMappingMapper;
import com.asterpro.modules.asset.mapper.UserAddressMapper;
import com.asterpro.modules.asset.mapper.UserDepositAddressMapper;
import com.asterpro.modules.asset.mapper.WithdrawOrderMapper;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.asset.service.DepositService;
import com.asterpro.modules.asset.service.UdunConfigService;
import com.asterpro.modules.asset.service.WithdrawService;
import com.asterpro.modules.asset.udun.UdunRuntimeConfig;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/admin/asset")
@RequiredArgsConstructor
public class AdminAssetController {

    private final DepositOrderMapper depositMapper;
    private final WithdrawOrderMapper withdrawMapper;
    private final AccountMapper accountMapper;
    private final AccountLogMapper accountLogMapper;
    private final DepositAddressMapper depositAddressMapper;
    private final DepositChannelConfigMapper depositChannelConfigMapper;
    private final TransferLogMapper transferLogMapper;
    private final UdunCoinMappingMapper udunCoinMappingMapper;
    private final UdunCallbackLogMapper udunCallbackLogMapper;
    private final UserAddressMapper userAddressMapper;
    private final UserDepositAddressMapper userDepositAddressMapper;
    private final DepositService depositService;
    private final WithdrawService withdrawService;
    private final AccountService accountService;
    private final UdunConfigService udunConfigService;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    // 用户三账户余额
    @GetMapping("/account/{userId}")
    public R<List<Account>> userAccounts(@PathVariable Long userId) {
        LambdaQueryWrapper<Account> w = new LambdaQueryWrapper<>();
        w.eq(Account::getUserId, userId).orderByAsc(Account::getAccountType).orderByAsc(Account::getCoin);
        return R.ok(accountMapper.selectList(w));
    }

    // 账单
    @GetMapping("/bill/page")
    public R<Page<AccountLog>> billPage(@RequestParam(required = false) Long userId,
                                        @RequestParam(required = false) String coin,
                                        @RequestParam(required = false) String bizType,
                                        @RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<AccountLog> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(AccountLog::getUserId, userId);
        if (coin != null && !coin.isBlank()) w.eq(AccountLog::getCoin, coin);
        if (bizType != null && !bizType.isBlank()) w.eq(AccountLog::getBizType, bizType);
        w.orderByDesc(AccountLog::getId);
        return R.ok(accountLogMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/deposit-address/page")
    public R<Page<DepositAddress>> depositAddressPage(@RequestParam(required = false) String coin,
                                                      @RequestParam(required = false) String chain,
                                                      @RequestParam(required = false) Integer enabled,
                                                      @RequestParam(defaultValue = "1") int pageNo,
                                                      @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<DepositAddress> w = new LambdaQueryWrapper<>();
        if (coin != null && !coin.isBlank()) w.eq(DepositAddress::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(DepositAddress::getChain, chain);
        if (enabled != null) w.eq(DepositAddress::getEnabled, enabled);
        w.orderByDesc(DepositAddress::getId);
        return R.ok(depositAddressMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/deposit-address/save")
    public R<DepositAddress> saveDepositAddress(@RequestBody DepositAddress dto) {
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getId() != null) depositAddressMapper.updateById(dto);
        else depositAddressMapper.insert(dto);
        logService.log(authService.currentAdminId(), "asset", "deposit_address_save",
                "deposit_address", String.valueOf(dto.getId()), dto.getCoin() + "/" + dto.getChain());
        return R.ok(dto);
    }

    @PostMapping("/deposit-address/{id}/delete")
    public R<Void> deleteDepositAddress(@PathVariable Integer id) {
        depositAddressMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "asset", "deposit_address_delete",
                "deposit_address", String.valueOf(id), null);
        return R.ok();
    }

    @GetMapping("/user-deposit-address/page")
    public R<Page<UserDepositAddress>> userDepositAddressPage(@RequestParam Long userId,
                                                               @RequestParam(required = false) String coin,
                                                               @RequestParam(required = false) String chain,
                                                               @RequestParam(required = false) Integer enabled,
                                                               @RequestParam(defaultValue = "1") int pageNo,
                                                               @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UserDepositAddress> w = new LambdaQueryWrapper<>();
        w.eq(UserDepositAddress::getUserId, userId);
        if (coin != null && !coin.isBlank()) w.eq(UserDepositAddress::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(UserDepositAddress::getChain, chain);
        if (enabled != null) w.eq(UserDepositAddress::getEnabled, enabled);
        w.orderByDesc(UserDepositAddress::getId);
        return R.ok(userDepositAddressMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/user-deposit-address/save")
    public R<UserDepositAddress> saveUserDepositAddress(@RequestBody UserDepositAddress dto) {
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getId() != null) userDepositAddressMapper.updateById(dto);
        else userDepositAddressMapper.insert(dto);
        logService.log(authService.currentAdminId(), "asset", "user_deposit_address_save",
                "user_deposit_address", String.valueOf(dto.getId()), dto.getCoin() + "/" + dto.getChain());
        return R.ok(dto);
    }

    @PostMapping("/user-deposit-address/{id}/delete")
    public R<Void> deleteUserDepositAddress(@PathVariable Integer id) {
        userDepositAddressMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "asset", "user_deposit_address_delete",
                "user_deposit_address", String.valueOf(id), null);
        return R.ok();
    }

    @GetMapping("/deposit-channel/page")
    public R<Page<DepositChannelConfig>> depositChannelPage(@RequestParam(required = false) String coin,
                                                           @RequestParam(required = false) String chain,
                                                           @RequestParam(required = false) String mode,
                                                           @RequestParam(defaultValue = "1") int pageNo,
                                                           @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<DepositChannelConfig> w = new LambdaQueryWrapper<>();
        if (coin != null && !coin.isBlank()) w.eq(DepositChannelConfig::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(DepositChannelConfig::getChain, chain);
        if (mode != null && !mode.isBlank()) w.eq(DepositChannelConfig::getMode, mode);
        w.orderByDesc(DepositChannelConfig::getId);
        return R.ok(depositChannelConfigMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/deposit-channel/save")
    public R<DepositChannelConfig> saveDepositChannel(@RequestBody DepositChannelConfig dto) {
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getMode() == null || dto.getMode().isBlank()) dto.setMode(DepositChannelConfig.MODE_MANUAL);
        if (dto.getManualEnabled() == null) dto.setManualEnabled(DepositChannelConfig.MODE_UDUN.equals(dto.getMode()) ? 0 : 1);
        if (dto.getUdunEnabled() == null) dto.setUdunEnabled(DepositChannelConfig.MODE_MANUAL.equals(dto.getMode()) ? 0 : 1);
        if (dto.getFallbackToManual() == null) dto.setFallbackToManual(1);
        if (dto.getId() != null) depositChannelConfigMapper.updateById(dto);
        else depositChannelConfigMapper.insert(dto);
        logService.log(authService.currentAdminId(), "asset", "deposit_channel_save",
                "deposit_channel", String.valueOf(dto.getId()), dto.getCoin() + "/" + dto.getChain() + " " + dto.getMode());
        return R.ok(dto);
    }

    @GetMapping("/udun-coin/page")
    public R<Page<UdunCoinMapping>> udunCoinPage(@RequestParam(required = false) String coin,
                                                @RequestParam(required = false) String chain,
                                                @RequestParam(required = false) Integer enabled,
                                                @RequestParam(defaultValue = "1") int pageNo,
                                                @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UdunCoinMapping> w = new LambdaQueryWrapper<>();
        if (coin != null && !coin.isBlank()) w.eq(UdunCoinMapping::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(UdunCoinMapping::getChain, chain);
        if (enabled != null) w.eq(UdunCoinMapping::getEnabled, enabled);
        w.orderByDesc(UdunCoinMapping::getId);
        return R.ok(udunCoinMappingMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/udun-coin/save")
    public R<UdunCoinMapping> saveUdunCoin(@RequestBody UdunCoinMapping dto) {
        if (dto.getEnabled() == null) dto.setEnabled(1);
        if (dto.getId() != null) udunCoinMappingMapper.updateById(dto);
        else udunCoinMappingMapper.insert(dto);
        logService.log(authService.currentAdminId(), "asset", "udun_coin_save",
                "udun_coin", String.valueOf(dto.getId()), dto.getCoin() + "/" + dto.getChain());
        return R.ok(dto);
    }

    @GetMapping("/udun-callback/page")
    public R<Page<UdunCallbackLog>> udunCallbackPage(@RequestParam(required = false) String txHash,
                                                     @RequestParam(required = false) String tradeId,
                                                     @RequestParam(required = false) Integer processed,
                                                     @RequestParam(defaultValue = "1") int pageNo,
                                                     @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UdunCallbackLog> w = new LambdaQueryWrapper<>();
        if (txHash != null && !txHash.isBlank()) w.like(UdunCallbackLog::getTxHash, txHash);
        if (tradeId != null && !tradeId.isBlank()) w.like(UdunCallbackLog::getTradeId, tradeId);
        if (processed != null) w.eq(UdunCallbackLog::getProcessed, processed);
        w.orderByDesc(UdunCallbackLog::getId);
        return R.ok(udunCallbackLogMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/udun-config")
    public R<UdunRuntimeConfig> udunConfig() {
        return R.ok(udunConfigService.current());
    }

    @PostMapping("/udun-config/save")
    public R<UdunRuntimeConfig> saveUdunConfig(@RequestBody UdunRuntimeConfig dto) {
        UdunRuntimeConfig saved = udunConfigService.save(dto);
        logService.log(authService.currentAdminId(), "asset", "udun_config_save",
                "udun_config", "udun", "enabled=" + saved.getEnabled());
        return R.ok(saved);
    }

    @GetMapping("/transfer/page")
    public R<Page<TransferLog>> transferPage(@RequestParam(required = false) Long userId,
                                             @RequestParam(required = false) String coin,
                                             @RequestParam(defaultValue = "1") int pageNo,
                                             @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<TransferLog> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(TransferLog::getUserId, userId);
        if (coin != null && !coin.isBlank()) w.eq(TransferLog::getCoin, coin);
        w.orderByDesc(TransferLog::getId);
        return R.ok(transferLogMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @GetMapping("/user-address/page")
    public R<Page<UserAddress>> userAddressPage(@RequestParam(required = false) Long userId,
                                                @RequestParam(required = false) String coin,
                                                @RequestParam(required = false) String chain,
                                                @RequestParam(required = false) Integer whitelist,
                                                @RequestParam(defaultValue = "1") int pageNo,
                                                @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<UserAddress> w = new LambdaQueryWrapper<>();
        if (userId != null) w.eq(UserAddress::getUserId, userId);
        if (coin != null && !coin.isBlank()) w.eq(UserAddress::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(UserAddress::getChain, chain);
        if (whitelist != null) w.eq(UserAddress::getWhitelist, whitelist);
        w.orderByDesc(UserAddress::getId);
        return R.ok(userAddressMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/user-address/{id}/whitelist")
    public R<Void> setUserAddressWhitelist(@PathVariable Long id, @RequestBody StatusDTO dto) {
        requireRemark(dto == null ? null : dto.getReason());
        if (dto.getStatus() == null || (dto.getStatus() != 0 && dto.getStatus() != 1)) {
            return R.fail("Invalid whitelist status"); // 白名单状态不合法
        }
        UserAddress address = userAddressMapper.selectById(id);
        if (address == null) return R.fail("Address does not exist"); // 地址不存在
        address.setWhitelist(dto.getStatus());
        userAddressMapper.updateById(address);
        logService.log(authService.currentAdminId(), "asset", "user_address_whitelist",
                "user_address", String.valueOf(id), "whitelist=" + dto.getStatus() + " reason=" + dto.getReason());
        return R.ok();
    }

    @PostMapping("/user-address/{id}/delete")
    public R<Void> deleteUserAddress(@PathVariable Long id, @RequestBody(required = false) StatusDTO dto) {
        userAddressMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "asset", "user_address_delete",
                "user_address", String.valueOf(id), dto == null ? null : dto.getReason());
        return R.ok();
    }

    // 手动调账
    @PostMapping("/adjust")
    public R<Void> adjust(@RequestBody AdjustDTO dto) {
        requireRemark(dto.getRemark());
        if (dto.getUserId() == null) throw new com.asterpro.common.exception.BizException("Please select user"); // 请选择用户
        if (dto.getAccountType() == null || dto.getAccountType() < 1 || dto.getAccountType() > 3) {
            throw new com.asterpro.common.exception.BizException("Invalid account type"); // 账户类型不合法
        }
        if (dto.getCoin() == null || dto.getCoin().isBlank()) throw new com.asterpro.common.exception.BizException("Please select coin"); // 请选择币种
        if (dto.getDelta() == null || dto.getDelta().signum() == 0) {
            throw new com.asterpro.common.exception.BizException("Adjust amount cannot be 0"); // 调账金额不能为 0
        }
        Long opId = authService.currentAdminId();
        accountService.adminAdjust(dto.getUserId(), dto.getAccountType(), dto.getCoin(),
                dto.getDelta(), opId, dto.getRemark());
        logService.log(opId, "asset", "adjust", "user", String.valueOf(dto.getUserId()),
                "type=" + dto.getAccountType() + " coin=" + dto.getCoin() + " delta=" + dto.getDelta());
        return R.ok();
    }

    // 储值审核
    @GetMapping("/deposit/page")
    public R<Page<DepositOrder>> depositPage(@RequestParam(required = false) Integer status,
                                             @RequestParam(required = false) Long userId,
                                             @RequestParam(required = false) String orderNo,
                                             @RequestParam(required = false) String coin,
                                             @RequestParam(required = false) String chain,
                                             @RequestParam(defaultValue = "1") int pageNo,
                                             @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<DepositOrder> w = new LambdaQueryWrapper<>();
        if (status != null) w.eq(DepositOrder::getStatus, status);
        if (userId != null) w.eq(DepositOrder::getUserId, userId);
        if (orderNo != null && !orderNo.isBlank()) w.like(DepositOrder::getOrderNo, orderNo);
        if (coin != null && !coin.isBlank()) w.eq(DepositOrder::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(DepositOrder::getChain, chain);
        w.orderByDesc(DepositOrder::getId);
        return R.ok(depositMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/deposit/{id}/approve")
    public R<Void> depositApprove(@PathVariable Long id, @RequestBody ReviewDTO dto) {
        requireRemark(dto.getRemark());
        Long opId = authService.currentAdminId();
        depositService.approve(id, opId, dto.getRemark());
        logService.log(opId, "asset", "deposit_approve", "deposit", String.valueOf(id), dto.getRemark());
        return R.ok();
    }

    @PostMapping("/deposit/{id}/reject")
    public R<Void> depositReject(@PathVariable Long id, @RequestBody ReviewDTO dto) {
        requireRemark(dto.getRemark());
        Long opId = authService.currentAdminId();
        depositService.reject(id, opId, dto.getRemark());
        logService.log(opId, "asset", "deposit_reject", "deposit", String.valueOf(id), dto.getRemark());
        return R.ok();
    }

    // 提现审核
    @GetMapping("/withdraw/page")
    public R<Page<WithdrawOrder>> withdrawPage(@RequestParam(required = false) Integer status,
                                               @RequestParam(required = false) Long userId,
                                               @RequestParam(required = false) String orderNo,
                                               @RequestParam(required = false) String coin,
                                               @RequestParam(required = false) String chain,
                                               @RequestParam(required = false) String address,
                                               @RequestParam(defaultValue = "1") int pageNo,
                                               @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<WithdrawOrder> w = new LambdaQueryWrapper<>();
        if (status != null) w.eq(WithdrawOrder::getStatus, status);
        if (userId != null) w.eq(WithdrawOrder::getUserId, userId);
        if (orderNo != null && !orderNo.isBlank()) w.like(WithdrawOrder::getOrderNo, orderNo);
        if (coin != null && !coin.isBlank()) w.eq(WithdrawOrder::getCoin, coin);
        if (chain != null && !chain.isBlank()) w.eq(WithdrawOrder::getChain, chain);
        if (address != null && !address.isBlank()) w.like(WithdrawOrder::getToAddress, address);
        w.orderByDesc(WithdrawOrder::getId);
        return R.ok(withdrawMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/withdraw/{id}/mark-paid")
    public R<Void> withdrawMarkPaid(@PathVariable Long id, @RequestBody PaidDTO dto) {
        requireRemark(dto.getRemark());
        if (dto.getTxHash() == null || dto.getTxHash().isBlank()) {
            throw new com.asterpro.common.exception.BizException("Please enter Tx Hash"); // 请填写 Tx Hash
        }
        Long opId = authService.currentAdminId();
        withdrawService.markPaid(id, opId, dto.getTxHash().trim());
        logService.log(opId, "asset", "withdraw_paid", "withdraw", String.valueOf(id),
                "txHash=" + dto.getTxHash() + " remark=" + dto.getRemark());
        return R.ok();
    }

    @PostMapping("/withdraw/{id}/mark-processing")
    public R<Void> withdrawMarkProcessing(@PathVariable Long id, @RequestBody ReviewDTO dto) {
        requireRemark(dto.getRemark());
        Long opId = authService.currentAdminId();
        withdrawService.markProcessing(id, opId, dto.getRemark());
        logService.log(opId, "asset", "withdraw_processing", "withdraw", String.valueOf(id), dto.getRemark());
        return R.ok();
    }

    @PostMapping("/withdraw/{id}/reject")
    public R<Void> withdrawReject(@PathVariable Long id, @RequestBody ReviewDTO dto) {
        requireRemark(dto.getRemark());
        Long opId = authService.currentAdminId();
        withdrawService.reject(id, opId, dto.getRemark());
        logService.log(opId, "asset", "withdraw_reject", "withdraw", String.valueOf(id), dto.getRemark());
        return R.ok();
    }

    private void requireRemark(String remark) {
        if (remark == null || remark.isBlank()) {
            throw new com.asterpro.common.exception.BizException("Please enter operation reason"); // 请填写操作原因
        }
    }

    @Data
    public static class AdjustDTO {
        private Long userId;
        private Integer accountType;
        private String coin;
        private BigDecimal delta;
        private String remark;
    }

    @Data
    public static class ReviewDTO {
        private String remark;
    }

    @Data
    public static class PaidDTO {
        private String txHash;
        private String remark;
    }

    @Data
    public static class StatusDTO {
        private Integer status;
        private String reason;
    }
}
