package com.asterpro.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_risk_rule")
public class RiskRule {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String code;
    private String name;
    private String config;
    private Integer enabled;
    private LocalDateTime createdAt;
}
