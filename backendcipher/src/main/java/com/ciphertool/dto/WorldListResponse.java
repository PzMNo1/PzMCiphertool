package com.ciphertool.dto;

import lombok.Data;

import java.util.List;

/**
 * 世界列表分页结果。
 */
@Data
public class WorldListResponse {

    private List<WorldInfo> worlds;

    /** 下一页游标，为空表示到底了。 */
    private String nextPageToken;

    /** 上游原始 JSON。 */
    private String raw;
}
