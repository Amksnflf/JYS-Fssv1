package com.asterpro.modules.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_kyc")
public class UserKyc {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Integer level;
    private String country;
    private String realName;
    private String idType;
    private String idNo;
    private String idFrontUrl;
    private String idBackUrl;
    private String faceUrl;
    private Integer auditStatus;
    private String auditRemark;
    private Long auditedBy;
    private LocalDateTime auditedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
