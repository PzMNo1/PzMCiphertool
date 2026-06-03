package com.ciphertool.service.impl;

import com.ciphertool.service.WebCrawlerService;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import jakarta.annotation.PreDestroy;
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

@Service
public class WebCrawlerServiceImpl implements WebCrawlerService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(WebCrawlerServiceImpl.class);

    private final HttpClient httpClient;
    private final ExecutorService researchExecutor;

    @Value("${tavily.api-key:}")
    private String tavilyApiKey;
    
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int DEEP_READ_LIMIT = 24;
    private static final int DEEP_READ_REQUEST_TIMEOUT_SECONDS = 18;
    private static final int DEEP_READ_FUTURE_TIMEOUT_SECONDS = 22;
    private static final int SEARCH_REQUEST_TIMEOUT_SECONDS = 6;
    private static final int SEARCH_FUTURE_TIMEOUT_SECONDS = 8;
    private static final int RESEARCH_QUERY_BATCH_PARALLELISM = 4;
    private static final int RESEARCH_QUERY_FUTURE_TIMEOUT_SECONDS = 18;
    private static final int NEWS_RESULT_LIMIT = 8;
    private static final int NEWS_CANDIDATE_LIMIT = 64;
    private static final int NEWS_PER_DOMAIN_LIMIT = 2;
    private static final int NEWS_STRICT_SCORE_FLOOR = 18;
    private static final int NEWS_FILL_SCORE_FLOOR = 12;
    private static final int NEWS_REDIRECT_RESOLVE_LIMIT = 10;

    // 新闻源定义
    private static final String[] TECH_SITES = {"site:36kr.com", "site:qbitai.com", "site:ifanr.com", "site:ithome.com"};
    private static final String[] FINANCE_SITES = {
            "site:caixin.com", "site:jiemian.com", "site:wallstreetcn.com", "site:cls.cn",
            "site:yicai.com", "site:stcn.com", "site:21jingji.com", "site:cs.com.cn",
            "site:cnstock.com", "site:nbd.com.cn"
    };
    private static final String[] OFFICIAL_SITES = {
            "site:xinhuanet.com", "site:people.com.cn", "site:thepaper.cn",
            "site:pbc.gov.cn", "site:csrc.gov.cn", "site:ndrc.gov.cn", "site:mof.gov.cn"
    };

    public WebCrawlerServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.researchExecutor = Executors.newFixedThreadPool(24);
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
                return "Baidu search is disabled by research policy. Use non-Baidu research sources instead.";
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
            return getNewsViaSearchPipeline(keyword, category);
        } catch (Exception e) {
            log.error("Get news failed: {}", e.getMessage());
            return "News query failed: " + e.getMessage();
        }
    }

    private String getLegacyNews(String keyword, String category) {
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

    private String getNewsViaSearchPipeline(String keyword, String category) {
        String baseKeyword = keyword == null ? "" : keyword.trim();
        String categoryTerm = newsCategoryTerm(category);
        String primary = buildPrimaryNewsQuery(baseKeyword, categoryTerm);
        List<String> queries = buildNewsQueries(primary, baseKeyword, categoryTerm, category);

        List<JSONObject> combined = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int[] redirectResolveBudget = {NEWS_REDIRECT_RESOLVE_LIMIT};
        addNewsCandidates(combined, seen, directNewsSourceCandidates(category), "official source fallback", primary, categoryTerm, redirectResolveBudget);
        int queryLimit = combined.size() >= 3 ? Math.min(4, queries.size()) : queries.size();
        for (String query : queries.stream().limit(queryLimit).toList()) {
            addNewsCandidates(combined, seen, searchUrlsAsList(query, 16, true), query, primary, categoryTerm, redirectResolveBudget);
            if (combined.size() >= NEWS_CANDIDATE_LIMIT || combined.size() >= NEWS_RESULT_LIMIT * 2) break;
        }

        if (combined.isEmpty()) {
            return "No news results found. Try a broader keyword, a different category, or web_research/search_urls as fallback.";
        }
        List<JSONObject> selected = selectNewsResults(combined);
        if (selected.isEmpty()) {
            return "No high-quality news results found after filtering " + combined.size()
                    + " candidates. Try a narrower keyword, an official source, or web_research depth=\"deep\".";
        }
        return formatNewsResults(selected, primary, combined.size(), queries);
    }

    private boolean containsNewsTerm(String value) {
        String lower = value == null ? "" : value.toLowerCase(Locale.ROOT);
        return lower.contains("news")
                || lower.contains("latest")
                || lower.contains("today")
                || lower.contains("current");
    }

    private String newsCategoryTerm(String category) {
        String normalized = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "tech", "technology" -> "technology";
            case "finance", "financial", "economics", "economy", "market", "markets" -> "finance";
            case "politics", "political", "world", "international" -> "world politics";
            case "sports" -> "sports";
            case "business" -> "business";
            default -> normalized;
        };
    }

    private String newsSourceHint(String category) {
        String normalized = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "tech", "technology" -> "site:reuters.com/technology OR site:apnews.com OR site:techcrunch.com OR site:theverge.com";
            case "finance", "financial", "economics", "economy", "market", "markets" -> "site:reuters.com/markets OR site:apnews.com OR site:cnbc.com OR site:ft.com";
            case "politics", "political", "world", "international" -> "site:reuters.com/world OR site:apnews.com OR site:bbc.com/news OR site:theguardian.com/world";
            default -> "";
        };
    }

    private List<String> newsAuthoritySites(String category) {
        String normalized = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "tech", "technology" -> List.of(
                    "site:reuters.com", "site:apnews.com", "site:techcrunch.com",
                    "site:theverge.com", "site:arstechnica.com", "site:wired.com");
            case "finance", "financial", "economics", "economy", "market", "markets" -> List.of(
                    "site:reuters.com", "site:apnews.com", "site:cnbc.com",
                    "site:ft.com", "site:wsj.com", "site:bloomberg.com");
            case "politics", "political", "world", "international" -> List.of(
                    "site:reuters.com", "site:apnews.com", "site:bbc.com",
                    "site:theguardian.com", "site:nytimes.com", "site:washingtonpost.com");
            default -> List.of("site:reuters.com", "site:apnews.com", "site:bbc.com", "site:theguardian.com");
        };
    }

    private String buildPrimaryNewsQuery(String baseKeyword, String categoryTerm) {
        String primary = baseKeyword == null ? "" : baseKeyword.trim();
        if (primary.isBlank()) {
            primary = categoryTerm.isBlank() ? "today news" : categoryTerm + " news today";
        }
        if (!containsNewsTerm(primary)) {
            primary = primary + " news";
        }
        return primary;
    }

    private List<String> buildNewsQueries(String primary, String baseKeyword, String categoryTerm, String category) {
        LinkedHashSet<String> queries = new LinkedHashSet<>();
        String authorityBase = baseKeyword == null || baseKeyword.isBlank() ? primary : baseKeyword.trim();
        if (!categoryTerm.isBlank() && !authorityBase.toLowerCase(Locale.ROOT).contains(categoryTerm)) {
            authorityBase = authorityBase + " " + categoryTerm;
        }
        if (!containsNewsTerm(authorityBase)) {
            authorityBase = authorityBase + " news today";
        }

        for (String site : newsAuthoritySites(category)) {
            queries.add(site + " " + authorityBase);
        }

        queries.add(primary + " Reuters OR AP OR BBC");
        queries.add(primary + " latest updates");
        queries.add(primary);

        if (!categoryTerm.isBlank() && !primary.toLowerCase(Locale.ROOT).contains(categoryTerm)) {
            queries.add(baseKeyword.isBlank()
                    ? categoryTerm + " latest news today"
                    : baseKeyword + " " + categoryTerm + " latest news");
        }

        String sourceHint = newsSourceHint(category);
        if (!sourceHint.isBlank()) {
            queries.add((baseKeyword == null || baseKeyword.isBlank() ? categoryTerm : baseKeyword) + " " + sourceHint);
        }
        return queries.stream().filter(q -> q != null && !q.isBlank()).limit(10).collect(Collectors.toList());
    }

    private List<JSONObject> directNewsSourceCandidates(String category) {
        String normalized = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        List<JSONObject> results = new ArrayList<>();
        if (containsAny(normalized, "tech", "technology")) {
            results.add(searchResult("official-source", "Tech News | Today's Latest Technology News | Reuters", "https://www.reuters.com/technology/", "Official Reuters technology section"));
            results.add(searchResult("official-source", "Technology: Latest Tech News Articles Today | AP News", "https://apnews.com/technology", "Official AP technology section"));
            results.add(searchResult("official-source", "TechCrunch | Startup and Technology News", "https://techcrunch.com/", "Official TechCrunch front page"));
            results.add(searchResult("official-source", "The Verge - Technology, science, art, and culture news", "https://www.theverge.com/tech", "Official The Verge technology section"));
        } else if (containsAny(normalized, "finance", "financial", "economics", "economy", "market", "markets")) {
            results.add(searchResult("official-source", "Latest Finance News | Today's Top Headlines | Reuters", "https://www.reuters.com/business/finance/", "Official Reuters finance section"));
            results.add(searchResult("official-source", "Markets | Reuters", "https://www.reuters.com/markets/", "Official Reuters markets section"));
            results.add(searchResult("official-source", "Stock Markets, Business News, Financials, Earnings - CNBC", "https://www.cnbc.com/markets/", "Official CNBC markets section"));
            results.add(searchResult("official-source", "Markets data and financial news | Financial Times", "https://www.ft.com/markets", "Official Financial Times markets section"));
        } else if (containsAny(normalized, "politics", "political", "world", "international")) {
            results.add(searchResult("official-source", "World News | Latest Top Stories | Reuters", "https://www.reuters.com/world/", "Official Reuters world section"));
            results.add(searchResult("official-source", "World News: Top & Breaking World News Today | AP News", "https://apnews.com/world-news", "Official AP world section"));
            results.add(searchResult("official-source", "World | Latest News & Updates | BBC News", "https://www.bbc.com/news/world", "Official BBC world section"));
            results.add(searchResult("official-source", "World news | The Guardian", "https://www.theguardian.com/world", "Official Guardian world section"));
        } else {
            results.add(searchResult("official-source", "BBC News", "https://www.bbc.com/news", "BBC general, world, business, technology and culture news"));
            results.add(searchResult("official-source", "Reuters World News", "https://www.reuters.com/world/", "Reuters world and international news section"));
            results.add(searchResult("official-source", "Reuters Business News", "https://www.reuters.com/business/", "Reuters business, economy, finance and market news"));
            results.add(searchResult("official-source", "AP News", "https://apnews.com/", "Associated Press top news, world, business, politics and society"));
            results.add(searchResult("official-source", "AP World News", "https://apnews.com/world-news", "Associated Press world and international news"));
            results.add(searchResult("official-source", "Sina News", "https://news.sina.com.cn/", "Sina Chinese domestic, international, society, finance and rolling news"));
            results.add(searchResult("official-source", "China News Service", "https://www.chinanews.com.cn/", "China News Service domestic, international, finance, society and culture news"));
            results.add(searchResult("official-source", "NetEase Latest News", "https://news.163.com/latest/", "NetEase rolling news, China, world, society, finance and technology"));
            results.add(searchResult("official-source", "CCTV News 30", "https://tv.cctv.com/lm/xw30f/", "CCTV daily Chinese news broadcast and major headlines"));
            results.add(searchResult("official-source", "National Business Daily", "https://www.nbd.com.cn/", "Chinese finance, markets, companies and economy news"));
        }
        return results;
    }

    private void addNewsCandidates(List<JSONObject> combined, Set<String> seen, List<JSONObject> incoming,
                                   String matchedQuery, String primary, String categoryTerm, int[] redirectResolveBudget) {
        for (JSONObject item : incoming) {
            String title = item.getString("title");
            String url = item.getString("url");
            if (!isValidTitle(title) || url == null || !url.startsWith("http")) continue;

            String normalizedUrl = normalizeUrl(url);
            if (isSearchRedirectDomain(extractDomain(normalizedUrl), normalizedUrl)) {
                if (!shouldSpendRedirectBudget(title, matchedQuery, primary, categoryTerm) || redirectResolveBudget[0] <= 0) {
                    continue;
                }
                redirectResolveBudget[0]--;
                normalizedUrl = resolveSearchRedirectUrl(normalizedUrl);
            }
            if (isSearchRedirectDomain(extractDomain(normalizedUrl), normalizedUrl)) continue;
            String key = normalizeUrlForDedup(normalizedUrl);
            if (key.isBlank() || seen.contains(key)) continue;

            String domain = extractDomain(normalizedUrl);
            if (isLowValueNewsResult(title, normalizedUrl, domain)) continue;

            item.put("url", normalizedUrl);
            item.put("domain", domain);
            item.put("matched_query", matchedQuery);
            String candidateHaystack = (title + " " + item.getString("snippet") + " " + normalizedUrl).toLowerCase(Locale.ROOT);
            item.put("category_required", !categoryTerm.isBlank());
            item.put("category_match", categoryTerm.isBlank() || categoryRelevanceScore(candidateHaystack, categoryTerm) > 0);
            item.put("news_score", scoreNewsCandidate(item, primary, categoryTerm));
            item.put("quality", newsQualityLabel(item.getIntValue("news_score")));
            item.put("signals", newsQualitySignals(item, categoryTerm));
            seen.add(key);
            combined.add(item);
        }
    }

    private List<JSONObject> selectNewsResults(List<JSONObject> candidates) {
        candidates.sort((a, b) -> Integer.compare(b.getIntValue("news_score"), a.getIntValue("news_score")));
        List<JSONObject> selected = new ArrayList<>();
        Map<String, Integer> domainCounts = new HashMap<>();
        Set<String> storyKeys = new HashSet<>();

        for (JSONObject item : candidates) {
            if (!isHighSignalNewsCandidate(item)) continue;

            String domain = Optional.ofNullable(item.getString("domain")).orElse("");
            if (domainCounts.getOrDefault(domain, 0) >= NEWS_PER_DOMAIN_LIMIT) continue;

            String storyKey = newsStoryKey(item.getString("title"));
            if (!storyKey.isBlank() && storyKeys.contains(storyKey)) continue;

            selected.add(item);
            domainCounts.put(domain, domainCounts.getOrDefault(domain, 0) + 1);
            if (!storyKey.isBlank()) storyKeys.add(storyKey);
            if (selected.size() >= NEWS_RESULT_LIMIT) break;
        }

        if (selected.size() < Math.min(NEWS_RESULT_LIMIT, candidates.size())) {
            for (JSONObject item : candidates) {
                if (selected.contains(item)) continue;
                if (!isFillNewsCandidate(item)) continue;
                String domain = Optional.ofNullable(item.getString("domain")).orElse("");
                if (domainCounts.getOrDefault(domain, 0) >= NEWS_PER_DOMAIN_LIMIT) continue;
                String storyKey = newsStoryKey(item.getString("title"));
                if (!storyKey.isBlank() && storyKeys.contains(storyKey)) continue;
                selected.add(item);
                domainCounts.put(domain, domainCounts.getOrDefault(domain, 0) + 1);
                if (!storyKey.isBlank()) storyKeys.add(storyKey);
                if (selected.size() >= NEWS_RESULT_LIMIT) break;
            }
        }
        return selected;
    }

    private boolean isHighSignalNewsCandidate(JSONObject item) {
        String domain = Optional.ofNullable(item.getString("domain")).orElse("");
        String url = Optional.ofNullable(item.getString("url")).orElse("");
        String haystack = (item.getString("title") + " " + item.getString("snippet") + " " + url).toLowerCase(Locale.ROOT);
        int score = item.getIntValue("news_score");
        if (isSearchRedirectDomain(domain, url)) return false;
        if (isNewsSectionPage(item.getString("title"), url)) return false;
        if (item.getBooleanValue("category_required") && !item.getBooleanValue("category_match")) return false;
        if (trustedNewsSourceScore(domain) >= 10) return score >= NEWS_FILL_SCORE_FLOOR;
        return score >= NEWS_STRICT_SCORE_FLOOR && hasNewsPlacementSignal(haystack);
    }

    private boolean isFillNewsCandidate(JSONObject item) {
        String domain = Optional.ofNullable(item.getString("domain")).orElse("");
        String url = Optional.ofNullable(item.getString("url")).orElse("");
        String haystack = (item.getString("title") + " " + item.getString("snippet") + " " + url).toLowerCase(Locale.ROOT);
        int score = item.getIntValue("news_score");
        if (isSearchRedirectDomain(domain, url)) return false;
        if (item.getBooleanValue("category_required") && !item.getBooleanValue("category_match")) return false;
        boolean sectionPage = isNewsSectionPage(item.getString("title"), url);
        return score >= NEWS_FILL_SCORE_FLOOR
                && (trustedNewsSourceScore(domain) > 0 || hasNewsPlacementSignal(haystack))
                && (!sectionPage || trustedNewsSourceScore(domain) >= 10);
    }

    private int scoreNewsCandidate(JSONObject item, String query, String categoryTerm) {
        String title = Optional.ofNullable(item.getString("title")).orElse("");
        String snippet = Optional.ofNullable(item.getString("snippet")).orElse("");
        String url = Optional.ofNullable(item.getString("url")).orElse("");
        String domain = Optional.ofNullable(item.getString("domain")).orElse("");
        String haystack = (title + " " + snippet + " " + url).toLowerCase(Locale.ROOT);

        int score = scoreSearchResult(item, query);
        score += trustedNewsSourceScore(domain);
        if (hasFreshnessSignal(haystack)) score += 8;
        if (hasNewsPlacementSignal(haystack)) score += 6;
        if (!categoryTerm.isBlank()) score += categoryRelevanceScore(haystack, categoryTerm);
        if (isHomepageLike(url)) score -= 6;
        if (isNewsSectionPage(title, url)) score -= 12;
        if (isSearchRedirectDomain(domain, url)) score -= 40;
        if (containsAny(haystack, "wikipedia", "baike", "encyclopedia", "definition", "dictionary")) score -= 18;
        return score;
    }

    private int trustedNewsSourceScore(String domain) {
        if (domain == null) return 0;
        String d = domain.toLowerCase(Locale.ROOT);
        if (containsAny(d, "reuters.com", "apnews.com")) return 24;
        if (containsAny(d, "bbc.com", "bbc.co.uk", "wsj.com", "ft.com", "bloomberg.com")) return 20;
        if (containsAny(d, "cnbc.com", "nytimes.com", "washingtonpost.com", "theguardian.com", "scmp.com")) return 18;
        if (containsAny(d, "techcrunch.com", "theverge.com", "arstechnica.com", "wired.com", "theregister.com")) return 16;
        if (containsAny(d, "caixin.com", "wallstreetcn.com", "cls.cn", "yicai.com", "stcn.com", "21jingji.com",
                "cs.com.cn", "cnstock.com", "xinhuanet.com", "people.com.cn", "thepaper.cn",
                "chinanews.com.cn", "news.sina.com.cn", "sina.com.cn", "news.163.com", "cctv.com", "cctv.cn", "nbd.com.cn")) return 14;
        if (containsAny(d, "ithome.com", "36kr.com", "qbitai.com", "ifanr.com", "livemint.com", "timesnownews.com")) return 10;
        return 0;
    }

    private int categoryRelevanceScore(String haystack, String categoryTerm) {
        String category = categoryTerm.toLowerCase(Locale.ROOT);
        if (category.contains("technology")) {
            return containsAny(haystack, "technology", "tech", "artificial intelligence", "chip", "software", "startup", "cloud", "cybersecurity", "semiconductor")
                    || Pattern.compile("\\bai\\b").matcher(haystack).find() ? 10 : 0;
        }
        if (category.contains("finance")) {
            return containsAny(haystack, "finance", "market", "stock", "fed", "economy", "inflation", "rates", "earnings", "bank",
                    "crypto", "bitcoin", "btc", "etf", "yield", "liquidity", "央行", "证监会", "财联社", "比特币", "加密货币", "行情") ? 10 : 0;
        }
        if (category.contains("politics")) {
            if (containsAny(haystack, "sports", "world cup", "tennis", "boxing", "football", "artanddesign")) return 0;
            return containsAny(haystack, "politics", "election", "government", "war", "diplomacy", "policy", "minister", "president", "parliament", "world news", "/world/", "world-news") ? 10 : 0;
        }
        if (category.contains("world")) {
            return containsAny(haystack, "world", "international", "global", "foreign", "diplomacy", "war", "government") ? 10 : 0;
        }
        return 0;
    }

    private boolean isLowValueNewsResult(String title, String url, String domain) {
        String haystack = (title + " " + url + " " + domain).toLowerCase(Locale.ROOT);
        if (isSearchRedirectDomain(domain, url)) return true;
        return containsAny(haystack,
                "baidu.com/link",
                "bing.com/search",
                "duckduckgo.com",
                "wikipedia.org",
                "baike.baidu.com",
                "britannica.com",
                "iciba.com",
                "merriam-webster.com",
                "dictionary.cambridge.org",
                "dictionary",
                "encyclopedia",
                "definition",
                "sciencedirect.com/journal/",
                "zhihu.com/question",
                "login",
                "subscribe to",
                "privacy policy",
                "terms of service",
                "tag/",
                "/search?");
    }

    private boolean isNewsSectionPage(String title, String url) {
        try {
            URI uri = URI.create(url == null ? "" : url);
            String path = Optional.ofNullable(uri.getPath()).orElse("/")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("/+", "/")
                    .replaceAll("/$", "");
            if (path.isBlank() || "/".equals(path)) return true;
            if (path.endsWith("/index.html")) {
                path = path.substring(0, path.length() - "/index.html".length());
            }

            boolean articleCue = path.matches(".*20\\d{2}.*")
                    || containsAny(path, "/article/", "/story/", "/live/", "/posts/")
                    || path.matches(".*/[a-z0-9-]+-[0-9a-f]{8,}$");
            if (articleCue) return false;

            String[] segments = Arrays.stream(path.split("/"))
                    .filter(segment -> !segment.isBlank())
                    .toArray(String[]::new);
            String joined = String.join("/", segments);
            if (segments.length <= 1 && containsAny(joined,
                    "news", "world", "world-news", "technology", "tech", "business", "markets",
                    "finance", "economy", "politics", "latest-news")) {
                return true;
            }
            return segments.length <= 2 && containsAny(joined,
                    "news/world", "world/news", "business/technology", "business/markets",
                    "markets", "news/technology", "news/business", "news/politics");
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isSearchRedirectDomain(String domain, String url) {
        String d = domain == null ? "" : domain.toLowerCase(Locale.ROOT);
        String u = url == null ? "" : url.toLowerCase(Locale.ROOT);
        return containsAny(d, "baidu.com", "bing.com", "duckduckgo.com", "google.com")
                || containsAny(u, "baidu.com/link", "bing.com/ck/a", "bing.com/search", "duckduckgo.com/l/");
    }

    private boolean shouldSpendRedirectBudget(String title, String matchedQuery, String primary, String categoryTerm) {
        String haystack = (title + " " + matchedQuery + " " + primary).toLowerCase(Locale.ROOT);
        if (containsAny(haystack, "dictionary", "definition", "encyclopedia", "wikipedia", "baike", "archive", "pdf")) {
            return false;
        }
        if (!categoryTerm.isBlank() && categoryRelevanceScore(haystack, categoryTerm) <= 0) {
            return false;
        }
        return containsAny(haystack,
                "reuters", "associated press", "ap news", "bbc", "cnbc", "financial times", "bloomberg",
                "techcrunch", "the verge", "ars technica", "wired", "latest", "today", "breaking", "news");
    }

    private String resolveSearchRedirectUrl(String url) {
        String normalized = normalizeUrl(url);
        String domain = extractDomain(normalized);
        if (!containsAny(domain, "baidu.com") || !normalized.toLowerCase(Locale.ROOT).contains("baidu.com/link")) {
            return normalized;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(normalized))
                    .header("User-Agent", USER_AGENT)
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            String finalUrl = response.uri() == null ? "" : response.uri().toString();
            return finalUrl.startsWith("http") && !isSearchRedirectDomain(extractDomain(finalUrl), finalUrl)
                    ? normalizeUrl(finalUrl)
                    : normalized;
        } catch (Exception e) {
            log.debug("Resolve search redirect failed: {}", rootMessage(e));
            return normalized;
        }
    }

    private boolean hasFreshnessSignal(String haystack) {
        return containsAny(haystack, "today", "latest", "live", "updates", "breaking", "2026", "may 27", "minutes ago", "hours ago");
    }

    private boolean hasNewsPlacementSignal(String haystack) {
        return containsAny(haystack,
                "news", "/news/", "/world/", "/technology/", "/tech/", "/markets/", "/business/",
                "/finance/", "/economy/", "/politics/", "/article/", "/story/", "/2026/");
    }

    private boolean isHomepageLike(String url) {
        try {
            URI uri = URI.create(url);
            String path = Optional.ofNullable(uri.getPath()).orElse("/");
            return "/".equals(path) || path.isBlank();
        } catch (Exception e) {
            return false;
        }
    }

    private String newsStoryKey(String title) {
        if (title == null) return "";
        String cleaned = title.toLowerCase(Locale.ROOT)
                .replaceAll("&#x27;", "'")
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\b(today|latest|live|updates|breaking|news|may|2026|the|and|for|with|from|this|that)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return Arrays.stream(cleaned.split("\\s+"))
                .filter(term -> term.length() > 2)
                .limit(6)
                .collect(Collectors.joining(" "));
    }

    private String extractDomain(String url) {
        try {
            String host = URI.create(url).getHost();
            if (host == null) return "";
            return host.toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        } catch (Exception e) {
            Matcher matcher = Pattern.compile("https?://([^/]+)").matcher(url == null ? "" : url);
            return matcher.find() ? matcher.group(1).toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "") : "";
        }
    }

    private String newsQualityLabel(int score) {
        if (score >= 34) return "high";
        if (score >= 22) return "medium";
        return "low";
    }

    private String newsQualitySignals(JSONObject item, String categoryTerm) {
        List<String> signals = new ArrayList<>();
        String domain = Optional.ofNullable(item.getString("domain")).orElse("");
        String haystack = (item.getString("title") + " " + item.getString("snippet") + " " + item.getString("url")).toLowerCase(Locale.ROOT);
        if (trustedNewsSourceScore(domain) >= 10) signals.add("trusted-source");
        if (containsAny(haystack, "today", "latest", "live", "updates", "breaking", "2026", "may 27")) signals.add("freshness-signal");
        if (!categoryTerm.isBlank() && categoryRelevanceScore(haystack, categoryTerm) > 0) signals.add("category-match");
        if (isNewsSectionPage(item.getString("title"), item.getString("url"))) signals.add("section-fallback");
        if (!domain.isBlank()) signals.add("domain:" + domain);
        return signals.isEmpty() ? "search-match" : String.join(", ", signals);
    }

    private boolean containsAny(String value, String... needles) {
        String lower = value == null ? "" : value.toLowerCase(Locale.ROOT);
        for (String needle : needles) {
            if (needle != null && !needle.isBlank() && lower.contains(needle.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String formatNewsResults(List<JSONObject> results, String query, int candidateCount, List<String> queries) {
        StringBuilder output = new StringBuilder();
        output.append("News results for: ").append(query).append("\n");
        output.append("Collection: ").append(candidateCount).append(" candidates from ")
                .append(countDistinctDomains(results)).append(" source domains; ranked by source authority, freshness, category relevance, and diversity.\n");
        output.append("Query plan: ").append(String.join(" | ", queries)).append("\n");
        int count = 0;
        for (JSONObject item : results) {
            if (count >= NEWS_RESULT_LIMIT) break;
            count++;
            output.append(count).append(". ").append(item.getString("title")).append("\n");
            output.append("   Source: ").append(item.getString("domain")).append(" via ").append(item.getString("source")).append("\n");
            output.append("   Link: ").append(item.getString("url")).append("\n");
            output.append("   Quality: ").append(item.getString("quality"))
                    .append(" (score ").append(item.getIntValue("news_score")).append("; ")
                    .append(item.getString("signals")).append(")\n");
            String snippet = item.getString("snippet");
            if (snippet != null && !snippet.isBlank()) {
                output.append("   Snippet: ").append(trimTo(snippet, 240)).append("\n");
            }
        }
        output.append("Next step: use read_webpage on the top 12-16 links before making factual claims or writing a final briefing.");
        return output.toString();
    }

    private int countDistinctDomains(List<JSONObject> results) {
        return (int) results.stream()
                .map(item -> Optional.ofNullable(item.getString("domain")).orElse(""))
                .filter(domain -> !domain.isBlank())
                .distinct()
                .count();
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
            int safeLimit = Math.max(3, Math.min(limit == null ? 20 : limit, 24));
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
            result.put("guidance", "Use these community snapshot ids in citations. For broad research, combine several communities with web_research/read_webpage evidence, cite 18+ useful sources when available, and end with a plain-text 来源 note instead of a Markdown source heading.");
            return result.toJSONString();
        } catch (Exception e) {
            log.error("Community snapshot failed", e);
            JSONObject result = new JSONObject();
            result.put("retrieved_at", java.time.OffsetDateTime.now().toString());
            result.put("limit", limit == null ? 20 : limit);
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
            List<JSONObject> searchResults = searchUrlsAsList(query, 32);
            if (searchResults.isEmpty()) {
                return JSON.toJSONString(List.of(Map.of("error", "未查找到有效非百度结果，可能被搜索引擎或目标站点拦截，请更换搜索词或改用直连来源")));
            }

            return JSON.toJSONString(searchResults);

        } catch (Exception e) {
            log.error("searchUrls failed: {}", e.getMessage());
            return JSON.toJSONString(List.of(Map.of("error", "搜索失败: " + e.getMessage())));
        }
    }

    @Override
    public String webResearch(String query, List<String> queries, String mode, Integer maxResults, Boolean readTop, String focusKeyword) {
        int max = Math.max(16, Math.min(maxResults == null ? 32 : maxResults, 40));
        boolean shouldReadTop = readTop == null || readTop;
        List<String> queryPlan = buildResearchQueries(query, queries, mode);
        List<String> executedQueryPlan = selectResearchQueryPlan(queryPlan, mode, shouldReadTop);

        JSONArray sources = new JSONArray();
        JSONArray evidence = new JSONArray();

        try {
            List<JSONObject> collected = collectResearchSourcesInParallel(executedQueryPlan, query, max, shouldReadTop);

            collected.sort((a, b) -> Integer.compare(scoreSearchResult(b, query), scoreSearchResult(a, query)));
            int sourceId = 1;
            for (JSONObject item : collected) {
                item.put("id", sourceId++);
                sources.add(item);
                if (sources.size() >= max) break;
            }

            if (shouldReadTop) {
                evidence.addAll(readTopEvidenceInParallel(sources, query, focusKeyword, mode));
            }

            JSONObject result = new JSONObject();
            result.put("query", query);
            result.put("mode", mode == null ? "auto" : mode);
            result.put("read_top", shouldReadTop);
            result.put("read_mode", shouldReadTop ? "deep_parallel" : "fast_sources_only");
            result.put("query_plan", executedQueryPlan);
            if (queryPlan.size() > executedQueryPlan.size()) {
                result.put("query_plan_full", queryPlan);
            }
            result.put("sources", sources);
            result.put("evidence", evidence);
            result.put("execution_policy", "Search query plan runs in bounded parallel batches of " + RESEARCH_QUERY_BATCH_PARALLELISM + "; each query fans out to search engines in parallel, then top sources are deep-read in parallel.");
            result.put("source_policy", "Default search fanout uses Bing CN, Bing Global, DuckDuckGo, Jina Search, Tavily when configured, plus direct first-hand/news/policy/report/community fallback sources. Baidu is disabled completely. Reuters/AP/CNBC/Bloomberg/财联社/official-policy/institution-report targets are searched as article/report queries before section fallbacks are used.");
            result.put("guidance", "Use source ids like [1], [2] in the final answer. Prefer first_hand_news, official_policy, institution_report, specialist_news, academic_primary, community_original and article/report-like URLs over section_fallback sources. Treat HTTP 451/403/429 as access-blocked evidence, not as absence of evidence; if blocked or sparse, call search_urls/read_webpage again with site: queries, official reports, RSS/search-result snippets, or alternate syndication/community originals before finalizing.");
            return result.toJSONString();
        } catch (Exception e) {
            log.error("webResearch failed: {}", e.getMessage(), e);
            return JSON.toJSONString(Map.of("error", "聚合检索失败: " + e.getMessage(), "query_plan", queryPlan));
        }
    }

    private List<String> selectResearchQueryPlan(List<String> queryPlan, String mode, boolean shouldReadTop) {
        List<String> plan = queryPlan == null ? List.of() : queryPlan;
        if (plan.isEmpty()) return plan;
        String lowerMode = mode == null ? "auto" : mode.toLowerCase(Locale.ROOT);
        boolean newsLike = lowerMode.contains("news");
        boolean academicLike = lowerMode.contains("academic");
        int limit = shouldReadTop
                ? (newsLike ? 18 : academicLike ? 16 : 16)
                : 18;
        if (plan.size() <= limit) return plan;

        LinkedHashSet<String> selected = new LinkedHashSet<>();
        int headCount = Math.min(8, limit);
        for (int i = 0; i < headCount && i < plan.size(); i++) {
            selected.add(plan.get(i));
        }

        String[] priorityNeedles = {
                "site:cnbc.com/crypto", "site:bloomberg.com/crypto", "site:coindesk.com", "site:theblock.co",
                "site:coinshares.com", "site:glassnode.com", "site:coinmetrics.io", "site:sec.gov",
                "site:cls.cn", "site:stcn.com", "site:yicai.com", "site:reuters.com/markets",
                "site:cnbc.com/markets", "site:bloomberg.com/markets", "site:pbc.gov.cn", "site:csrc.gov.cn",
                "site:nature.com", "site:science.org", "site:arxiv.org", "site:ieeexplore.ieee.org", "site:dl.acm.org"
        };
        for (String needle : priorityNeedles) {
            if (selected.size() >= limit) break;
            for (String candidate : plan) {
                if (candidate.toLowerCase(Locale.ROOT).contains(needle)) {
                    selected.add(candidate);
                    break;
                }
            }
        }

        for (String candidate : plan) {
            if (selected.size() >= limit) break;
            selected.add(candidate);
        }
        return new ArrayList<>(selected);
    }

    private List<JSONObject> collectResearchSourcesInParallel(List<String> queryPlan, String query, int max, boolean shouldReadTop) {
        List<JSONObject> collected = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        List<String> plan = queryPlan == null ? List.of() : queryPlan;
        int perQueryMax = max >= 32 ? (shouldReadTop ? 16 : 20) : Math.min(max, 16);
        int collectionLimit = Math.max(max * 6, max + 48);

        for (int start = 0; start < plan.size(); start += RESEARCH_QUERY_BATCH_PARALLELISM) {
            List<String> batch = plan.subList(start, Math.min(start + RESEARCH_QUERY_BATCH_PARALLELISM, plan.size()));
            List<CompletableFuture<List<JSONObject>>> futures = new ArrayList<>();
            for (String q : batch) {
                futures.add(CompletableFuture
                        .supplyAsync(() -> {
                            List<JSONObject> items = searchUrlsAsList(q, perQueryMax);
                            for (JSONObject item : items) {
                                item.put("query", q);
                                enrichSearchResultMetadata(item);
                            }
                            return items;
                        }, researchExecutor)
                        .completeOnTimeout(List.<JSONObject>of(), RESEARCH_QUERY_FUTURE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                        .exceptionally(error -> {
                            log.debug("Research query failed [{}]: {}", trimTo(q, 80), rootMessage(error));
                            return List.of();
                        }));
            }
            for (CompletableFuture<List<JSONObject>> future : futures) {
                for (JSONObject item : future.join()) {
                    String url = item.getString("url");
                    String dedupeKey = normalizeUrlForDedup(url);
                    if (dedupeKey.isBlank() || seen.contains(dedupeKey)) continue;
                    seen.add(dedupeKey);
                    collected.add(item);
                    if (collected.size() >= collectionLimit) return collected;
                }
            }
        }
        return collected;
    }

    private JSONArray readTopEvidenceInParallel(JSONArray sources, String query, String focusKeyword, String mode) {
        int readCount = Math.min(getDeepReadLimitForMode(mode), sources.size());
        String focus = focusKeyword == null || focusKeyword.isBlank() ? query : focusKeyword;
        List<CompletableFuture<JSONObject>> futures = new ArrayList<>();

        for (int i = 0; i < readCount; i++) {
            JSONObject source = sources.getJSONObject(i);

            CompletableFuture<JSONObject> future = CompletableFuture
                    .supplyAsync(() -> readEvidenceItem(source, focus), researchExecutor)
                    .completeOnTimeout(
                            buildEvidenceErrorItem(source, "read_timeout_after_" + DEEP_READ_FUTURE_TIMEOUT_SECONDS + "s"),
                            DEEP_READ_FUTURE_TIMEOUT_SECONDS,
                            TimeUnit.SECONDS
                    )
                    .exceptionally(error -> buildEvidenceErrorItem(source, "read_failed: " + rootMessage(error)));
            futures.add(future);
        }

        JSONArray evidence = new JSONArray();
        for (CompletableFuture<JSONObject> future : futures) {
            evidence.add(future.join());
        }
        return evidence;
    }

    private int getDeepReadLimitForMode(String mode) {
        String lowerMode = mode == null ? "auto" : mode.toLowerCase(Locale.ROOT);
        if (lowerMode.contains("news")) return DEEP_READ_LIMIT;
        if (lowerMode.contains("academic")) return DEEP_READ_LIMIT;
        return Math.min(20, DEEP_READ_LIMIT);
    }

    private JSONObject readEvidenceItem(JSONObject source, String focus) {
        JSONObject item = baseEvidenceItem(source);
        String url = source.getString("url");
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
            copyIfPresent(page, item, "read_method");
            copyIfPresent(page, item, "http_status");
            copyIfPresent(page, item, "jina_status");
            copyIfPresent(page, item, "blocked");
            copyIfPresent(page, item, "filter_warning");
            copyIfPresent(page, item, "read_attempts");
            copyIfPresent(page, item, "canonical_url");
            String content = page.getString("content");
            if (content == null) content = page.toJSONString();
            item.put("content", trimTo(content, 3000));
            item.put("truncated", content.length() > 3000);
        } catch (Exception readError) {
            item.put("error", "read_failed: " + readError.getMessage());
        }
        return item;
    }

    private JSONObject buildEvidenceErrorItem(JSONObject source, String error) {
        JSONObject item = baseEvidenceItem(source);
        item.put("error", error);
        return item;
    }

    private JSONObject baseEvidenceItem(JSONObject source) {
        JSONObject item = new JSONObject();
        item.put("source_id", source.getInteger("id"));
        item.put("title", source.getString("title"));
        item.put("url", source.getString("url"));
        copyIfPresent(source, item, "source_tier");
        copyIfPresent(source, item, "source_type");
        copyIfPresent(source, item, "domain");
        copyIfPresent(source, item, "article_like");
        copyIfPresent(source, item, "section_fallback");
        return item;
    }

    private void copyIfPresent(JSONObject source, JSONObject target, String key) {
        if (source != null && source.containsKey(key)) {
            target.put(key, source.get(key));
        }
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
            List<JSONObject> attempts = new ArrayList<>();
            JSONObject page = fetchJinaReaderPage(url, "application/json", "jina_json", capTimeout(requestTimeout, 12));
            attempts.add(readAttemptSummary(page));

            if (shouldRetryRead(page)) {
                JSONObject markdownPage = fetchJinaReaderPage(url, "text/plain,text/markdown,*/*", "jina_markdown", capTimeout(requestTimeout, 8));
                attempts.add(readAttemptSummary(markdownPage));
                if (isBetterReadPage(markdownPage, page)) {
                    page = markdownPage;
                }
            }

            if (shouldRetryRead(page) || isBlockedPage(page)) {
                JSONObject directPage = fetchDirectHtmlPage(url, capTimeout(requestTimeout, 8));
                attempts.add(readAttemptSummary(directPage));
                if (isBetterReadPage(directPage, page)) {
                    page = directPage;
                }
            }

            if (!hasUsablePageContent(page)) {
                JSONObject result = new JSONObject();
                result.put("url", url);
                result.put("error", "读取网页失败: 无可用正文。可能是访问限制、反爬、付费墙、动态渲染或目标源临时不可用。");
                result.put("blocked", attempts.stream().anyMatch(attempt ->
                        attempt instanceof JSONObject && Boolean.TRUE.equals(((JSONObject) attempt).getBoolean("blocked"))));
                result.put("read_attempts", attempts);
                return result.toJSONString();
            }

            return buildReadWebpageResult(url, page, focusKeyword, chunkIndex, attempts).toJSONString();

        } catch (Exception e) {
            log.error("readWebpage failed: {}", e.getMessage());
            return JSON.toJSONString(Map.of("error", "读取网页失败: " + e.getMessage()));
        }
    }

    private JSONObject fetchJinaReaderPage(String url, String accept, String readMethod, Duration requestTimeout) {
        JSONObject result = new JSONObject();
        result.put("read_method", readMethod);
        try {
            String jinaUrl = "https://r.jina.ai/" + url;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(jinaUrl))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", accept)
                    .header("X-Return-Format", "markdown")
                    .timeout(requestTimeout)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            result.put("http_status", response.statusCode());
            result.put("blocked", isBlockedStatus(response.statusCode()));

            if (response.statusCode() != 200) {
                result.put("error", "HTTP " + response.statusCode());
                result.put("error_detail", trimTo(cleanText(response.body()), 320));
                return result;
            }

            JSONObject parsed = parseJinaReaderBody(response.body());
            for (Map.Entry<String, Object> entry : parsed.entrySet()) {
                result.put(entry.getKey(), entry.getValue());
            }
            return result;
        } catch (Exception e) {
            result.put("error", rootMessage(e));
            return result;
        }
    }

    private JSONObject parseJinaReaderBody(String body) {
        JSONObject result = new JSONObject();
        String value = body == null ? "" : body.trim();
        if (value.startsWith("{")) {
            try {
                JSONObject root = JSON.parseObject(value);
                Integer jinaStatus = Optional.ofNullable(root.getInteger("status")).orElse(root.getInteger("code"));
                if (jinaStatus != null) {
                    result.put("jina_status", jinaStatus);
                    result.put("blocked", isBlockedStatus(jinaStatus));
                }
                String message = root.getString("message");
                if (message != null && !message.isBlank()) {
                    result.put("error", message);
                }
                JSONObject data = root.getJSONObject("data");
                if (data != null) {
                    result.put("title", firstNonBlank(data.getString("title"), root.getString("title")));
                    result.put("canonical_url", firstNonBlank(data.getString("url"), root.getString("url")));
                    result.put("content", firstNonBlank(
                            data.getString("content"),
                            data.getString("markdown"),
                            data.getString("text"),
                            root.getString("content")
                    ));
                    result.put("parsed_json", true);
                    return result;
                }
                result.put("title", root.getString("title"));
                result.put("canonical_url", root.getString("url"));
                result.put("content", firstNonBlank(root.getString("content"), root.getString("markdown"), root.getString("text")));
                result.put("parsed_json", true);
                return result;
            } catch (Exception e) {
                result.put("parse_warning", "jina_json_parse_failed: " + rootMessage(e));
            }
        }
        result.put("content", body == null ? "" : body);
        return result;
    }

    private JSONObject fetchDirectHtmlPage(String url, Duration requestTimeout) {
        JSONObject result = new JSONObject();
        result.put("read_method", "direct_html");
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                    .timeout(requestTimeout)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            result.put("http_status", response.statusCode());
            result.put("blocked", isBlockedStatus(response.statusCode()));
            if (response.statusCode() != 200) {
                result.put("error", "HTTP " + response.statusCode());
                result.put("error_detail", trimTo(cleanText(response.body()), 320));
                return result;
            }
            result.put("content", extractMainContent(response.body(), true));
            result.put("canonical_url", response.uri() == null ? url : response.uri().toString());
            return result;
        } catch (Exception e) {
            result.put("error", rootMessage(e));
            return result;
        }
    }

    private JSONObject buildReadWebpageResult(String url, JSONObject page, String focusKeyword, Integer chunkIndex, List<JSONObject> attempts) {
        String content = Optional.ofNullable(page.getString("content")).orElse("");
        JSONObject result = new JSONObject();
        result.put("url", url);
        result.put("canonical_url", firstNonBlank(page.getString("canonical_url"), url));
        result.put("title", page.getString("title"));
        result.put("content", selectReadContent(content, focusKeyword, chunkIndex, result));
        result.put("read_method", page.getString("read_method"));
        result.put("http_status", page.get("http_status"));
        result.put("jina_status", page.get("jina_status"));
        result.put("blocked", isBlockedPage(page));
        result.put("source_tier", classifySourceTier(url));
        result.put("source_type", classifySourceType(url));
        result.put("article_like", isArticleLikeUrl(url));
        result.put("section_fallback", isLikelySectionUrl(url));
        result.put("read_attempts", attempts);
        return result;
    }

    private String selectReadContent(String content, String focusKeyword, Integer chunkIndex, JSONObject result) {
        int maxReturnChars = 10000;
        if (focusKeyword != null && !focusKeyword.trim().isEmpty()) {
            List<String> validChunks = splitContentChunks(content);
            List<String> keywords = extractFocusTerms(focusKeyword);
            Map<String, Double> chunkScores = new HashMap<>();

            for (String chunk : validChunks) {
                String chunkLower = chunk.toLowerCase(Locale.ROOT);
                double score = 0.0;
                for (String kw : keywords) {
                    int count = countOccurrences(chunkLower, kw.toLowerCase(Locale.ROOT));
                    if (count > 0) {
                        score += (count * Math.max(2, kw.length())) / Math.log(chunk.length() + 10);
                        if (chunkLower.substring(0, Math.min(chunkLower.length(), 220)).contains(kw.toLowerCase(Locale.ROOT))) {
                            score += 3.0;
                        }
                    }
                }
                if (score > 0) {
                    chunkScores.put(chunk, score);
                }
            }

            List<Map.Entry<String, Double>> sortedScores = new ArrayList<>(chunkScores.entrySet());
            sortedScores.sort((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()));

            StringBuilder selected = new StringBuilder();
            int currentCharCount = 0;
            for (Map.Entry<String, Double> entry : sortedScores) {
                String chunk = entry.getKey();
                if (currentCharCount + chunk.length() > maxReturnChars && currentCharCount > 0) break;
                selected.append("... ").append(chunk).append(" ...\n\n");
                currentCharCount += chunk.length();
                if (currentCharCount >= maxReturnChars) break;
            }

            result.put("filter_applied", "Semantic Chunk Ranking (Local RAG)");
            result.put("focus_keyword_used", focusKeyword);
            result.put("focus_terms", keywords);
            result.put("chunks_analyzed", validChunks.size());

            String selectedContent = selected.toString().trim();
            if (selectedContent.isEmpty()) {
                result.put("filter_warning", "No high-scoring paragraph matched focus_keyword; returned leading excerpt instead of hiding the page.");
                return trimTo(content, maxReturnChars);
            }
            return selectedContent;
        }

        int chunkSize = 8000;
        int totalLength = content.length();
        int idx = (chunkIndex != null && chunkIndex >= 0) ? chunkIndex : 0;
        int start = idx * chunkSize;
        int end = Math.min(start + chunkSize, totalLength);

        result.put("chunk_index", idx);
        result.put("total_chunks", Math.ceil((double) totalLength / chunkSize));
        result.put("total_length", totalLength);
        return start < totalLength ? content.substring(start, end) : "已到达文档末尾。";
    }

    private List<String> splitContentChunks(String content) {
        String[] rawChunks = Optional.ofNullable(content).orElse("").split("\\n\\s*\\n|(?=\\n#)|(?<=。)|(?<=\\.)\\s+");
        List<String> validChunks = new ArrayList<>();
        for (String chunk : rawChunks) {
            String cleaned = chunk.trim();
            if (cleaned.length() > 50) {
                validChunks.add(cleaned);
            }
        }
        return validChunks;
    }

    private List<String> extractFocusTerms(String focusKeyword) {
        LinkedHashSet<String> terms = new LinkedHashSet<>();
        String lower = focusKeyword == null ? "" : focusKeyword.toLowerCase(Locale.ROOT);
        Matcher matcher = Pattern.compile("[\\p{IsHan}]{2,}|[a-z0-9][a-z0-9._+-]{1,}").matcher(lower);
        while (matcher.find()) {
            String token = matcher.group();
            if (!isLowValueFocusTerm(token)) {
                terms.add(token);
            }
            if (token.matches("[\\p{IsHan}]{5,}")) {
                for (int i = 0; i + 2 <= token.length(); i++) {
                    String shingle = token.substring(i, i + 2);
                    if (!isLowValueFocusTerm(shingle)) {
                        terms.add(shingle);
                    }
                }
            }
        }
        if (containsAny(lower, "btc", "bitcoin", "比特币")) {
            terms.add("btc");
            terms.add("bitcoin");
            terms.add("比特币");
        }
        if (containsAny(lower, "price", "价格", "行情", "走势", "涨", "跌")) {
            terms.add("price");
            terms.add("close");
            terms.add("open");
            terms.add("high");
            terms.add("low");
            terms.add("价格");
            terms.add("收盘");
            terms.add("开盘");
            terms.add("最高");
            terms.add("最低");
        }
        if (containsAny(lower, "policy", "regulation", "政策", "监管")) {
            terms.add("policy");
            terms.add("regulator");
            terms.add("sec");
            terms.add("federal reserve");
            terms.add("政策");
            terms.add("监管");
            terms.add("央行");
            terms.add("证监会");
        }
        if (containsAny(lower, "report", "research", "研报", "报告", "机构")) {
            terms.add("report");
            terms.add("research");
            terms.add("outlook");
            terms.add("报告");
            terms.add("研报");
        }
        if (terms.isEmpty() && focusKeyword != null && !focusKeyword.isBlank()) {
            terms.add(focusKeyword.toLowerCase(Locale.ROOT));
        }
        return new ArrayList<>(terms);
    }

    private boolean isLowValueFocusTerm(String token) {
        return containsAny(token, "这个", "一个", "一些", "每天", "这个月", "本月", "今天", "最新", "新闻", "情况");
    }

    private int countOccurrences(String value, String term) {
        if (value == null || term == null || term.isBlank()) return 0;
        int count = 0;
        int index = 0;
        while ((index = value.indexOf(term, index)) >= 0) {
            count++;
            index += Math.max(1, term.length());
        }
        return count;
    }

    private boolean shouldRetryRead(JSONObject page) {
        return page == null || !hasUsablePageContent(page) || isBlockedPage(page);
    }

    private boolean hasUsablePageContent(JSONObject page) {
        if (page == null) return false;
        String content = Optional.ofNullable(page.getString("content")).orElse("").trim();
        if (content.length() < 220) return false;
        String lower = content.toLowerCase(Locale.ROOT);
        return !containsAny(lower,
                "enable javascript",
                "checking your browser",
                "access denied",
                "you are being redirected",
                "subscribe to continue",
                "robot check",
                "captcha");
    }

    private boolean isBetterReadPage(JSONObject candidate, JSONObject current) {
        if (!hasUsablePageContent(candidate)) return false;
        if (!hasUsablePageContent(current)) return true;
        return contentLength(candidate) > contentLength(current) + 200;
    }

    private int contentLength(JSONObject page) {
        return Optional.ofNullable(page).map(p -> Optional.ofNullable(p.getString("content")).orElse("").length()).orElse(0);
    }

    private boolean isBlockedPage(JSONObject page) {
        if (page == null) return false;
        Boolean blocked = page.getBoolean("blocked");
        if (Boolean.TRUE.equals(blocked)) return true;
        Integer status = page.getInteger("http_status");
        if (status != null && isBlockedStatus(status)) return true;
        Integer jinaStatus = page.getInteger("jina_status");
        return jinaStatus != null && isBlockedStatus(jinaStatus);
    }

    private boolean isBlockedStatus(int status) {
        return status == 401 || status == 403 || status == 429 || status == 451;
    }

    private JSONObject readAttemptSummary(JSONObject page) {
        JSONObject summary = new JSONObject();
        if (page == null) return summary;
        copyIfPresent(page, summary, "read_method");
        copyIfPresent(page, summary, "http_status");
        copyIfPresent(page, summary, "jina_status");
        copyIfPresent(page, summary, "blocked");
        copyIfPresent(page, summary, "error");
        summary.put("content_length", contentLength(page));
        return summary;
    }

    private Duration capTimeout(Duration requested, int maxSeconds) {
        long requestedSeconds = requested == null ? maxSeconds : requested.getSeconds();
        return Duration.ofSeconds(Math.max(2, Math.min(requestedSeconds, maxSeconds)));
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private List<JSONObject> searchUrlsAsList(String query, int maxResults) {
        return searchUrlsAsList(query, maxResults, false);
    }

    private List<JSONObject> searchUrlsAsList(String query, int maxResults, boolean includeBaidu) {
        int limit = Math.max(1, Math.min(maxResults, 40));
        List<JSONObject> combined = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<CompletableFuture<List<JSONObject>>> futures = new ArrayList<>();
        if (includeBaidu) {
            log.debug("Baidu include request ignored by research policy for query: {}", trimTo(query, 80));
        }

        futures.add(searchSourceFuture("bing-cn", () -> fetchBingResults(query, "cn.bing.com", "bing-cn")));
        futures.add(searchSourceFuture("bing-global", () -> fetchBingResults(query, "www.bing.com", "bing-global")));
        futures.add(searchSourceFuture("duckduckgo", () -> fetchDuckDuckGoResults(query)));
        futures.add(searchSourceFuture("jina-search", () -> fetchJinaSearchResults(query, Math.min(limit, 20))));

        if (tavilyApiKey != null && !tavilyApiKey.isBlank()) {
            futures.add(searchSourceFuture("tavily", () -> fetchTavilyResults(query, Math.min(limit, 16))));
        }

        for (CompletableFuture<List<JSONObject>> future : futures) {
            addSearchResults(combined, seen, future.join(), limit);
        }

        if (combined.size() < limit) {
            addSearchResults(combined, seen, buildDirectResearchFallbackSources(query, limit), limit);
        }

        combined.sort((a, b) -> Integer.compare(scoreSearchResult(b, query), scoreSearchResult(a, query)));
        return combined.stream().limit(limit).collect(Collectors.toList());
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
            String qLower = q.toLowerCase(Locale.ROOT);
            boolean currentLike = lowerMode.contains("news")
                    || q.matches(".*(最新|今天|新闻|current|latest|today|202[0-9]).*");
            boolean cryptoLike = containsAny(qLower,
                    "btc", "bitcoin", "比特币", "crypto", "cryptocurrency", "加密货币", "数字货币", "eth", "ethereum", "以太坊");
            boolean marketLike = lowerMode.contains("market") || cryptoLike || containsAny(qLower,
                    "finance", "financial", "market", "markets", "stock", "stocks", "bond", "yield", "rate", "rates",
                    "commodity", "oil", "gold", "etf", "price", "economy", "macro", "fed", "inflation",
                    "财经", "金融", "市场", "股市", "股票", "美股", "a股", "港股", "债券", "利率", "汇率", "期货", "价格", "行情", "经济", "通胀");
            boolean policyLike = containsAny(qLower,
                    "policy", "regulation", "regulator", "government", "official", "sec", "fed", "treasury",
                    "政策", "监管", "官方", "央行", "证监会", "财政部", "发改委", "政府");
            boolean reportLike = containsAny(qLower,
                    "report", "research", "white paper", "whitepaper", "outlook", "analysis",
                    "研报", "研究", "报告", "白皮书", "机构", "投行", "券商");
            boolean communityLike = lowerMode.contains("community") || containsAny(qLower,
                    "社区", "reddit", "hacker news", "github", "v2ex", "product hunt", "lobsters", "前沿", "讨论", "实践", "经验");

            if (currentLike || marketLike || policyLike || reportLike) {
                plan.add(q + " Reuters Bloomberg AP CNBC 财联社");
                plan.add("site:reuters.com " + q);
                plan.add("site:apnews.com " + q);
                plan.add("site:cnbc.com " + q);
                plan.add("site:bloomberg.com " + q);
                plan.add(q + " 财联社 第一财经 证券时报 21财经");
                plan.add(q + " official policy regulator announcement report");
            }
            if (cryptoLike) {
                String cryptoIntent = buildCryptoSearchIntent(q);
                plan.add("site:cnbc.com/crypto " + cryptoIntent);
                plan.add("site:bloomberg.com/crypto " + cryptoIntent);
                plan.add("site:coindesk.com " + cryptoIntent);
                plan.add("site:theblock.co " + cryptoIntent);
                plan.add("site:cointelegraph.com " + cryptoIntent);
                plan.add("site:coinshares.com " + cryptoIntent + " report");
                plan.add("site:glassnode.com " + cryptoIntent + " report");
                plan.add("site:coinmetrics.io " + cryptoIntent + " market");
                plan.add("site:sec.gov bitcoin crypto ETF");
            }
            if (marketLike) {
                String marketIntent = buildMarketSearchIntent(q);
                plan.add(marketIntent + " Reuters markets Bloomberg CNBC");
                plan.add("site:reuters.com/markets " + marketIntent);
                plan.add("site:cnbc.com/markets " + marketIntent);
                plan.add("site:bloomberg.com/markets " + marketIntent);
                plan.add("site:cls.cn " + q);
                plan.add("site:stcn.com " + q);
                plan.add("site:yicai.com " + q);
            }
            if (policyLike) {
                plan.add(q + " site:sec.gov OR site:federalreserve.gov OR site:treasury.gov");
                plan.add(q + " site:pbc.gov.cn OR site:csrc.gov.cn OR site:ndrc.gov.cn OR site:mof.gov.cn");
            }
            if (reportLike || marketLike) {
                plan.add(q + " institution report research outlook pdf");
                plan.add(q + " 券商研报 机构报告 深度研究");
            }
            if (lowerMode.contains("news") || currentLike) {
                plan.add(q + " 最新 新闻");
                plan.add(q + " official announcement OR press release");
            }
            if (lowerMode.contains("academic") || q.matches(".*(论文|研究|paper|research|benchmark|评测).*")) {
                plan.add(q + " paper arxiv benchmark");
            }
            if (lowerMode.contains("technical") || q.matches(".*(API|文档|框架|模型|代码|GitHub|docs|release|版本|库).*")) {
                plan.add(q + " official docs GitHub release");
            }
            if (communityLike || q.matches(".*(社区|实践|最佳实践|建议|方案|reddit|hacker news|经验).*")) {
                plan.add(q + " best practices community discussion");
                plan.add("site:news.ycombinator.com " + q);
                plan.add("site:reddit.com " + q);
                plan.add("site:github.com " + q);
                plan.add("site:v2ex.com " + q);
            }
        }
        return plan.stream().limit(18).collect(Collectors.toList());
    }

    private String buildMarketSearchIntent(String query) {
        String q = query == null ? "" : query.trim();
        String lower = q.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "btc", "bitcoin", "比特币")) {
            return "bitcoin BTC price market daily volatility ETF flows liquidation";
        }
        if (containsAny(lower, "eth", "ethereum", "以太坊")) {
            return "ethereum ETH price market daily volatility ETF flows";
        }
        return q + " market price economy policy research";
    }

    private String buildCryptoSearchIntent(String query) {
        String q = query == null ? "" : query.trim();
        String lower = q.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "btc", "bitcoin", "比特币")) {
            return "bitcoin BTC price drop market ETF flows liquidation";
        }
        if (containsAny(lower, "eth", "ethereum", "以太坊")) {
            return "ethereum ETH price market ETF flows";
        }
        return q + " crypto market price";
    }

    private List<JSONObject> buildDirectResearchFallbackSources(String query, int maxResults) {
        List<JSONObject> results = new ArrayList<>();
        String q = query == null ? "" : query.toLowerCase(Locale.ROOT);
        boolean agentLike = containsAny(q,
                "agent", "agents", "ai agent", "agentic", "mcp", "langchain", "langgraph", "llamaindex",
                "crewai", "autogen", "cursor", "windsurf", "copilot", "claude code", "社区", "开发者社区", "智能体");
        boolean aiLike = containsAny(q,
                "artificial intelligence", "openai", "anthropic", "deepmind", "hugging face", "llm",
                "large language model", "machine learning", "codex", "claude", "gemini", "deepseek",
                "人工智能", "生成式ai", "生成式 ai", "大模型", "机器学习")
                || Pattern.compile("(^|[^a-z])ai([^a-z]|$)").matcher(q).find();
        boolean academicLike = containsAny(q, "paper", "research", "benchmark", "arxiv", "论文", "学术", "研究", "评测");
        boolean newsLike = containsAny(q, "latest", "today", "news", "current", "最新", "今天", "新闻", "趋势", "前沿");
        boolean cryptoLike = containsAny(q, "btc", "bitcoin", "比特币", "crypto", "cryptocurrency", "加密货币", "数字货币", "eth", "ethereum", "以太坊");
        boolean marketLike = cryptoLike || containsAny(q,
                "finance", "financial", "market", "markets", "stock", "stocks", "bond", "yield", "rate", "rates",
                "commodity", "oil", "gold", "etf", "price", "economy", "macro", "fed", "inflation",
                "财经", "金融", "市场", "股市", "股票", "美股", "a股", "港股", "债券", "利率", "汇率", "期货", "价格", "行情", "经济", "通胀");
        boolean policyLike = containsAny(q,
                "policy", "regulation", "regulator", "government", "official", "sec", "treasury",
                "政策", "监管", "官方", "央行", "证监会", "财政部", "发改委", "政府");
        boolean reportLike = containsAny(q,
                "report", "research", "white paper", "whitepaper", "outlook", "analysis",
                "研报", "研究", "报告", "白皮书", "机构", "投行", "券商");
        boolean communityLike = containsAny(q,
                "社区", "reddit", "hacker news", "github", "v2ex", "product hunt", "lobsters", "前沿", "讨论", "实践", "经验");
        boolean generalNewsLike = newsLike && !agentLike && !aiLike && containsAny(q,
                "top news", "world", "international", "china", "domestic", "business", "finance", "market",
                "markets", "economy", "politics", "society", "sports", "culture", "entertainment",
                "头条", "要闻", "国内", "国际", "中国", "财经", "市场", "经济", "社会", "体育", "娱乐", "文化", "综合", "全景");

        if (marketLike) {
            addMarketResearchFallbackSources(results, cryptoLike);
        }

        if (policyLike || marketLike) {
            addPolicyResearchFallbackSources(results);
        }

        if (reportLike || marketLike || academicLike) {
            addInstitutionReportFallbackSources(results, cryptoLike);
        }

        if (communityLike) {
            addCommunityResearchFallbackSources(results);
        }

        if (generalNewsLike) {
            addGeneralNewsFallbackSources(results);
        }

        if (agentLike || aiLike) {
            addAiResearchFallbackSources(results);
        }

        if (agentLike) {
            addDirectSource(results, "direct-source", "LangChain Blog", "https://blog.langchain.com/", "LangChain and LangGraph agent framework updates");
            addDirectSource(results, "direct-source", "LangGraph GitHub", "https://github.com/langchain-ai/langgraph", "LangGraph source repository and releases");
            addDirectSource(results, "direct-source", "LlamaIndex Blog", "https://www.llamaindex.ai/blog", "LlamaIndex agent/RAG framework updates");
            addDirectSource(results, "direct-source", "Microsoft AutoGen GitHub", "https://github.com/microsoft/autogen", "AutoGen source repository and releases");
            addDirectSource(results, "direct-source", "CrewAI GitHub", "https://github.com/crewAIInc/crewAI", "CrewAI source repository and releases");
            addDirectSource(results, "direct-source", "Model Context Protocol", "https://modelcontextprotocol.io/", "MCP official documentation and ecosystem entry point");
            addDirectSource(results, "direct-source", "Aider News", "https://aider.chat/docs/news.html", "Aider coding-agent release notes");
            addDirectSource(results, "direct-source", "Cursor Changelog", "https://www.cursor.com/changelog", "Cursor product changelog");
            addDirectSource(results, "direct-source", "GitHub Trending", "https://github.com/trending?since=daily", "Daily trending GitHub repositories");
            addDirectSource(results, "direct-source", "Hacker News", "https://news.ycombinator.com/news", "Developer community front page");
            addDirectSource(results, "direct-source", "Hacker News Newest", "https://news.ycombinator.com/newest", "Fresh Hacker News submissions");
            addDirectSource(results, "direct-source", "Product Hunt AI", "https://www.producthunt.com/topics/artificial-intelligence", "Product Hunt AI product launches");
            addDirectSource(results, "direct-source", "Lobsters", "https://lobste.rs/", "Technical community discussions");
            addDirectSource(results, "direct-source", "V2EX Hot", "https://www.v2ex.com/?tab=hot", "Chinese developer community hot topics");
            addDirectSource(results, "direct-source", "Reddit r/LocalLLaMA", "https://www.reddit.com/r/LocalLLaMA/hot/", "Open-source LLM and agent community discussions");
            addDirectSource(results, "direct-source", "Reddit r/MachineLearning", "https://www.reddit.com/r/MachineLearning/hot/", "Machine learning community discussions");
            addDirectSource(results, "direct-source", "Reddit r/programming", "https://www.reddit.com/r/programming/hot/", "Programming community discussions");
            addDirectSource(results, "direct-source", "Simon Willison", "https://simonwillison.net/", "Practitioner notes on LLM tools, agents, and AI engineering");
        }

        if (academicLike || agentLike) {
            addDirectSource(results, "direct-source", "arXiv cs.AI recent", "https://arxiv.org/list/cs.AI/recent", "Recent artificial intelligence papers");
            addDirectSource(results, "direct-source", "arXiv cs.CL recent", "https://arxiv.org/list/cs.CL/recent", "Recent computational linguistics and LLM papers");
            addDirectSource(results, "direct-source", "Papers with Code", "https://paperswithcode.com/", "Paper, benchmark, and code index");
            addDirectSource(results, "direct-source", "Nature Machine Intelligence", "https://www.nature.com/natmachintell/", "Peer-reviewed AI research journal");
            addDirectSource(results, "direct-source", "ACM Digital Library", "https://dl.acm.org/", "ACM publication index");
            addDirectSource(results, "direct-source", "IEEE Xplore", "https://ieeexplore.ieee.org/", "IEEE publication index");
        }

        if (newsLike || results.isEmpty()) {
            if (!generalNewsLike) {
                addGeneralNewsFallbackSources(results);
            }
            addTechnologyNewsFallbackSources(results, agentLike || aiLike);
        }

        return results.stream().limit(maxResults).collect(Collectors.toList());
    }

    private void addMarketResearchFallbackSources(List<JSONObject> results, boolean cryptoFocused) {
        addDirectSource(results, "direct-source", "Reuters Markets", "https://www.reuters.com/markets/", "Reuters financial markets, economy, currencies, commodities and crypto-adjacent market news");
        addDirectSource(results, "direct-source", "Reuters Business", "https://www.reuters.com/business/", "Reuters business, finance, economy and market news");
        addDirectSource(results, "direct-source", "Bloomberg Markets", "https://www.bloomberg.com/markets", "Bloomberg market data, economy and finance coverage");
        addDirectSource(results, "direct-source", "CNBC Markets", "https://www.cnbc.com/markets/", "CNBC markets, business, economy and finance news");
        addDirectSource(results, "direct-source", "CNBC Crypto World", "https://www.cnbc.com/crypto-world/", "CNBC crypto market news and video briefings");
        addDirectSource(results, "direct-source", "财联社", "https://www.cls.cn/", "Chinese market-moving finance wire, policy and company news");
        addDirectSource(results, "direct-source", "第一财经", "https://www.yicai.com/", "Chinese finance, macro, markets and company news");
        addDirectSource(results, "direct-source", "证券时报", "https://www.stcn.com/", "Chinese securities, markets and listed-company news");
        addDirectSource(results, "direct-source", "21世纪经济报道", "https://www.21jingji.com/", "Chinese macro, finance and capital-market reporting");
        addDirectSource(results, "direct-source", "中国证券报", "https://www.cs.com.cn/", "Chinese securities and macro-finance reporting");
        addDirectSource(results, "direct-source", "上海证券报", "https://www.cnstock.com/", "Chinese securities and listed-company reporting");
        if (cryptoFocused) {
            addDirectSource(results, "direct-source", "CoinDesk Markets", "https://www.coindesk.com/markets/", "Crypto market news, prices, ETFs, mining and policy coverage");
            addDirectSource(results, "direct-source", "The Block", "https://www.theblock.co/", "Crypto markets, exchange, ETF, funding and policy reporting");
            addDirectSource(results, "direct-source", "Cointelegraph Markets", "https://cointelegraph.com/markets", "Crypto markets and policy news");
            addDirectSource(results, "direct-source", "Decrypt", "https://decrypt.co/", "Crypto industry and market news");
            addDirectSource(results, "direct-source", "CryptoSlate", "https://cryptoslate.com/", "Crypto market, on-chain and industry news");
            addDirectSource(results, "direct-source", "CME Cryptocurrency Products", "https://www.cmegroup.com/markets/cryptocurrencies.html", "CME crypto futures and institutional market reference");
        }
    }

    private void addPolicyResearchFallbackSources(List<JSONObject> results) {
        addDirectSource(results, "direct-source", "SEC Crypto Assets", "https://www.sec.gov/securities-topics/crypto-assets", "U.S. SEC official crypto asset policy and investor-protection topic page");
        addDirectSource(results, "direct-source", "SEC Newsroom", "https://www.sec.gov/newsroom", "U.S. SEC official announcements, enforcement and policy releases");
        addDirectSource(results, "direct-source", "Federal Reserve News", "https://www.federalreserve.gov/newsevents.htm", "Federal Reserve official policy, speech and press-release index");
        addDirectSource(results, "direct-source", "U.S. Treasury Press Releases", "https://home.treasury.gov/news/press-releases", "U.S. Treasury official policy and enforcement announcements");
        addDirectSource(results, "direct-source", "CFTC Press Room", "https://www.cftc.gov/PressRoom/PressReleases", "U.S. CFTC official derivatives, commodity and crypto enforcement releases");
        addDirectSource(results, "direct-source", "ECB Press", "https://www.ecb.europa.eu/press/html/index.en.html", "European Central Bank official monetary policy and market communications");
        addDirectSource(results, "direct-source", "中国人民银行", "http://www.pbc.gov.cn/", "PBOC official monetary policy, financial regulation and statistics");
        addDirectSource(results, "direct-source", "中国证监会", "http://www.csrc.gov.cn/", "CSRC official securities-market regulation and policy releases");
        addDirectSource(results, "direct-source", "国家发展改革委", "https://www.ndrc.gov.cn/", "NDRC official macro policy, industry and price-policy releases");
        addDirectSource(results, "direct-source", "财政部", "http://www.mof.gov.cn/", "MOF fiscal policy and official financial releases");
    }

    private void addInstitutionReportFallbackSources(List<JSONObject> results, boolean cryptoFocused) {
        addDirectSource(results, "direct-source", "CoinShares Research", "https://coinshares.com/research/", "Digital asset investment, fund-flow and market research");
        addDirectSource(results, "direct-source", "Glassnode Insights", "https://insights.glassnode.com/", "On-chain market research, weekly reports and data-driven crypto analysis");
        addDirectSource(results, "direct-source", "Coin Metrics Insights", "https://coinmetrics.io/insights/", "Crypto market data research and network-data analysis");
        addDirectSource(results, "direct-source", "Kaiko Research", "https://www.kaiko.com/research", "Institutional crypto market data and liquidity research");
        addDirectSource(results, "direct-source", "Coinbase Institutional Research", "https://www.coinbase.com/institutional/research-insights", "Institutional crypto market research and insights");
        addDirectSource(results, "direct-source", "Binance Research", "https://www.binance.com/en/research", "Crypto asset research, market structure and industry reports");
        if (!cryptoFocused) {
            addDirectSource(results, "direct-source", "IMF Publications", "https://www.imf.org/en/Publications", "International macroeconomic policy and market research");
            addDirectSource(results, "direct-source", "BIS Publications", "https://www.bis.org/publications/index.htm", "Bank for International Settlements financial-system and monetary research");
            addDirectSource(results, "direct-source", "World Bank Research", "https://www.worldbank.org/en/research", "World Bank economic and policy research");
        }
    }

    private void addCommunityResearchFallbackSources(List<JSONObject> results) {
        addDirectSource(results, "direct-source", "Hacker News", "https://news.ycombinator.com/news", "Developer and technology community front page");
        addDirectSource(results, "direct-source", "Hacker News Newest", "https://news.ycombinator.com/newest", "Fresh developer and technology submissions");
        addDirectSource(results, "direct-source", "GitHub Trending", "https://github.com/trending?since=daily", "Daily trending open-source repositories");
        addDirectSource(results, "direct-source", "Product Hunt", "https://www.producthunt.com/", "New technology and product launches");
        addDirectSource(results, "direct-source", "Lobsters", "https://lobste.rs/", "Technical community discussions");
        addDirectSource(results, "direct-source", "V2EX Hot", "https://www.v2ex.com/?tab=hot", "Chinese developer community hot topics");
        addDirectSource(results, "direct-source", "Reddit r/programming", "https://www.reddit.com/r/programming/hot/", "Programming community discussions");
        addDirectSource(results, "direct-source", "Reddit r/Bitcoin", "https://www.reddit.com/r/Bitcoin/hot/", "Bitcoin community discussions");
        addDirectSource(results, "direct-source", "Reddit r/CryptoCurrency", "https://www.reddit.com/r/CryptoCurrency/hot/", "Crypto market and community discussions");
    }

    private void addGeneralNewsFallbackSources(List<JSONObject> results) {
        addDirectSource(results, "direct-source", "BBC News", "https://www.bbc.com/news", "General breaking news, world, business, technology, culture and analysis");
        addDirectSource(results, "direct-source", "BBC World", "https://www.bbc.com/news/world", "World and international news from BBC");
        addDirectSource(results, "direct-source", "Reuters World", "https://www.reuters.com/world/", "Reuters world, politics, diplomacy and conflict news");
        addDirectSource(results, "direct-source", "Reuters Business", "https://www.reuters.com/business/", "Reuters business, finance, economy and market news");
        addDirectSource(results, "direct-source", "Reuters Markets", "https://www.reuters.com/markets/", "Reuters financial markets and economy news");
        addDirectSource(results, "direct-source", "AP Top News", "https://apnews.com/", "Associated Press top news across world, politics, business, sports and culture");
        addDirectSource(results, "direct-source", "AP World News", "https://apnews.com/world-news", "Associated Press world and international news");
        addDirectSource(results, "direct-source", "The Guardian World", "https://www.theguardian.com/world", "Guardian world and international news");
        addDirectSource(results, "direct-source", "CNBC Markets", "https://www.cnbc.com/markets/", "CNBC markets, business, economy and finance news");
        addDirectSource(results, "direct-source", "Sina News", "https://news.sina.com.cn/", "Chinese domestic, international, society and rolling news");
        addDirectSource(results, "direct-source", "China News Service", "https://www.chinanews.com.cn/", "Chinese domestic, international, finance, society and culture news");
        addDirectSource(results, "direct-source", "NetEase Latest News", "https://news.163.com/latest/", "Chinese rolling latest news, China, world, society, finance and technology");
        addDirectSource(results, "direct-source", "People's Daily Online", "https://www.people.com.cn/", "Chinese official domestic, politics, society and international news");
        addDirectSource(results, "direct-source", "CCTV News 30", "https://tv.cctv.com/lm/xw30f/", "CCTV daily Chinese news broadcast and major headlines");
        addDirectSource(results, "direct-source", "National Business Daily", "https://www.nbd.com.cn/", "Chinese finance, markets, companies and economy news");
    }

    private void addAiResearchFallbackSources(List<JSONObject> results) {
        addDirectSource(results, "direct-source", "OpenAI News", "https://openai.com/news/", "Official OpenAI announcements and research/product updates");
        addDirectSource(results, "direct-source", "Anthropic News", "https://www.anthropic.com/news", "Official Anthropic announcements and model/product updates");
        addDirectSource(results, "direct-source", "Google DeepMind Blog", "https://deepmind.google/discover/blog/", "Official Google DeepMind research and product blog");
        addDirectSource(results, "direct-source", "Google AI Blog", "https://blog.google/technology/ai/", "Official Google AI news and product updates");
        addDirectSource(results, "direct-source", "Microsoft AI Blog", "https://blogs.microsoft.com/ai/", "Official Microsoft AI announcements and analysis");
        addDirectSource(results, "direct-source", "GitHub AI & ML Blog", "https://github.blog/ai-and-ml/", "GitHub AI engineering and developer tooling updates");
        addDirectSource(results, "direct-source", "Hugging Face Blog", "https://huggingface.co/blog", "Open-source model and tooling community updates");
        addDirectSource(results, "direct-source", "The Batch", "https://www.deeplearning.ai/the-batch/", "AI industry and research newsletter from DeepLearning.AI");
    }

    private void addTechnologyNewsFallbackSources(List<JSONObject> results, boolean aiFocused) {
        addDirectSource(results, "direct-source", "Reuters Technology", "https://www.reuters.com/technology/", "Reuters technology news section");
        addDirectSource(results, "direct-source", "AP Technology", "https://apnews.com/technology", "Associated Press technology news section");
        addDirectSource(results, "direct-source", "TechCrunch", "https://techcrunch.com/", "TechCrunch startup and technology news");
        addDirectSource(results, "direct-source", "The Verge Tech", "https://www.theverge.com/tech", "The Verge technology, science, art and culture news");
        addDirectSource(results, "direct-source", "Ars Technica", "https://arstechnica.com/", "Ars Technica technology, science and policy news");
        addDirectSource(results, "direct-source", "Wired", "https://www.wired.com/", "Wired technology, business, culture and science news");
        if (aiFocused) {
            addDirectSource(results, "direct-source", "TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/", "TechCrunch AI coverage");
            addDirectSource(results, "direct-source", "The Verge AI", "https://www.theverge.com/ai-artificial-intelligence", "The Verge AI coverage");
            addDirectSource(results, "direct-source", "Ars Technica AI", "https://arstechnica.com/ai/", "Ars Technica AI coverage");
            addDirectSource(results, "direct-source", "Wired AI", "https://www.wired.com/tag/artificial-intelligence/", "Wired AI coverage");
        }
    }

    private void addDirectSource(List<JSONObject> results, String source, String title, String url, String snippet) {
        results.add(searchResult(source, title, url, snippet));
    }

    private List<JSONObject> fetchBingResults(String query, String host, String source) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://" + host + "/search?q=" + encodedQuery + "&setlang=zh-Hans";
            String html = stripNoise(fetchHtml(url, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS)));
            List<JSONObject> results = new ArrayList<>();

            String[] blocks = html.split("class=\"b_algo\"");
            for (int i = 1; i < blocks.length && results.size() < 12; i++) {
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
        log.debug("Baidu search skipped by research policy for query: {}", trimTo(query, 80));
        return List.of();
    }

    private List<JSONObject> fetchDuckDuckGoResults(String query) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String html = stripNoise(fetchHtml("https://duckduckgo.com/html/?q=" + encodedQuery, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS)));
            List<JSONObject> results = new ArrayList<>();
            Pattern pattern = Pattern.compile("<a[^>]*class=\"result__a\"[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(html);
            while (matcher.find() && results.size() < 12) {
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

    private List<JSONObject> fetchJinaSearchResults(String query, int maxResults) {
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8).replace("+", "%20");
            String text = fetchText("https://s.jina.ai/" + encodedQuery, Duration.ofSeconds(SEARCH_REQUEST_TIMEOUT_SECONDS + 2));
            return parseJinaSearchResults(text, maxResults);
        } catch (Exception e) {
            log.debug("Jina search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<JSONObject> parseJinaSearchResults(String text, int maxResults) {
        List<JSONObject> results = new ArrayList<>();
        String value = text == null ? "" : text;
        Pattern blockPattern = Pattern.compile("(?is)(?:^|\\n)Title:\\s*(.*?)\\s*\\nURL Source:\\s*(https?://\\S+)\\s*(.*?)(?=\\nTitle:|\\z)");
        Matcher blockMatcher = blockPattern.matcher(value);
        while (blockMatcher.find() && results.size() < maxResults) {
            String title = cleanText(blockMatcher.group(1));
            String url = normalizeUrl(blockMatcher.group(2));
            String snippet = cleanText(blockMatcher.group(3).replaceFirst("(?is)^\\s*Markdown Content:\\s*", ""));
            results.add(searchResult("jina-search", title, url, snippet));
        }

        if (results.size() >= maxResults) return results;

        Pattern markdownLinkPattern = Pattern.compile("\\[([^\\]\\n]{6,160})\\]\\((https?://[^\\s)]+)\\)");
        Matcher linkMatcher = markdownLinkPattern.matcher(value);
        while (linkMatcher.find() && results.size() < maxResults) {
            String title = cleanText(linkMatcher.group(1));
            String url = normalizeUrl(linkMatcher.group(2));
            results.add(searchResult("jina-search", title, url, "Jina search result"));
        }
        return results;
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
            if (isSearchRedirectDomain(extractDomain(url), url)) continue;
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
        enrichSearchResultMetadata(result);
        return result;
    }

    private void enrichSearchResultMetadata(JSONObject result) {
        if (result == null) return;
        String url = normalizeUrl(result.getString("url"));
        String domain = extractDomain(url);
        boolean articleLike = isArticleLikeUrl(url);
        boolean sectionFallback = isLikelySectionUrl(url);
        boolean reportLike = isReportLikeUrl(url);
        result.put("url", url);
        result.put("domain", domain);
        result.put("source_tier", classifySourceTier(url));
        result.put("source_type", classifySourceType(url));
        result.put("article_like", articleLike);
        result.put("report_like", reportLike);
        result.put("section_fallback", sectionFallback);
    }

    private String classifySourceTier(String url) {
        String lower = url == null ? "" : url.toLowerCase(Locale.ROOT);
        String domain = extractDomain(lower);
        if (containsAny(domain,
                "sec.gov", "federalreserve.gov", "treasury.gov", "cftc.gov", "ecb.europa.eu",
                "pbc.gov.cn", "csrc.gov.cn", "ndrc.gov.cn", "mof.gov.cn")
                || domain.endsWith(".gov") || domain.endsWith(".gov.cn")) {
            return "official_policy";
        }
        if (containsAny(domain,
                "coinshares.com", "glassnode.com", "coinmetrics.io", "kaiko.com", "cmegroup.com",
                "blackrock.com", "fidelity.com", "ark-invest.com", "coinbase.com", "binance.com")) {
            return "institution_report";
        }
        if (containsAny(domain,
                "reuters.com", "apnews.com", "bloomberg.com", "cnbc.com", "ft.com", "wsj.com",
                "bbc.com", "bbc.co.uk", "theguardian.com", "xinhuanet.com", "people.com.cn", "cls.cn")) {
            return "first_hand_news";
        }
        if (containsAny(domain,
                "coindesk.com", "theblock.co", "cointelegraph.com", "decrypt.co", "cryptoslate.com",
                "caixin.com", "yicai.com", "stcn.com", "cs.com.cn", "cnstock.com", "21jingji.com",
                "wallstreetcn.com", "nbd.com.cn", "jiemian.com", "thepaper.cn")) {
            return "specialist_news";
        }
        if (containsAny(domain,
                "news.ycombinator.com", "reddit.com", "github.com", "v2ex.com", "lobste.rs", "producthunt.com")) {
            return "community_original";
        }
        if (containsAny(lower, "arxiv.org", "nature.com", "science.org", "ieee.org", "acm.org", "pubmed.ncbi.nlm.nih.gov")) {
            return "academic_primary";
        }
        return "general_web";
    }

    private String classifySourceType(String url) {
        if (isReportLikeUrl(url)) return "report";
        if (classifySourceTier(url).equals("official_policy")) return "official";
        if (classifySourceTier(url).equals("community_original")) return "community";
        if (isArticleLikeUrl(url)) return "article";
        if (isLikelySectionUrl(url)) return "section";
        return "source";
    }

    private boolean isArticleLikeUrl(String url) {
        try {
            if (isLikelySectionUrl(url)) return false;
            URI uri = URI.create(url == null ? "" : url);
            String path = Optional.ofNullable(uri.getPath()).orElse("").toLowerCase(Locale.ROOT);
            String[] segments = Arrays.stream(path.split("/"))
                    .filter(segment -> !segment.isBlank())
                    .toArray(String[]::new);
            if (path.endsWith(".pdf")) return true;
            if (path.matches(".*20\\d{2}.*")) return true;
            if (containsAny(path, "/article/", "/story/", "/stories/", "/live/", "/posts/", "/news/", "/reports/", "/research/", "/insights/", "/analysis/")) {
                return segments.length >= 2;
            }
            return segments.length >= 3 && path.length() > 28;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isReportLikeUrl(String url) {
        String lower = url == null ? "" : url.toLowerCase(Locale.ROOT);
        return containsAny(lower, ".pdf", "report", "research", "whitepaper", "white-paper", "outlook", "insights", "analysis", "研报", "报告");
    }

    private boolean isLikelySectionUrl(String url) {
        if (url == null || url.isBlank()) return false;
        if (isHomepageLike(url)) return true;
        if (isNewsSectionPage("", url)) return true;
        try {
            URI uri = URI.create(url);
            String path = Optional.ofNullable(uri.getPath()).orElse("/")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("/+", "/")
                    .replaceAll("/$", "");
            String[] segments = Arrays.stream(path.split("/"))
                    .filter(segment -> !segment.isBlank())
                    .toArray(String[]::new);
            String joined = String.join("/", segments);
            if (segments.length <= 1 && containsAny(joined,
                    "crypto", "business", "markets", "finance", "economy", "technology", "tech", "news",
                    "world", "politics", "research", "reports", "insights", "latest", "rolling")) {
                return true;
            }
            return segments.length <= 2 && containsAny(joined,
                    "business/markets", "markets/commodities", "markets/currencies", "markets/rates-bonds",
                    "markets/crypto", "finance/markets", "news/latest", "news/finance", "category/artificial-intelligence");
        } catch (Exception e) {
            return false;
        }
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
        String tier = Optional.ofNullable(result.getString("source_tier")).orElse(classifySourceTier(url));
        if ("official_policy".equals(tier)) score += 12;
        else if ("first_hand_news".equals(tier)) score += 10;
        else if ("institution_report".equals(tier)) score += 9;
        else if ("specialist_news".equals(tier)) score += 7;
        else if ("academic_primary".equals(tier)) score += 7;
        else if ("community_original".equals(tier)) score += 4;

        if (Boolean.TRUE.equals(result.getBoolean("article_like"))) score += 10;
        if (Boolean.TRUE.equals(result.getBoolean("report_like"))) score += 8;
        if (Boolean.TRUE.equals(result.getBoolean("section_fallback"))) score -= 12;
        if (isHomepageLike(url)) score -= 14;
        if (url.contains(".gov") || url.contains(".edu") || url.contains("docs.") || url.contains("developer.") || url.contains("github.com")) score += 3;
        String source = Optional.ofNullable(result.getString("source")).orElse("");
        if ("tavily".equals(source) || "bing-cn".equals(source) || "bing-global".equals(source)
                || "jina-search".equals(source)) score += 2;
        if ("direct-source".equals(source)) score += Boolean.TRUE.equals(result.getBoolean("section_fallback")) ? 0 : 2;
        if ("baidu".equalsIgnoreCase(source) || url.contains("baidu.com")) score -= 6;
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
        if (url.contains("bing.com/ck/a") && url.contains("u=a1")) {
            String decoded = decodeBingRedirectUrl(url);
            if (!decoded.isBlank()) return decoded;
        }
        return url;
    }

    private String normalizeUrlForDedup(String raw) {
        String url = normalizeUrl(raw);
        int hash = url.indexOf('#');
        if (hash >= 0) url = url.substring(0, hash);
        return url.replaceAll("[?&](utm_[^=&]+|spm|from|source|msockid|ocid|fbclid|gclid|ref|cmpid|smid)=[^&]+", "")
                .replaceAll("[?&]$", "")
                .toLowerCase(Locale.ROOT);
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

    private String decodeBingRedirectUrl(String raw) {
        try {
            Matcher matcher = Pattern.compile("[?&]u=a1([^&]+)").matcher(raw);
            if (!matcher.find()) return "";
            String encoded = URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8)
                    .replace('-', '+')
                    .replace('_', '/');
            int padding = (4 - encoded.length() % 4) % 4;
            encoded = encoded + "=".repeat(padding);
            String decoded = new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8);
            return decoded.startsWith("http") ? decoded : "";
        } catch (Exception e) {
            return "";
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
