(function () {
    const resources = [
        {
            "id": "openai-skills",
            "name": "OpenAI Skills Catalog",
            "type": "Skill Registry",
            "source": "Official",
            "risk": "Low",
            "recommend": "Codex skill baseline",
            "tags": [
                "skill",
                "codex",
                "openai",
                "github"
            ],
            "scenario": "Use official Codex skills as examples for SKILL.md structure.",
            "url": "https://github.com/openai/skills",
            "docs": "https://openai.com/academy/codex-plugins-and-skills/",
            "template": "skills/my-skill/SKILL.md\nskills/my-skill/scripts/\nskills/my-skill/references/",
            "platforms": [
                "Codex"
            ],
            "permissions": [
                "filesRead",
                "scripts"
            ],
            "installModes": [
                "local",
                "sourceReview"
            ],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 95,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "codex": {
                    "local": "# Codex Skill folder\n# Create this under the project root.\n\n.codex/skills/my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\n# SKILL.md should define when to use the skill, workflow, constraints, and any scripts/references to load."
                },
                "generic": {
                    "local": "my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\nUse the official skills repository as the structure reference. Keep large references outside SKILL.md and load them only when needed."
                }
            }
        },
        {
            "id": "anthropic-skills",
            "name": "Anthropic Skills",
            "type": "Skill Registry",
            "source": "Official",
            "risk": "Low",
            "recommend": "Good reference for portable skills",
            "tags": [
                "skill",
                "claude",
                "anthropic",
                "github"
            ],
            "scenario": "Study skill layout and reusable agent workflows.",
            "url": "https://github.com/anthropics/skills",
            "docs": "https://github.com/anthropics/skills",
            "template": "SKILL.md describes when to use the skill, workflow, scripts, and references.",
            "platforms": [
                "Claude",
                "Generic Skill"
            ],
            "permissions": [
                "filesRead",
                "scripts"
            ],
            "installModes": [
                "local",
                "sourceReview"
            ],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 94,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "claude": {
                    "local": "# Claude Skill folder\n# Follow the target Claude Code skill/plugin docs for the final install path.\n\nmy-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\n# Review SKILL.md and bundled scripts before enabling the skill."
                },
                "generic": {
                    "local": "my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\nPortable skill layout: put activation rules and workflow in SKILL.md; keep scripts and references scoped and auditable."
                }
            }
        },
        {
            "id": "agentskills",
            "name": "Agent Skills Spec",
            "type": "Skill Standard",
            "source": "Official",
            "risk": "Low",
            "recommend": "Use as neutral format reference",
            "tags": [
                "skill",
                "spec",
                "standard",
                "skill.md"
            ],
            "scenario": "Understand the open folder-based skill standard centered on SKILL.md.",
            "url": "https://agentskills.io/",
            "docs": "https://agentskills.io/",
            "template": "# Skill Name\n\n## When to use\n...\n\n## Workflow\n...\n\n## Constraints\n...",
            "platforms": [
                "Codex",
                "Claude",
                "Generic Skill"
            ],
            "permissions": [
                "filesRead"
            ],
            "installModes": [
                "documentation"
            ],
            "authRequired": false,
            "maintenance": "official",
            "trustScore": 92,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "generic": {
                    "default": "# Agent Skills neutral structure\n\nmy-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/\n\nSKILL.md\n- When to use\n- Workflow\n- Constraints\n- Inputs / outputs\n- Safety notes"
                },
                "codex": {
                    "local": ".codex/skills/my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/"
                },
                "claude": {
                    "local": "my-skill/\n  SKILL.md\n  scripts/\n  references/\n  assets/"
                }
            }
        },
        {
            "id": "codex-marketplace",
            "name": "Codex Marketplace",
            "type": "Plugin Marketplace",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Search Codex plugins and skills",
            "tags": [
                "skill",
                "codex",
                "plugin",
                "marketplace"
            ],
            "scenario": "Discover community Codex plugins and skills.",
            "url": "https://www.codex-marketplace.com/",
            "docs": "https://www.codex-marketplace.com/skills",
            "template": "Review plugin manifest and skill files before installing.",
            "platforms": [
                "Codex"
            ],
            "permissions": [
                "network",
                "filesRead",
                "scripts"
            ],
            "installModes": [
                "marketplace",
                "sourceReview"
            ],
            "authRequired": "depends",
            "maintenance": "community",
            "trustScore": 70,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "codex": {
                    "local": "# Codex community skill review flow\n\n1. Open the marketplace entry.\n2. Review SKILL.md, scripts/, and references/.\n3. Install only after checking permissions and bundled commands.\n4. Keep credentials in local ignored files or environment variables."
                }
            }
        },
        {
            "id": "claude-plugins",
            "name": "Claude Plugin Marketplace",
            "type": "Plugin Marketplace",
            "source": "Official",
            "risk": "Medium",
            "recommend": "Claude Code plugin discovery",
            "tags": [
                "skill",
                "claude",
                "plugin",
                "marketplace"
            ],
            "scenario": "Discover Claude Code plugins and plugin marketplaces.",
            "url": "https://code.claude.com/docs/en/discover-plugins",
            "docs": "https://code.claude.com/docs/en/discover-plugins",
            "template": "Add marketplace by GitHub repo, Git URL, local path, or marketplace.json.",
            "platforms": [
                "Claude"
            ],
            "permissions": [
                "network",
                "filesRead",
                "scripts"
            ],
            "installModes": [
                "marketplace",
                "local",
                "remote"
            ],
            "authRequired": "depends",
            "maintenance": "official",
            "trustScore": 88,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "claude": {
                    "local": "# Claude Plugin install planning note\n\n1. Add a marketplace by GitHub repo, Git URL, local path, or marketplace.json.\n2. Review plugin manifest, MCP connectors, slash commands, and skills.\n3. Enable only the plugin capabilities you need.\n4. Store secrets outside the plugin directory."
                },
                "generic": {
                    "default": "Claude plugins can bundle manifest, MCP connectors, slash commands, and skills.\nReview the manifest and any MCP permissions before enabling."
                }
            }
        },
        {
            "id": "findskills",
            "name": "FindSkills",
            "type": "Skill Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Cross ecosystem search",
            "tags": [
                "skill",
                "mcp",
                "search",
                "directory"
            ],
            "scenario": "Search skills, MCP servers, GPT plugins, and other agent resources.",
            "url": "https://www.findskills.org/",
            "docs": "https://www.findskills.org/",
            "template": "Use for discovery; verify target project source before install.",
            "platforms": [
                "Codex",
                "Claude",
                "ChatGPT",
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
                    "local": "# FindSkills cross-ecosystem review\n\n1. Use FindSkills to locate a specific Skill, MCP server, or plugin.\n2. Open the original source before installing anything.\n3. For MCP entries, verify the server command, transport, auth flow, and permissions.\n4. For Skill entries, inspect SKILL.md, scripts/, references/, and bundled assets.\n5. Keep only reviewed resources in your local backlog."
                },
                "chatgpt": {
                    "default": "ChatGPT resource review from FindSkills\n\n1. Find the original plugin, GPT, or remote MCP app source.\n2. Confirm it has a hosted endpoint compatible with ChatGPT when MCP is involved.\n3. Review requested tools and account permissions before authorizing.\n4. Do not expose a local MCP server publicly unless you trust the tunnel and the server."
                }
            }
        },
        {
            "id": "skillery",
            "name": "Skillery",
            "type": "Skill Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Skill marketplace for CLI agents",
            "tags": [
                "skill",
                "marketplace",
                "codex",
                "claude"
            ],
            "scenario": "Browse skills for Claude Code, Codex CLI, and compatible agents.",
            "url": "https://skillery.dev/",
            "docs": "https://skillery.dev/",
            "template": "Install only after reading SKILL.md and bundled scripts.",
            "platforms": [
                "Codex",
                "Claude"
            ],
            "permissions": [
                "network",
                "filesRead",
                "scripts"
            ],
            "installModes": [
                "marketplace",
                "sourceReview"
            ],
            "authRequired": "depends",
            "maintenance": "community",
            "trustScore": 68,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "codex": {
                    "local": "# Skillery to Codex skill review\n\n1. Open the Skillery entry and original repository.\n2. Inspect SKILL.md, scripts/, references/, assets/, and any install notes.\n3. Confirm the skill activation rules are narrow enough for your project.\n4. Copy the skill into .codex/skills/ only after reviewing bundled commands.\n5. Keep secrets outside the skill folder."
                },
                "claude": {
                    "local": "# Skillery to Claude skill review\n\n1. Open the Skillery entry and original repository.\n2. Inspect SKILL.md and bundled scripts before enabling the skill.\n3. Check whether the skill expects MCP connectors or external credentials.\n4. Install only the reviewed folder/files into the target Claude skill/plugin location.\n5. Test in a throwaway workspace before using real project data."
                },
                "generic": {
                    "default": "# Skillery generic skill review\n\n1. Review the original repository, not only the marketplace card.\n2. Read SKILL.md for activation rules, workflow, and constraints.\n3. Inspect scripts/, references/, assets/, and manifest files.\n4. Reject skills that run broad shell commands without clear limits.\n5. Install into your agent only after a local test."
                }
            }
        },
        {
            "id": "trustedskills",
            "name": "TrustedSkills",
            "type": "Skill Directory",
            "source": "Community",
            "risk": "Medium",
            "recommend": "Multi-platform skill search",
            "tags": [
                "skill",
                "directory",
                "cursor",
                "vscode",
                "mcp"
            ],
            "scenario": "Search skills across OpenClaw, MCP, Claude, OpenAI, Cursor, and VS Code.",
            "url": "https://trustedskills.dev/",
            "docs": "https://trustedskills.dev/",
            "template": "Use trust labels as hints; inspect source and permission scope.",
            "platforms": [
                "Codex",
                "Claude",
                "Cursor",
                "VS Code",
                "Generic MCP"
            ],
            "permissions": [
                "network"
            ],
            "installModes": [
                "directory",
                "marketplace"
            ],
            "authRequired": false,
            "maintenance": "community",
            "trustScore": 69,
            "lastChecked": "2026-05-27",
            "installTemplates": {
                "codex": {
                    "local": "# TrustedSkills to Codex review\n\n1. Use TrustedSkills as a search and trust-label hint.\n2. Open the original source for the selected skill or MCP server.\n3. For skills, inspect SKILL.md, scripts/, references/, and activation rules.\n4. For MCP servers, verify exact client JSON from upstream docs.\n5. Add to .codex/skills/ or MCP config only after a local dry run."
                },
                "cursor": {
                    "local": "# TrustedSkills to Cursor review\n\n1. Open the upstream source for the selected resource.\n2. If it is an MCP server, verify the final .cursor/mcp.json snippet from upstream docs.\n3. Check whether the server reads files, runs shell commands, or requires API keys.\n4. Start in a test workspace and keep credentials in environment variables."
                },
                "generic": {
                    "default": "# TrustedSkills multi-platform review\n\n1. Treat trust labels as hints, not final approval.\n2. Open the original project source and docs.\n3. Inspect permissions, scripts, credentials, and maintenance activity.\n4. Match the resource to the target platform before copying config.\n5. Re-check the source periodically if it remains in your backlog."
                }
            }
        }
    ];

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && group.id !== 'skills');
    groups.push({
        id: 'skills',
        resources
    });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
