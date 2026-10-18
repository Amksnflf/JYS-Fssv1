package com.asterpro.modules.support.service;

import com.asterpro.common.exception.BizException;
import com.asterpro.modules.support.vo.SupportHubConfigVO;
import com.asterpro.modules.system.entity.SystemConfig;
import com.asterpro.modules.system.mapper.SystemConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupportConfigService {

    private final SystemConfigMapper systemConfigMapper;

    public SupportHubConfigVO buildPublicConfig() {
        try {
            Map<String, String> configMap = supportConfigMap();
            return buildFromMap(configMap);
        } catch (Exception e) {
            log.warn("Failed to load support config from database, using defaults", e);
            return defaultPublicConfig();
        }
    }

    private SupportHubConfigVO buildFromMap(Map<String, String> configMap) {
        SupportHubConfigVO vo = new SupportHubConfigVO();
        vo.setEnabled(boolValue(configMap, "support.enabled", true));
        vo.setMode(strValue(configMap, "support.mode", "hub"));
        vo.setVendor(strValue(configMap, "support.vendor", "none"));
        vo.setHelpCenterEnabled(boolValue(configMap, "support.help_center_enabled", true));
        vo.setTicketEnabled(boolValue(configMap, "support.ticket_enabled", true));
        vo.setThirdPartyEnabled(boolValue(configMap, "support.third_party_enabled", false));
        vo.setThirdPartyType(strValue(configMap, "support.third_party_type", "none"));
        vo.setThirdPartyUrl(strValue(configMap, "support.third_party_url", ""));
        vo.setThirdPartyScript(strValue(configMap, "support.third_party_script", ""));
        vo.setThirdPartyAppId(strValue(configMap, "support.third_party_app_id", ""));
        vo.setFallbackToTicket(boolValue(configMap, "support.fallback_to_ticket", true));
        return vo;
    }

    private SupportHubConfigVO defaultPublicConfig() {
        return buildFromMap(Map.of());
    }

    public List<SystemConfig> listSupportConfigs() {
        return systemConfigMapper.selectList(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getModule, "support")
                .orderByAsc(SystemConfig::getId));
    }

    public SystemConfig saveSupportConfig(SystemConfig dto) {
        if (dto.getConfigKey() == null || dto.getConfigKey().isBlank()) {
            throw new BizException("Config key cannot be empty"); // 配置键不能为空
        }
        if (!dto.getConfigKey().startsWith("support.")) {
            throw new BizException("Only support.* configs can be saved"); // 仅允许保存 support.* 配置
        }
        dto.setModule("support");
        LambdaQueryWrapper<SystemConfig> wrapper = new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, dto.getConfigKey())
                .last("LIMIT 1");
        SystemConfig existing = systemConfigMapper.selectOne(wrapper);
        if (existing == null) {
            systemConfigMapper.insert(dto);
            return dto;
        }
        existing.setConfigValue(dto.getConfigValue());
        existing.setRemark(dto.getRemark());
        existing.setModule("support");
        systemConfigMapper.updateById(existing);
        return existing;
    }

    public int defaultPriority() {
        Map<String, String> configMap = supportConfigMap();
        String value = configMap.get("support.default_priority");
        if (value == null || value.isBlank()) {
            return 2;
        }
        try {
            int priority = Integer.parseInt(value.trim());
            return priority < 1 || priority > 4 ? 2 : priority;
        } catch (NumberFormatException ignored) {
            return 2;
        }
    }

    private Map<String, String> supportConfigMap() {
        List<SystemConfig> configs = listSupportConfigs();
        Map<String, String> configMap = new LinkedHashMap<>();
        for (SystemConfig config : configs) {
            configMap.put(config.getConfigKey(), config.getConfigValue());
        }
        return configMap;
    }

    private boolean boolValue(Map<String, String> configMap, String key, boolean defaultValue) {
        String value = configMap.get(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return "true".equalsIgnoreCase(value.trim()) || "1".equals(value.trim());
    }

    private String strValue(Map<String, String> configMap, String key, String defaultValue) {
        String value = configMap.get(key);
        return value == null ? defaultValue : value;
    }
}
