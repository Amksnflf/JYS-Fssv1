package com.asterpro.modules.asset.controller;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.modules.asset.entity.UdunCallbackLog;
import com.asterpro.modules.asset.mapper.UdunCallbackLogMapper;
import com.asterpro.modules.asset.service.DepositService;
import com.asterpro.modules.asset.service.UdunConfigService;
import com.asterpro.modules.asset.udun.UdunSignUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/callback/udun")
@RequiredArgsConstructor
public class UdunCallbackController {

    private final UdunConfigService udunConfigService;
    private final DepositService depositService;
    private final UdunCallbackLogMapper callbackLogMapper;

    @PostMapping("/transaction")
    public String transaction(@RequestParam String timestamp,
                              @RequestParam String nonce,
                              @RequestParam String sign,
                              @RequestParam String body) {
        boolean signValid = UdunSignUtil.verify(body, udunConfigService.current().getSignKey(), nonce, timestamp, sign);
        JSONObject json = StrUtil.isBlank(body) ? new JSONObject() : JSON.parseObject(body);
        UdunCallbackLog logEntity = buildLog(json, body, signValid);
        callbackLogMapper.insert(logEntity);
        if (!signValid) {
            markFailed(logEntity, "签名错误");
            return "FAIL";
        }
        try {
            Integer tradeType = json.getInteger("tradeType");
            Integer status = json.getInteger("status");
            if (tradeType != null && tradeType == 1 && status != null && status == 3) {
                depositService.handleUdunDeposit(
                        json.getString("address"),
                        json.getString("mainCoinType"),
                        json.getString("coinType"),
                        json.getString("amount"),
                        json.getString("decimals"),
                        json.getString("txId"),
                        json.getString("tradeId"),
                        json.getString("blockHigh"));
                markProcessed(logEntity);
            } else {
                markFailed(logEntity, "非成功充币回调，仅记录");
            }
            return "SUCCESS";
        } catch (Exception e) {
            log.warn("udun callback process failed body={}", body, e);
            markFailed(logEntity, e.getMessage());
            return "FAIL";
        }
    }

    private UdunCallbackLog buildLog(JSONObject json, String body, boolean signValid) {
        UdunCallbackLog logEntity = new UdunCallbackLog();
        logEntity.setTradeId(json.getString("tradeId"));
        logEntity.setTradeType(json.getString("tradeType"));
        logEntity.setTxHash(json.getString("txId"));
        logEntity.setBusinessId(json.getString("businessId"));
        logEntity.setAddress(json.getString("address"));
        logEntity.setCoinType(json.getString("coinType"));
        logEntity.setMainCoinType(json.getString("mainCoinType"));
        logEntity.setStatus(json.getInteger("status"));
        logEntity.setSignValid(signValid ? 1 : 0);
        logEntity.setProcessed(0);
        logEntity.setRawBody(body);
        return logEntity;
    }

    private void markProcessed(UdunCallbackLog logEntity) {
        logEntity.setProcessed(1);
        logEntity.setProcessedAt(LocalDateTime.now());
        callbackLogMapper.updateById(logEntity);
    }

    private void markFailed(UdunCallbackLog logEntity, String reason) {
        logEntity.setProcessed(0);
        logEntity.setFailReason(StrUtil.maxLength(reason, 500));
        logEntity.setProcessedAt(LocalDateTime.now());
        callbackLogMapper.updateById(logEntity);
    }
}
