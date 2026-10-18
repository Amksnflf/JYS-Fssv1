package com.asterpro.common.util;

import cn.hutool.core.util.RandomUtil;

import java.util.concurrent.ThreadLocalRandom;

public class CodeGen {

    private CodeGen() {}

    /** 4 位 + 时间戳后 4 位组合，便于人眼识别 */
    public static String uid() {
        long ts = System.currentTimeMillis() % 10000;
        int rand = ThreadLocalRandom.current().nextInt(1000, 10000);
        return String.format("%04d%04d", rand, ts);
    }

    /** 6 位大写字母 + 数字邀请码 */
    public static String inviteCode() {
        return RandomUtil.randomString("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);
    }

    /** 6 位数字验证码 */
    public static String verifyCode() {
        return RandomUtil.randomNumbers(6);
    }

    /** 业务订单号 前缀 + 时间戳 + 随机 */
    public static String orderNo(String prefix) {
        return prefix + System.currentTimeMillis() + RandomUtil.randomNumbers(4);
    }
}
