package com.ciphertool.service.impl;

import com.ciphertool.service.WebCrawlerService;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class WebCrawlerServiceImpl implements WebCrawlerService {

    private final HttpClient httpClient;
    private final ExecutorService researchExecutor;

    @Value("${tavily.api-key:}")
    private String tavilyApiKey;
    
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int DEEP_READ_LIMIT = 4;
    private static final int DEEP_READ_REQUEST_TIMEOUT_SECONDS = 12;
    private static final int DEEP_READ_FUTURE_TIMEOUT_SECONDS = 14;
    private static final int SEARCH_REQUEST_TIMEOUT_SECONDS = 5;
    private static final int SEARCH_FUTURE_TIMEOUT_SECONDS = 6;

    // 新闻源定义
    private static final String[] TECH_SITES = {"site:36kr.com", "site:qbitai.com", "site:ifanr.com", "site:ithome.com"};
    private static final String[] FINANCE_SITES = {"site:caixin.com", "site:jiemian.com", "site:wallstreetcn.com"};
    private static final String[] OFFICIAL_SITES = {"site:xinhuanet.com", "site:people.com.cn", "site:thepaper.cn"};

    public WebCrawlerServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.researchExecutor = Executors.newFixedThreadPool(8);
    }

    @PreDestroy
    public void shutdownResearchExecutor() {
        researchExecutor.shutdownNow();
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

    @Override
    public String getFinanceQuote(String symbol) {
        try {
            String normalized = symbol.trim().toLowerCase(Locale.ROOT);
            if (!normalized.contains(".")) {
                normalized = normalized + ".us";
            }
            String url = "https://stooq.com/q/l/?s=" + URLEncoder.encode(normalized, StandardCharsets.UTF_8) + "&f=sd2t2ohlcv&h&e=csv";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return "Finance query failed: HTTP " + response.statusCode();
            }
            String[] lines = response.body().trim().split("\\R");
            if (lines.length < 2) {
                return "Finance query returned no data for " + symbol;
            }
            String[] values = lines[1].split(",", -1);
            if (values.length < 8 || "N/D".equalsIgnoreCase(values[3])) {
                return "No quote data found for " + symbol + ". Try a Stooq symbol such as aapl.us.";
            }
            JSONObject result = new JSONObject();
            result.put("symbol", values[0]);
            result.put("date", values[1]);
            result.put("time", values[2]);
            result.put("open", values[3]);
            result.put("high", values[4]);
            result.put("low", values[5]);
            result.put("close", values[6]);
            result.put("volume", values[7]);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            log.error("Finance quote failed: {}", e.getMessage());
            return "Finance query failed: " + e.getMessage();
        }
    }

    // 移除 parseWeatherJson 方法，因为不再使用
    
    @Override
    public String communitySnapshot(List<String> sources, Integer limit) {
        try {
            int safeLimit = Math.max(3, Math.min(limit == null ? 12 : limit, 20));
            LinkedHashSet<String> requested = new LinkedHashSet<>();
            if (sources != null) {
                sources.stream()
                        .filter(Objects::nonNull)
                        .map(source -> source.trim().toLowerCase(Locale.ROOT))
                        .filter(source -> !source.isBlank())
                        .forEach(requested::add);
            }
            if (requested.isEmpty()) {
                requested.addAll(List.of("hackernews", "github", "v2ex", "reddit", "lobsters", "producthunt"));
            }

            JSONObject result = new JSONObject();
            result.put("retrieved_at", java.time.OffsetDateTime.now().toString());
            result.put("limit", safeLimit);
            JSONArray communities = new JSONArray();
            for (String source : requested) {
                communities.add(fetchCommunity(source, safeLimit));
            }
            result.put("communities", communities);
            result.put("guidance", "Use these community snapshot ids in citations. End the final answer with a Sources/来源 section and do not append a one-sentence summary unless explicitly requested.");
            return result.toJSONString();
        } catch (Exception e) {
            log.error("Community snapshot failed", e);
            JSONObject result = new JSONObject();
            result.put("retrieved_at", java.time.OffsetDateTime.now().toString());
            result.put("limit", limit == null ? 12 : limit);
            result.put("communities", new JSONArray());
            result.put("error", "community_snapshot recovered from backend error: " + e.getMessage());
            result.put("guidance", "The snapshot endpoint recovered from an internal error. Retry with fewer sources or use web_research/search_urls as fallback.");
            return result.toJSONString();
        }
    }

    private JSONObject fetchCommunity(String source, int limit) {
        try {
            return switch (source) {
                case "hackernews", "hn" -> fetchHackerNews(limit);
                case "github", "github_trending", "github-trending" -> fetchGithubTrending(limit);
                case "v2ex" -> fetchV2ex(limit);
                case "reddit", "programming" -> fetchRedditProgramming(limit);
                case "lobsters" -> fetchLobsters(limit);
                case "producthunt", "product_hunt", "product-hunt" -> fetchProductHunt(limit);
                default -> communityError(source, "Unsupported source");
            };
        } catch (Exception e) {
            return communityError(source, e.getMessage());
        }
    }

    private JSONObject fetchHackerNews(int limit) {
        try {
            String html = fetchHtml("https://news.ycombinator.com/news", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            JSONArray items = new JSONArray();
            Matcher matcher = Pattern.compile("<span class=\"titleline\"><a href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL).matcher(html);
            while (matcher.find() && items.size() < limit) {
                JSONObject item = new JSONObject();
                item.put("title", cleanText(matcher.group(2)));
                item.put("url", resolveUrl("https://news.ycombinator.com/", matcher.group(1)));
                items.add(item);
            }
            return communityOk("hackernews", "Hacker News", "https://news.ycombinator.com/news", items);
        } catch (Exception e) {
            return communityError("hackernews", e.getMessage());
        }
    }

    private JSONObject fetchGithubTrending(int limit) {
        JSONArray items = new JSONArray();
        try {
            String html = fetchHtml("https://github.com/trending?since=daily", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            Pattern repoPattern = Pattern.compile("<h2[^>]*class=\"[^\"]*h3[^\"]*\"[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL);
            Matcher matcher = repoPattern.matcher(html);
            while (matcher.find() && items.size() < limit) {
                JSONObject item = new JSONObject();
                item.put("title", cleanText(matcher.group(2)).replaceAll("\\s*/\\s*", "/"));
                item.put("url", resolveUrl("https://github.com/", matcher.group(1)));
                items.add(item);
            }
            if (items.isEmpty()) {
                Matcher fallbackMatcher = Pattern.compile("href=\"(/[^/\\s]+/[^/\\s\"?#]+)\"[^>]*>\\s*([\\s\\S]{0,240}?)</a>", Pattern.CASE_INSENSITIVE).matcher(html);
                Set<String> seen = new HashSet<>();
                while (fallbackMatcher.find() && items.size() < limit) {
                    String href = fallbackMatcher.group(1);
                    if (href.contains("/features") || href.contains("/topics") || !seen.add(href)) continue;
                    String title = cleanText(fallbackMatcher.group(2)).replaceAll("\\s*/\\s*", "/");
                    if (!title.contains("/") || title.length() > 120) continue;
                    JSONObject item = new JSONObject();
                    item.put("title", title);
                    item.put("url", resolveUrl("https://github.com/", href));
                    items.add(item);
                }
            }
            if (items.isEmpty()) {
                addSearchItems(items, searchUrlsAsList("GitHub Trending repositories today", limit), limit);
            }
            return communityOk("github", "GitHub Trending", "https://github.com/trending?since=daily", items);
        } catch (Exception e) {
            addSearchItems(items, searchUrlsAsList("GitHub Trending repositories today", limit), limit);
            JSONObject community = communityOk("github", "GitHub Trending", "https://github.com/trending?since=daily", items);
            if (items.isEmpty()) {
                community.put("error", e.getMessage());
            } else {
                community.put("warning", "Direct GitHub Trending fetch failed or was truncated; returned search fallback results.");
            }
            return community;
        }
    }

    private JSONObject fetchV2ex(int limit) {
        try {
            String html = fetchHtml("https://www.v2ex.com/?tab=hot", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            JSONArray items = new JSONArray();
            Matcher matcher = Pattern.compile("<span class=\"item_title\"><a href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL).matcher(html);
            while (matcher.find() && items.size() < limit) {
                JSONObject item = new JSONObject();
                item.put("title", cleanText(matcher.group(2)));
                item.put("url", resolveUrl("https://www.v2ex.com/", matcher.group(1)));
                items.add(item);
            }
            return communityOk("v2ex", "V2EX", "https://www.v2ex.com/?tab=hot", items);
        } catch (Exception e) {
            return communityError("v2ex", e.getMessage());
        }
    }

    private JSONObject fetchRedditProgramming(int limit) {
        JSONArray items = new JSONArray();
        try {
            String json = fetchText("https://www.reddit.com/r/programming/hot.json?limit=" + limit, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            JSONObject root = JSON.parseObject(json);
            JSONObject dataRoot = root == null ? null : root.getJSONObject("data");
            JSONArray children = dataRoot == null ? null : dataRoot.getJSONArray("children");
            if (children == null) {
                throw new RuntimeException("Reddit JSON did not contain listing data");
            }
            for (int i = 0; i < children.size() && items.size() < limit; i++) {
                JSONObject data = children.getJSONObject(i).getJSONObject("data");
                JSONObject item = new JSONObject();
                item.put("title", data.getString("title"));
                item.put("url", resolveUrl("https://www.reddit.com/", data.getString("permalink")));
                item.put("score", data.getIntValue("score"));
                item.put("comments", data.getIntValue("num_comments"));
                items.add(item);
            }
            return communityOk("reddit", "Reddit r/programming", "https://www.reddit.com/r/programming/hot/", items);
        } catch (Exception e) {
            try {
                String rss = fetchText("https://www.reddit.com/r/programming/.rss", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
                Matcher matcher = Pattern.compile("<entry>[\\s\\S]*?<title>(.*?)</title>[\\s\\S]*?<link[^>]*href=\"([^\"]+)\"", Pattern.CASE_INSENSITIVE).matcher(rss);
                while (matcher.find() && items.size() < limit) {
                    JSONObject item = new JSONObject();
                    item.put("title", cleanText(matcher.group(1)));
                    item.put("url", resolveUrl("https://www.reddit.com/", matcher.group(2)));
                    items.add(item);
                }
            } catch (Exception rssError) {
                log.debug("Reddit RSS fallback failed: {}", rssError.getMessage());
            }
            if (items.isEmpty()) {
                addSearchItems(items, searchUrlsAsList("site:reddit.com/r/programming programming hot", limit), limit);
            }
            JSONObject community = communityOk("reddit", "Reddit r/programming", "https://www.reddit.com/r/programming/hot/", items);
            if (items.isEmpty()) {
                community.put("error", e.getMessage());
            } else {
                community.put("warning", "Reddit JSON was blocked or unavailable; returned RSS/search fallback results.");
            }
            return community;
        }
    }

    private JSONObject fetchLobsters(int limit) {
        try {
            String html = fetchHtml("https://lobste.rs/", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            JSONArray items = new JSONArray();
            Matcher matcher = Pattern.compile("<a[^>]*class=\"u-url\"[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL).matcher(html);
            while (matcher.find() && items.size() < limit) {
                JSONObject item = new JSONObject();
                item.put("title", cleanText(matcher.group(2)));
                item.put("url", resolveUrl("https://lobste.rs/", matcher.group(1)));
                items.add(item);
            }
            return communityOk("lobsters", "Lobsters", "https://lobste.rs/", items);
        } catch (Exception e) {
            return communityError("lobsters", e.getMessage());
        }
    }

    private JSONObject fetchProductHunt(int limit) {
        try {
            String html = fetchHtml("https://www.producthunt.com/", Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS));
            JSONArray items = new JSONArray();
            Matcher matcher = Pattern.compile("<a[^>]*href=\"(/posts/[^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL).matcher(html);
            Set<String> seen = new HashSet<>();
            while (matcher.find() && items.size() < limit) {
                String url = resolveUrl("https://www.producthunt.com/", matcher.group(1));
                String title = cleanText(matcher.group(2));
                if (title.length() < 2 || title.length() > 120 || !seen.add(url)) continue;
                JSONObject item = new JSONObject();
                item.put("title", title);
                item.put("url", url);
                items.add(item);
            }
            if (items.isEmpty()) {
                items.addAll(searchUrlsAsList("site:producthunt.com/posts Product Hunt today", limit));
            }
            return communityOk("producthunt", "Product Hunt", "https://www.producthunt.com/", items);
        } catch (Exception e) {
            return communityError("producthunt", e.getMessage());
        }
    }

    private JSONObject communityOk(String id, String name, String url, JSONArray items) {
        JSONObject community = new JSONObject();
        community.put("id", id);
        community.put("name", name);
        community.put("url", url);
        community.put("items", items);
        community.put("item_count", items.size());
        return community;
    }

    private JSONObject communityError(String id, String message) {
        JSONObject community = new JSONObject();
        community.put("id", id);
        community.put("name", id);
        community.put("items", new JSONArray());
        community.put("error", message == null ? "Unknown error" : message);
        return community;
    }

    private void addSearchItems(JSONArray items, List<JSONObject> searchItems, int limit) {
        Set<String> seen = new HashSet<>();
        for (Object existing : items) {
            if (existing instanceof JSONObject item) {
                seen.add(normalizeUrlForDedup(item.getString("url")));
            }
        }
        for (JSONObject searchItem : searchItems) {
            if (items.size() >= limit) return;
            String title = searchItem.getString("title");
            String url = searchItem.getString("url");
            String key = normalizeUrlForDedup(url);
            if (!isValidTitle(title) || key.isBlank() || !seen.add(key)) continue;
            JSONObject item = new JSONObject();
            item.put("title", title);
            item.put("url", normalizeUrl(url));
            String snippet = searchItem.getString("snippet");
            if (snippet != null && !snippet.isBlank()) {
                item.put("snippet", snippet);
            }
            items.add(item);
        }
    }

    private String fetchText(String url, Duration requestTimeout) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                .timeout(requestTimeout)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("HTTP " + response.statusCode());
        }
        return response.body();
    }

    private String resolveUrl(String base, String href) {
        if (href == null || href.isBlank()) return "";
        if (href.startsWith("http://") || href.startsWith("https://")) return normalizeUrl(href);
        return URI.create(base).resolve(href).toString();
    }

    @Override
    public String searchUrls(String query) {
        try {
            List<JSONObject> searchResults = searchUrlsAsList(query, 10);
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
    public String webResearch(String query, List<String> queries, String mode, Integer maxResults, Boolean readTop, String focusKeyword) {
        int max = Math.max(4, Math.min(maxResults == null ? 10 : maxResults, 20));
        boolean shouldReadTop = readTop == null || readTop;
        List<String> queryPlan = buildResearchQueries(query, queries, mode);

        JSONArray sources = new JSONArray();
        JSONArray evidence = new JSONArray();
        Set<String> seen = new LinkedHashSet<>();
        int sourceId = 1;

        try {
            for (String q : queryPlan) {
                List<JSONObject> items = searchUrlsAsList(q, max);
                for (JSONObject item : items) {
                    String url = item.getString("url");
                    String dedupeKey = normalizeUrlForDedup(url);
                    if (dedupeKey.isBlank() || seen.contains(dedupeKey)) continue;
                    seen.add(dedupeKey);
                    item.put("id", sourceId++);
                    item.put("query", q);
                    sources.add(item);
                    if (sources.size() >= max) break;
                }
                if (sources.size() >= max) break;
            }

            if (shouldReadTop) {
                evidence.addAll(readTopEvidenceInParallel(sources, query, focusKeyword));
            }

            JSONObject result = new JSONObject();
            result.put("query", query);
            result.put("mode", mode == null ? "auto" : mode);
            result.put("read_top", shouldReadTop);
            result.put("read_mode", shouldReadTop ? "deep_parallel" : "fast_sources_only");
            result.put("query_plan", queryPlan);
            result.put("sources", sources);
            result.put("evidence", evidence);
            result.put("guidance", "Use source ids like [1], [2] in the final answer. If evidence is sparse or contradictory, call search_urls/read_webpage again with narrower queries.");
            return result.toJSONString();
        } catch (Exception e) {
            log.error("webResearch failed: {}", e.getMessage(), e);
            return JSON.toJSONString(Map.of("error", "聚合检索失败: " + e.getMessage(), "query_plan", queryPlan));
        }
    }

    private JSONArray readTopEvidenceInParallel(JSONArray sources, String query, String focusKeyword) {
        int readCount = Math.min(DEEP_READ_LIMIT, sources.size());
        String focus = focusKeyword == null || focusKeyword.isBlank() ? query : focusKeyword;
        List<CompletableFuture<JSONObject>> futures = new ArrayList<>();

        for (int i = 0; i < readCount; i++) {
            JSONObject source = sources.getJSONObject(i);
            Integer sourceId = source.getInteger("id");
            String title = source.getString("title");
            String url = source.getString("url");

            CompletableFuture<JSONObject> future = CompletableFuture
                    .supplyAsync(() -> readEvidenceItem(sourceId, title, url, focus), researchExecutor)
                    .completeOnTimeout(
                            buildEvidenceErrorItem(sourceId, title, url, "read_timeout_after_" + DEEP_READ_FUTURE_TIMEOUT_SECONDS + "s"),
                            DEEP_READ_FUTURE_TIMEOUT_SECONDS,
                            TimeUnit.SECONDS
                    )
                    .exceptionally(error -> buildEvidenceErrorItem(sourceId, title, url, "read_failed: " + rootMessage(error)));
            futures.add(future);
        }

        JSONArray evidence = new JSONArray();
        for (CompletableFuture<JSONObject> future : futures) {
            evidence.add(future.join());
        }
        return evidence;
    }

    private JSONObject readEvidenceItem(Integer sourceId, String title, String url, String focus) {
        JSONObject item = baseEvidenceItem(sourceId, title, url);
        try {
            JSONObject page = JSON.parseObject(readWebpageInternal(
                    url,
                    focus,
                    0,
                    Duration.ofSeconds(DEEP_READ_REQUEST_TIMEOUT_SECONDS)
            ));
            String error = page.getString("error");
            if (error != null && !error.isBlank()) {
                item.put("error", error);
            }
            String content = page.getString("content");
            if (content == null) content = page.toJSONString();
            item.put("content", trimTo(content, 3500));
            item.put("truncated", content.length() > 3500);
        } catch (Exception readError) {
            item.put("error", "read_failed: " + readError.getMessage());
        }
        return item;
    }

    private JSONObject buildEvidenceErrorItem(Integer sourceId, String title, String url, String error) {
        JSONObject item = baseEvidenceItem(sourceId, title, url);
        item.put("error", error);
        return item;
    }

    private JSONObject baseEvidenceItem(Integer sourceId, String title, String url) {
        JSONObject item = new JSONObject();
        item.put("source_id", sourceId);
        item.put("title", title);
        item.put("url", url);
        return item;
    }

    private String rootMessage(Throwable error) {
        Throwable current = error;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }

    @Override
    public String readWebpage(String url, String focusKeyword, Integer chunkIndex) {
        return readWebpageInternal(url, focusKeyword, chunkIndex, Duration.ofSeconds(30));
    }

    private String readWebpageInternal(String url, String focusKeyword, Integer chunkIndex, Duration requestTimeout) {
        try {
            // Using Jina Reader API for deep, clean markdown fetching
            String jinaUrl = "https://r.jina.ai/" + url;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(jinaUrl))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json") // Requesting JSON for better structure from Jina if we want, or text/event-stream
                     // "X-Return-Format": "markdown" is default for Jina Reader
                    .timeout(requestTimeout)
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

    private List<JSONObject> searchUrlsAsList(String query, int maxResults) {
        List<JSONObject> combined = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<CompletableFuture<List<JSONObject>>> futures = new ArrayList<>();

        futures.add(searchSourceFuture("bing-cn", () -> fetchBingResults(query, "cn.bing.com", "bing-cn")));
        futures.add(searchSourceFuture("bing-global", () -> fetchBingResults(query, "www.bing.com", "bing-global")));
        futures.add(searchSourceFuture("duckduckgo", () -> fetchDuckDuckGoResults(query)));
        futures.add(searchSourceFuture("baidu", () -> fetchBaiduResults(query)));

        if (tavilyApiKey != null && !tavilyApiKey.isBlank()) {
            futures.add(searchSourceFuture("tavily", () -> fetchTavilyResults(query, Math.min(maxResults, 8))));
        }

        for (CompletableFuture<List<JSONObject>> future : futures) {
            addSearchResults(combined, seen, future.join(), maxResults);
        }

        combined.sort((a, b) -> Integer.compare(scoreSearchResult(b, query), scoreSearchResult(a, query)));
        return combined.stream().limit(maxResults).collect(Collectors.toList());
    }

    private CompletableFuture<List<JSONObject>> searchSourceFuture(String source, Supplier<List<JSONObject>> supplier) {
        return CompletableFuture
                .supplyAsync(supplier, researchExecutor)
                .completeOnTimeout(List.<JSONObject>of(), SEARCH_FUTURE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .exceptionally(error -> {
                    log.debug("Search source failed [{}]: {}", source, rootMessage(error));
                    return List.of();
                });
    }

    private List<String> buildResearchQueries(String query, List<String> userQueries, String mode) {
        LinkedHashSet<String> plan = new LinkedHashSet<>();
        if (userQueries != null) {
            userQueries.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .forEach(plan::add);
        }
        String q = query == null ? "" : query.trim();
        if (!q.isBlank()) {
            plan.add(q);
            String lowerMode = mode == null ? "auto" : mode.toLowerCase(Locale.ROOT);
            if (lowerMode.contains("news") || q.matches(".*(最新|今天|新闻|current|latest|today|202[0-9]).*")) {
                plan.add(q + " 最新 新闻");
                plan.add(q + " official announcement OR press release");
            }
            if (lowerMode.contains("academic") || q.matches(".*(论文|研究|paper|research|benchmark|评测).*")) {
                plan.add(q + " paper arxiv benchmark");
            }
            if (lowerMode.contains("technical") || q.matches(".*(API|文档|框架|模型|代码|GitHub|docs|release|版本|库).*")) {
                plan.add(q + " official docs GitHub release");
            }
            if (lowerMode.contains("community") || q.matches(".*(社区|实践|最佳实践|建议|方案|reddit|hacker news|经验).*")) {
                plan.add(q + " best practices community discussion");
            }
        }
        return plan.stream().limit(6).collect(Collectors.toList());
    }

    private List<JSONObject> fetchBingResults(String query, String host, String source) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://" + host + "/search?q=" + encodedQuery + "&setlang=zh-Hans";
            String html = stripNoise(fetchHtml(url, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS)));
            List<JSONObject> results = new ArrayList<>();

            String[] blocks = html.split("class=\"b_algo\"");
            for (int i = 1; i < blocks.length && results.size() < 8; i++) {
                String block = blocks[i];
                Matcher linkMatcher = Pattern.compile("<h2[^>]*>\\s*<a[^>]*href=\"(http[^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(block);
                if (!linkMatcher.find()) continue;

                String title = cleanText(linkMatcher.group(2));
                String resultUrl = normalizeUrl(linkMatcher.group(1));
                String snippet = "";
                Matcher snippetMatcher = Pattern.compile("<p[^>]*>(.*?)</p>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(block);
                if (snippetMatcher.find()) snippet = cleanText(snippetMatcher.group(1));

                results.add(searchResult(source, title, resultUrl, snippet));
            }
            return results;
        } catch (Exception e) {
            log.debug("Bing search failed [{}]: {}", source, e.getMessage());
            return List.of();
        }
    }

    private List<JSONObject> fetchBaiduResults(String query) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String html = stripNoise(fetchHtml("https://www.baidu.com/s?wd=" + encodedQuery, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS)));
            List<JSONObject> results = new ArrayList<>();
            Pattern[] patterns = {
                    Pattern.compile("<h3[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE),
                    Pattern.compile("class=\"t\"[^>]*>\\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\\s*(.*?)</a>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE)
            };
            for (Pattern pattern : patterns) {
                Matcher matcher = pattern.matcher(html);
                while (matcher.find() && results.size() < 8) {
                    String title = cleanText(matcher.group(2)).replace("<em>", "").replace("</em>", "");
                    String resultUrl = normalizeUrl(matcher.group(1));
                    results.add(searchResult("baidu", title, resultUrl, "Baidu search result"));
                }
            }
            return results;
        } catch (Exception e) {
            log.debug("Baidu search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<JSONObject> fetchDuckDuckGoResults(String query) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String html = stripNoise(fetchHtml("https://duckduckgo.com/html/?q=" + encodedQuery, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS)));
            List<JSONObject> results = new ArrayList<>();
            Pattern pattern = Pattern.compile("<a[^>]*class=\"result__a\"[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(html);
            while (matcher.find() && results.size() < 8) {
                String resultUrl = decodeDuckDuckGoUrl(normalizeUrl(matcher.group(1)));
                String title = cleanText(matcher.group(2));
                results.add(searchResult("duckduckgo", title, resultUrl, "DuckDuckGo search result"));
            }
            return results;
        } catch (Exception e) {
            log.debug("DuckDuckGo search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<JSONObject> fetchTavilyResults(String query, int maxResults) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("api_key", tavilyApiKey.trim());
            payload.put("query", query);
            payload.put("search_depth", "advanced");
            payload.put("include_answer", false);
            payload.put("include_raw_content", false);
            payload.put("max_results", maxResults);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.tavily.com/search"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS))
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toJSONString()))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return List.of();

            JSONObject root = JSON.parseObject(response.body());
            JSONArray arr = root.getJSONArray("results");
            if (arr == null) return List.of();
            List<JSONObject> results = new ArrayList<>();
            for (int i = 0; i < arr.size() && results.size() < maxResults; i++) {
                JSONObject item = arr.getJSONObject(i);
                results.add(searchResult(
                        "tavily",
                        item.getString("title"),
                        item.getString("url"),
                        item.getString("content")
                ));
            }
            return results;
        } catch (Exception e) {
            log.debug("Tavily search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private void addSearchResults(List<JSONObject> combined, Set<String> seen, List<JSONObject> incoming, int maxResults) {
        for (JSONObject item : incoming) {
            String title = item.getString("title");
            String url = item.getString("url");
            if (!isValidTitle(title) || url == null || !url.startsWith("http")) continue;
            String key = normalizeUrlForDedup(url);
            if (key.isBlank() || seen.contains(key)) continue;
            seen.add(key);
            combined.add(item);
            if (combined.size() >= maxResults * 3) return;
        }
    }

    private JSONObject searchResult(String source, String title, String url, String snippet) {
        JSONObject result = new JSONObject();
        result.put("source", source);
        result.put("title", cleanText(title));
        result.put("url", normalizeUrl(url));
        result.put("snippet", trimTo(cleanText(snippet), 320));
        return result;
    }

    private int scoreSearchResult(JSONObject result, String query) {
        String title = Optional.ofNullable(result.getString("title")).orElse("").toLowerCase(Locale.ROOT);
        String snippet = Optional.ofNullable(result.getString("snippet")).orElse("").toLowerCase(Locale.ROOT);
        String url = Optional.ofNullable(result.getString("url")).orElse("").toLowerCase(Locale.ROOT);
        String q = query == null ? "" : query.toLowerCase(Locale.ROOT);
        int score = 0;
        if (!q.isBlank() && (title.contains(q) || snippet.contains(q))) score += 8;
        for (String term : q.split("[\\s,，。;；:：|/]+")) {
            if (term.length() < 2) continue;
            if (title.contains(term)) score += 4;
            if (snippet.contains(term)) score += 2;
            if (url.contains(term)) score += 1;
        }
        if (url.contains(".gov") || url.contains(".edu") || url.contains("docs.") || url.contains("developer.") || url.contains("github.com")) score += 3;
        String source = Optional.ofNullable(result.getString("source")).orElse("");
        if ("tavily".equals(source) || "bing-cn".equals(source) || "bing-global".equals(source)) score += 2;
        return score;
    }

    private String stripNoise(String html) {
        html = Pattern.compile("<script[^>]*>.*?</script>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        html = Pattern.compile("<style[^>]*>.*?</style>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html).replaceAll("");
        return html;
    }

    private String normalizeUrl(String raw) {
        if (raw == null) return "";
        String url = raw.replace("&amp;", "&").trim();
        if (url.startsWith("//")) return "https:" + url;
        return url;
    }

    private String normalizeUrlForDedup(String raw) {
        String url = normalizeUrl(raw);
        int hash = url.indexOf('#');
        if (hash >= 0) url = url.substring(0, hash);
        return url.replaceAll("[?&](utm_[^=&]+|spm|from|source)=[^&]+", "").toLowerCase(Locale.ROOT);
    }

    private String decodeDuckDuckGoUrl(String raw) {
        try {
            String url = normalizeUrl(raw);
            int idx = url.indexOf("uddg=");
            if (idx < 0) return url;
            String encoded = url.substring(idx + 5);
            int amp = encoded.indexOf('&');
            if (amp >= 0) encoded = encoded.substring(0, amp);
            return URLDecoder.decode(encoded, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return raw;
        }
    }

    private String trimTo(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
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
        return fetchHtml(url, Duration.ofSeconds(20));
    }

    private String fetchHtml(String url, Duration requestTimeout) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                .timeout(requestTimeout)
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
