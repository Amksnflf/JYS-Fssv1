package com.asterpro.common.util;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

public final class PageUtil {

    public static final int DEFAULT_PAGE_NO = 1;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 200;

    private PageUtil() {
    }

    public static <T> Page<T> page(Integer pageNo, Integer pageSize) {
        int current = pageNo == null || pageNo < 1 ? DEFAULT_PAGE_NO : pageNo;
        int size = pageSize == null || pageSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, MAX_PAGE_SIZE);
        return new Page<>(current, size);
    }
}
