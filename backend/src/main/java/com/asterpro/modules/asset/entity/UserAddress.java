package com.asterpro.modules.asset.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_address")
public class UserAddress {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String coin;
    private String chain;
    private String address;
    private String memo;
    private String remark;
    private Integer whitelist;
    private LocalDateTime createdAt;
}
