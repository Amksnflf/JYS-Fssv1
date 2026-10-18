package com.asterpro.modules.asset.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class AssetOverviewVO {
    private BigDecimal totalUsd;
    private BigDecimal spotTotalUsd;
    private BigDecimal tradeTotalUsd;
    private BigDecimal financeTotalUsd;
    /** 今日盈亏 */
    private BigDecimal todayProfit;
    /** 三账户原始行 */
    private List<AccountVO> accounts;
    /** 币种汇总（不分账户） */
    private List<AccountVO> coinSummary;
}
