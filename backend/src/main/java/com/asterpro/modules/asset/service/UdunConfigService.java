package com.asterpro.modules.asset.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.modules.asset.udun.UdunProperties;
import com.asterpro.modules.asset.udun.UdunRuntimeConfig;
import com.asterpro.modules.system.entity.SystemConfig;
import com.asterpro.modules.system.mapper.SystemConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UdunConfigService {

    private static final String MODULE = "udun";
    private static final String PREFIX = "udun.";

    private final SystemConfigMapper systemConfigMapper;
    private final UdunProperties defaults;

    public UdunRuntimeConfig current() {
        Map<String, String> values = values();
        UdunRuntimeConfig cfg = new UdunRuntimeConfig();
        cfg.setEnabled(bool(values.get("enabled"), defaults.getEnabled()));
        cfg.setGatewayUrl(str(values.get("gateway-url"), defaults.getGatewayUrl()));
        cfg.setMerchantId(str(values.get("merchant-id"), defaults.getMerchantId()));
        cfg.setSignKey(str(values.get("sign-key"), defaults.getSignKey()));
        cfg.setCallbackUrl(str(values.get("callback-url"), defaults.getCallbackUrl()));
        cfg.setAddressExpireMinutes(integer(values.get("address-expire-minutes"), defaults.getAddressExpireMinutes()));
        cfg.setConnectTimeoutSeconds(integer(values.get("connect-timeout-seconds"), defaults.getConnectTimeoutSeconds()));
        cfg.setReadTimeoutSeconds(integer(values.get("read-timeout-seconds"), defaults.getReadTimeoutSeconds()));
        return cfg;
    }

    @Transactional
    public UdunRuntimeConfig save(UdunRuntimeConfig dto) {
        upsert("enabled", String.valueOf(Boolean.TRUE.equals(dto.getEnabled())), "是否启用优盾充值");
        upsert("gateway-url", dto.getGatewayUrl(), "优盾网关地址");
        upsert("merchant-id", dto.getMerchantId(), "优盾商户号");
        upsert("sign-key", dto.getSignKey(), "优盾签名密钥");
        upsert("callback-url", dto.getCallbackUrl(), "优盾回调地址");
        upsert("address-expire-minutes", String.valueOf(dto.getAddressExpireMinutes() == null ? 60 : dto.getAddressExpireMinutes()), "充值地址有效分钟数");
        upsert("connect-timeout-seconds", String.valueOf(dto.getConnectTimeoutSeconds() == null ? 10 : dto.getConnectTimeoutSeconds()), "连接超时秒数");
        upsert("read-timeout-seconds", String.valueOf(dto.getReadTimeoutSeconds() == null ? 20 : dto.getReadTimeoutSeconds()), "读取超时秒数");
        return current();
    }

    private Map<String, String> values() {
        List<SystemConfig> rows = systemConfigMapper.selectList(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getModule, MODULE));
        Map<String, String> map = new HashMap<>();
        for (SystemConfig row : rows) {
            String key = row.getConfigKey();
            if (key != null && key.startsWith(PREFIX)) {
                map.put(key.substring(PREFIX.length()), row.getConfigValue());
            }
        }
        return map;
    }

    private void upsert(String key, String value, String remark) {
        String configKey = PREFIX + key;
        SystemConfig exists = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, configKey)
                .last("LIMIT 1"));
        if (exists == null) {
            exists = new SystemConfig();
            exists.setConfigKey(configKey);
            exists.setModule(MODULE);
            exists.setConfigValue(value);
            exists.setRemark(remark);
            systemConfigMapper.insert(exists);
        } else {
            exists.setConfigValue(value);
            exists.setModule(MODULE);
            exists.setRemark(remark);
            systemConfigMapper.updateById(exists);
        }
    }

    private String str(String value, String fallback) {
        return StrUtil.isBlank(value) ? fallback : value;
    }

    private Boolean bool(String value, Boolean fallback) {
        if (StrUtil.isBlank(value)) return Boolean.TRUE.equals(fallback);
        return Boolean.parseBoolean(value);
    }

    private Integer integer(String value, Integer fallback) {
        if (StrUtil.isBlank(value)) return fallback;
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
