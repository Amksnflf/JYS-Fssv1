package com.asterpro.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("t_i18n_dict")
public class I18nDict {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String dictKey;
    private String lang;
    private String value;
    private String module;
}
