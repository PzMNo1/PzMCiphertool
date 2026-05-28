package com.ciphertool.dto;

import lombok.Data;

@Data
public class ApiRouterChannelHealthCheckRequest {

    /**
     * Empty means check all enabled channels. Set a channel ID to check one channel.
     */
    private String channelId;
}
