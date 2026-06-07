package com.ciphertool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageGenerationResponse {
    private String content;
    private List<ImageItem> images = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageItem {
        private String url;
        private String mimeType;
        private String revisedPrompt;
    }
}
