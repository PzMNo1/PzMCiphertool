package com.ciphertool.dto;

import lombok.Data;

/**
 * 生成任务受理结果，对应 World Labs 的 Operation 对象。
 *
 * <p>世界生成是长任务（通常 5 分钟左右），这里只返回受理信息，
 * 前端拿 {@link #operationId} 轮询 {@code /api/world/operations/{id}}。</p>
 */
@Data
public class WorldGenerateResponse {

    /** 操作 ID，用于后续轮询。 */
    private String operationId;

    /** 上游是否已完成（刚受理时一定是 false）。 */
    private boolean done;

    /** 完成后的世界 ID，未完成时为 null。 */
    private String worldId;

    /** 失败时的错误信息。 */
    private String error;

    /** 该次生成消耗的 credits，完成后才有值。 */
    private Integer costCredits;

    /** 上游原始 JSON，字段随版本演进，前端按需读取。 */
    private String raw;
}
