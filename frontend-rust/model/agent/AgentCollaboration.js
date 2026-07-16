/**
 * AgentCollaboration describes visible multi-agent style coordination.
 *
 * It is intentionally lightweight: the main runtime remains the controller, and
 * collaborator roles become explicit plan/events/prompt contracts.
 */
(function () {
    class AgentCollaboration {
        constructor(runtime) {
            this.runtime = runtime;
        }

        createPlan(intent = {}, policy = {}) {
            const collaborators = this.selectCollaborators(intent, policy);
            if (!collaborators.length) {
                return {
                    enabled: false,
                    strategy: 'single_agent',
                    collaborators: [],
                    handoffs: [],
                    quality_gates: []
                };
            }

            return {
                enabled: true,
                strategy: this.resolveStrategy(intent, policy, collaborators),
                collaborators,
                display: this.buildDisplayPlan(intent, policy, collaborators),
                handoffs: this.buildHandoffs(collaborators),
                quality_gates: this.buildQualityGates(intent, policy, collaborators)
            };
        }

        buildPromptLines(plan = null) {
            const collaboration = plan?.collaboration;
            if (!collaboration?.enabled || !Array.isArray(collaboration.collaborators)) return [];
            const roleLines = collaboration.collaborators.map(agent => {
                const tools = Array.isArray(agent.toolFocus) && agent.toolFocus.length
                    ? ` Tool focus: ${agent.toolFocus.join(', ')}.`
                    : '';
                return `  - ${agent.label}: ${agent.mission}${tools}`;
            });
            const handoffLines = (collaboration.handoffs || []).map(handoff =>
                `  - ${handoff.from} -> ${handoff.to}: ${handoff.reason}`
            );
            const gateLines = (collaboration.quality_gates || []).map(gate => `  - ${gate}`);

            return [
                '- Multi-agent collaboration contract:',
                `  - Strategy: ${collaboration.strategy}. The host runtime is the controller; collaborator roles are internal workstreams, not separate user-visible personas.`,
                ...roleLines,
                handoffLines.length ? '  - Handoffs:' : '',
                ...handoffLines,
                gateLines.length ? '  - Quality gates:' : '',
                ...gateLines,
                '  - During final synthesis, merge collaborator outputs into one direct answer. Mention the collaboration only if it clarifies progress or limitations.'
            ].filter(Boolean);
        }

        emitStart(runtime, runState) {
            const collaboration = runState?.plan?.collaboration;
            if (!collaboration?.enabled) return;
            runtime.emitEvent(runState, 'collaboration.started', {
                strategy: collaboration.strategy,
                display: collaboration.display || null,
                collaborators: collaboration.collaborators.map(agent => ({
                    id: agent.id,
                    label: agent.label,
                    mission: agent.mission,
                    toolFocus: agent.toolFocus || []
                })),
                handoffs: collaboration.handoffs || [],
                quality_gates: collaboration.quality_gates || []
            }, { stage: 'plan', visibility: 'history' });
        }

        emitStage(runtime, runState, collaboratorId, status, payload = {}) {
            const collaborator = this.findCollaborator(runState?.plan?.collaboration, collaboratorId);
            if (!collaborator) return;
            runtime.emitEvent(runState, `collaboration.${status}`, {
                collaborator_id: collaborator.id,
                label: collaborator.label,
                mission: collaborator.mission,
                ...(payload || {})
            }, { stage: payload.stage || 'act', visibility: 'history' });
        }

        annotateRunState(runState) {
            if (!runState?.plan?.collaboration?.enabled) return;
            runState.collaboration = {
                ...runState.plan.collaboration,
                status: 'running',
                started_at: new Date().toISOString(),
                completed_at: null
            };
        }

        finalize(runState) {
            if (!runState?.collaboration) return;
            runState.collaboration.status = 'completed';
            runState.collaboration.completed_at = new Date().toISOString();
        }

        selectCollaborators(intent = {}, policy = {}) {
            const selected = [];
            const add = agent => {
                if (!selected.some(item => item.id === agent.id)) selected.push(agent);
            };

            const selectedTools = Array.isArray(policy.selectedTools) ? policy.selectedTools : [];
            const hasNetworkTools = this.runtime.hasNetworkTools(selectedTools);
            const hasProjectTools = selectedTools.some(name => ['list_files', 'read_file', 'search_files', 'file_info', 'propose_patch', 'run_tests', 'run_build'].includes(name));
            const hasWriting = Boolean(policy.writingContract?.active || intent.wantsLongformWriting);
            const hasEvidence = Boolean(intent.wantsFreshInfo || intent.wantsNewsBrief || intent.wantsAcademicResearch || hasNetworkTools);

            if (hasEvidence) {
                add({
                    id: 'researcher',
                    label: 'Research Agent',
                    mission: 'Map current facts, gather source candidates, and identify evidence gaps.',
                    toolFocus: selectedTools.filter(name => ['web_research', 'search_urls', 'read_webpage', 'news_query', 'community_snapshot', 'agent_earth_run'].includes(name))
                });
                add({
                    id: 'verifier',
                    label: 'Verifier Agent',
                    mission: 'Check source quality, citation fit, freshness, and conflicting claims.',
                    toolFocus: ['read_webpage', 'search_urls']
                });
            }

            if (hasProjectTools || intent.wantsProject) {
                add({
                    id: 'architect',
                    label: 'Project Analyst',
                    mission: 'Read project structure, locate relevant files, and preserve existing architecture.',
                    toolFocus: selectedTools.filter(name => ['list_files', 'read_file', 'search_files', 'file_info'].includes(name))
                });
                add({
                    id: 'implementer',
                    label: 'Implementation Agent',
                    mission: 'Propose focused changes, build or test through approved project tools, and report risks.',
                    toolFocus: selectedTools.filter(name => ['propose_patch', 'run_tests', 'run_build', 'update_plan'].includes(name))
                });
                add({
                    id: 'reviewer',
                    label: 'Review Agent',
                    mission: 'Review behavioral risks, missing tests, regressions, and unsafe operations before final synthesis.',
                    toolFocus: ['read_file', 'search_files', 'run_tests']
                });
            }

            if (hasWriting) {
                add({
                    id: 'writer',
                    label: 'Writer Agent',
                    mission: 'Turn evidence and analysis into the requested finished deliverable with coherent structure.',
                    toolFocus: []
                });
                add({
                    id: 'editor',
                    label: 'Editor Agent',
                    mission: 'Tighten readability, remove unsupported claims, and align tone with the user request.',
                    toolFocus: []
                });
            }

            if (intent.wantsCrypto || intent.wantsMath) {
                add({
                    id: 'solver',
                    label: 'Solver Agent',
                    mission: 'Use deterministic tools for calculations, ciphers, conversions, and puzzle-like checks.',
                    toolFocus: selectedTools.filter(name => !this.runtime.hasNetworkTools([name]))
                });
            }

            if (selected.length <= 1) return [];
            return selected.slice(0, 6);
        }

        resolveStrategy(intent = {}, policy = {}, collaborators = []) {
            if (intent.wantsProject) return 'project_handoff_review';
            if (intent.wantsNewsBrief) return 'parallel_research_then_editorial_synthesis';
            if (intent.wantsAcademicResearch) return 'research_verification_synthesis';
            if (policy.writingContract?.active) return 'research_writer_editor_pipeline';
            if (collaborators.some(agent => agent.id === 'solver')) return 'specialist_solver_review';
            return 'parallel_specialists';
        }

        buildHandoffs(collaborators = []) {
            const ids = collaborators.map(agent => agent.id);
            const handoffs = [];
            const add = (from, to, reason) => {
                if (ids.includes(from) && ids.includes(to)) handoffs.push({ from, to, reason });
            };
            add('researcher', 'verifier', 'Verify source quality before synthesis.');
            add('architect', 'implementer', 'Implementation should follow project structure discovered by analysis.');
            add('implementer', 'reviewer', 'Review risks and tests before final answer.');
            add('researcher', 'writer', 'Writer uses evidence only after source collection.');
            add('verifier', 'writer', 'Writer removes or labels weak claims.');
            add('writer', 'editor', 'Editor tightens the final deliverable.');
            add('solver', 'reviewer', 'Reviewer checks deterministic output and edge cases.');
            return handoffs;
        }

        buildDisplayPlan(intent = {}, policy = {}, collaborators = []) {
            const ids = new Set(collaborators.map(agent => agent.id));
            const lanes = [];
            const add = lane => {
                if (!lanes.some(item => item.id === lane.id)) lanes.push(lane);
            };

            if (ids.has('researcher')) {
                add({
                    id: 'research',
                    label: '资料',
                    mission: '检索、阅读、整理证据',
                    sourceAgents: collaborators.filter(agent => ['researcher'].includes(agent.id)).map(agent => agent.id)
                });
            }

            if (ids.has('architect') || ids.has('implementer')) {
                add({
                    id: 'execution',
                    label: '执行',
                    mission: '读项目、推进改动、运行验证',
                    sourceAgents: collaborators.filter(agent => ['architect', 'implementer'].includes(agent.id)).map(agent => agent.id)
                });
            } else if (ids.has('writer')) {
                add({
                    id: 'writing',
                    label: '成稿',
                    mission: '把材料整理成最终答复',
                    sourceAgents: collaborators.filter(agent => ['writer'].includes(agent.id)).map(agent => agent.id)
                });
            } else if (ids.has('solver')) {
                add({
                    id: 'solving',
                    label: '解题',
                    mission: '计算、转换、校验结果',
                    sourceAgents: collaborators.filter(agent => ['solver'].includes(agent.id)).map(agent => agent.id)
                });
            }

            if (ids.has('verifier') || ids.has('reviewer') || ids.has('editor')) {
                add({
                    id: 'quality',
                    label: '质检',
                    mission: '查来源、风险、遗漏和表达质量',
                    sourceAgents: collaborators.filter(agent => ['verifier', 'reviewer', 'editor'].includes(agent.id)).map(agent => agent.id)
                });
            }

            if (!lanes.length && collaborators.length) {
                add({
                    id: 'auto',
                    label: '自动',
                    mission: '按任务需要自动分工',
                    sourceAgents: collaborators.map(agent => agent.id)
                });
            }

            return {
                modeLabel: this.getDisplayModeLabel(intent, policy),
                summary: this.getDisplaySummary(intent, policy, lanes),
                lanes: lanes.slice(0, 3)
            };
        }

        getDisplayModeLabel(intent = {}, policy = {}) {
            if (intent.wantsProject) return '项目协作';
            if (intent.wantsNewsBrief || intent.wantsAcademicResearch || intent.wantsFreshInfo) return '研究协作';
            if (policy.writingContract?.active || intent.wantsLongformWriting) return '写作协作';
            if (intent.wantsCrypto || intent.wantsMath) return '解题协作';
            return '自动协作';
        }

        getDisplaySummary(intent = {}, policy = {}, lanes = []) {
            if (!lanes.length) return '单 Agent 直接处理';
            if (intent.wantsProject) return '先读项目，再执行和质检';
            if (intent.wantsNewsBrief) return '先收集资料，再核验和整理';
            if (policy.writingContract?.active || intent.wantsLongformWriting) return '先找资料，再成稿和润色';
            return '系统自动分工，无需手动选择';
        }

        buildQualityGates(intent = {}, policy = {}, collaborators = []) {
            const gates = [];
            if (collaborators.some(agent => agent.id === 'verifier')) {
                gates.push('Important factual claims must be supported by collected evidence or labeled as uncertain.');
            }
            if (intent.wantsProject || collaborators.some(agent => agent.id === 'reviewer')) {
                gates.push('Final answer must include changed behavior, verification result, and residual risk when project tools are used.');
            }
            if (policy.writingContract?.active) {
                gates.push('Final deliverable must match requested audience, depth, structure, and citation policy.');
            }
            if (!gates.length) {
                gates.push('Final answer must merge collaborator findings without exposing raw internal logs.');
            }
            return gates;
        }

        findCollaborator(collaboration = null, id = '') {
            return (collaboration?.collaborators || []).find(agent => agent.id === id) || null;
        }
    }

    window.AgentCollaboration = AgentCollaboration;
})();
