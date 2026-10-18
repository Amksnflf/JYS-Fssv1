package com.asterpro.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SendCodeDTO {

    @NotBlank(message = "目标类型不能为空")
    @Pattern(regexp = "phone|email", message = "目标类型错误")
    private String targetType;

    @NotBlank(message = "目标不能为空")
    private String target;

    @NotBlank(message = "场景不能为空")
    private String scene;

    private String countryCode;
}
