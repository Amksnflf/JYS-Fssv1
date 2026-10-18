package com.asterpro.common.api;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(0, "ok"),
    PARAM_ERROR(400, "Parameter error"), // 参数错误
    UNAUTHORIZED(401, "Not logged in or login expired"), // 未登录或登录已过期
    FORBIDDEN(403, "No permission to access"), // 无权限访问
    NOT_FOUND(404, "Resource not found"), // 资源不存在
    SERVER_ERROR(500, "Internal server error"), // 服务器内部错误

    USER_NOT_EXIST(1001, "User does not exist"), // 用户不存在
    USER_PWD_ERROR(1002, "Account or password error"), // 账号或密码错误
    USER_LOCKED(1003, "Account has been frozen"), // 账号已被冻结
    USER_ALREADY_EXIST(1004, "Account has been registered"), // 账号已被注册
    VERIFY_CODE_ERROR(1005, "Verification code error or expired"), // 验证码错误或已过期
    KYC_REQUIRED(1006, "Please complete identity verification first"), // 请先完成实名认证
    PAY_PWD_ERROR(1007, "Transaction password error"), // 交易密码错误

    BALANCE_NOT_ENOUGH(2001, "Insufficient balance"), // 余额不足
    COIN_DISABLED(2002, "This coin has been suspended"), // 该币种已暂停
    WITHDRAW_DISABLED(2003, "Withdrawal is suspended for this coin"), // 该币种暂停提现

    SYMBOL_NOT_EXIST(3001, "Trading pair does not exist"), // 交易对不存在
    ORDER_NOT_EXIST(3002, "Order does not exist"), // 订单不存在
    PRICE_OUT_OF_RANGE(3003, "Price is out of allowed range"), // 价格不在允许范围内

    QUOTE_UNAVAILABLE(4001, "Market data temporarily unavailable, please try again later"); // 行情暂不可用，请稍后再试

    private final int code;
    private final String msg;
}
