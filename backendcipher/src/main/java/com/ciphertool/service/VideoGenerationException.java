package com.ciphertool.service;

public class VideoGenerationException extends RuntimeException {
    public VideoGenerationException(String message) {
        super(message);
    }

    public VideoGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
