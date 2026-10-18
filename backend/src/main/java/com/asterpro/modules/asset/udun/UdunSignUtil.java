package com.asterpro.modules.asset.udun;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;

public final class UdunSignUtil {

    private UdunSignUtil() {
    }

    public static String sign(String body, String key, String nonce, String timestamp) {
        return DigestUtil.md5Hex(String.valueOf(body) + key + nonce + timestamp).toLowerCase();
    }

    public static boolean verify(String body, String key, String nonce, String timestamp, String sign) {
        if (StrUtil.hasBlank(key, nonce, timestamp, sign)) return false;
        return sign(body, key, nonce, timestamp).equalsIgnoreCase(sign);
    }
}
