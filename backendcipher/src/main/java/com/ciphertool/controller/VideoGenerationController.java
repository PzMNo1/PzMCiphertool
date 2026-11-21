package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.VideoGenerationRequest;
import com.ciphertool.dto.VideoGenerationResponse;
import com.ciphertool.service.UsageQuotaService;
import com.ciphertool.service.VideoContent;
import com.ciphertool.service.VideoGenerationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*")
public class VideoGenerationController {

    private final VideoGenerationService videoGenerationService;
    private final UsageQuotaService usageQuotaService;

    public VideoGenerationController(VideoGenerationService videoGenerationService, UsageQuotaService usageQuotaService) {
        this.videoGenerationService = videoGenerationService;
        this.usageQuotaService = usageQuotaService;
    }

    @PostMapping("/generations")
    public ApiResponse<VideoGenerationResponse> generate(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody VideoGenerationRequest request) {
        UsageQuotaService.QuotaCharge charge = usageQuotaService.consumeMedia(
                authorization,
                servletRequest,
                UsageQuotaService.Surface.VIDEO,
                1
        );
        try {
            return ApiResponse.success("视频创作任务已提交", videoGenerationService.submit(request));
        } catch (RuntimeException e) {
            usageQuotaService.refundMedia(charge);
            throw e;
        }
    }

    @GetMapping("/generations/{taskId}")
    public ApiResponse<VideoGenerationResponse> status(@PathVariable String taskId) {
        return ApiResponse.success("视频创作任务状态", videoGenerationService.status(taskId));
    }

    @GetMapping("/generations/{taskId}/content")
    public ResponseEntity<Resource> content(@PathVariable String taskId) {
        VideoContent content = videoGenerationService.content(taskId);
        long length;
        try {
            length = content.resource().contentLength();
        } catch (Exception e) {
            length = -1;
        }
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400");
        if (length >= 0) {
            builder.contentLength(length);
        }
        return builder.body(content.resource());
    }
}
