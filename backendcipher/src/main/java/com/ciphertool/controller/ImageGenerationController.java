package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ImageGenerationRequest;
import com.ciphertool.dto.ImageGenerationResponse;
import com.ciphertool.service.ImageGenerationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "*")
public class ImageGenerationController {

    private final ImageGenerationService imageGenerationService;

    public ImageGenerationController(ImageGenerationService imageGenerationService) {
        this.imageGenerationService = imageGenerationService;
    }

    @PostMapping("/generations")
    public ApiResponse<ImageGenerationResponse> generate(@Valid @RequestBody ImageGenerationRequest request) {
        return ApiResponse.success("图片生成完成", imageGenerationService.generate(request));
    }
}
