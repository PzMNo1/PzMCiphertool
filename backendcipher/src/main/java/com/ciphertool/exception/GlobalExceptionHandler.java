package com.ciphertool.exception;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.service.ApiRouterService;
import com.ciphertool.service.AuthService;
import com.ciphertool.service.ImageGenerationException;
import com.ciphertool.service.WorldModelException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global Exception Handler
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "参数校验失败";
        log.warn("Validation failed: {}", message);
        return ApiResponse.error(message);
    }

    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleBindException(BindException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "参数绑定失败";
        log.warn("Bind failed: {}", message);
        return ApiResponse.error(message);
    }

    @ExceptionHandler(AuthService.AuthAccessException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Void> handleAuthAccessException(AuthService.AuthAccessException e) {
        log.warn("Unauthorized request: {}", e.getMessage());
        return ApiResponse.error(e.getMessage());
    }

    @ExceptionHandler(ApiRouterService.ApiRouterAccessException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiRouterAccessException(ApiRouterService.ApiRouterAccessException e) {
        log.warn("API router access denied: {}", e.getMessage());
        return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Bad request: {}", e.getMessage());
        return ApiResponse.error(e.getMessage());
    }

    @ExceptionHandler(ImageGenerationException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ApiResponse<Void> handleImageGenerationException(ImageGenerationException e) {
        log.warn("Image generation failed: {}", e.getMessage());
        return ApiResponse.error(e.getMessage());
    }

    /**
     * 世界模型上游错误：未配置 Key 视为服务端配置问题（501），其余按上游语义映射，
     * 让前端能区分「去配 Key」和「去充值」两种情况。
     */
    @ExceptionHandler(WorldModelException.class)
    public ResponseEntity<ApiResponse<Void>> handleWorldModelException(WorldModelException e) {
        HttpStatus status;
        if (e.isNotConfigured()) {
            status = HttpStatus.NOT_IMPLEMENTED;
        } else if (e.getStatusCode() == 402) {
            status = HttpStatus.PAYMENT_REQUIRED;
        } else if (e.getStatusCode() == 429) {
            status = HttpStatus.TOO_MANY_REQUESTS;
        } else if (e.getStatusCode() == 400 || e.getStatusCode() == 401 || e.getStatusCode() == 403
                || e.getStatusCode() == 404) {
            status = HttpStatus.BAD_REQUEST;
        } else {
            status = HttpStatus.BAD_GATEWAY;
        }
        log.warn("World model call failed ({}): {}", status.value(), e.getMessage());
        return ResponseEntity.status(status).body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception e) {
        log.error("System error: ", e);
        return ApiResponse.error("系统繁忙，请稍后重试");
    }
}















