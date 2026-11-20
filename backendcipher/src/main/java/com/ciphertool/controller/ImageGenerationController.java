package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.ImageGenerationRequest;
import com.ciphertool.dto.ImageGenerationResponse;
import com.ciphertool.service.ImageGenerationService;
import com.ciphertool.service.UsageQuotaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "*")
public class ImageGenerationController {

    private final ImageGenerationService imageGenerationService;
    private final UsageQuotaService usageQuotaService;

    public ImageGenerationController(ImageGenerationService imageGenerationService, UsageQuotaService usageQuotaService) {
        this.imageGenerationService = imageGenerationService;
        this.usageQuotaService = usageQuotaService;
    }

    @PostMapping("/generations")
    public ApiResponse<ImageGenerationResponse> generate(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ImageGenerationRequest request) {
        int count = request.getN() == null ? 1 : request.getN();
        UsageQuotaService.QuotaCharge charge = usageQuotaService.consumeMedia(
                authorization,
                servletRequest,
                UsageQuotaService.Surface.IMAGE,
                count
        );
        try {
            return ApiResponse.success("图片生成完成", imageGenerationService.generate(request));
        } catch (RuntimeException e) {
            usageQuotaService.refundMedia(charge);
            throw e;
        }
    }
}
