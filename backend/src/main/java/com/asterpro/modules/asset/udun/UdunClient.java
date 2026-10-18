package com.asterpro.modules.asset.udun;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.service.UdunConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class UdunClient {

    private final UdunProperties properties;
    private final UdunConfigService configService;

    public JSONObject createAddress(String mainCoinType, String alias) {
        UdunRuntimeConfig cfg = ensureEnabled();
        Integer mainType;
        try {
            mainType = Integer.valueOf(mainCoinType);
        } catch (NumberFormatException e) {
            throw new BizException("Udun main coin type configuration error"); // 优盾主币种编号配置错误
        }
        JSONObject item = new JSONObject();
        item.put("merchantId", cfg.getMerchantId());
        item.put("mainCoinType", mainType);
        item.put("callUrl", cfg.getCallbackUrl());
        if (StrUtil.isNotBlank(alias)) item.put("alias", alias);
        return post(cfg, "/mch/address/create", JSON.toJSONString(List.of(item)));
    }

    public JSONObject supportCoins(boolean showBalance) {
        UdunRuntimeConfig cfg = ensureEnabled();
        JSONObject body = new JSONObject();
        body.put("merchantId", cfg.getMerchantId());
        body.put("showBalance", showBalance);
        return post(cfg, "/mch/support-coins", body.toJSONString());
    }

    public JSONObject checkAddress(String mainCoinType, String address) {
        UdunRuntimeConfig cfg = ensureEnabled();
        JSONObject item = new JSONObject();
        item.put("merchantId", cfg.getMerchantId());
        item.put("mainCoinType", mainCoinType);
        item.put("address", address);
        return post(cfg, "/mch/check/address", JSON.toJSONString(List.of(item)));
    }

    private JSONObject post(UdunRuntimeConfig cfg, String path, String body) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = IdUtil.fastSimpleUUID().substring(0, 16);
        String sign = UdunSignUtil.sign(body, cfg.getSignKey(), nonce, timestamp);
        Map<String, String> params = new HashMap<>();
        params.put("timestamp", timestamp);
        params.put("nonce", nonce);
        params.put("sign", sign);
        params.put("body", body);

        FormBody.Builder form = new FormBody.Builder();
        params.forEach(form::add);
        String url = StrUtil.removeSuffix(cfg.getGatewayUrl(), "/") + path;
        Request request = new Request.Builder().url(url).post(form.build()).build();
        try (Response response = http(cfg).newCall(request).execute()) {
            String text = response.body() == null ? "" : response.body().string();
            if (!response.isSuccessful()) {
                log.warn("udun http error url={} code={} body={}", url, response.code(), text);
                throw new BizException("Udun API request failed"); // 优盾接口请求失败
            }
            JSONObject json = JSON.parseObject(text);
            if (json.getIntValue("code") != 200) {
                throw new BizException("Udun API failed: " + json.getString("message")); // 优盾接口失败：
            }
            return json;
        } catch (IOException e) {
            log.warn("udun request failed path={}", path, e);
            throw new BizException("Udun API request exception"); // 优盾接口请求异常
        }
    }

    private OkHttpClient http(UdunRuntimeConfig cfg) {
        return new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(cfg.getConnectTimeoutSeconds()))
                .readTimeout(Duration.ofSeconds(cfg.getReadTimeoutSeconds()))
                .build();
    }

    private UdunRuntimeConfig ensureEnabled() {
        UdunRuntimeConfig cfg = configService.current();
        if (!Boolean.TRUE.equals(cfg.getEnabled())) {
            throw new BizException("Udun deposit not enabled"); // 优盾充值未启用
        }
        if (StrUtil.hasBlank(cfg.getGatewayUrl(), cfg.getMerchantId(), cfg.getSignKey(), cfg.getCallbackUrl())) {
            throw new BizException("Udun configuration incomplete"); // 优盾配置不完整
        }
        return cfg;
    }
}
