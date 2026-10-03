package com.ciphertool.service;

import com.ciphertool.dto.WorldGenerateRequest;
import com.ciphertool.dto.WorldGenerateResponse;
import com.ciphertool.dto.WorldInfo;
import com.ciphertool.dto.WorldListResponse;
import com.ciphertool.dto.WorldStatusResponse;

/**
 * World Labs / Marble 世界模型代理服务。
 *
 * <p>所有上游调用都收口在这里，目的是：API Key 只留在服务端；
 * 前端不需要知道 {@code WLT-Api-Key} 头、base url、模型名的存在。</p>
 */
public interface WorldModelService {

    /** 后端是否已配置 API Key。 */
    boolean isConfigured();

    /** 接入状态 + 剩余额度，用于前端首屏引导。 */
    WorldStatusResponse status();

    /** 发起一次世界生成，返回可轮询的操作。 */
    WorldGenerateResponse generate(WorldGenerateRequest request);

    /** 轮询生成进度；完成后返回 worldId 与资产。 */
    WorldGenerateResponse operation(String operationId);

    /** 按 ID 取一个世界及其全部可下载资产。 */
    WorldInfo world(String worldId);

    /** 列出通过 API 生成过的世界，供「作品库」使用。 */
    WorldListResponse list(Integer pageSize, String pageToken, String status, String model);

    /** 删除一个世界。 */
    boolean delete(String worldId);
}
