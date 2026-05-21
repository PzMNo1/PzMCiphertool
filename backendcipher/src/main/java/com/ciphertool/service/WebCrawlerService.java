package com.ciphertool.service;

import java.util.Map;

/**
 * 网页爬虫服务接口
 */
public interface WebCrawlerService {
    
    /**
     * 搜索引擎搜索
     * @param query 搜索关键词
     * @param engine 搜索引擎 (bing/baidu)
     * @param timeLimit 时间限制 (d:一天, w:一周, m:一月, y:一年)
     * @return 搜索结果摘要
     */
    String search(String query, String engine, String timeLimit);
    
    /**
     * 获取网页内容
     * @param url 网页URL
     * @param fullContent 是否获取完整内容
     * @return 网页内容
     */
    String fetchWebpage(String url, boolean fullContent);
    
    /**
     * 获取新闻摘要
     * @param keyword 新闻关键词
     * @param category 分类 (tech, financial, sports, etc.)
     * @return 新闻列表摘要
     */
    String getNews(String keyword, String category);
    
    /**
     * 获取天气信息
     * @param city 城市名称
     * @param detailed 是否需要详细预报
     * @return 天气信息
     */
    String getWeather(String city, boolean detailed);
    /**
     * 多步搜索：获取搜索结果URL列表（搜索第一步）
     * @param query 搜索关键词
     * @return 包含链接和摘要的JSON数组字符串
     */
    String searchUrls(String query);

    /**
     * 深度读取：获取指定URL的网页全文Markdown（搜索第二步）
     * 支持长文本分页或关键词过滤片段
     * @param url 网页URL
     * @param focusKeyword 可选，关注的关键词，用于过滤返回相关的段落
     * @param chunkIndex 可选，当网页太长时，获取的文本块索引（默认0）
     * @return 包含Markdown正文或错误信息的JSON字符串
     */
    String readWebpage(String url, String focusKeyword, Integer chunkIndex);
}
