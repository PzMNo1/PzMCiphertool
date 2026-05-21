package com.ciphertool.service.impl;

import com.ciphertool.service.WebCrawlerService;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class WebCrawlerServiceImpl implements WebCrawlerService {

    private final HttpClient httpClient;
    
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // 新闻源定义
    private static final String[] TECH_SITES = {"site:36kr.com", "site:qbitai.com", "site:ifanr.com", "site:ithome.com"};
    private static final String[] FINANCE_SITES = {"site:caixin.com", "site:jiemian.com", "site:wallstreetcn.com"};
    private static final String[] OFFICIAL_SITES = {"site:xinhuanet.com", "site:people.com.cn", "site:thepaper.cn"};

    public WebCrawlerServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public String search(String query, String engine, String timeLimit) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url;
            
            if ("baidu".equalsIgnoreCase(engine)) {
                url = "https://www.baidu.com/s?wd=" + encodedQuery;
            } else {
                // Bing 国际版
                // timeLimit: d=day, w=week, m=month
                // 修复: URL中的双引号必须编码为 %22
                String filter = "";
                if ("d".equalsIgnoreCase(timeLimit)) filter = "&filters=ex1:%22ez1%22";
                else if ("w".equalsIgnoreCase(timeLimit)) filter = "&filters=ex1:%22ez2%22";
                else if ("m".equalsIgnoreCase(timeLimit)) filter = "&filters=ex1:%22ez3%22";
                
                url = "https://www.bing.com/search?q=" + encodedQuery + "&setlang=zh-Hans" + filter;
            }
            
            String html = fetchHtml(url);
            return extractSearchResults(html, engine);
        } catch (Exception e) {
            log.error("Search failed: {}", e.getMessage());
            return "搜索失败: " + e.getMessage();
        }
    }

    @Override
    public String fetchWebpage(String url, boolean fullContent) {
        try {
            String html = fetchHtml(url);
            return extractMainContent(html, fullContent);
        } catch (Exception e) {
            log.error("Fetch webpage failed: {}", e.getMessage());
            return "获取网页失败: " + e.getMessage();
        }
    }

    @Override
    public String getNews(String keyword, String category) {
        try {
            // 构建增强查询
            StringBuilder queryBuilder = new StringBuilder(keyword);
            
            // 如果有分类，添加特定站点限定
            if (category != null && !category.isEmpty()) {
                String sites = "";
                switch (category.toLowerCase()) {
                    case "tech":
                    case "technology":
                    case "科技":
                        sites = " (" + String.join(" OR ", TECH_SITES) + ")";
                        break;
                    case "finance":
                    case "economics":
                    case "财经":
                    case "经济":
                        sites = " (" + String.join(" OR ", FINANCE_SITES) + ")";
                        break;
                    case "politics":
                    case "political":
                    case "政治":
                        sites = " (" + String.join(" OR ", OFFICIAL_SITES) + ")";
                        break;
                    default:
                        // 默认添加"新闻"关键词
                        if (!keyword.contains("新闻")) queryBuilder.append(" 新闻");
                }
                queryBuilder.append(sites);
            } else if (!keyword.contains("新闻")) {
                 queryBuilder.append(" 新闻");
            }
            
            // 使用 Bing 搜索新闻 (强制一周内)
            return search(queryBuilder.toString(), "bing", "w");
            
        } catch (Exception e) {
            log.error("Get news failed: {}", e.getMessage());
            return "获取新闻失败: " + e.getMessage();
        }
    }

    @Override
    public String getWeather(String city, boolean detailed) {
        try {
            // 回退到使用 wttr.in 简单文本格式，因为JSON格式不稳定且容易解析失败
            // 使用 format=3 (简单) 或 format=v2 (详细)
            String englishCity = mapChineseCityToEnglish(city);
            String format = detailed ? "v2" : "3";
            String url = "https://wttr.in/" + englishCity + "?format=" + format;
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "curl/7.68.0")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                // 如果返回的是 HTML (有时候 wttr.in 会这样)，尝试清理
                String body = response.body();
                if (body.trim().startsWith("<!DOCTYPE html>")) {
                   return "获取天气失败: 服务返回了HTML页面，请稍后重试"; 
                }
                return "城市: " + city + "\n" + body.trim();
            } else {
                return "获取天气失败 HTTP " + response.statusCode();
            }
        } catch (Exception e) {
            log.error("Get weather failed: {}", e.getMessage());
            return getWeatherFallback(city);
        }
    }
    
    // 移除 parseWeatherJson 方法，因为不再使用
    
    @Override
    public String searchUrls(String query) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://cn.bing.com/search?q=" + encodedQuery + "&setlang=zh-Hans";
            String html = fetchHtml(url);
            
            List<JSONObject> searchResults = new ArrayList<>();
            
            // 简单清理，防止匹配到 script或style 里的内容
            html = Pattern.compile("<script[^>]*>.*?</script>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
            html = Pattern.compile("<style[^>]*>.*?</style>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
            
            // 采用字符串切割方式，只取真正的搜索结果条目 b_algo，拒绝提取侧边栏的"相关搜索"等垃圾H2标签
            String[] blocks = html.split("class=\"b_algo\"");
            for (int i = 1; i < blocks.length && searchResults.size() < 6; i++) {
                String block = blocks[i];
                // 真正的搜索结果都有一个包含链接的 h2
                Matcher matcher = Pattern.compile("<h2>\\s*<a[^>]*href=\"(http[^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL).matcher(block);
                if (matcher.find()) {
                    String link = matcher.group(1);
                    String title = cleanText(matcher.group(2));
                    
                    if (isValidTitle(title) && searchResults.stream().noneMatch(obj -> obj.getString("title").equals(title))) {
                        JSONObject result = new JSONObject();
                        result.put("title", title);
                        result.put("url", link);
                        result.put("snippet", "Search result for: " + title); 
                        searchResults.add(result);
                    }
                }
            }
            
            // 若Bing没抓到真正的结果或遇到反爬，使用 Baidu 兜底 (Baidu的 link?url= 是标准 302 跳转，Jina API 能够跟随)
            if (searchResults.isEmpty()) {
                String baiduUrl = "https://www.baidu.com/s?wd=" + encodedQuery;
                String baiduHtml = fetchHtml(baiduUrl);
                
                Pattern[] baiduPatterns = {
                    Pattern.compile("<h3[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL),
                    Pattern.compile("class=\"t\"[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL)
                };
                
                for (Pattern pattern : baiduPatterns) {
                    Matcher matcher = pattern.matcher(baiduHtml);
                    while (matcher.find() && searchResults.size() < 6) {
                        String link = matcher.group(1);
                        if (link.startsWith("http")) {
                            String titleRaw = matcher.group(2);
                            String title = cleanText(titleRaw).replaceAll("<em>", "").replaceAll("</em>", "").replaceAll("<!--(.*?)-->", "");
                            if (isValidTitle(title) && searchResults.stream().noneMatch(obj -> obj.getString("title").equals(title))) {
                                JSONObject result = new JSONObject();
                                result.put("title", title + " (Baidu)");
                                result.put("url", link);
                                result.put("snippet", "Search result: " + title);
                                searchResults.add(result);
                            }
                        }
                    }
                }
            }
            
            if (searchResults.isEmpty()) {
                return JSON.toJSONString(List.of(Map.of("error", "未查找到有效结果，可能被搜索引擎拦截，请更换搜索词")));
            }
            
            return JSON.toJSONString(searchResults);

        } catch (Exception e) {
            log.error("searchUrls failed: {}", e.getMessage());
            return JSON.toJSONString(List.of(Map.of("error", "搜索失败: " + e.getMessage())));
        }
    }

    @Override
    public String readWebpage(String url, String focusKeyword, Integer chunkIndex) {
        try {
            // Using Jina Reader API for deep, clean markdown fetching
            String jinaUrl = "https://r.jina.ai/" + url;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(jinaUrl))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json") // Requesting JSON for better structure from Jina if we want, or text/event-stream
                     // "X-Return-Format": "markdown" is default for Jina Reader
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() != 200) {
                return JSON.toJSONString(Map.of("error", "抓取网页失败，HTTP状态码: " + response.statusCode()));
            }
            
            String markdownContent = response.body();
            
            // Chunking & Semantic Ranking Logic (Local RAG)
            int maxReturnChars = 8000; // Limit returned context to ~8000 chars to avoid overwhelming LLM
            
            if (focusKeyword != null && !focusKeyword.trim().isEmpty()) {
                // Split markdown into logical chunks (blocks separated by newlines or headers)
                String[] rawChunks = markdownContent.split("\\n\\s*\\n|(?=\\n#)");
                List<String> validChunks = new ArrayList<>();
                
                for (String chunk : rawChunks) {
                    chunk = chunk.trim();
                    if (chunk.length() > 50) { // Ignore extremely short fragments
                        validChunks.add(chunk);
                    }
                }
                
                // Extract keywords from focusKeyword (simple tokenization)
                List<String> keywords = Arrays.stream(focusKeyword.split("[\\s,]+"))
                                              .map(String::toLowerCase)
                                              .filter(k -> k.length() > 1) // Ignore single chars
                                              .collect(Collectors.toList());
                
                // If no valid keywords, fallback to returning top
                if (keywords.isEmpty()) {
                    keywords.add(focusKeyword.toLowerCase());
                }

                // Rank chunks using a simple TF (Term Frequency) & Density scoring
                Map<String, Double> chunkScores = new HashMap<>();
                
                for (String chunk : validChunks) {
                    String chunkLower = chunk.toLowerCase();
                    double score = 0.0;
                    
                    for (String kw : keywords) {
                        int count = 0;
                        int lastIndex = 0;
                        while ((lastIndex = chunkLower.indexOf(kw, lastIndex)) != -1) {
                            count++;
                            lastIndex += kw.length();
                        }
                        
                        // Score calculation: Frequency * (Keyword Length) / log(Chunk Length + 10)
                        // This rewards chunks with dense, repeated keywords without overly favoring huge chunks
                        if (count > 0) {
                            score += (count * kw.length()) / Math.log(chunk.length() + 10);
                            
                            // Boost if keyword appears in a markdown header within the chunk
                            if (chunkLower.contains("# ") && chunkLower.substring(0, Math.min(chunkLower.length(), 200)).contains(kw)) {
                                score += 5.0; 
                            }
                        }
                    }
                    if (score > 0) {
                        chunkScores.put(chunk, score);
                    }
                }
                
                // Sort chunks by score descending
                List<Map.Entry<String, Double>> sortedScores = new ArrayList<>(chunkScores.entrySet());
                sortedScores.sort((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()));
                
                StringBuilder finalRankedContent = new StringBuilder();
                int currentCharCount = 0;
                
                // Take top scoring chunks until we hit the char limit
                for (Map.Entry<String, Double> entry : sortedScores) {
                    String chunk = entry.getKey();
                    if (currentCharCount + chunk.length() > maxReturnChars && currentCharCount > 0) {
                        break; // Stop if adding this chunk exceeds limit (unless it's the very first chunk)
                    }
                    
                    finalRankedContent.append("... ").append(chunk).append(" ...\n\n");
                    currentCharCount += chunk.length();
                    
                    if (currentCharCount >= maxReturnChars) break;
                }
                
                String finalContent = finalRankedContent.toString().trim();
                
                if (finalContent.isEmpty()) {
                     finalContent = "网页全文中未找到与关键词/意图: '" + focusKeyword + "' 高度相关的段落。请尝试更换关键词，或者直接不带 focus_keyword 读取全文的前面部分。";
                }
                 
                JSONObject result = new JSONObject();
                result.put("url", url);
                result.put("content", finalContent);
                result.put("filter_applied", "Semantic Chunk Ranking (Local RAG)");
                result.put("focus_keyword_used", focusKeyword);
                result.put("chunks_analyzed", validChunks.size());
                return JSON.toJSONString(result);
                
            } else {
                // Legacy / fallback behavior: Return by chunkIndex (simple pagination)
                int chunkSize = 6000;

                int totalLength = markdownContent.length();
                int idx = (chunkIndex != null && chunkIndex >= 0) ? chunkIndex : 0;
                int start = idx * chunkSize;
                int end = Math.min(start + chunkSize, totalLength);
                
                String chunkContent = "";
                if (start < totalLength) {
                    chunkContent = markdownContent.substring(start, end);
                } else {
                    chunkContent = "已到达文档末尾。";
                }
                
                JSONObject result = new JSONObject();
                result.put("url", url);
                result.put("content", chunkContent);
                result.put("chunk_index", idx);
                result.put("total_chunks", Math.ceil((double)totalLength / chunkSize));
                result.put("total_length", totalLength);
                return JSON.toJSONString(result);
            }

        } catch (Exception e) {
            log.error("readWebpage failed: {}", e.getMessage());
            return JSON.toJSONString(Map.of("error", "读取网页失败: " + e.getMessage()));
        }
    }
    
    private String getWeatherFallback(String city) {
        try {
            // 映射常用中文城市名到英文
            String englishCity = mapChineseCityToEnglish(city);
            String url = "https://wttr.in/" + englishCity + "?format=3";
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "curl/7.68.0")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                return "天气信息: " + response.body().trim();
            }
        } catch (Exception e) {
            log.error("Weather fallback failed: {}", e.getMessage());
        }
        return "获取天气失败，请尝试使用英文城市名如 Beijing, Shanghai";
    }

    
    // ... helper methods (mapChineseCityToEnglish, fetchHtml, extractSearchResults, extractMainContent, cleanText, isValidTitle) ...
    
    private String mapChineseCityToEnglish(String city) {
        // ... (保持不变) ...
        switch (city) {
            case "北京": return "Beijing";
            case "上海": return "Shanghai";
            // ... (保持之前的所有映射) ...
            case "广州": return "Guangzhou";
            case "深圳": return "Shenzhen";
            case "杭州": return "Hangzhou";
            case "南京": return "Nanjing";
            case "成都": return "Chengdu";
            case "重庆": return "Chongqing";
            case "武汉": return "Wuhan";
            case "西安": return "Xian";
            case "天津": return "Tianjin";
            case "苏州": return "Suzhou";
            case "厦门": return "Xiamen";
            case "青岛": return "Qingdao";
            case "大连": return "Dalian";
            case "长沙": return "Changsha";
            case "郑州": return "Zhengzhou";
            case "沈阳": return "Shenyang";
            case "哈尔滨": return "Harbin";
            case "昆明": return "Kunming";
            case "福州": return "Fuzhou";
            case "合肥": return "Hefei";
            case "济南": return "Jinan";
            case "太原": return "Taiyuan";
            case "长春": return "Changchun";
            case "南昌": return "Nanchang";
            case "南宁": return "Nanning";
            case "海口": return "Haikou";
            case "贵阳": return "Guiyang";
            case "拉萨": return "Lhasa";
            case "乌鲁木齐": return "Urumqi";
            case "兰州": return "Lanzhou";
            case "西宁": return "Xining";
            case "银川": return "Yinchuan";
            case "石家庄": return "Shijiazhuang";
            default: return city;
        }
    }

    private String fetchHtml(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                .timeout(Duration.ofSeconds(20))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new RuntimeException("HTTP " + response.statusCode());
        }
        
        return response.body();
    }

    private String extractSearchResults(String html, String engine) {
        StringBuilder results = new StringBuilder();
        List<String> titles = new ArrayList<>();
        List<String> links = new ArrayList<>();
        
        // 移除无关标签
        html = Pattern.compile("<script[^>]*>.*?</script>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<style[^>]*>.*?</style>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        
        if ("baidu".equalsIgnoreCase(engine)) {
            // 百度搜索结果 - 更加通用的匹配
            Pattern[] patterns = {
                // 常见的百度结果标题结构
                Pattern.compile("<h3[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL),
                Pattern.compile("class=\"t\"[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL),
                Pattern.compile("<a[^>]*class=\"c-title-text\"[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL)
            };
            
            for (Pattern pattern : patterns) {
                Matcher matcher = pattern.matcher(html);
                while (matcher.find() && titles.size() < 10) {
                    try {
                        String link = matcher.group(1);
                        String titleRaw = matcher.group(2);
                        // 百度搜索结果可能包含 <em>标签，需要清理
                        String title = cleanText(titleRaw).replaceAll("<em>", "").replaceAll("</em>", "");
                        
                        if (isValidTitle(title) && !titles.contains(title)) {
                            titles.add(title);
                            links.add(link);
                        }
                    } catch (Exception e) {
                        // ignore parsing errors for single items
                    }
                }
            }
        } else {
            // Bing 搜索逻辑
            Pattern[] patterns = {
                Pattern.compile("<h2[^>]*>\\s*<a[^>]*href=\"(http[^\"]+)\"[^>]*>([^<]+)</a>", Pattern.DOTALL),
                Pattern.compile("class=\"b_algo\"[^>]*>.*?<h2>\\s*<a[^>]*href=\"(http[^\"]+)\"[^>]*>([^<]+)</a>", Pattern.DOTALL)
            };
            
            for (Pattern pattern : patterns) {
                Matcher matcher = pattern.matcher(html);
                while (matcher.find() && titles.size() < 10) {
                    String link = matcher.group(1);
                    String title = cleanText(matcher.group(2));
                    if (isValidTitle(title) && !titles.contains(title)) {
                        titles.add(title);
                        links.add(link);
                    }
                }
            }
        }
        
        // 构建结果，包含链接
        int count = 0;
        int maxResults = 8;
        for (int i = 0; i < titles.size(); i++) {
            if (count >= maxResults) break;
            count++;
            results.append(count).append(". ").append(titles.get(i))
                   .append("\n   链接: ").append(links.get(i)).append("\n");
        }
        
        if (results.length() == 0) {
            return "未找到搜索结果 (尝试更换搜索引擎或关键词)";
        }
        
        return "搜索结果:\n" + results.toString();
    }

    private String extractMainContent(String html, boolean fullContent) {
        // ... (保留之前的清理逻辑) ...
        html = Pattern.compile("<!--.*?-->", Pattern.DOTALL).matcher(html).replaceAll("");
        html = Pattern.compile("<script[^>]*>.*?</script>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<style[^>]*>.*?</style>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<nav[^>]*>.*?</nav>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<header[^>]*>.*?</header>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<footer[^>]*>.*?</footer>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        
        // 提取标题
        String title = "";
        Pattern titlePattern = Pattern.compile("<title[^>]*>(.+?)</title>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher titleMatcher = titlePattern.matcher(html);
        if (titleMatcher.find()) {
            title = cleanText(titleMatcher.group(1));
        }
        
        // 提取正文
        StringBuilder content = new StringBuilder();
        
        // 优先提取 article 或 main
        Pattern articlePattern = Pattern.compile("<(?:article|main)[^>]*>(.*?)</(?:article|main)>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher articleMatcher = articlePattern.matcher(html);
        String targetHtml = html;
        if (articleMatcher.find()) {
            targetHtml = articleMatcher.group(1);
        }
        
        // 提取文本
        Pattern textPattern = Pattern.compile("<(?:p|h[1-6]|li|div)[^>]*>([^<]+(?:<[^/][^>]*>[^<]*</[^>]+>)*[^<]*)</(?:p|h[1-6]|li|div)>", Pattern.DOTALL);
        Matcher textMatcher = textPattern.matcher(targetHtml);
        
        int charCount = 0;
        int maxChars = fullContent ? 5000 : 1500; // 完整模式增加限制
        
        while (textMatcher.find() && charCount < maxChars) {
            String text = cleanText(textMatcher.group(1));
            // 稍宽松的过滤
            if (text.length() > 10 && !text.matches(".*[<>{}\\[\\]].*")) {
                content.append(text).append("\n");
                charCount += text.length();
            }
        }
        
        // Fallback
        if (charCount < 100) {
            String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
            if (text.length() > maxChars) {
                text = text.substring(0, maxChars) + "...";
            }
            content.append(text);
        }
        
        return "标题: " + title + "\n\n内容:\n" + content.toString().trim();
    }
    
    // ... helper methods ...
    private String cleanText(String text) {
        if (text == null) return "";
        text = text.replaceAll("<[^>]+>", "");
        text = text.replaceAll("&nbsp;", " ");
        text = text.replaceAll("&lt;", "<");
        text = text.replaceAll("&gt;", ">");
        text = text.replaceAll("&amp;", "&");
        text = text.replaceAll("&quot;", "\"");
        text = text.replaceAll("&#\\d+;", "");
        text = text.replaceAll("\\s+", " ").trim();
        return text;
    }
    
    private boolean isValidTitle(String title) {
        if (title == null || title.length() < 2 || title.length() > 200) return false;
        if (title.contains("广告") || title.contains("推广")) return false;
        return true;
    }
}
