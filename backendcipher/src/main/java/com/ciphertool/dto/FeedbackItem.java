package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackItem {

    private String id;

    private String submitterMaskedEmail;

    private String content;

    private String createdAt;

    private String updatedAt;

    private boolean replied;

    private String replyContent;

    private String replyAuthor;

    private String repliedAt;
}
