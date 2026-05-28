package com.ciphertool.controller;

import com.ciphertool.service.McpLabCheckService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(McpLabController.class)
class McpLabControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private McpLabCheckService mcpLabCheckService;

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
}
