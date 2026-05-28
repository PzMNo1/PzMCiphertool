(function () {
    const resources = [
        {
            "id": "official-mcp-registry",
            "name": "Official MCP Registry",
            "type": "MCP Registry",
            "source": "Official",
            "risk": "Low",
            "recommend": "Official first",
            "tags": [
                "mcp",
                "registry",
                "official",
                "api"
            ],
            "scenario": "Search standard MCP servers and inspect registry metadata.",
            "url": "https://registry.modelcontextprotocol.io/",
            "docs": "https://github.com/modelcontextprotocol/registry",
            "template": "{\"mcpServers\":{\"server-name\":{\"command\":\"npx\",\"args\":[\"-y\",\"package-name\"]}}}",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "ChatGPT",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "registry",
                "remote"
            ],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 96,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"package-name-from-registry\"]\n    }\n  }\n}",
                    "remote": "{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"url\": \"https://your-remote-mcp.example.com\",\n      \"transport\": \"sse\"\n    }\n  }\n}"
                },
                "claude": {
                    "local": "# Claude Code MCP JSON\n# Pick a concrete server from the registry first.\n\n{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"package-name-from-registry\"]\n    }\n  }\n}",
                    "remote": "# Claude Code remote MCP JSON\n{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"url\": \"https://your-remote-mcp.example.com\",\n      \"transport\": \"sse\"\n    }\n  }\n}"
                },
                "cursor": {
                    "local": "# .cursor/mcp.json\n{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"package-name-from-registry\"]\n    }\n  }\n}",
                    "remote": "# .cursor/mcp.json\n{\n  \"mcpServers\": {\n    \"server-name\": {\n      \"url\": \"https://your-remote-mcp.example.com\",\n      \"transport\": \"sse\"\n    }\n  }\n}"
                },
                "chatgpt": {
                    "remote": "ChatGPT Developer Mode MCP App\n\nRemote server URL: https://your-remote-mcp.example.com\nTransport: follow the server documentation\nAuth: configure only after reviewing the server permissions"
                }
            }
        },
        {
            "id": "docker-mcp-catalog",
            "name": "Docker MCP Catalog",
            "type": "MCP Registry",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Best for isolated local runs",
            "tags": [
                "mcp",
                "docker",
                "catalog",
                "sandbox"
            ],
            "scenario": "Run MCP servers as Docker images with clearer isolation boundaries.",
            "url": "https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/",
            "docs": "https://docs.docker.com/ai/mcp-catalog-and-toolkit/",
            "template": "{\"mcpServers\":{\"dockerized-tool\":{\"command\":\"docker\",\"args\":[\"run\",\"--rm\",\"image-name\"]}}}",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network",
                "docker",
                "shell"
            ],
            "installModes": [
                "docker",
                "local"
            ],
            "authRequired": "depends",
            "maintenance": "official",
            "trustScore": 92,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "docker": "{\n  \"mcpServers\": {\n    \"docker-mcp-server\": {\n      \"command\": \"docker\",\n      \"args\": [\"run\", \"--rm\", \"-i\", \"docker/mcp-server-image:tag\"],\n      \"env\": {\n        \"API_KEY\": \"your-key-if-required\"\n      }\n    }\n  }\n}"
                },
                "claude": {
                    "docker": "# Claude Code MCP JSON using Docker\n{\n  \"mcpServers\": {\n    \"docker-mcp-server\": {\n      \"command\": \"docker\",\n      \"args\": [\"run\", \"--rm\", \"-i\", \"docker/mcp-server-image:tag\"]\n    }\n  }\n}"
                },
                "cursor": {
                    "docker": "# .cursor/mcp.json using Docker\n{\n  \"mcpServers\": {\n    \"docker-mcp-server\": {\n      \"command\": \"docker\",\n      \"args\": [\"run\", \"--rm\", \"-i\", \"docker/mcp-server-image:tag\"]\n    }\n  }\n}"
                }
            }
        },
        {
            "id": "openai-connectors-mcp",
            "name": "OpenAI Connectors / MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Low",
            "recommend": "API-side MCP reference",
            "tags": [
                "mcp",
                "openai",
                "api",
                "connector"
            ],
            "scenario": "Use OpenAI API documentation for connector and MCP server integration patterns.",
            "url": "https://platform.openai.com/docs/guides/tools-connectors-mcp",
            "docs": "https://platform.openai.com/docs/guides/tools-connectors-mcp",
            "template": "Use official connector docs for remote MCP configuration and tool calling constraints.",
            "platforms": [
                "OpenAI API",
                "Generic MCP"
            ],
            "permissions": [
                "network",
                "apiKey"
            ],
            "installModes": [
                "remote",
                "documentation"
            ],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 95,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "remote": "# OpenAI API MCP connector planning note\n# Use the current OpenAI connector docs before copying this into code.\n\nRemote MCP server: https://your-remote-mcp.example.com\nAuth: store secrets in environment variables\nReview: confirm allowed tools, approval behavior, and data boundaries"
                }
            }
        },
        {
            "id": "chatgpt-developer-mode-mcp",
            "name": "ChatGPT Developer Mode MCP Apps",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "ChatGPT custom app reference",
            "tags": [
                "mcp",
                "chatgpt",
                "apps",
                "connector"
            ],
            "scenario": "Reference ChatGPT custom MCP app behavior, connector boundaries, and testing flow.",
            "url": "https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt",
            "docs": "https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt",
            "template": "Remote MCP apps need explicit connector setup; local-only servers usually need a tunnel or host.",
            "platforms": [
                "ChatGPT"
            ],
            "permissions": [
                "network",
                "apiKey",
                "remote"
            ],
            "installModes": [
                "remote",
                "documentation"
            ],
            "authRequired": "depends",
            "maintenance": "official",
            "trustScore": 90,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "chatgpt": {
                    "remote": "ChatGPT Developer Mode MCP App\n\n1. Enable Developer Mode in ChatGPT.\n2. Add a new MCP App.\n3. Server URL: https://your-remote-mcp.example.com\n4. Review requested tools before authorizing.\n5. Local MCP servers need a hosted endpoint or tunnel."
                },
                "generic": {
                    "remote": "ChatGPT only connects to remote MCP apps.\n\nRemote URL: https://your-remote-mcp.example.com\nLocal server: expose through a trusted tunnel only after reviewing permissions."
                }
            }
        },
        {
            "id": "smithery",
            "name": "Smithery",
            "type": "MCP Registry",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Good discovery and install UX",
            "tags": [
                "mcp",
                "registry",
                "install",
                "tools"
            ],
            "scenario": "Find MCP servers, review tools, and use install-oriented workflows.",
            "url": "https://smithery.ai/",
            "docs": "https://smithery.ai/docs/concepts/registry_search_servers",
            "template": "{\"mcpServers\":{\"smithery-server\":{\"command\":\"npx\",\"args\":[\"-y\",\"@smithery/cli\",\"run\",\"server-id\"]}}}",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network",
                "shell",
                "installScript"
            ],
            "installModes": [
                "cli",
                "local",
                "remote"
            ],
            "authRequired": "depends",
            "maintenance": "community",
            "trustScore": 78,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "{\n  \"mcpServers\": {\n    \"smithery-server\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@smithery/cli\", \"run\", \"server-id\"]\n    }\n  }\n}",
                    "remote": "{\n  \"mcpServers\": {\n    \"smithery-remote\": {\n      \"url\": \"https://your-smithery-or-hosted-mcp.example.com\",\n      \"transport\": \"sse\"\n    }\n  }\n}"
                },
                "claude": {
                    "local": "# Claude Code MCP JSON\n{\n  \"mcpServers\": {\n    \"smithery-server\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@smithery/cli\", \"run\", \"server-id\"]\n    }\n  }\n}"
                },
                "cursor": {
                    "local": "# .cursor/mcp.json\n{\n  \"mcpServers\": {\n    \"smithery-server\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@smithery/cli\", \"run\", \"server-id\"]\n    }\n  }\n}"
                }
            }
        },
        {
            "id": "glama",
            "name": "Glama",
            "type": "MCP Registry",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Good inspector and schema view",
            "tags": [
                "mcp",
                "inspector",
                "gateway",
                "schema"
            ],
            "scenario": "Inspect MCP server tools and schemas before connecting them.",
            "url": "https://glama.ai/",
            "docs": "https://glama.ai/mcp",
            "template": "Review server tools and schemas before adding local credentials.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network",
                "remote"
            ],
            "installModes": [
                "remote",
                "inspector"
            ],
            "authRequired": "depends",
            "maintenance": "community",
            "trustScore": 78,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "remote": "{\n  \"mcpServers\": {\n    \"glama-reviewed-server\": {\n      \"url\": \"https://your-reviewed-mcp-server.example.com\",\n      \"transport\": \"sse\"\n    }\n  }\n}\n\n# Use Glama to inspect tools/schema first, then replace the URL above with the reviewed server endpoint."
                }
            }
        },
        {
            "id": "pulsemcp",
            "name": "PulseMCP",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Broad ecosystem scan",
            "tags": [
                "mcp",
                "directory",
                "news",
                "community"
            ],
            "scenario": "Browse MCP servers by category such as GitHub, Figma, Notion, browser, database.",
            "url": "https://www.pulsemcp.com/servers",
            "docs": "https://www.pulsemcp.com/",
            "template": "Use as discovery, then verify package source and permissions manually.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 74,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "# PulseMCP discovery review\n\n1. Open PulseMCP and choose one concrete server.\n2. Follow the listing to the upstream repository or package docs.\n3. Verify maintainer, license, recent commits, open issues, and requested permissions.\n4. Copy only the upstream MCP JSON or command after review.\n5. Test with read-only credentials before adding write permissions."
                }
            }
        },
        {
            "id": "mcp-atlas",
            "name": "MCP Atlas",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Meta search across directories",
            "tags": [
                "mcp",
                "search",
                "aggregator"
            ],
            "scenario": "Search across multiple MCP sources from one place.",
            "url": "https://www.mcp-atlas.com/",
            "docs": "https://www.mcp-atlas.com/",
            "template": "Use aggregator results as leads, not as trust signals.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 72,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "# MCP Atlas aggregator review\n\n1. Use MCP Atlas only as a search entry point.\n2. Pick one result and open its original upstream source.\n3. Compare package name, repository URL, docs, and latest release across sources.\n4. Reject entries without a clear upstream project or permission description.\n5. Paste the final MCP client config only from the reviewed upstream docs."
                }
            }
        },
        {
            "id": "mcplist",
            "name": "MCPList",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Simple category browsing",
            "tags": [
                "mcp",
                "directory",
                "reference",
                "community"
            ],
            "scenario": "Browse reference, official, and community MCP servers.",
            "url": "https://www.mcplist.ai/",
            "docs": "https://www.mcplist.ai/",
            "template": "Check upstream repository and runtime permissions before install.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 70,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "# MCPList candidate review\n\n1. Browse the category and select a concrete MCP server.\n2. Open the upstream repository, package page, and installation docs.\n3. Confirm whether it runs local commands, reads files, calls APIs, or requires secrets.\n4. Prefer projects with clear examples, license, and recent maintenance.\n5. Add the server to your MCP client only after replacing all placeholders with upstream values."
                }
            }
        },
        {
            "id": "safemcp",
            "name": "SafeMCP",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Useful for initial risk triage",
            "tags": [
                "mcp",
                "safety",
                "scoring",
                "directory"
            ],
            "scenario": "Use scoring and classification as a first pass before manual review.",
            "url": "https://safemcp.info/",
            "docs": "https://safemcp.info/",
            "template": "Treat scores as advisory; still inspect code and requested permissions.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory",
                "riskReview"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 76,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "# SafeMCP risk triage\n\n1. Use the SafeMCP score as a first-pass signal, not as install approval.\n2. Read the upstream repository and any install scripts before connecting it.\n3. Map requested tools to actual permissions: files, shell, browser, database, network, secrets.\n4. Start with a test account and read-only scopes.\n5. Keep the SafeMCP result with your local review notes for later re-checks."
                }
            }
        },
        {
            "id": "awesome-mcp-servers",
            "name": "awesome-mcp-servers",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Good GitHub curated list",
            "tags": [
                "mcp",
                "github",
                "curated",
                "list"
            ],
            "scenario": "Find community MCP projects and compare maintenance status.",
            "url": "https://github.com/appcypher/awesome-mcp-servers",
            "docs": "https://github.com/appcypher/awesome-mcp-servers",
            "template": "Prefer projects with active commits, issues, docs, and clear license.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory",
                "sourceReview"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 73,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "local": "# awesome-mcp-servers source review\n\n1. Treat the list as discovery, not as an installer.\n2. Open the selected project repository directly.\n3. Check README, license, commits, releases, issues, and dependency/install scripts.\n4. Confirm the exact MCP transport and client JSON from the project docs.\n5. Run the server in a minimal test workspace before adding production credentials."
                }
            }
        }
    ];

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && group.id !== 'mcp');
    groups.push({
        id: 'mcp',
        resources
    });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
