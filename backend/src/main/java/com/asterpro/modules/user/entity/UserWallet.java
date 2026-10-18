package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_wallet")
public class UserWallet {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String walletType;
    private String address;
    private String chain;
    private LocalDateTime createdAt;
}
