package com.asterpro.common.util;

import cn.hutool.crypto.digest.BCrypt;

public class PasswordUtil {

    private PasswordUtil() {}

    public static String hash(String raw) {
        return BCrypt.hashpw(raw, BCrypt.gensalt(10));
    }

    public static boolean matches(String raw, String hashed) {
        if (raw == null || hashed == null) return false;
        try {
            return BCrypt.checkpw(raw, hashed);
        } catch (Exception e) {
            return false;
        }
    }
}
