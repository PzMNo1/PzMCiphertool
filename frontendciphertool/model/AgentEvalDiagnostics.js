/**
 * AgentEvalDiagnostics - deterministic, local diagnosis for eval case failures.
 *
 * This is intentionally rule based. It keeps live/offline eval diagnosis
 * explainable and avoids another model call just to interpret failed checks.
 */
class AgentEvalDiagnostics {
    constructor() {
        this.categoryOrder = [
            'auth_or_config',
            'runtime_unavailable',
            'backend_unavailable',
            'routing_failure',
            'tool_failure',
            'approval_rejection',
            'missing_evidence',
            'citation_quality',
            'model_contract',
            'performance_regression',
            'storage_traceability'
        ];
        this.categories = {
            routing_failure: {
                id: 'routing_failure',
                label: 'Routing',
                severity: 'high',
                tone: 'watch',
                description: 'Prompt classification or selected tools did not match the case contract.',
                nextSteps: [
                    'Open the run replay and inspect route.completed selected tools.',
                    'Add or adjust routing fixtures for this prompt family.'
                ]
            },
            tool_failure: {
                id: 'tool_failure',
                label: 'Tool Failure',
                severity: 'high',
                tone: 'fail',
                description: 'A selected tool failed or returned an unusable result.',
                nextSteps: [
                    'Open the replay timeline and inspect tool.failed payloads.',
                    'Reproduce the same tool input outside the model loop.'
                ]
            },
            approval_rejection: {
                id: 'approval_rejection',
                label: 'Approval',
                severity: 'medium',
                tone: 'watch',
                description: 'Execution stopped or degraded because an approval gate rejected the tool call.',
                nextSteps: [
                    'Confirm whether rejection was expected for this eval case.',
                    'If unexpected, inspect risk classification and approval resolver behavior.'
                ]
            },
            missing_evidence: {
                id: 'missing_evidence',
                label: 'Evidence',
                severity: 'high',
                tone: 'fail',
                description: 'A research-like run did not collect evidence required by the case.',
                nextSteps: [
                    'Check whether the research route opened/read sources before synthesis.',
                    'Verify evidence.added events are emitted after source reads.'
                ]
            },
            citation_quality: {
                id: 'citation_quality',
                label: 'Citations',
                severity: 'medium',
                tone: 'watch',
                description: 'Final citation markers did not map cleanly to trusted evidence.',
                nextSteps: [
                    'Verify final-answer citation markers and evidence ids.',
                    'Prefer primary or official sources for cited claims.'
                ]
            },
            model_contract: {
                id: 'model_contract',
                label: 'Contract',
                severity: 'medium',
                tone: 'watch',
                description: 'The runtime response, snapshot, or quality score missed a case assertion.',
                nextSteps: [
                    'Compare failed assertions with the response and AgentRun snapshot.',
                    'Inspect run.completed/run.failed terminal events in replay.'
                ]
            },
            backend_unavailable: {
                id: 'backend_unavailable',
                label: 'Backend',
                severity: 'high',
                tone: 'fail',
                description: 'A backend-required case could not reach required project/API services.',
                nextSteps: [
                    'Start or verify the backend before rerunning backend-required cases.',
                    'Check fetch status, endpoint path, login state, and CORS errors.'
                ]
            },
            auth_or_config: {
                id: 'auth_or_config',
                label: 'Auth/Config',
                severity: 'high',
                tone: 'fail',
                description: 'The model provider key or model configuration is missing or rejected.',
                nextSteps: [
                    'Confirm the current frontend session has a valid model API key.',
                    'Rerun a safe non-network smoke case after updating configuration.'
                ]
            },
            runtime_unavailable: {
                id: 'runtime_unavailable',
                label: 'Runtime',
                severity: 'high',
                tone: 'fail',
                description: 'Required frontend Agent runtime globals were not loaded.',
                nextSteps: [
                    'Verify modules.js loads AgentRuntime, DeepSeekClient, and ToolRegistry in order.',
                    'Check browser console for script load or global initialization errors.'
                ]
            },
            performance_regression: {
                id: 'performance_regression',
                label: 'Performance',
                severity: 'medium',
                tone: 'watch',
                description: 'The case took unusually long or was flagged as slow.',
                nextSteps: [
                    'Compare with the latest batch trend slower-cases group.',
                    'Inspect stage timing to locate the longest route/tool/model stage.'
                ]
            },
            storage_traceability: {
                id: 'storage_traceability',
                label: 'Traceability',
                severity: 'medium',
                tone: 'watch',
                description: 'Run or batch persistence failed, so replay evidence may be incomplete.',
                nextSteps: [
                    'Inspect AgentRunStore localStorage and backend mirror writes.',
                    'Keep the case result visible until replay persistence is restored.'
                ]
            }
        };
        this.runbooks = {
            routing_failure: [
                {
                    id: 'routing-inspect-route',
                    label: 'Inspect route decision',
                    detail: 'Open replay and compare route.completed mode/selectedTools with the failed assertion.',
                    verify: 'Rerun the same case and confirm selectedTools matches the case contract.'
                },
                {
                    id: 'routing-add-fixture',
                    label: 'Add routing fixture',
                    detail: 'Add this prompt family to the deterministic routing/eval fixture set before changing broad router rules.',
                    verify: 'Offline eval and the affected live case should both pass.'
                }
            ],
            tool_failure: [
                {
                    id: 'tool-replay-payload',
                    label: 'Replay tool payload',
                    detail: 'Inspect tool.requested/tool.failed payloads and reproduce the tool input outside the model loop.',
                    verify: 'The same tool input returns a usable result without model involvement.'
                },
                {
                    id: 'tool-contract-guard',
                    label: 'Harden tool contract',
                    detail: 'Normalize tool errors into bounded, user-visible failures and keep AgentRun events complete.',
                    verify: 'Replay shows tool.failed plus run.completed or a clear run.failed terminal event.'
                }
            ],
            approval_rejection: [
                {
                    id: 'approval-expected',
                    label: 'Confirm expected rejection',
                    detail: 'Check whether this case intentionally rejects side-effect tools, as silent live eval does.',
                    verify: 'If rejection is expected, the case assertion should require rejected approval metrics.'
                },
                {
                    id: 'approval-risk-map',
                    label: 'Review risk mapping',
                    detail: 'Inspect risk classification, approval.required payload, and resolver output.',
                    verify: 'Only project_exec or configured high-risk tools require approval.'
                }
            ],
            missing_evidence: [
                {
                    id: 'evidence-source-open',
                    label: 'Verify source reads',
                    detail: 'Check whether the research route opened/read sources before synthesis.',
                    verify: 'Replay contains evidence.added events before synthesis starts.'
                },
                {
                    id: 'evidence-ledger-map',
                    label: 'Repair evidence ledger',
                    detail: 'Ensure opened primary/official sources are recorded with trustLevel and contentHash.',
                    verify: 'Quality no longer reports Research run has no evidence.'
                }
            ],
            citation_quality: [
                {
                    id: 'citation-marker-map',
                    label: 'Map citation markers',
                    detail: 'Compare final-answer markers with evidence ids and citation.verified payload.',
                    verify: 'Unmatched citation markers drop to zero.'
                },
                {
                    id: 'citation-trust-upgrade',
                    label: 'Upgrade cited evidence',
                    detail: 'Prefer opened official, academic, or primary sources for cited claims.',
                    verify: 'Weak citation count drops and trust distribution improves.'
                }
            ],
            model_contract: [
                {
                    id: 'contract-terminal-event',
                    label: 'Check terminal event',
                    detail: 'Inspect run.completed/run.failed/run.cancelled and response content for the failed assertion.',
                    verify: 'Replay status is completed and response content satisfies the assertion.'
                },
                {
                    id: 'contract-assertion-fit',
                    label: 'Validate assertion fit',
                    detail: 'Confirm the assertion describes required behavior instead of an overly narrow phrasing expectation.',
                    verify: 'The case fails only on real behavioral regressions.'
                }
            ],
            backend_unavailable: [
                {
                    id: 'backend-health',
                    label: 'Check backend health',
                    detail: 'Verify backend process, login state, endpoint path, CORS, and fetch status.',
                    verify: 'Backend-required live cases can read project/API endpoints.'
                },
                {
                    id: 'backend-fallback',
                    label: 'Keep fallback visible',
                    detail: 'Ensure frontend shows a clear backend unavailable warning instead of losing replay context.',
                    verify: 'Workbench still displays the failed case with diagnosis and traceability.'
                }
            ],
            auth_or_config: [
                {
                    id: 'auth-key-session',
                    label: 'Verify model key',
                    detail: 'Confirm the current frontend session has a valid model API key and provider config.',
                    verify: 'Safe live smoke case can call the model and produce a non-empty response.'
                },
                {
                    id: 'auth-config-error',
                    label: 'Expose config error',
                    detail: 'Keep missing/invalid key failures explicit in Live Eval rather than swallowing them as generic runtime errors.',
                    verify: 'Live Eval failure text mentions key/config cause.'
                }
            ],
            runtime_unavailable: [
                {
                    id: 'runtime-load-order',
                    label: 'Verify load order',
                    detail: 'Check modules.js loads AgentRuntime, DeepSeekClient, ToolRegistry, and dependencies before Workbench actions.',
                    verify: 'Browser console has no missing global or constructor errors.'
                },
                {
                    id: 'runtime-smoke',
                    label: 'Run runtime smoke',
                    detail: 'Run a safe non-tool Live Eval case after fixing script load errors.',
                    verify: 'LIVE-001 reaches run.completed.'
                }
            ],
            performance_regression: [
                {
                    id: 'perf-stage-timing',
                    label: 'Inspect stage timing',
                    detail: 'Open replay timing and identify whether route, model, tool, or synthesis dominated latency.',
                    verify: 'Next batch no longer flags this case in slower cases.'
                },
                {
                    id: 'perf-timeout-budget',
                    label: 'Review timeout budget',
                    detail: 'Check backend/network/tool timeouts and avoid unbounded waits in tool execution.',
                    verify: 'Duration returns near the previous batch baseline.'
                }
            ],
            storage_traceability: [
                {
                    id: 'storage-local',
                    label: 'Check local persistence',
                    detail: 'Inspect agentRunStoreV1 and localStorage quota errors for failed saves.',
                    verify: 'AgentRunStore.saveRun returns a saved record for the case runId.'
                },
                {
                    id: 'storage-backend-mirror',
                    label: 'Check backend mirror',
                    detail: 'Verify backend AgentRun save/event append endpoints and login identity.',
                    verify: 'Open Run can replay the saved case from Workbench.'
                }
            ]
        };
        Object.keys(this.categories).forEach(id => {
            this.categories[id].runbook = this.runbooks[id] || [];
        });
    }

    diagnoseCase(caseResult = {}) {
        const item = caseResult || {};
        const textBundle = this.collectText(item);
        const text = textBundle.join('\n').toLowerCase();
        const findings = this.findingTitles(item);
        const categories = [];
        const add = (id, reason, patterns = []) => {
            if (categories.some(category => category.id === id)) return;
            const meta = this.categories[id] || { id, label: id, severity: 'low', tone: 'watch', nextSteps: [] };
            categories.push({
                ...meta,
                reason,
                signals: this.pickSignals(textBundle, patterns)
            });
        };

        if (this.hasAny(text, ['api key', 'model api key', 'configured model api key', 'invalid api', 'unauthorized', 'authentication', '401', '403', '密钥', '鉴权'])) {
            add('auth_or_config', 'Model provider configuration or authorization is blocking the run.', ['api key', 'model api key', 'unauthorized', '401', '403', '密钥']);
        }

        if (this.hasRuntimeUnavailableSignal(text)) {
            add('runtime_unavailable', 'Agent runtime dependencies were unavailable when the case executed.', ['agentruntime', 'deepseekclient', 'toolregistry', 'unavailable', 'not defined']);
        }

        if (this.hasBackendSignal(item, text)) {
            add('backend_unavailable', 'Backend-required services appear unavailable or returned an error.', ['backend', 'failed to fetch', 'fetch failed', '404', '500', 'connection refused', '/api/']);
        }

        if (this.hasAny(text, ['should route', 'should enter', 'selected tool', 'selectedtools', 'runtime mode should', 'mode should', 'prompt should enter', 'should not route', 'route read-only', 'route project', 'route research'])) {
            add('routing_failure', 'The router/mode/tool selection missed the expected contract.', ['should route', 'should enter', 'selected tool', 'runtime mode should', 'mode should']);
        }

        if (findings.has('tool failure observed') || this.hasAny(text, ['tool failure', 'tool failed', 'tool error', 'tool call(s) failed', 'tool execution', '工具执行错误', '工具失败', '调用工具失败'])) {
            add('tool_failure', 'At least one tool call failed during the run.', ['tool failure', 'tool failed', 'tool error', 'tool call(s) failed', '工具执行错误']);
        }

        if (findings.has('approval rejected') || this.hasAny(text, ['approval rejected', 'rejected approval', 'does not approve', 'approval request', '审批', '拒绝'])) {
            add('approval_rejection', 'An approval gate rejected a requested action.', ['approval rejected', 'rejected approval', 'does not approve', 'approval request', '拒绝']);
        }

        if (findings.has('research run has no evidence') || this.hasAny(text, ['no evidence', 'missing evidence', 'collect evidence', 'evidence > 0', '没有 evidence', '没有来源'])) {
            add('missing_evidence', 'The case expected research evidence but none was recorded.', ['research run has no evidence', 'no evidence', 'collect evidence', 'evidence > 0']);
        }

        if (findings.has('weak citations') || findings.has('unmatched citation markers') || this.hasAny(text, ['weak citation', 'unmatched citation', 'citation marker', 'citation markers', '引用'])) {
            add('citation_quality', 'Citation verification found weak or unmatched markers.', ['weak citation', 'unmatched citation', 'citation marker', '引用']);
        }

        if (this.hasAny(text, ['response content should not be empty', 'run should complete', 'should complete', 'quality score should', 'final answer', 'terminal event', 'run did not complete', 'no terminal event'])) {
            add('model_contract', 'The model response or AgentRun lifecycle missed a required assertion.', ['response content should not be empty', 'run should complete', 'quality score should', 'terminal event']);
        }

        if (findings.has('long run duration') || this.isSlow(item) || this.hasAny(text, ['timeout', 'timed out', 'long run duration', 'slow case', 'slower case'])) {
            add('performance_regression', 'The case duration or timeout signal needs review.', ['timeout', 'timed out', 'long run duration', 'slow']);
        }

        if (this.hasAny(text, ['agentrunstore did not save', 'agentrunstore save failed', 'batch was not saved', 'batch save failed', 'not saved', 'localstorage', 'traceability'])) {
            add('storage_traceability', 'Run or batch persistence failed for this eval result.', ['agentrunstore did not save', 'agentrunstore save failed', 'batch was not saved', 'not saved']);
        }

        const failed = item.pass === false || (Array.isArray(item.failures) && item.failures.length > 0);
        if (failed && !categories.length) {
            add('model_contract', 'The case failed without a narrower matching diagnostic signal.', []);
        }

        const ordered = this.sortCategories(categories);
        const primary = ordered[0] || null;
        return {
            caseId: item.id || '',
            title: item.title || '',
            pass: Boolean(item.pass),
            failed,
            score: Number.isFinite(item.score) ? item.score : null,
            grade: item.grade || '',
            categories: ordered,
            primaryCategory: primary?.id || '',
            primaryLabel: primary?.label || '',
            summary: primary
                ? `${primary.label}: ${primary.reason}`
                : failed ? 'Failed without a matched diagnostic signal.' : 'No diagnostic signals.',
            signals: this.pickSignals(textBundle, [])
        };
    }

    diagnoseBatch(batch = {}) {
        const cases = Array.isArray(batch.cases) ? batch.cases : [];
        const caseDiagnoses = cases.map(item => this.diagnoseCase(item));
        const batchWarnings = Array.isArray(batch.warnings) ? batch.warnings : [];
        const warningDiagnosis = batchWarnings.length
            ? this.diagnoseCase({
                id: batch.batchId || 'batch',
                title: 'Batch warnings',
                pass: batch.pass !== false,
                warnings: batchWarnings,
                failures: batch.pass === false ? batchWarnings : []
            })
            : null;
        const diagnoses = [
            ...caseDiagnoses.filter(item => item.categories.length || item.failed),
            ...(warningDiagnosis && warningDiagnosis.categories.length ? [warningDiagnosis] : [])
        ];
        const overview = this.summarizeDiagnoses(diagnoses);
        const batchDiagnosis = {
            batchId: batch.batchId || '',
            type: batch.type || '',
            total: Number.isFinite(batch.total) ? batch.total : cases.length,
            passed: Number.isFinite(batch.passed) ? batch.passed : cases.filter(item => item.pass).length,
            failed: Number.isFinite(batch.failed) ? batch.failed : cases.filter(item => !item.pass).length,
            pass: batch.pass === undefined ? cases.length > 0 && cases.every(item => item.pass) : Boolean(batch.pass),
            caseDiagnoses,
            diagnoses,
            overview,
            topCategories: overview.topCategories,
            hasSignals: overview.signalCases > 0,
            hasFailures: overview.failedCases > 0
        };
        batchDiagnosis.remediation = this.buildRemediationPlan(batchDiagnosis);
        return batchDiagnosis;
    }

    summarizeDiagnoses(diagnoses = []) {
        const items = (Array.isArray(diagnoses) ? diagnoses : [])
            .filter(item => item && (item.categories?.length || item.failed));
        const counts = {};
        items.forEach(item => {
            const seen = new Set();
            (item.categories || []).forEach(category => {
                if (!category?.id || seen.has(category.id)) return;
                seen.add(category.id);
                if (!counts[category.id]) {
                    counts[category.id] = {
                        id: category.id,
                        label: category.label || category.id,
                        severity: category.severity || 'low',
                        tone: category.tone || 'watch',
                        count: 0,
                        failed: 0,
                        cases: [],
                        nextSteps: category.nextSteps || [],
                        runbook: category.runbook || this.categories[category.id]?.runbook || []
                    };
                }
                counts[category.id].count += 1;
                if (item.failed) counts[category.id].failed += 1;
                if (item.caseId) counts[category.id].cases.push(item.caseId);
            });
        });
        const topCategories = Object.values(counts)
            .sort((a, b) => (b.failed - a.failed)
                || (b.count - a.count)
                || (this.categoryOrder.indexOf(a.id) - this.categoryOrder.indexOf(b.id)));
        const failedCases = items.filter(item => item.failed).length;
        const signalCases = items.filter(item => item.categories?.length).length;
        const actionPlan = this.unique(topCategories
            .slice(0, 3)
            .flatMap(item => item.nextSteps || []))
            .slice(0, 5);

        return {
            failedCases,
            signalCases,
            categories: counts,
            topCategories,
            actionPlan,
            summaryText: topCategories.length
                ? this.summaryText(failedCases, signalCases, topCategories[0])
                : 'No diagnostic signals detected.'
        };
    }

    buildRemediationPlan(input = {}) {
        const diagnosis = input?.overview ? input : this.diagnoseBatch(input);
        const overview = diagnosis.overview || {};
        const topCategories = overview.topCategories || [];
        const failedCaseIds = this.failedCaseIdsForDiagnosis(diagnosis);
        const actions = [];
        topCategories.forEach((category, categoryIndex) => {
            const categoryMeta = this.categories[category.id] || category;
            const runbook = category.runbook || categoryMeta.runbook || [];
            runbook.forEach((step, stepIndex) => {
                actions.push({
                    id: step.id || `${category.id}-${stepIndex + 1}`,
                    categoryId: category.id,
                    categoryLabel: category.label || categoryMeta.label || category.id,
                    priority: categoryIndex + 1,
                    label: step.label || step.detail || '',
                    detail: step.detail || '',
                    verify: step.verify || '',
                    caseIds: this.caseIdsForCategory(diagnosis, category.id, { failedOnly: true })
                });
            });
        });
        const categoryReruns = topCategories
            .map(category => ({
                categoryId: category.id,
                label: category.label || category.id,
                caseIds: this.caseIdsForCategory(diagnosis, category.id, { failedOnly: true })
            }))
            .filter(item => item.caseIds.length > 0);

        return {
            summary: actions.length
                ? `${actions.length} runbook step(s) across ${topCategories.length} diagnostic category(ies).`
                : 'No remediation actions required.',
            actions: this.uniqueActions(actions).slice(0, 8),
            failedCaseIds,
            categoryReruns,
            canRerun: failedCaseIds.length > 0
        };
    }

    failedCaseIdsForDiagnosis(diagnosis = {}) {
        return this.unique((diagnosis.caseDiagnoses || [])
            .filter(item => item.failed && item.caseId)
            .map(item => item.caseId));
    }

    caseIdsForCategory(diagnosis = {}, categoryId, options = {}) {
        return this.unique((diagnosis.caseDiagnoses || [])
            .filter(item => item.caseId)
            .filter(item => !options.failedOnly || item.failed)
            .filter(item => (item.categories || []).some(category => category.id === categoryId))
            .map(item => item.caseId));
    }

    summaryText(failedCases, signalCases, topCategory) {
        const label = topCategory?.label || 'Unknown';
        const count = topCategory?.failed || topCategory?.count || 0;
        if (failedCases > 0) {
            return `${failedCases} failed case(s); top signal: ${label} (${count}).`;
        }
        if (signalCases > 0) {
            return `${signalCases} case(s) have warning/quality signals; top signal: ${label}.`;
        }
        return 'No diagnostic signals detected.';
    }

    collectText(item) {
        const rows = [];
        const push = value => {
            if (value === undefined || value === null) return;
            const text = typeof value === 'string' ? value : JSON.stringify(value);
            if (text) rows.push(text);
        };
        ['id', 'title', 'risk', 'grade'].forEach(key => push(item[key]));
        if (Number.isFinite(item.score)) push(`score ${item.score}`);
        if (Number.isFinite(item.durationMs)) push(`duration ${item.durationMs}ms`);
        ['usesTools', 'usesNetwork', 'requiresBackend', 'requiresApproval'].forEach(key => {
            if (item[key]) push(key);
        });
        (Array.isArray(item.failures) ? item.failures : []).forEach(push);
        (Array.isArray(item.warnings) ? item.warnings : []).forEach(push);
        (Array.isArray(item.assertions) ? item.assertions : [])
            .filter(assertion => assertion && assertion.pass === false)
            .forEach(assertion => push(assertion.message || assertion));
        (Array.isArray(item.findings) ? item.findings : []).forEach(finding => {
            push(finding?.title || finding);
            push(finding?.detail || '');
            push(finding?.severity || '');
        });
        return this.unique(rows);
    }

    findingTitles(item) {
        return new Set((Array.isArray(item.findings) ? item.findings : [])
            .map(finding => String(finding?.title || finding || '').toLowerCase())
            .filter(Boolean));
    }

    hasRuntimeUnavailableSignal(text) {
        const dependency = this.hasAny(text, ['agentruntime', 'deepseekclient', 'toolregistry', 'agent runtime']);
        const missing = this.hasAny(text, ['unavailable', 'not defined', 'cannot read', 'is not a constructor', 'missing']);
        return dependency && missing;
    }

    hasBackendSignal(item, text) {
        const backendText = this.hasAny(text, ['backend', 'failed to fetch', 'fetch failed', 'networkerror', '404', '500', '502', '503', 'connection refused', 'ecconnrefused', '/api/']);
        return Boolean(item.requiresBackend) && backendText;
    }

    hasAny(text, patterns) {
        return patterns.some(pattern => text.includes(String(pattern).toLowerCase()));
    }

    isSlow(item) {
        const duration = Number(item.durationMs);
        return Number.isFinite(duration) && duration > 300000;
    }

    pickSignals(textBundle, patterns = [], limit = 3) {
        const loweredPatterns = patterns.map(pattern => String(pattern).toLowerCase()).filter(Boolean);
        const matches = textBundle.filter(text => {
            if (!loweredPatterns.length) return true;
            const lowered = String(text).toLowerCase();
            return loweredPatterns.some(pattern => lowered.includes(pattern));
        });
        return this.unique(matches)
            .slice(0, limit)
            .map(text => {
                const value = String(text);
                return value.length <= 180 ? value : `${value.slice(0, 177)}...`;
            });
    }

    sortCategories(categories) {
        return [...categories].sort((a, b) => {
            const ai = this.categoryOrder.indexOf(a.id);
            const bi = this.categoryOrder.indexOf(b.id);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
    }

    unique(items) {
        return Array.from(new Set((items || []).filter(item => item !== undefined && item !== null && item !== '')));
    }

    uniqueActions(actions) {
        const seen = new Set();
        return (actions || []).filter(action => {
            const key = action.id || `${action.categoryId}:${action.label}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

window.AgentEvalDiagnostics = AgentEvalDiagnostics;
window.agentEvalDiagnostics = new AgentEvalDiagnostics();
