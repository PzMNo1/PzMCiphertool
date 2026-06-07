package com.ciphertool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackReplyRequest {

    @NotBlank(message = "回复内容不能为空")
    @Size(max = 2000, message = "回复内容不能超过2000个字符")
    private String content;
}
