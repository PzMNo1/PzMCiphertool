package com.ciphertool.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ciphertool.dto.McpLabResource;
import com.ciphertool.dto.McpLabResourceBundle;
import com.ciphertool.dto.McpLabResourceImportResult;
import com.ciphertool.dto.McpLabResourceRequest;
import com.ciphertool.dto.McpLabResourceSearchRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class McpLabResourceService {

    private static final DateTimeFormatter STORAGE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int DEFAULT_LIMIT = 500;
    private static final int MAX_LIMIT = 1000;
    private static final int MAX_SEARCH_RESULTS = 12;
    private static final int MAX_IMPORT_RESOURCES = 200;

    private static final Set<String> RESOURCE_TYPES = Set.of(
            "MCP Registry",
            "MCP Directory",
            "MCP Documentation",
            "Skill Registry",
            "Skill Standard",
            "Skill Directory",
            "Plugin Marketplace"
    );
    private static final Set<String> CATEGORIES = Set.of(
            "mcp", "skill", "prompt", "workflow", "devTools", "dataApis", "security", "automation", "other"
    );
    private static final Set<String> SOURCES = Set.of("Official", "Community");
    private static final Set<String> RISKS = Set.of("Low", "Medium");
    private static final Set<String> PERMISSIONS = Set.of(
            "network", "apiKey", "filesRead", "filesWrite", "shell", "browser",
            "database", "docker", "remote", "installScript", "scripts"
    );
    private static final Set<String> INSTALL_MODES = Set.of(
            "registry", "remote", "docker", "local", "cli", "directory", "documentation",
            "inspector", "riskReview", "sourceReview", "marketplace"
    );
    private static final Set<String> MAINTENANCE = Set.of("official", "community", "unknown");
    private static final Set<String> AUTH = Set.of("true", "false", "depends");
    private static final Set<String> OFFICIAL_HOST_HINTS = Set.of(
            "modelcontextprotocol.io", "registry.modelcontextprotocol.io", "openai.com", "platform.openai.com",
            "github.com/modelcontextprotocol", "github.com/openai", "github.com/cloudflare", "developers.figma.com",
            "canva.dev", "linear.app", "atlassian.com", "stripe.com", "github.com/stripe",
            "github.com/makenotion", "github.com/supabase-community", "github.com/neondatabase",
            "github.com/github", "learn.microsoft.com", "docs.docker.com", "docs.firecrawl.dev"
    );

    private final JdbcTemplate jdbcTemplate;
    private final WebCrawlerService webCrawlerService;
    private final McpLabCheckService mcpLabCheckService;

    private final RowMapper<McpLabResource> resourceMapper = (rs, rowNum) -> {
        McpLabResource item = new McpLabResource();
        item.setId(rs.getString("id"));
        item.setName(rs.getString("name"));
        item.setType(rs.getString("resource_type"));
        item.setCategory(rs.getString("category"));
        item.setCategories(readStringList(rs.getString("categories_json")));
        item.setSource(rs.getString("source"));
        item.setRisk(rs.getString("risk"));
        item.setRecommend(rs.getString("recommend"));
        item.setTags(readStringList(rs.getString("tags_json")));
        item.setScenario(rs.getString("scenario"));
        item.setUrl(rs.getString("url"));
        item.setDocs(rs.getString("docs"));
        item.setTemplate(rs.getString("template"));
        item.setPlatforms(readStringList(rs.getString("platforms_json")));
        item.setPermissions(readStringList(rs.getString("permissions_json")));
        item.setInstallModes(readStringList(rs.getString("install_modes_json")));
        item.setAuthRequired(rs.getString("auth_required"));
        item.setMaintenance(rs.getString("maintenance"));
        item.setTrustScore(rs.getInt("trust_score"));
        item.setLastChecked(rs.getString("last_checked"));
        item.setOrigin(rs.getString("origin"));
        item.setSubmittedBy(rs.getString("submitted_by"));
        item.setCreatedAt(rs.getString("created_at"));
        item.setUpdatedAt(rs.getString("updated_at"));
        return item;
    };

    @PostConstruct
    public void seedDefaults() {
        ensureSchema();
        ClassPathResource resource = new ClassPathResource("mcp-lab-resources.json");
        if (!resource.exists()) {
            return;
        }
        try (InputStream stream = resource.getInputStream()) {
            String json = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            JSONArray array = JSON.parseArray(json);
            for (Object value : array) {
                try {
                    if (value instanceof JSONObject object) {
                        upsertSeed(toRequest(object));
                    }
                } catch (Exception ignored) {
                    // Keep later seed entries usable if one resource is malformed or temporarily unreachable.
                }
            }
        } catch (Exception e) {
            // A broken seed file should not block the whole application from booting.
        }
    }

    private void ensureSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS mcp_lab_resources (
                    id VARCHAR(96) PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    resource_type VARCHAR(64) NOT NULL,
                    category VARCHAR(32) NOT NULL,
                    categories_json VARCHAR(512) NOT NULL DEFAULT '[]',
                    source VARCHAR(32) NOT NULL,
                    risk VARCHAR(32) NOT NULL,
                    recommend VARCHAR(120) NOT NULL DEFAULT '',
                    tags_json VARCHAR(1024) NOT NULL DEFAULT '[]',
                    scenario CLOB NOT NULL,
                    url VARCHAR(2048) NOT NULL,
                    docs VARCHAR(2048) NOT NULL DEFAULT '',
                    template CLOB NOT NULL,
                    platforms_json VARCHAR(1024) NOT NULL DEFAULT '[]',
                    permissions_json VARCHAR(1024) NOT NULL DEFAULT '[]',
                    install_modes_json VARCHAR(1024) NOT NULL DEFAULT '[]',
                    auth_required VARCHAR(16) NOT NULL DEFAULT 'depends',
                    maintenance VARCHAR(32) NOT NULL DEFAULT 'unknown',
                    trust_score INT NOT NULL DEFAULT 60,
                    last_checked VARCHAR(32) NOT NULL DEFAULT '',
                    origin VARCHAR(32) NOT NULL DEFAULT 'community',
                    submitted_by VARCHAR(320) NOT NULL DEFAULT '',
                    created_at VARCHAR(40) NOT NULL,
                    updated_at VARCHAR(40) NOT NULL,
                    deleted BOOLEAN NOT NULL DEFAULT FALSE
                )
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_category ON mcp_lab_resources(category, trust_score)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_origin ON mcp_lab_resources(origin, created_at)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_deleted ON mcp_lab_resources(deleted, updated_at)");
    }

    public List<McpLabResource> list(String category, String query, Integer limit) {
        int safeLimit = Math.max(1, Math.min(limit == null ? DEFAULT_LIMIT : limit, MAX_LIMIT));
        String normalizedCategory = normalizeCategory(category);
        String normalizedQuery = blank(query).toLowerCase(Locale.ROOT);
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("select * from mcp_lab_resources where deleted = false");
        if (!normalizedCategory.isBlank()) {
            sql.append(" and (category = ? or lower(categories_json) like ?)");
            args.add(normalizedCategory);
            args.add("%\"" + normalizedCategory.toLowerCase(Locale.ROOT) + "\"%");
        }
        if (!normalizedQuery.isBlank()) {
            sql.append(" and (lower(name) like ? or lower(resource_type) like ? or lower(tags_json) like ? or lower(scenario) like ? or lower(url) like ?)");
            String like = "%" + normalizedQuery + "%";
            args.add(like);
            args.add(like);
            args.add(like);
            args.add(like);
            args.add(like);
        }
        sql.append(" order by trust_score desc, name asc limit ?");
        args.add(safeLimit);
        return jdbcTemplate.query(sql.toString(), resourceMapper, args.toArray());
    }

    public McpLabResource addCommunityResource(McpLabResourceRequest request) {
        McpLabResource item = normalize(request, "community");
        String id = item.getId();
        if (id.isBlank()) {
            id = uniqueId(slug(item.getName()));
            item.setId(id);
        }
        if (isSeedResource(id)) {
            item.setId(uniqueId(id + "-community"));
        }
        upsert(item);
        return get(item.getId());
    }

    public McpLabResourceBundle exportBundle(String category, String query, Integer limit) {
        McpLabResourceBundle bundle = new McpLabResourceBundle();
        bundle.setExportedAt(now());
        bundle.setSubmittedBy("server-export");
        bundle.setCompatibility(List.of(
                "Codex",
                "Claude Code",
                "OpenClaw",
                "Hermes",
                "Cursor",
                "Generic MCP"
        ));
        bundle.setResources(list(category, query, limit).stream()
                .map(this::toRequest)
                .toList());
        return bundle;
    }

    public McpLabResourceImportResult importBundle(McpLabResourceBundle bundle) {
        if (bundle == null || bundle.getResources() == null || bundle.getResources().isEmpty()) {
            throw new IllegalArgumentException("导入包必须包含 resources 数组");
        }
        if (bundle.getResources().size() > MAX_IMPORT_RESOURCES) {
            throw new IllegalArgumentException("一次最多导入 " + MAX_IMPORT_RESOURCES + " 个资源");
        }

        McpLabResourceImportResult result = new McpLabResourceImportResult();
        List<McpLabResource> accepted = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        String submittedBy = firstNonBlank(bundle.getSubmittedBy(), "bundle-import");

        int index = 0;
        for (McpLabResourceRequest resource : bundle.getResources()) {
            index++;
            try {
                resource.setSubmittedBy(firstNonBlank(resource.getSubmittedBy(), submittedBy));
                accepted.add(addCommunityResource(resource));
            } catch (Exception e) {
                errors.add("第 " + index + " 项导入失败：" + firstNonBlank(e.getMessage(), "资源格式不正确"));
            }
        }

        result.setAccepted(accepted.size());
        result.setRejected(errors.size());
        result.setResources(accepted);
        result.setErrors(errors);
        return result;
    }

    public List<McpLabResource> searchOnline(McpLabResourceSearchRequest request) {
        String query = blank(request.getQuery());
        String category = normalizeCategory(request.getCategory());
        int limit = Math.max(1, Math.min(request.getLimit() == null ? 8 : request.getLimit(), MAX_SEARCH_RESULTS));
        String expandedQuery = buildSearchQuery(query, category);
        String raw = webCrawlerService.searchUrls(expandedQuery);
        JSONArray array = JSON.parseArray(raw);
        List<McpLabResource> candidates = new ArrayList<>();
        Set<String> seenUrls = new LinkedHashSet<>();
        for (Object value : array) {
            if (!(value instanceof JSONObject object)) continue;
            String url = firstNonBlank(object.getString("url"), object.getString("link"));
            String title = firstNonBlank(object.getString("title"), object.getString("name"));
            String snippet = firstNonBlank(object.getString("snippet"), object.getString("description"));
            if (url.isBlank() || title.isBlank() || !seenUrls.add(url)) continue;
            if (!isPublicHttpUrl(url)) continue;
            McpLabResource item = candidateFromSearch(title, snippet, url, category);
            candidates.add(item);
            if (candidates.size() >= limit) break;
        }
        return candidates;
    }

    private void upsertSeed(McpLabResourceRequest request) {
        McpLabResource item = normalize(request, "seed");
        if (item.getId().isBlank()) {
            item.setId(slug(item.getName()));
        }
        upsert(item);
    }

    private boolean isSeedResource(String id) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from mcp_lab_resources where id = ? and origin = 'seed'",
                Integer.class,
                id
        );
        return count != null && count > 0;
    }

    private McpLabResource get(String id) {
        List<McpLabResource> matches = jdbcTemplate.query(
                "select * from mcp_lab_resources where id = ? and deleted = false",
                resourceMapper,
                id
        );
        if (matches.isEmpty()) {
            throw new IllegalArgumentException("资源不存在");
        }
        return matches.get(0);
    }

    private void upsert(McpLabResource item) {
        String now = now();
        int updated = jdbcTemplate.update(
                "update mcp_lab_resources set name = ?, resource_type = ?, category = ?, categories_json = ?, source = ?, risk = ?, " +
                        "recommend = ?, tags_json = ?, scenario = ?, url = ?, docs = ?, template = ?, platforms_json = ?, permissions_json = ?, " +
                        "install_modes_json = ?, auth_required = ?, maintenance = ?, trust_score = ?, last_checked = ?, origin = ?, submitted_by = ?, " +
                        "updated_at = ?, deleted = false where id = ?",
                item.getName(),
                item.getType(),
                item.getCategory(),
                writeJson(item.getCategories()),
                item.getSource(),
                item.getRisk(),
                item.getRecommend(),
                writeJson(item.getTags()),
                item.getScenario(),
                item.getUrl(),
                item.getDocs(),
                item.getTemplate(),
                writeJson(item.getPlatforms()),
                writeJson(item.getPermissions()),
                writeJson(item.getInstallModes()),
                item.getAuthRequired(),
                item.getMaintenance(),
                item.getTrustScore(),
                item.getLastChecked(),
                item.getOrigin(),
                item.getSubmittedBy(),
                now,
                item.getId()
        );
        if (updated > 0) {
            return;
        }
        jdbcTemplate.update(
                "insert into mcp_lab_resources (id, name, resource_type, category, categories_json, source, risk, recommend, tags_json, scenario, " +
                        "url, docs, template, platforms_json, permissions_json, install_modes_json, auth_required, maintenance, trust_score, " +
                        "last_checked, origin, submitted_by, created_at, updated_at, deleted) " +
                        "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)",
                item.getId(),
                item.getName(),
                item.getType(),
                item.getCategory(),
                writeJson(item.getCategories()),
                item.getSource(),
                item.getRisk(),
                item.getRecommend(),
                writeJson(item.getTags()),
                item.getScenario(),
                item.getUrl(),
                item.getDocs(),
                item.getTemplate(),
                writeJson(item.getPlatforms()),
                writeJson(item.getPermissions()),
                writeJson(item.getInstallModes()),
                item.getAuthRequired(),
                item.getMaintenance(),
                item.getTrustScore(),
                item.getLastChecked(),
                item.getOrigin(),
                item.getSubmittedBy(),
                now,
                now
        );
    }

    private McpLabResource normalize(McpLabResourceRequest request, String origin) {
        String name = trim(request.getName(), 120);
        String url = trim(request.getUrl(), 2048);
        String docs = trim(firstNonBlank(request.getDocs(), url), 2048);
        if (name.isBlank()) {
            throw new IllegalArgumentException("资源名称不能为空");
        }
        if (url.isBlank()) {
            throw new IllegalArgumentException("URL不能为空");
        }
        validatePublicUrl(url, "seed".equals(origin));
        if (!docs.isBlank()) {
            validatePublicUrl(docs, "seed".equals(origin));
        }

        String category = normalizeCategory(request.getCategory());
        List<String> categories = normalizeCategoryList(request.getCategories(), category);
        if (category.isBlank()) {
            category = categories.isEmpty() ? inferCategory(name, request.getType(), request.getTags(), request.getScenario(), url) : categories.get(0);
        }
        if (categories.isEmpty()) {
            categories = List.of(category);
        }

        String source = choice(request.getSource(), SOURCES, inferSource(url));
        String maintenance = choice(request.getMaintenance(), MAINTENANCE, source.equals("Official") ? "official" : "community");

        McpLabResource item = new McpLabResource();
        item.setId(normalizeId(request.getId(), name));
        item.setName(name);
        item.setType(choice(request.getType(), RESOURCE_TYPES, category.equals("skill") ? "Skill Directory" : "MCP Directory"));
        item.setCategory(category);
        item.setCategories(categories);
        item.setSource(source);
        item.setRisk(choice(request.getRisk(), RISKS, source.equals("Official") ? "Low" : "Medium"));
        item.setRecommend(trim(firstNonBlank(request.getRecommend(), source.equals("Official") ? "官方优先入口" : "社区资源候选"), 120));
        item.setTags(normalizeList(request.getTags(), List.of(category), null, 16, 32));
        item.setScenario(trim(firstNonBlank(request.getScenario(), "社区提交的 Skill / MCP 候选资源。用途：补充共享目录中的可接入工具或技能。益处：团队成员可以复用同一份资源入口；接入前仍需打开上游来源检查权限、脚本和维护状态。"), 600));
        item.setUrl(url);
        item.setDocs(docs);
        item.setTemplate(trim(firstNonBlank(request.getTemplate(), defaultTemplate(category, name)), 5000));
        item.setPlatforms(normalizeList(request.getPlatforms(), List.of("Codex", "Claude", "Cursor", "Generic MCP"), null, 12, 40));
        item.setPermissions(normalizeList(request.getPermissions(), List.of("network"), PERMISSIONS, 12, 40));
        item.setInstallModes(normalizeList(request.getInstallModes(), List.of(category.equals("skill") ? "sourceReview" : "directory"), INSTALL_MODES, 12, 40));
        item.setAuthRequired(choice(request.getAuthRequired(), AUTH, "depends"));
        item.setMaintenance(maintenance);
        item.setTrustScore(clampScore(request.getTrustScore(), source.equals("Official") ? 84 : 68));
        item.setLastChecked(trim(firstNonBlank(request.getLastChecked(), LocalDate.now().toString()), 32));
        item.setOrigin(origin);
        item.setSubmittedBy(trim(firstNonBlank(request.getSubmittedBy(), "anonymous"), 320));
        return item;
    }

    private McpLabResource candidateFromSearch(String title, String snippet, String url, String requestedCategory) {
        String category = requestedCategory.isBlank()
                ? inferCategory(title, "", List.of(), snippet, url)
                : requestedCategory;
        String source = inferSource(url);
        McpLabResource item = new McpLabResource();
        item.setId(uniqueId(slug(title)));
        item.setName(trim(cleanTitle(title), 120));
        item.setType(category.equals("skill") ? "Skill Directory" : category.equals("mcp") ? "MCP Directory" : "Skill Directory");
        item.setCategory(category);
        item.setCategories(List.of(category));
        item.setSource(source);
        item.setRisk(source.equals("Official") ? "Low" : "Medium");
        item.setRecommend(source.equals("Official") ? "官方优先入口" : "联网搜索候选");
        item.setTags(normalizeList(List.of(category, hostToken(url), "search"), List.of(category), null, 8, 32));
        item.setScenario(searchCandidateScenario(category, snippet));
        item.setUrl(url);
        item.setDocs(url);
        item.setTemplate(defaultTemplate(category, title));
        item.setPlatforms(List.of("Codex", "Claude", "Cursor", "Generic MCP"));
        item.setPermissions(List.of("network"));
        item.setInstallModes(List.of("directory", "sourceReview"));
        item.setAuthRequired("depends");
        item.setMaintenance(source.equals("Official") ? "official" : "unknown");
        item.setTrustScore(source.equals("Official") ? 76 : 58);
        item.setLastChecked(LocalDate.now().toString());
        item.setOrigin("search");
        item.setSubmittedBy("search");
        item.setCreatedAt("");
        item.setUpdatedAt("");
        return item;
    }

    private McpLabResourceRequest toRequest(JSONObject object) {
        McpLabResourceRequest request = new McpLabResourceRequest();
        request.setId(object.getString("id"));
        request.setName(object.getString("name"));
        request.setType(object.getString("type"));
        request.setCategory(object.getString("category"));
        request.setCategories(readJsonStringList(object, "categories"));
        request.setSource(object.getString("source"));
        request.setRisk(object.getString("risk"));
        request.setRecommend(object.getString("recommend"));
        request.setTags(readJsonStringList(object, "tags"));
        request.setScenario(object.getString("scenario"));
        request.setUrl(object.getString("url"));
        request.setDocs(object.getString("docs"));
        request.setTemplate(object.getString("template"));
        request.setPlatforms(readJsonStringList(object, "platforms"));
        request.setPermissions(readJsonStringList(object, "permissions"));
        request.setInstallModes(readJsonStringList(object, "installModes"));
        request.setAuthRequired(object.getString("authRequired"));
        request.setMaintenance(object.getString("maintenance"));
        request.setTrustScore(object.getInteger("trustScore"));
        request.setLastChecked(object.getString("lastChecked"));
        request.setSubmittedBy("seed");
        return request;
    }

    private McpLabResourceRequest toRequest(McpLabResource item) {
        McpLabResourceRequest request = new McpLabResourceRequest();
        request.setId(item.getId());
        request.setName(item.getName());
        request.setType(item.getType());
        request.setCategory(item.getCategory());
        request.setCategories(item.getCategories());
        request.setSource(item.getSource());
        request.setRisk(item.getRisk());
        request.setRecommend(item.getRecommend());
        request.setTags(item.getTags());
        request.setScenario(item.getScenario());
        request.setUrl(item.getUrl());
        request.setDocs(item.getDocs());
        request.setTemplate(item.getTemplate());
        request.setPlatforms(item.getPlatforms());
        request.setPermissions(item.getPermissions());
        request.setInstallModes(item.getInstallModes());
        request.setAuthRequired(item.getAuthRequired());
        request.setMaintenance(item.getMaintenance());
        request.setTrustScore(item.getTrustScore());
        request.setLastChecked(item.getLastChecked());
        request.setSubmittedBy(item.getSubmittedBy());
        return request;
    }

    private String buildSearchQuery(String query, String category) {
        String base = query.trim();
        if ("mcp".equals(category)) {
            return base + " MCP server registry docs GitHub";
        }
        if ("skill".equals(category)) {
            return base + " agent skill SKILL.md repository";
        }
        if ("security".equals(category)) {
            return base + " MCP skill security audit agent tool";
        }
        return base + " MCP server agent skill tool";
    }

    private String searchCandidateScenario(String category, String snippet) {
        String summary = trim(snippet, 220);
        String use = switch (category) {
            case "skill" -> "用途：作为 Skill 候选资源，用来沉淀可复用的 Agent 工作流或技能目录。";
            case "security" -> "用途：作为安全审查候选资源，用来辅助权限评估、漏洞扫描或风险判断。";
            case "automation" -> "用途：作为自动化候选资源，用来连接浏览器、网页、办公或跨应用流程。";
            case "dataApis" -> "用途：作为 API / 数据候选资源，用来连接数据库、云服务或第三方接口。";
            case "workflow" -> "用途：作为工作流候选资源，用来拆解、复用或编排多步骤任务。";
            default -> "用途：作为 MCP 候选资源，用来扩展 Agent 可调用的外部工具、数据源或服务。";
        };
        String benefit = "益处：先进入候选列表再人工确认，可以提升资源发现效率，同时避免未经审查的来源直接入库。";
        String source = summary.isBlank() ? "" : " 搜索摘要：" + summary;
        return trim(use + benefit + source, 600);
    }

    private String inferCategory(String name, String type, List<String> tags, String scenario, String url) {
        String text = String.join(" ",
                blank(name),
                blank(type),
                blank(scenario),
                blank(url),
                String.join(" ", tags == null ? List.of() : tags)
        ).toLowerCase(Locale.ROOT);
        if (containsAny(text, "mcp", "modelcontextprotocol")) return "mcp";
        if (containsAny(text, "skill", "skill.md", "codex", "claude")) return "skill";
        if (containsAny(text, "prompt", "提示词")) return "prompt";
        if (containsAny(text, "workflow", "automation template", "n8n", "zapier")) return "workflow";
        if (containsAny(text, "security", "audit", "codeql", "semgrep", "secrets", "risk")) return "security";
        if (containsAny(text, "browser", "scrape", "crawl", "automation")) return "automation";
        if (containsAny(text, "api", "database", "postgres", "connector", "data")) return "dataApis";
        if (containsAny(text, "github", "vscode", "cursor", "cli", "dev", "code")) return "devTools";
        return "other";
    }

    private List<String> normalizeCategoryList(List<String> values, String primary) {
        LinkedHashSet<String> list = new LinkedHashSet<>();
        if (!primary.isBlank()) list.add(primary);
        if (values != null) {
            values.stream()
                    .map(this::normalizeCategory)
                    .filter(value -> !value.isBlank())
                    .limit(6)
                    .forEach(list::add);
        }
        return new ArrayList<>(list);
    }

    private List<String> normalizeList(List<String> values, List<String> fallback, Set<String> allowed, int maxItems, int maxLength) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (values != null) {
            for (String value : values) {
                for (String part : blank(value).split("[,，、/\\n]+")) {
                    String item = trim(part, maxLength);
                    if (item.isBlank()) continue;
                    if (allowed != null && !allowed.contains(item)) continue;
                    result.add(item);
                    if (result.size() >= maxItems) break;
                }
                if (result.size() >= maxItems) break;
            }
        }
        if (result.isEmpty() && fallback != null) {
            fallback.stream()
                    .map(value -> trim(value, maxLength))
                    .filter(value -> !value.isBlank())
                    .filter(value -> allowed == null || allowed.contains(value))
                    .limit(maxItems)
                    .forEach(result::add);
        }
        return new ArrayList<>(result);
    }

    private void validatePublicUrl(String url, boolean seedMode) {
        if (seedMode) {
            validatePublicUrlShape(url);
            return;
        }
        try {
            mcpLabCheckService.safeHttpUri(url);
        } catch (Exception e) {
            throw new IllegalArgumentException("资源链接不可用：" + e.getMessage());
        }
    }

    private void validatePublicUrlShape(String rawUrl) {
        try {
            java.net.URI uri = java.net.URI.create(blank(rawUrl));
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) {
                throw new IllegalArgumentException("仅支持 http/https URL");
            }
            if (uri.getUserInfo() != null) {
                throw new IllegalArgumentException("URL不能包含用户信息");
            }
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.isBlank()) {
                throw new IllegalArgumentException("URL缺少主机名");
            }
            if ("localhost".equals(host) || host.endsWith(".localhost")
                    || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.")
                    || host.matches("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*")) {
                throw new IllegalArgumentException("不允许检测内网或本地地址");
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("资源链接不可用：" + e.getMessage());
        }
    }

    private boolean isPublicHttpUrl(String url) {
        try {
            mcpLabCheckService.safeHttpUri(url);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String normalizeCategory(String value) {
        String normalized = blank(value).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
        Map<String, String> aliases = Map.ofEntries(
                Map.entry("mcp", "mcp"),
                Map.entry("mcptools", "mcp"),
                Map.entry("skill", "skill"),
                Map.entry("skills", "skill"),
                Map.entry("prompt", "prompt"),
                Map.entry("prompts", "prompt"),
                Map.entry("workflow", "workflow"),
                Map.entry("workflows", "workflow"),
                Map.entry("devtools", "devTools"),
                Map.entry("developer", "devTools"),
                Map.entry("dataapis", "dataApis"),
                Map.entry("dataapi", "dataApis"),
                Map.entry("data", "dataApis"),
                Map.entry("apis", "dataApis"),
                Map.entry("security", "security"),
                Map.entry("automation", "automation"),
                Map.entry("other", "other")
        );
        String category = aliases.getOrDefault(normalized, "");
        return CATEGORIES.contains(category) ? category : "";
    }

    private String normalizeId(String value, String name) {
        String id = slug(firstNonBlank(value, name));
        return id.length() > 80 ? id.substring(0, 80) : id;
    }

    private String uniqueId(String prefix) {
        String base = slug(prefix);
        if (base.isBlank()) base = "resource";
        base = base.length() > 48 ? base.substring(0, 48) : base;
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String slug(String value) {
        return blank(value).toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_-]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private String choice(String value, Set<String> allowed, String fallback) {
        String normalized = trim(value, 80);
        return allowed.contains(normalized) ? normalized : fallback;
    }

    private int clampScore(Integer value, int fallback) {
        int score = value == null ? fallback : value;
        return Math.max(0, Math.min(100, score));
    }

    private String inferSource(String url) {
        String lower = blank(url).toLowerCase(Locale.ROOT);
        return OFFICIAL_HOST_HINTS.stream().anyMatch(lower::contains) ? "Official" : "Community";
    }

    private String defaultTemplate(String category, String name) {
        if ("skill".equals(category)) {
            return trim(name, 48) + "/\n  SKILL.md\n  scripts/\n  references/\n\nReview SKILL.md, scripts, references, activation rules, and permissions before enabling.";
        }
        return "{\"mcpServers\":{\"server-name\":{\"command\":\"npx\",\"args\":[\"-y\",\"package-name\"]}}}\n\nReplace placeholders only with values from upstream docs.";
    }

    private String cleanTitle(String title) {
        return blank(title)
                .replaceAll("\\s*[-|:].*(Bing|Google|DuckDuckGo|Search).*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String hostToken(String url) {
        try {
            String host = java.net.URI.create(url).getHost();
            return host == null ? "web" : host.toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "").split("\\.")[0];
        } catch (Exception e) {
            return "web";
        }
    }

    private boolean containsAny(String value, String... needles) {
        String haystack = value == null ? "" : value;
        return Arrays.stream(needles).anyMatch(haystack::contains);
    }

    private String writeJson(List<String> values) {
        return JSON.toJSONString(values == null ? List.of() : values);
    }

    private List<String> readJsonStringList(JSONObject object, String key) {
        if (object == null || key == null || key.isBlank()) {
            return List.of();
        }
        Object value = object.get(key);
        if (value instanceof JSONArray array) {
            List<String> result = new ArrayList<>();
            for (Object item : array) {
                String text = trim(item == null ? "" : String.valueOf(item), 80);
                if (!text.isBlank()) {
                    result.add(text);
                }
            }
            return result;
        }
        return readStringList(value == null ? "" : String.valueOf(value));
    }

    private List<String> readStringList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            if (raw.trim().startsWith("[")) {
                return JSON.parseArray(raw, String.class);
            }
        } catch (Exception ignored) {
            // Fall back to delimiter parsing.
        }
        return Pattern.compile("[,，、/\\n]+")
                .splitAsStream(raw)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String trim(String value, int max) {
        String text = blank(value);
        return text.length() <= max ? text : text.substring(0, max);
    }

    private String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private String now() {
        return LocalDateTime.now().format(STORAGE_TIME);
    }
}
