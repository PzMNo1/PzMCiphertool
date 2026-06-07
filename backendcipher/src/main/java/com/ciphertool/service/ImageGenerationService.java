package com.ciphertool.service;

import com.ciphertool.dto.ImageGenerationRequest;
import com.ciphertool.dto.ImageGenerationResponse;

public interface ImageGenerationService {
    ImageGenerationResponse generate(ImageGenerationRequest request);
}
