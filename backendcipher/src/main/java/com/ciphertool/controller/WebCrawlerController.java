package com.ciphertool.controller;

import com.ciphertool.service.WebCrawlerService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/crawler")
@CrossOrigin(origins = "*")
public class WebCrawlerController {

    private final WebCrawlerService webCrawlerService;

    public WebCrawlerController(WebCrawlerService webCrawlerService) {
        this.webCrawlerService = webCrawlerService;
    }

    /**
     * 搜索引擎搜索
     */
    @PostMapping("/search")
    public Map<String, Object> search(@RequestBody Map<String, Object> request) {
        String query = (String) request.getOrDefault("query", "");
        String engine = (String) request.getOrDefault("engine", "bing");
        String timeLimit = (String) request.getOrDefault("time_limit", "");
        
        if (query.isEmpty()) {
            return Map.of("success", false, "message", "搜索关键词不能为空");
        }
        
        String result = webCrawlerService.search(query, engine, timeLimit);
        return Map.of("success", true, "data", result);
    }

    /**
     * 获取网页内容 (遗留方法，建议前端逐步废弃)
     */
    @PostMapping("/webpage")
    public Map<String, Object> fetchWebpage(@RequestBody Map<String, Object> request) {
        String url = (String) request.getOrDefault("url", "");
        boolean fullContent = Boolean.TRUE.equals(request.get("full_content"));
        
        if (url.isEmpty()) {
            return Map.of("success", false, "message", "URL不能为空");
        }
        
        // 简单的URL验证
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        String result = webCrawlerService.fetchWebpage(url, fullContent);
        return Map.of("success", true, "data", result);
    }

    /**
     * 多步搜索第一步：获取搜索URL列表
     */
    @PostMapping("/search_urls")
    public Map<String, Object> searchUrls(@RequestBody Map<String, Object> request) {
        String query = (String) request.getOrDefault("query", "");
        if (query.isEmpty()) {
            return Map.of("success", false, "message", "搜索关键词不能为空");
        }
        String result = webCrawlerService.searchUrls(query);
        return Map.of("success", true, "data", result);
    }

    /**
     * 多步搜索第二步：深度读取网页全文Markdown
     */
    @PostMapping("/read_webpage")
    public Map<String, Object> readWebpage(@RequestBody Map<String, Object> request) {
        String url = (String) request.getOrDefault("url", "");
        String focusKeyword = (String) request.getOrDefault("focus_keyword", "");
        Integer chunkIndex = request.containsKey("chunk_index") ? (Integer) request.get("chunk_index") : 0;
        
        if (url.isEmpty()) {
            return Map.of("success", false, "message", "URL不能为空");
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        String result = webCrawlerService.readWebpage(url, focusKeyword, chunkIndex);
        return Map.of("success", true, "data", result);
    }

    /**
     * 获取新闻
     */
    @PostMapping("/news")
    public Map<String, Object> getNews(@RequestBody Map<String, Object> request) {
        String keyword = (String) request.getOrDefault("keyword", "");
        String category = (String) request.getOrDefault("category", "");
        
        if (keyword.isEmpty() && category.isEmpty()) {
            return Map.of("success", false, "message", "关键词和分类不能同时为空");
        }
        
        String result = webCrawlerService.getNews(keyword, category);
        return Map.of("success", true, "data", result);
    }

    /**
     * 获取天气
     */
    @PostMapping("/weather")
    public Map<String, Object> getWeather(@RequestBody Map<String, Object> request) {
        String city = (String) request.getOrDefault("city", "");
        boolean detailed = Boolean.TRUE.equals(request.get("detailed"));
        
        if (city.isEmpty()) {
            return Map.of("success", false, "message", "城市名称不能为空");
        }
        
        String result = webCrawlerService.getWeather(city, detailed);
        return Map.of("success", true, "data", result);
    }
}
