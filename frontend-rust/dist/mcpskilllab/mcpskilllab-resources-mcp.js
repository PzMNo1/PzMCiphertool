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

    const reviewTemplate = name => `# ${name} MCP review\n\n1. Open the official docs or upstream repository first.\n2. Confirm transport, auth flow, requested tools, and permission scope.\n3. Prefer OAuth, read-only scopes, test workspaces, and sandbox credentials.\n4. Copy MCP JSON only from the reviewed source.\n5. Re-check the source before adding production secrets.`;

    const remoteTemplate = (serverName, url) => `{\n  "mcpServers": {\n    "${serverName}": {\n      "url": "${url}"\n    }\n  }\n}`;

    const npxTemplate = (serverName, pkg, envName = '') => {
        const envBlock = envName ? `,\n      "env": {\n        "${envName}": "your-token"\n      }` : '';
        return `{\n  "mcpServers": {\n    "${serverName}": {\n      "command": "npx",\n      "args": ["-y", "${pkg}"]${envBlock}\n    }\n  }\n}`;
    };

    const extraResources = [
        {
            "id": "modelcontextprotocol-reference-servers",
            "name": "MCP Reference Servers",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "reference", "filesystem", "git", "memory", "fetch"],
            "scenario": "Review the official reference implementations before choosing local file, git, memory, fetch, or time servers.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": reviewTemplate("MCP Reference Servers"),
            "platforms": ["Codex", "Claude", "Cursor", "VS Code", "Generic MCP"],
            "permissions": ["network", "filesRead", "shell"],
            "installModes": ["sourceReview", "local", "documentation"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 91,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-filesystem-reference",
            "name": "Filesystem MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Good reference for portable skills",
            "category": "mcp",
            "tags": ["mcp", "filesystem", "local", "files"],
            "scenario": "Give an agent scoped read or write access to specific local folders.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": npxTemplate("filesystem", "@modelcontextprotocol/server-filesystem"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["filesRead", "filesWrite", "shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 82,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-fetch-reference",
            "name": "Fetch MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Low",
            "recommend": "Good reference for portable skills",
            "category": "mcp",
            "tags": ["mcp", "fetch", "web", "http"],
            "scenario": "Fetch and transform public web content through a small MCP tool surface.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": npxTemplate("fetch", "@modelcontextprotocol/server-fetch"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 86,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-memory-reference",
            "name": "Memory MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Good reference for portable skills",
            "category": "mcp",
            "tags": ["mcp", "memory", "knowledge-graph"],
            "scenario": "Experiment with persistent graph memory for an agent in a controlled workspace.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": npxTemplate("memory", "@modelcontextprotocol/server-memory"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["filesRead", "filesWrite", "shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 82,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-sequential-thinking-reference",
            "name": "Sequential Thinking MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Low",
            "recommend": "Good reference for portable skills",
            "category": "mcp",
            "tags": ["mcp", "reasoning", "planning"],
            "scenario": "Expose a structured planning scratchpad for complex multi-step tasks.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": npxTemplate("sequential-thinking", "@modelcontextprotocol/server-sequential-thinking"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 86,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-time-reference",
            "name": "Time MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Low",
            "recommend": "Good reference for portable skills",
            "category": "mcp",
            "tags": ["mcp", "time", "timezone"],
            "scenario": "Provide timezone conversion and current-time context through a narrow MCP server.",
            "url": "https://github.com/modelcontextprotocol/servers",
            "docs": "https://github.com/modelcontextprotocol/servers",
            "template": npxTemplate("time", "@modelcontextprotocol/server-time"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 87,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "github-mcp-server",
            "name": "GitHub MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "github", "code", "issues", "pull-requests"],
            "scenario": "Read and manage GitHub repositories, issues, pull requests, and code search through GitHub's official MCP server.",
            "url": "https://github.com/github/github-mcp-server",
            "docs": "https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server",
            "template": reviewTemplate("GitHub MCP Server"),
            "platforms": ["Codex", "Claude", "Cursor", "VS Code", "Generic MCP"],
            "permissions": ["network", "apiKey", "filesRead", "filesWrite"],
            "installModes": ["remote", "local", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 90,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "playwright-mcp",
            "name": "Playwright MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Good inspector and schema view",
            "category": "mcp",
            "tags": ["mcp", "browser", "testing", "automation", "playwright"],
            "scenario": "Drive a browser for testing, inspection, and UI automation through Microsoft Playwright.",
            "url": "https://github.com/microsoft/playwright-mcp",
            "docs": "https://github.com/microsoft/playwright-mcp",
            "template": npxTemplate("playwright", "@playwright/mcp"),
            "platforms": ["Codex", "Claude", "Cursor", "VS Code", "Generic MCP"],
            "permissions": ["browser", "network", "filesRead", "filesWrite", "shell"],
            "installModes": ["local", "sourceReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 87,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "browserbase-mcp-server",
            "name": "Browserbase MCP Server",
            "type": "MCP Directory",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Good discovery and install UX",
            "category": "mcp",
            "tags": ["mcp", "browserbase", "browser", "automation", "stagehand"],
            "scenario": "Use hosted browser sessions for web automation, extraction, and QA flows.",
            "url": "https://github.com/browserbase/mcp-server-browserbase",
            "docs": "https://context7.com/browserbase/mcp-server-browserbase",
            "template": npxTemplate("browserbase", "@browserbasehq/mcp-server-browserbase", "BROWSERBASE_API_KEY"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["browser", "network", "apiKey", "remote"],
            "installModes": ["local", "docker", "sourceReview"],
            "authRequired": true,
            "maintenance": "community",
            "trustScore": 78,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "cloudflare-mcp",
            "name": "Cloudflare MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "cloudflare", "remote", "cloud", "security"],
            "scenario": "Connect to Cloudflare's hosted MCP endpoint for account, application, security, and performance operations.",
            "url": "https://github.com/cloudflare/mcp",
            "docs": "https://github.com/cloudflare/mcp",
            "template": remoteTemplate("cloudflare-api", "https://mcp.cloudflare.com/mcp"),
            "platforms": ["Codex", "Claude", "Cursor", "ChatGPT", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote"],
            "installModes": ["remote", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 90,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "cloudflare-mcp-server-cloudflare",
            "name": "Cloudflare MCP Server Catalog",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "cloudflare", "docs", "radar", "browser-rendering"],
            "scenario": "Review Cloudflare's server-specific MCP endpoints such as documentation, radar, and browser rendering.",
            "url": "https://github.com/cloudflare/mcp-server-cloudflare",
            "docs": "https://github.com/cloudflare/mcp-server-cloudflare",
            "template": reviewTemplate("Cloudflare MCP Server Catalog"),
            "platforms": ["Codex", "Claude", "Cursor", "ChatGPT", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote", "browser"],
            "installModes": ["remote", "sourceReview"],
            "authRequired": "depends",
            "maintenance": "official",
            "trustScore": 88,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "figma-mcp-server",
            "name": "Figma MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "figma", "design", "dev-mode", "frontend"],
            "scenario": "Provide design context from Figma Dev Mode to coding agents for design-to-code workflows.",
            "url": "https://developers.figma.com/docs/figma-mcp-server",
            "docs": "https://developers.figma.com/docs/figma-mcp-server/local-server-installation/",
            "template": reviewTemplate("Figma MCP Server"),
            "platforms": ["Codex", "Claude", "Cursor", "VS Code", "Generic MCP"],
            "permissions": ["network", "browser", "filesWrite", "remote"],
            "installModes": ["remote", "local", "documentation"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 87,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "canva-mcp",
            "name": "Canva MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "canva", "design", "export", "remote"],
            "scenario": "Connect an assistant to Canva design APIs for generation, export, and design workflows.",
            "url": "https://www.canva.dev/docs/mcp/",
            "docs": "https://www.canva.dev/docs/mcp/tools/",
            "template": reviewTemplate("Canva MCP"),
            "platforms": ["Codex", "Claude", "Cursor", "ChatGPT", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote"],
            "installModes": ["remote", "documentation"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 86,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "zapier-mcp",
            "name": "Zapier MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Broad ecosystem scan",
            "category": "mcp",
            "tags": ["mcp", "zapier", "automation", "saas", "remote"],
            "scenario": "Expose Zapier-connected app actions to MCP clients with Zapier account auth and task billing.",
            "url": "https://help.zapier.com/hc/en-us/articles/36265392843917-Use-Zapier-MCP-with-your-client",
            "docs": "https://docs.zapier.com/powered-by-zapier/embedding-zapier-mcp/getting-started",
            "template": reviewTemplate("Zapier MCP"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote"],
            "installModes": ["remote", "documentation"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 84,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "linear-mcp",
            "name": "Linear MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "linear", "issues", "projects", "remote"],
            "scenario": "Find, create, and update Linear issues, projects, comments, and related objects through Linear's hosted MCP server.",
            "url": "https://linear.app/docs/mcp",
            "docs": "https://linear.app/docs/mcp",
            "template": remoteTemplate("linear", "https://mcp.linear.app/mcp"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote", "filesWrite"],
            "installModes": ["remote", "documentation"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 86,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "atlassian-remote-mcp",
            "name": "Atlassian Remote MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "atlassian", "jira", "confluence", "remote"],
            "scenario": "Connect Jira and Confluence Cloud data to compatible assistants through Atlassian's hosted remote MCP server.",
            "url": "https://www.atlassian.com/blog/announcements/remote-mcp-server",
            "docs": "https://support.atlassian.com/rovo/docs/setting-up-ides/",
            "template": reviewTemplate("Atlassian Remote MCP"),
            "platforms": ["Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote", "filesWrite"],
            "installModes": ["remote", "documentation"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 84,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "stripe-mcp",
            "name": "Stripe MCP",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "API-side MCP reference",
            "category": "mcp",
            "tags": ["mcp", "stripe", "payments", "billing", "remote"],
            "scenario": "Connect payment, customer, product, and billing tools through Stripe's remote or local MCP server.",
            "url": "https://github.com/mcp/com.stripe/mcp",
            "docs": "https://github.com/stripe/agent-toolkit",
            "template": "npx -y @stripe/mcp --api-key=YOUR_STRIPE_SECRET_KEY",
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote", "shell"],
            "installModes": ["remote", "local", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 86,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "notion-mcp-server",
            "name": "Notion MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Official first",
            "category": "mcp",
            "tags": ["mcp", "notion", "workspace", "docs", "remote"],
            "scenario": "Access and edit Notion workspace content through Notion's official MCP path.",
            "url": "https://github.com/makenotion/notion-mcp-server",
            "docs": "https://github.com/makenotion/notion-mcp-server",
            "template": reviewTemplate("Notion MCP Server"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network", "apiKey", "remote", "filesWrite"],
            "installModes": ["remote", "local", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 84,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "supabase-mcp",
            "name": "Supabase MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "API-side MCP reference",
            "category": "mcp",
            "tags": ["mcp", "supabase", "database", "postgres", "remote"],
            "scenario": "Manage Supabase projects, docs, database schema, SQL, debugging, and project metadata through MCP.",
            "url": "https://github.com/supabase-community/supabase-mcp",
            "docs": "https://github.com/supabase-community/supabase-mcp",
            "template": remoteTemplate("supabase", "https://mcp.supabase.com/mcp"),
            "platforms": ["Codex", "Claude", "Cursor", "Windsurf", "Generic MCP"],
            "permissions": ["network", "apiKey", "database", "remote"],
            "installModes": ["remote", "local", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 85,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "neon-mcp-server",
            "name": "Neon MCP Server",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Medium",
            "recommend": "API-side MCP reference",
            "category": "mcp",
            "tags": ["mcp", "neon", "postgres", "database", "remote"],
            "scenario": "Manage Neon projects, branches, migrations, schema comparisons, and database queries through MCP.",
            "url": "https://github.com/neondatabase-labs/mcp-server-neon",
            "docs": "https://github.com/neondatabase-labs/mcp-server-neon",
            "template": reviewTemplate("Neon MCP Server"),
            "platforms": ["Codex", "Claude", "Cursor", "Windsurf", "Generic MCP"],
            "permissions": ["network", "apiKey", "database", "remote"],
            "installModes": ["remote", "local", "sourceReview"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 84,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "firecrawl-mcp",
            "name": "Firecrawl MCP Server",
            "type": "MCP Directory",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Good discovery and install UX",
            "category": "mcp",
            "tags": ["mcp", "firecrawl", "search", "scrape", "browser"],
            "scenario": "Search, scrape, crawl, map, and interact with web pages through Firecrawl.",
            "url": "https://github.com/mcp/firecrawl/firecrawl-mcp-server",
            "docs": "https://www.firecrawl.dev/skills",
            "template": npxTemplate("firecrawl", "firecrawl-mcp", "FIRECRAWL_API_KEY"),
            "platforms": ["Codex", "Claude", "Cursor", "VS Code", "Generic MCP"],
            "permissions": ["network", "apiKey", "browser", "remote"],
            "installModes": ["local", "remote", "marketplace"],
            "authRequired": true,
            "maintenance": "official",
            "trustScore": 80,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "openmcpdirectory",
            "name": "Open MCP Directory",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Broad ecosystem scan",
            "category": "mcp",
            "tags": ["mcp", "directory", "search", "community"],
            "scenario": "Browse community MCP servers and jump to upstream project pages for manual review.",
            "url": "https://www.openmcpdirectory.com/",
            "docs": "https://www.openmcpdirectory.com/",
            "template": reviewTemplate("Open MCP Directory"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["directory", "sourceReview"],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 70,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcpserverslist",
            "name": "MCP Servers List",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Simple category browsing",
            "category": "mcp",
            "tags": ["mcp", "directory", "catalog", "community"],
            "scenario": "Search common MCP servers by service category before checking the upstream source.",
            "url": "https://www.mcpserverslist.com/",
            "docs": "https://www.mcpserverslist.com/",
            "template": reviewTemplate("MCP Servers List"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["directory", "sourceReview"],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 69,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "everymcp",
            "name": "EveryMCP",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Meta search across directories",
            "category": "mcp",
            "tags": ["mcp", "directory", "marketplace", "community"],
            "scenario": "Compare MCP server cards and use the linked GitHub or official docs as the source of truth.",
            "url": "https://everymcp.com/",
            "docs": "https://everymcp.com/",
            "template": reviewTemplate("EveryMCP"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["directory", "sourceReview"],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 68,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "aescut-mcp",
            "name": "Aescut MCP Directory",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Useful for initial risk triage",
            "category": "mcp",
            "tags": ["mcp", "directory", "security", "ratings"],
            "scenario": "Use directory metadata as a first-pass signal, then verify upstream repository and permissions.",
            "url": "https://aescut.sh/mcp",
            "docs": "https://aescut.sh/mcp",
            "template": reviewTemplate("Aescut MCP Directory"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["directory", "riskReview"],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 70,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "tool-shelf-mcp-reference",
            "name": "ToolShelf MCP Reference Servers",
            "type": "MCP Directory",
            "source": "Community",
            "risk": "Low",
            "recommend": "Good inspector and schema view",
            "category": "mcp",
            "tags": ["mcp", "reference", "review", "compatibility"],
            "scenario": "Compare official reference servers, setup patterns, and compatibility notes before installing.",
            "url": "https://thetoolshelf.dev/mcp/servers/mcp-reference-servers/",
            "docs": "https://thetoolshelf.dev/mcp/servers/mcp-reference-servers/",
            "template": reviewTemplate("ToolShelf MCP Reference Servers"),
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["directory", "documentation", "sourceReview"],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 74,
            "lastChecked": "2026-06-06"
        },
        {
            "id": "mcp-security-best-practices",
            "name": "MCP Security Best Practices",
            "type": "MCP Documentation",
            "source": "Official",
            "risk": "Low",
            "recommend": "Useful for initial risk triage",
            "category": "mcp",
            "tags": ["mcp", "security", "authorization", "ssrf", "audit"],
            "scenario": "Review official MCP security guidance before enabling high-permission local or remote servers.",
            "url": "https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices",
            "docs": "https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices",
            "template": "Use the official security guide as a baseline for OAuth, SSRF, token, scope, and local server risk review.",
            "platforms": ["Codex", "Claude", "Cursor", "Generic MCP"],
            "permissions": ["network"],
            "installModes": ["documentation", "riskReview"],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 84,
            "lastChecked": "2026-06-06"
        }
    ];

    resources.push(...extraResources);

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && group.id !== 'mcp');
    groups.push({
        id: 'mcp',
        resources
    });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
