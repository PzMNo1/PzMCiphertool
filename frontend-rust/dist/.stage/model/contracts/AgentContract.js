/**
 * AgentContract - phase 1 shared contract helpers.
 * This file defines stable shapes without changing runtime behavior.
 */
(function () {
    const CONTRACT_VERSION = 'agent-contract-v1';

    const RUN_MODES = Object.freeze([
        'chat',
        'quick_agent',
        'research',
        'academic_research',
        'crypto',
        'project_read',
        'code_review',
        'project_exec',
        'image',
        'page_control'
    ]);

    const RISK_LEVELS = Object.freeze([
        'safe_read',
        'network_read',
        'project_read',
        'project_exec',
        'write_or_external',
        'dangerous'
    ]);

    const EVENT_TYPES = Object.freeze([
        'run.started',
        'context.built',
        'plan.created',
        'route.completed',
        'model.started',
        'model.delta',
        'model.completed',
        'tool.requested',
        'approval.required',
        'approval.resolved',
        'tool.started',
        'tool.completed',
        'tool.failed',
        'evidence.added',
        'citation.verified',
        'artifact.created',
        'collaboration.started',
        'collaboration.active',
        'collaboration.handoff',
        'collaboration.completed',
        'durable.checkpoint',
        'durable.recovered',
        'synthesis.started',
        'run.completed',
        'run.failed',
        'run.cancelled'
    ]);

    const TOOL_PACKAGES = Object.freeze([
        'chat',
        'core_tools',
        'crypto_tools',
        'math_tools',
        'research_tools',
        'community_tools',
        'market_tools',
        'project_read_tools',
        'project_exec_tools',
        'patch_proposal_tools',
        'image_tools',
        'page_control_tools',
        'agent_earth_tools',
        'api_router_tools'
    ]);

    const TOOL_PACKAGE_BY_NAME = Object.freeze({
        get_current_date: 'core_tools',
        get_current_time: 'core_tools',
        text_analysis: 'core_tools',
        update_plan: 'core_tools',

        calculate: 'math_tools',
        random_number: 'math_tools',
        uuid_generate: 'math_tools',
        unit_convert: 'math_tools',
        get_time: 'math_tools',
        time: 'math_tools',

        caesar_cipher: 'crypto_tools',
        base64_encode: 'crypto_tools',
        base64_decode: 'crypto_tools',
        morse_encode: 'crypto_tools',
        morse_decode: 'crypto_tools',
        rot13: 'crypto_tools',
        hex_encode: 'crypto_tools',
        hex_decode: 'crypto_tools',
        url_encode: 'crypto_tools',
        url_decode: 'crypto_tools',
        reverse_text: 'crypto_tools',
        atbash_cipher: 'crypto_tools',
        vigenere_cipher: 'crypto_tools',
        binary_convert: 'crypto_tools',
        hash_text: 'crypto_tools',
        frequency_analysis: 'crypto_tools',

        community_snapshot: 'community_tools',

        web_research: 'research_tools',
        search_urls: 'research_tools',
        read_webpage: 'research_tools',
        click_link: 'research_tools',
        news_query: 'research_tools',
        get_weather: 'research_tools',
        weather: 'research_tools',
        search_query: 'research_tools',
        open_url: 'research_tools',
        find_in_page: 'research_tools',
        open: 'research_tools',
        find: 'research_tools',

        finance_query: 'market_tools',

        agent_earth_run: 'agent_earth_tools',

        list_files: 'project_read_tools',
        read_file: 'project_read_tools',
        search_files: 'project_read_tools',
        file_info: 'project_read_tools',

        run_tests: 'project_exec_tools',
        run_build: 'project_exec_tools',

        propose_patch: 'patch_proposal_tools'
    });

    const PACKAGE_DEFAULTS = Object.freeze({
        chat: {
            risk: 'safe_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 10000,
            maxOutputChars: 12000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'none',
            owner: 'frontend',
            enabledByDefault: true
        },
        core_tools: {
            risk: 'safe_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 5000,
            maxOutputChars: 12000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'none',
            owner: 'frontend',
            enabledByDefault: true
        },
        crypto_tools: {
            risk: 'safe_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 5000,
            maxOutputChars: 12000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'none',
            owner: 'frontend',
            enabledByDefault: true
        },
        math_tools: {
            risk: 'safe_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 5000,
            maxOutputChars: 12000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'none',
            owner: 'frontend',
            enabledByDefault: true
        },
        research_tools: {
            risk: 'network_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 45000,
            maxOutputChars: 48000,
            cachePolicy: 'per_run',
            retryPolicy: 'once',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: true
        },
        community_tools: {
            risk: 'network_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 45000,
            maxOutputChars: 32000,
            cachePolicy: 'per_run',
            retryPolicy: 'once',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: true
        },
        market_tools: {
            risk: 'network_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 20000,
            maxOutputChars: 8000,
            cachePolicy: 'per_run',
            retryPolicy: 'once',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: true
        },
        project_read_tools: {
            risk: 'project_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 15000,
            maxOutputChars: 16000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'read',
            owner: 'backend',
            enabledByDefault: true
        },
        project_exec_tools: {
            risk: 'project_exec',
            sideEffect: true,
            requiresApproval: true,
            approvalMode: 'interactive_gate_v1',
            timeoutMs: 90000,
            maxOutputChars: 16000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'exec',
            owner: 'backend',
            enabledByDefault: false
        },
        patch_proposal_tools: {
            risk: 'project_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 15000,
            maxOutputChars: 16000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'read',
            owner: 'backend',
            enabledByDefault: true
        },
        image_tools: {
            risk: 'network_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 90000,
            maxOutputChars: 8000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: true
        },
        page_control_tools: {
            risk: 'safe_read',
            sideEffect: true,
            requiresApproval: false,
            timeoutMs: 10000,
            maxOutputChars: 8000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: false,
            projectAccess: 'none',
            owner: 'agentmaster',
            enabledByDefault: true
        },
        agent_earth_tools: {
            risk: 'network_read',
            sideEffect: false,
            requiresApproval: false,
            timeoutMs: 70000,
            maxOutputChars: 24000,
            cachePolicy: 'per_run',
            retryPolicy: 'none',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: true
        },
        api_router_tools: {
            risk: 'write_or_external',
            sideEffect: true,
            requiresApproval: true,
            timeoutMs: 20000,
            maxOutputChars: 12000,
            cachePolicy: 'none',
            retryPolicy: 'none',
            networkAccess: true,
            projectAccess: 'none',
            owner: 'backend',
            enabledByDefault: false
        }
    });

    function nowIso() {
        return new Date().toISOString();
    }

    function createId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
    }

    function cleanOneLine(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function previewValue(value, max = 600) {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (!text) return '';
        return text.length <= max ? text : `${text.slice(0, max)}\n[preview truncated]`;
    }

    function inferToolPackage(name) {
        return TOOL_PACKAGE_BY_NAME[name] || 'core_tools';
    }

    function normalizeToolMetadata(name, metadata = {}) {
        const toolPackage = metadata.package || metadata.toolPackage || inferToolPackage(name);
        const defaults = PACKAGE_DEFAULTS[toolPackage] || PACKAGE_DEFAULTS.core_tools;
        return {
            ...metadata,
            package: toolPackage,
            risk: metadata.risk || defaults.risk,
            sideEffect: metadata.sideEffect ?? defaults.sideEffect,
            requiresApproval: metadata.requiresApproval ?? defaults.requiresApproval,
            timeoutMs: metadata.timeoutMs || defaults.timeoutMs,
            maxInputChars: metadata.maxInputChars || 6000,
            maxOutputChars: metadata.maxOutputChars || defaults.maxOutputChars,
            cachePolicy: metadata.cachePolicy || defaults.cachePolicy,
            retryPolicy: metadata.retryPolicy || defaults.retryPolicy,
            networkAccess: metadata.networkAccess ?? defaults.networkAccess,
            projectAccess: metadata.projectAccess || defaults.projectAccess,
            owner: metadata.owner || defaults.owner,
            enabledByDefault: metadata.enabledByDefault ?? defaults.enabledByDefault,
            approvalMode: metadata.approvalMode || defaults.approvalMode || 'none'
        };
    }

    function normalizeToolContract(tool) {
        const metadata = normalizeToolMetadata(tool.name, tool.metadata || {});
        return {
            ...tool,
            metadata,
            contract: {
                name: tool.name,
                package: metadata.package,
                description: tool.description || '',
                inputSchema: tool.parameters || { type: 'object', properties: {} },
                outputSchema: tool.outputSchema || null,
                risk: metadata.risk,
                sideEffect: metadata.sideEffect,
                requiresApproval: metadata.requiresApproval,
                timeoutMs: metadata.timeoutMs,
                maxInputChars: metadata.maxInputChars,
                maxOutputChars: metadata.maxOutputChars,
                cachePolicy: metadata.cachePolicy,
                retryPolicy: metadata.retryPolicy,
                networkAccess: metadata.networkAccess,
                projectAccess: metadata.projectAccess,
                owner: metadata.owner,
                enabledByDefault: metadata.enabledByDefault,
                approvalMode: metadata.approvalMode || 'none',
                impact: metadata.impact || '',
                tags: Array.isArray(metadata.tags) ? metadata.tags : [],
                sourceKind: metadata.sourceKind || ''
            }
        };
    }

    function createAgentEvent({ runId, seq, type, stage, payload = {}, visibility = 'history' }) {
        return {
            id: createId('evt'),
            contract_version: CONTRACT_VERSION,
            runId,
            seq,
            type,
            ts: nowIso(),
            stage,
            payload,
            visibility
        };
    }

    function createContextPack(input = {}) {
        const preparedAttachments = input.preparedAttachments || {};
        const historyAttachments = Array.isArray(preparedAttachments.historyAttachments)
            ? preparedAttachments.historyAttachments
            : [];
        const priorMessages = Array.isArray(input.priorMessages) ? input.priorMessages : [];
        const priorAgentRuns = Array.isArray(input.priorAgentRuns) ? input.priorAgentRuns.slice(-4) : [];
        const textAttachments = historyAttachments.filter(item => item.kind === 'text');
        const imageAttachments = historyAttachments.filter(item => item.kind === 'image');
        const priorEvidence = priorAgentRuns.flatMap(run => Array.isArray(run.evidence) ? run.evidence : []).slice(-24);
        const priorToolSummaries = priorAgentRuns.flatMap(run => Array.isArray(run.toolResultSummaries) ? run.toolResultSummaries : []).slice(-12);
        return {
            id: createId('ctx'),
            contract_version: CONTRACT_VERSION,
            runId: input.runId || null,
            task: {
                text: String(input.userMessage || ''),
                routingText: String(input.routingMessage || ''),
                imageMode: Boolean(input.isImageModeEnabled),
                toolEnabled: Boolean(input.isToolEnabled),
                deepThinkEnabled: Boolean(input.isDeepThinkEnabled)
            },
            recentMessages: priorMessages.slice(-12).map(message => ({
                role: message.role,
                contentPreview: previewValue(message.content || '', 600)
            })),
            attachmentsManifest: historyAttachments.map(item => ({
                name: item.name,
                path: item.path,
                size: item.size,
                type: item.type,
                kind: item.kind
            })),
            attachmentChunks: textAttachments.map(item => ({
                path: item.path,
                kind: 'text',
                includedInPrompt: true
            })),
            imageInputs: imageAttachments.map(item => ({
                path: item.path,
                kind: 'image',
                includedInPrompt: true
            })),
            projectSnippets: [],
            agentRunSummaries: priorAgentRuns,
            toolResultSummaries: priorToolSummaries,
            evidenceLedger: priorEvidence,
            outputPolicy: input.outputPolicy || {
                citeSourcesWhenEvidenceExists: true,
                preserveUserLanguage: true
            },
            limits: {
                maxAttachments: input.maxAttachments,
                maxTotalTextChars: input.maxTotalTextChars,
                maxImageAttachments: input.maxImageAttachments
            },
            summary: {
                chatId: input.chatId || null,
                priorMessageCount: priorMessages.length,
                attachmentCount: historyAttachments.length,
                textAttachmentCount: textAttachments.length,
                imageAttachmentCount: imageAttachments.length,
                hasAttachmentContext: Boolean(preparedAttachments.contextText),
                priorAgentRunCount: priorAgentRuns.length,
                priorEvidenceCount: priorEvidence.length,
                priorToolSummaryCount: priorToolSummaries.length
            }
        };
    }

    function normalizeEvidenceEntry(entry = {}, options = {}) {
        const retrievedAt = entry.retrievedAt || entry.observed_at || nowIso();
        const contentForHash = [
            entry.url,
            entry.title,
            entry.snippet,
            entry.content_preview,
            entry.contentPreview,
            entry.error
        ].filter(Boolean).join('\n');
        const trust = inferTrust(entry);
        const source = inferSourceProfile(entry);
        const normalized = {
            ...entry,
            id: entry.id || createId('evd'),
            contract_version: CONTRACT_VERSION,
            runId: entry.runId || options.runId || '',
            source_id: entry.source_id ?? entry.sourceId ?? '',
            sourceId: entry.sourceId ?? entry.source_id ?? '',
            kind: entry.kind || 'unknown',
            tool: entry.tool || '',
            title: cleanOneLine(entry.title || ''),
            url: String(entry.url || '').trim().replace(/[.,;]+$/, ''),
            observed_at: entry.observed_at || retrievedAt,
            retrievedAt,
            contentHash: entry.contentHash || hashString(contentForHash || JSON.stringify(entry)),
            trustLevel: entry.trustLevel || trust.level,
            trustReason: entry.trustReason || trust.reason,
            sourceType: entry.sourceType || source.sourceType,
            authorityScore: entry.authorityScore ?? source.authorityScore,
            recencyScore: entry.recencyScore ?? source.recencyScore,
            primarySource: entry.primarySource ?? source.primarySource,
            sourceProfileReason: entry.sourceProfileReason || source.reason,
            claimIds: Array.isArray(entry.claimIds) ? entry.claimIds : [],
            usedInFinalAnswer: Boolean(entry.usedInFinalAnswer)
        };
        return normalized;
    }

    function inferTrust(entry) {
        if (entry.error) return { level: 'low', reason: 'tool returned an error for this source' };
        if (entry.kind === 'source_candidate' || entry.kind === 'search_result') {
            return { level: 'low', reason: 'search candidate or snippet, not opened content' };
        }
        const url = String(entry.url || '').toLowerCase();
        if (/arxiv\.org|nature\.com|science\.org|ieee\.org|acm\.org|pubmed|nih\.gov|opg\.optica\.org/.test(url)) {
            return { level: 'primary', reason: 'recognized primary or academic source domain' };
        }
        if (/github\.com|docs\.|developer\.|official|gov|edu/.test(url)) {
            return { level: 'high', reason: 'recognized official, developer, government, education, or source repository domain' };
        }
        if (entry.kind === 'opened_source' || entry.kind === 'opened_page') {
            return { level: 'medium', reason: 'opened page content without primary-source domain signal' };
        }
        if (url) return { level: 'medium', reason: 'URL-backed evidence' };
        return { level: 'unknown', reason: 'no URL or trust signal available' };
    }

    function inferSourceProfile(entry) {
        const url = String(entry.url || '').toLowerCase();
        const title = String(entry.title || '').toLowerCase();
        const kind = String(entry.kind || '').toLowerCase();
        const text = `${url}\n${title}`;
        let sourceType = 'unknown';
        let authorityScore = 0.35;
        let primarySource = false;
        let reason = 'no strong source-type signal';

        if (entry.error || /error/.test(kind)) {
            sourceType = 'error';
            authorityScore = 0.05;
            reason = 'tool returned an error';
        } else if (/arxiv\.org|doi\.org|pubmed|nih\.gov|nature\.com|science\.org|cell\.com|springer\.com|sciencedirect\.com|wiley\.com|ieee\.org|ieeexplore\.ieee\.org|acm\.org|dl\.acm\.org|opg\.optica\.org|osa\.org/.test(url)) {
            sourceType = 'paper';
            authorityScore = 0.92;
            primarySource = true;
            reason = 'academic or primary research domain';
        } else if (/\.gov\b|\.gov\.|who\.int|un\.org|worldbank\.org|imf\.org|oecd\.org|wto\.org|sec\.gov|federalreserve\.gov|ecb\.europa\.eu|pbc\.gov\.cn/.test(url)) {
            sourceType = 'official_policy';
            authorityScore = 0.9;
            primarySource = true;
            reason = 'government, regulator, or intergovernmental organization';
        } else if (/docs\.|developer\.|developers\.|learn\.microsoft\.com|cloud\.google\.com|aws\.amazon\.com|github\.com|gitlab\.com|npmjs\.com|pypi\.org|crates\.io/.test(url)) {
            sourceType = 'official_docs';
            authorityScore = 0.84;
            primarySource = true;
            reason = 'official developer documentation or source repository';
        } else if (/annual[-_ ]?report|white[-_ ]?paper|report|10-k|10-q|earnings|investor|ir\.|research|institute|mckinsey|gartner|forrester|idc|cbinsights|statista|ourworldindata|data\./.test(text)) {
            sourceType = 'institution_report';
            authorityScore = 0.78;
            primarySource = /annual[-_ ]?report|10-k|10-q|earnings|investor|ir\./.test(text);
            reason = 'institutional report, data source, or company disclosure';
        } else if (/reuters\.com|apnews\.com|bbc\.com|bloomberg\.com|wsj\.com|ft\.com|nytimes\.com|theguardian\.com|cnbc\.com|npr\.org|economist\.com|caixin\.com|chinanews\.com|news\.cn|xinhuanet\.com|people\.com\.cn|cctv\.com/.test(url)) {
            sourceType = 'news';
            authorityScore = 0.68;
            reason = 'reputable news or wire source';
        } else if (/github\.com\/trending|news\.ycombinator\.com|reddit\.com|v2ex\.com|lobste\.rs|producthunt\.com|stackoverflow\.com|medium\.com|substack\.com/.test(url) || kind === 'community_snapshot_item') {
            sourceType = 'community';
            authorityScore = 0.48;
            primarySource = kind === 'community_snapshot_item';
            reason = 'community, forum, or first-hand discussion source';
        } else if (/wikipedia\.org|baike\.|encyclopedia|britannica\.com/.test(url)) {
            sourceType = 'encyclopedia';
            authorityScore = 0.38;
            reason = 'encyclopedic or secondary summary source';
        } else if (kind === 'source_candidate' || kind === 'search_result') {
            sourceType = 'search_candidate';
            authorityScore = 0.22;
            reason = 'search result or unopened candidate';
        } else if (url) {
            sourceType = 'webpage';
            authorityScore = 0.45;
            reason = 'URL-backed web page without stronger profile signal';
        }

        return {
            sourceType,
            authorityScore,
            recencyScore: inferRecencyScore(entry),
            primarySource,
            reason
        };
    }

    function inferRecencyScore(entry) {
        const value = entry.published_at || entry.publishedAt || entry.date || entry.retrievedAt || entry.observed_at;
        const time = value ? Date.parse(value) : NaN;
        if (!Number.isFinite(time)) return 0.5;
        const ageDays = Math.max(0, (Date.now() - time) / 86400000);
        if (ageDays <= 7) return 1;
        if (ageDays <= 30) return 0.85;
        if (ageDays <= 180) return 0.65;
        if (ageDays <= 730) return 0.45;
        return 0.25;
    }

    function hashString(value) {
        const text = String(value || '');
        let hash = 2166136261;
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }

    window.AgentContract = {
        CONTRACT_VERSION,
        RUN_MODES,
        RISK_LEVELS,
        EVENT_TYPES,
        TOOL_PACKAGES,
        TOOL_PACKAGE_BY_NAME,
        PACKAGE_DEFAULTS,
        createId,
        createAgentEvent,
        createContextPack,
        normalizeToolMetadata,
        normalizeToolContract,
        normalizeEvidenceEntry,
        hashString,
        previewValue
    };
})();
