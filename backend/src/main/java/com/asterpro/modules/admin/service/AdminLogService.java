package com.asterpro.modules.admin.service;

import com.asterpro.common.util.RequestUtil;
import com.asterpro.modules.admin.entity.AdminLog;
import com.asterpro.modules.admin.mapper.AdminLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final AdminLogMapper mapper;

    public void log(Long adminId, String module, String action,
                    String targetType, String targetId, String params) {
        try {
            AdminLog l = new AdminLog();
            l.setAdminId(adminId);
            l.setModule(module);
            l.setAction(action);
            l.setTargetType(targetType);
            l.setTargetId(targetId);
            l.setParams(params);
            l.setIp(RequestUtil.ip());
            mapper.insert(l);
        } catch (Exception e) {
            log.warn("write admin log err: {}", e.getMessage());
        }
    }
}
