package com.ciphertool.controller;

import com.ciphertool.dto.McpLabResource;
import com.ciphertool.dto.McpLabResourceBundle;
import com.ciphertool.dto.McpLabResourceImportResult;
import com.ciphertool.dto.McpLabResourceRequest;
import com.ciphertool.service.McpLabCheckService;
import com.ciphertool.service.McpLabResourceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(McpLabController.class)
class McpLabControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private McpLabCheckService mcpLabCheckService;

    @MockBean
    private McpLabResourceService mcpLabResourceService;

    @Test
    void listResourcesReturnsSharedDirectoryItems() throws Exception {
        McpLabResource resource = sampleResource("official-mcp-registry", "Official MCP Registry");
        given(mcpLabResourceService.list("mcp", "registry", 20)).willReturn(List.of(resource));

        mockMvc.perform(get("/api/mcp-lab/resources")
                        .param("category", "mcp")
                        .param("query", "registry")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Resources loaded"))
                .andExpect(jsonPath("$.data[0].id").value("official-mcp-registry"))
                .andExpect(jsonPath("$.data[0].name").value("Official MCP Registry"))
                .andExpect(jsonPath("$.data[0].category").value("mcp"));
    }

    @Test
    void addResourceSubmitsToSharedDirectory() throws Exception {
        McpLabResource resource = sampleResource("community-notion-mcp", "Community Notion MCP");
        given(mcpLabResourceService.addCommunityResource(any())).willReturn(resource);

        mockMvc.perform(post("/api/mcp-lab/resources")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Community Notion MCP",
                                  "category": "mcp",
                                  "url": "https://github.com/example/notion-mcp",
                                  "docs": "https://github.com/example/notion-mcp"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Resource added"))
                .andExpect(jsonPath("$.data.id").value("community-notion-mcp"))
                .andExpect(jsonPath("$.data.origin").value("community"));
    }

    @Test
    void searchResourcesReturnsOnlineCandidates() throws Exception {
        McpLabResource resource = sampleResource("notion-mcp-search", "Notion MCP Search");
        resource.setOrigin("search");
        given(mcpLabResourceService.searchOnline(any())).willReturn(List.of(resource));

        mockMvc.perform(post("/api/mcp-lab/resources/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "Notion MCP",
                                  "category": "mcp",
                                  "limit": 8
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Search candidates loaded"))
                .andExpect(jsonPath("$.data[0].id").value("notion-mcp-search"))
                .andExpect(jsonPath("$.data[0].origin").value("search"));
    }

    @Test
    void exportResourcesReturnsPortableSkillBundle() throws Exception {
        McpLabResourceRequest request = sampleRequest("community-codex-skill", "Community Codex Skill");
        McpLabResourceBundle bundle = new McpLabResourceBundle();
        bundle.setSchemaVersion("1.0");
        bundle.setKind("pzm-mcp-skill-resource-bundle");
        bundle.setSubmittedBy("server-export");
        bundle.setCompatibility(List.of("Codex", "Claude Code", "OpenClaw", "Hermes"));
        bundle.setResources(List.of(request));
        given(mcpLabResourceService.exportBundle("skill", null, 100)).willReturn(bundle);

        mockMvc.perform(get("/api/mcp-lab/resources/export")
                        .param("category", "skill")
                        .param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Resource bundle exported"))
                .andExpect(jsonPath("$.data.kind").value("pzm-mcp-skill-resource-bundle"))
                .andExpect(jsonPath("$.data.compatibility[0]").value("Codex"))
                .andExpect(jsonPath("$.data.resources[0].id").value("community-codex-skill"))
                .andExpect(jsonPath("$.data.resources[0].category").value("skill"));
    }

    @Test
    void importResourcesAcceptsPortableSkillBundle() throws Exception {
        McpLabResource resource = sampleResource("community-codex-skill", "Community Codex Skill");
        resource.setCategory("skill");
        resource.setCategories(List.of("skill"));
        McpLabResourceImportResult result = new McpLabResourceImportResult(
                1,
                0,
                List.of(resource),
                List.of()
        );
        given(mcpLabResourceService.importBundle(any())).willReturn(result);

        mockMvc.perform(post("/api/mcp-lab/resources/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "kind": "pzm-mcp-skill-resource-bundle",
                                  "submittedBy": "agent-upload",
                                  "compatibility": ["Codex", "Claude Code", "OpenClaw"],
                                  "resources": [
                                    {
                                      "id": "community-codex-skill",
                                      "name": "Community Codex Skill",
                                      "category": "skill",
                                      "url": "https://github.com/example/community-codex-skill",
                                      "docs": "https://github.com/example/community-codex-skill"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Resource bundle imported"))
                .andExpect(jsonPath("$.data.accepted").value(1))
                .andExpect(jsonPath("$.data.rejected").value(0))
                .andExpect(jsonPath("$.data.resources[0].id").value("community-codex-skill"));
    }

    @Test
    void healthReturnsReadOnlyCheckerStatus() throws Exception {
        given(mcpLabCheckService.health()).willReturn(Map.of(
                "status", "ready",
                "checker", "mcp-lab-read-only",
                "version", "1.1",
                "maxRedirects", 3,
                "safety", "http_https_only_no_private_hosts_no_command_execution"
        ));

        mockMvc.perform(get("/api/mcp-lab/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("MCP Lab checker is ready"))
                .andExpect(jsonPath("$.data.status").value("ready"))
                .andExpect(jsonPath("$.data.checker").value("mcp-lab-read-only"))
                .andExpect(jsonPath("$.data.version").value("1.1"))
                .andExpect(jsonPath("$.data.maxRedirects").value(3))
                .andExpect(jsonPath("$.data.safety").value("http_https_only_no_private_hosts_no_command_execution"));
    }

    private McpLabResource sampleResource(String id, String name) {
        McpLabResource resource = new McpLabResource();
        resource.setId(id);
        resource.setName(name);
        resource.setType("MCP Directory");
        resource.setCategory("mcp");
        resource.setCategories(List.of("mcp"));
        resource.setSource("Official");
        resource.setRisk("Low");
        resource.setRecommend("Official first");
        resource.setTags(List.of("mcp", "registry"));
        resource.setScenario("Find and review MCP resources.");
        resource.setUrl("https://registry.modelcontextprotocol.io/");
        resource.setDocs("https://registry.modelcontextprotocol.io/");
        resource.setTemplate("{\"mcpServers\":{}}");
        resource.setPlatforms(List.of("Codex", "Generic MCP"));
        resource.setPermissions(List.of("network"));
        resource.setInstallModes(List.of("directory"));
        resource.setAuthRequired("depends");
        resource.setMaintenance("official");
        resource.setTrustScore(90);
        resource.setLastChecked("2026-06-06");
        resource.setOrigin("community");
        resource.setSubmittedBy("test");
        resource.setCreatedAt("2026-06-06T00:00:00");
        resource.setUpdatedAt("2026-06-06T00:00:00");
        return resource;
    }

    private McpLabResourceRequest sampleRequest(String id, String name) {
        McpLabResourceRequest request = new McpLabResourceRequest();
        request.setId(id);
        request.setName(name);
        request.setType("Skill Directory");
        request.setCategory("skill");
        request.setCategories(List.of("skill"));
        request.setSource("Community");
        request.setRisk("Medium");
        request.setRecommend("Community skill bundle");
        request.setTags(List.of("skill", "codex"));
        request.setScenario("Portable skill resource for agent workflows.");
        request.setUrl("https://github.com/example/community-codex-skill");
        request.setDocs("https://github.com/example/community-codex-skill");
        request.setTemplate("community-codex-skill/\n  SKILL.md\n  scripts/");
        request.setPlatforms(List.of("Codex", "Claude Code", "OpenClaw"));
        request.setPermissions(List.of("filesRead", "scripts"));
        request.setInstallModes(List.of("sourceReview", "directory"));
        request.setAuthRequired("depends");
        request.setMaintenance("community");
        request.setTrustScore(68);
        request.setLastChecked("2026-06-06");
        request.setSubmittedBy("test");
        return request;
    }
}
