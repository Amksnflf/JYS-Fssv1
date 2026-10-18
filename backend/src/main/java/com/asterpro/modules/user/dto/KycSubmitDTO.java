package com.asterpro.modules.user.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class KycSubmitDTO {

    @NotNull(message = "Verification level cannot be empty") // 认证级别不能为空
    @Min(1) @Max(2)
    private Integer level;

    @NotBlank(message = "Country cannot be empty") // 国家不能为空
    private String country;

    @NotBlank(message = "Real name cannot be empty") // 真实姓名不能为空
    private String realName;

    @NotBlank(message = "ID type cannot be empty") // 证件类型不能为空
    private String idType;

    @NotBlank(message = "ID number cannot be empty") // 证件号不能为空
    private String idNo;

    /** level=2 时必填 */
    private String idFrontUrl;
    private String idBackUrl;
    private String faceUrl;
}
