package com.ciphertool.controller;

import com.ciphertool.dto.ApiResponse;
import com.ciphertool.dto.WorldGenerateRequest;
import com.ciphertool.dto.WorldGenerateResponse;
import com.ciphertool.dto.WorldInfo;
import com.ciphertool.dto.WorldListResponse;
import com.ciphertool.dto.WorldStatusResponse;
import com.ciphertool.service.WorldModelService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 建模实验室「世界模型」页签的后端入口。
 *
 * <p>前端只认这几个路径，World Labs 的 base url、鉴权头、模型名全部留在服务端。</p>
 */
@RestController
@RequestMapping("/api/world")
@CrossOrigin(origins = "*")
public class WorldModelController {

    private final WorldModelService worldModelService;

    public WorldModelController(WorldModelService worldModelService) {
        this.worldModelService = worldModelService;
    }

    /** 接入状态与剩余额度。未配置 Key 时也返回 200，让前端显示引导而不是报错。 */
    @GetMapping("/status")
    public ApiResponse<WorldStatusResponse> status() {
        WorldStatusResponse status = worldModelService.status();
        return ApiResponse.success(status.isConfigured() ? "世界模型已接入" : "世界模型未配置", status);
    }

    /** 提交一次世界生成。 */
    @PostMapping("/generations")
    public ApiResponse<WorldGenerateResponse> generate(@RequestBody WorldGenerateRequest request) {
        return ApiResponse.success("已提交世界生成任务", worldModelService.generate(request));
    }

    /** 轮询生成进度。 */
    @GetMapping("/operations/{operationId}")
    public ApiResponse<WorldGenerateResponse> operation(@PathVariable String operationId) {
        return ApiResponse.success("ok", worldModelService.operation(operationId));
    }

    /** 取世界的全部可下载资产（SPZ / 碰撞网格 / 全景图）。 */
    @GetMapping("/worlds/{worldId}")
    public ApiResponse<WorldInfo> world(@PathVariable String worldId) {
        return ApiResponse.success("ok", worldModelService.world(worldId));
    }

    /** 作品库：列出通过 API 生成过的世界。 */
    @PostMapping("/worlds")
    public ApiResponse<WorldListResponse> list(
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            @RequestParam(value = "pageToken", required = false) String pageToken,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "model", required = false) String model) {
        return ApiResponse.success("ok", worldModelService.list(pageSize, pageToken, status, model));
    }

    /** 删除一个世界。 */
    @DeleteMapping("/worlds/{worldId}")
    public ApiResponse<Boolean> delete(@PathVariable String worldId) {
        return ApiResponse.success("已删除", worldModelService.delete(worldId));
    }
}
