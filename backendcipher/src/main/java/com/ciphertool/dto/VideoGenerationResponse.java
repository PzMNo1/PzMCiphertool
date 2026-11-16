package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 视频创作任务状态。
 *
 * <p>提交时只返回 taskId 与状态；前端轮询后再拿 progress 与成片地址。</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoGenerationResponse {
    private String taskId;
    private String status;
    private Integer progress;
    private String model;
    private List<VideoItem> videos = new ArrayList<>();
    private String errorMessage;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VideoItem {
        private String url;
        private String mimeType;
        private Integer durationSeconds;
        private String aspectRatio;
    }
}
