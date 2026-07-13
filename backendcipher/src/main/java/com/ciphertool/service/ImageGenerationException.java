package com.ciphertool.service;

public class ImageGenerationException extends RuntimeException {
    public ImageGenerationException(String message) {
        super(message);
    }

    public ImageGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
