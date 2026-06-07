package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.FeedbackCreateRequest;
import com.ciphertool.dto.FeedbackOverview;
import com.ciphertool.dto.FeedbackReplyRequest;
import com.ciphertool.service.AuthService;
import com.ciphertool.service.FeedbackService;
import com.ciphertool.service.RiskControlService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final AuthService authService;
    private final RiskControlService riskControlService;

    @Value("${feedback.risk.submit-per-hour:20}")
    private int submitPerHour;

    @GetMapping
    public ApiResponse<FeedbackOverview> list(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String currentUserEmail = authService.resolveSessionEmail(authorization);
        return ApiResponse.success("Feedback loaded", feedbackService.list(currentUserEmail));
    }

    @PostMapping
    public ApiResponse<FeedbackOverview> create(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest servletRequest,
            @Valid @RequestBody FeedbackCreateRequest request) {
        String email = authService.resolveSessionEmail(authorization);
        if (email == null || email.isBlank()) {
            riskControlService.requireIpAction(
                    riskControlService.clientIp(servletRequest),
                    "feedback-submit",
                    submitPerHour,
                    Duration.ofHours(1),
                    "反馈提交过于频繁，请稍后再试"
            );
        } else {
            riskControlService.requireUserAction(
                    email,
                    "feedback-submit",
                    submitPerHour,
                    Duration.ofHours(1),
                    "反馈提交过于频繁，请稍后再试"
            );
        }
        return ApiResponse.success("反馈已提交", feedbackService.create(email, request.getContent()));
    }

    @PostMapping("/{id}/reply")
    public ApiResponse<FeedbackOverview> reply(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String id,
            @Valid @RequestBody FeedbackReplyRequest request) {
        String email = authService.requireSessionEmail(authorization);
        return ApiResponse.success("回复已发布", feedbackService.reply(email, id, request.getContent()));
    }

    @PostMapping("/{id}/delete")
    public ApiResponse<FeedbackOverview> delete(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String id) {
        String email = authService.requireSessionEmail(authorization);
        return ApiResponse.success("反馈已删除", feedbackService.delete(email, id));
    }
}
