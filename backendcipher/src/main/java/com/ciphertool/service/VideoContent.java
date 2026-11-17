package com.ciphertool.service;

import org.springframework.core.io.Resource;

/**
 * 后端代理的视频文件。上游 content 地址需要 Bearer Key，浏览器无法直接播放，
 * 因此这里先落盘再以可 seek 的 Resource 返回。
 */
public record VideoContent(Resource resource, String contentType) {
}
