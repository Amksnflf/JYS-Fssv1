package com.asterpro.common.exception;

import com.asterpro.common.api.ResultCode;
import lombok.Getter;

@Getter
public class BizException extends RuntimeException {

    private final int code;

    public BizException(String msg) {
        super(msg);
        this.code = ResultCode.PARAM_ERROR.getCode();
    }

    public BizException(int code, String msg) {
        super(msg);
        this.code = code;
    }

    public BizException(ResultCode rc) {
        super(rc.getMsg());
        this.code = rc.getCode();
    }
}
