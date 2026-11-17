package com.ciphertool.service;

import com.ciphertool.dto.VideoGenerationRequest;
import com.ciphertool.dto.VideoGenerationResponse;

public interface VideoGenerationService {
    /**
     * 提交视频创作任务，返回上游 taskId。
     */
    VideoGenerationResponse submit(VideoGenerationRequest request);

    /**
     * 查询视频创作任务状态；成功时带回成片地址。
     */
    VideoGenerationResponse status(String taskId);

    /**
     * 读取成片文件；首次访问时从上游下载并缓存到服务端。
     */
    VideoContent content(String taskId);
}
