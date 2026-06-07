package com.ciphertool.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ImageGenerationRequest {
    @NotBlank(message = "图片生成提示不能为空")
    private String prompt;

    private String model;

    private String size;

    @Min(value = 1, message = "图片数量至少为 1")
    @Max(value = 4, message = "图片数量最多为 4")
    private Integer n;
}
