package com.asterpro.modules.asset.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.modules.asset.entity.DepositChannelConfig;
import com.asterpro.modules.asset.mapper.DepositChannelConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DepositChannelService {

    private final DepositChannelConfigMapper mapper;

    public DepositChannelConfig resolve(String coin, String chain) {
        DepositChannelConfig exact = find(coin, chain);
        if (exact != null) return normalize(exact);
        DepositChannelConfig coinDefault = find(coin, null);
        if (coinDefault != null) return normalize(coinDefault);
        DepositChannelConfig global = find(null, null);
        if (global != null) return normalize(global);

        DepositChannelConfig fallback = new DepositChannelConfig();
        fallback.setMode(DepositChannelConfig.MODE_MANUAL);
        fallback.setManualEnabled(1);
        fallback.setUdunEnabled(0);
        fallback.setFallbackToManual(1);
        fallback.setEnabled(1);
        return fallback;
    }

    private DepositChannelConfig find(String coin, String chain) {
        LambdaQueryWrapper<DepositChannelConfig> w = new LambdaQueryWrapper<>();
        if (StrUtil.isBlank(coin)) w.isNull(DepositChannelConfig::getCoin);
        else w.eq(DepositChannelConfig::getCoin, coin);
        if (StrUtil.isBlank(chain)) w.isNull(DepositChannelConfig::getChain);
        else w.eq(DepositChannelConfig::getChain, chain);
        w.eq(DepositChannelConfig::getEnabled, 1).last("LIMIT 1");
        return mapper.selectOne(w);
    }

    private DepositChannelConfig normalize(DepositChannelConfig cfg) {
        if (StrUtil.isBlank(cfg.getMode())) cfg.setMode(DepositChannelConfig.MODE_MANUAL);
        if (cfg.getManualEnabled() == null) {
            cfg.setManualEnabled(DepositChannelConfig.MODE_UDUN.equals(cfg.getMode()) ? 0 : 1);
        }
        if (cfg.getUdunEnabled() == null) {
            cfg.setUdunEnabled(DepositChannelConfig.MODE_MANUAL.equals(cfg.getMode()) ? 0 : 1);
        }
        if (cfg.getFallbackToManual() == null) cfg.setFallbackToManual(1);
        return cfg;
    }
}
