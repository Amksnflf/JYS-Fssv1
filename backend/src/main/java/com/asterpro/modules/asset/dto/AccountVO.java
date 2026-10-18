package com.asterpro.modules.asset.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AccountVO {
    /** 1 现货 2 交易 3 理财；0 表示币种汇总行 */
    private Integer accountType;
    private String coin;
    private BigDecimal available;
    private BigDecimal frozen;
    /** USDT 估值 */
    private BigDecimal valuation;
    /** 单价 */
    private BigDecimal price;
    /** 累计盈亏 */
    private BigDecimal totalProfit;
    /** 跌涨幅（百分比） */
    private BigDecimal profitRate;
}
