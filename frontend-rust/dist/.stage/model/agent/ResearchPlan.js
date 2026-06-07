/**
 * AgentResearchPlan builds a lightweight structured research artifact.
 *
 * It does not route tools or force workflow steps. The runtime uses it as a
 * harness record for research-like and research-writing runs.
 */
(function () {
    class AgentResearchPlan {
        constructor(runtime) {
            this.runtime = runtime;
        }

        shouldCreate(plan = {}) {
            return this.runtime.isEvidenceSeekingPlan(plan)
                || Boolean(plan?.policyFlags?.needsResearchPlan)
                || Boolean(plan?.writingContract?.needsResearch);
        }

        create(plan = {}, userMessage = '') {
            if (!this.shouldCreate(plan)) return null;
            const contract = plan.writingContract || null;
            const deliverable = plan.policyFlags?.deliverable || contract?.deliverable || 'answer';
            const now = new Date().toISOString();
            const mainQuestion = this.runtime.cleanOneLine(userMessage || 'Research task');

            return {
                id: `rplan-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
                kind: 'research_plan',
                status: 'active',
                created_at: now,
                updated_at: now,
                mode: plan.mode || 'chat',
                researchProfile: plan.researchProfile || 'none',
                deliverable,
                task: this.runtime.previewValue(mainQuestion, 700),
                questions: this.buildQuestions(plan, mainQuestion),
                source_strategy: this.buildSourceStrategy(plan),
                coverage_goals: {
                    sourceTarget: Number(plan.sourceTarget || 0),
                    citationTarget: Number(plan.citationTarget || 0),
                    softTargets: true
                },
                gaps: [],
                notes: []
            };
        }

        buildQuestions(plan = {}, mainQuestion = '') {
            const questions = [{
                id: 'q-main',
                text: this.runtime.previewValue(mainQuestion, 280),
                role: 'main',
                status: 'open'
            }];
            const contract = plan.writingContract || {};
            const deliverable = contract.deliverable || plan.policyFlags?.deliverable || 'answer';
            const add = (id, text) => questions.push({ id, text, role: 'supporting', status: 'open' });

            if (contract.needsResearch || this.runtime.isEvidenceSeekingPlan(plan)) {
                add('q-context', 'What is the relevant background, current state, and source landscape?');
                add('q-evidence', 'Which claims need direct evidence, data, examples, or primary sources?');
            }
            if (plan.policyFlags?.needsCounterEvidence || deliverable === 'literature_review') {
                add('q-counter', 'What counter-evidence, disagreement, limitations, or uncertainty should be represented?');
            }
            if (contract.needsOutline || ['research_report', 'paper', 'article', 'white_paper'].includes(deliverable)) {
                add('q-structure', 'What structure will best serve the target reader and deliverable?');
            }
            return questions;
        }

        buildSourceStrategy(plan = {}) {
            const profile = plan.researchProfile || 'none';
            const selectedTools = Array.isArray(plan.selectedTools) ? plan.selectedTools : [];
            const priorities = ['primary', 'official', 'high_authority', 'recent_when_relevant'];
            if (profile === 'academic') priorities.unshift('peer_reviewed_or_paper');
            if (profile === 'news_brief') priorities.unshift('reputable_news', 'category_breadth');
            if (profile === 'industry') priorities.unshift('market_data', 'company_disclosure', 'industry_report', 'supply_chain');
            if (plan.policyFlags?.needsCounterEvidence) priorities.push('counter_evidence');

            return {
                profile,
                preferred_source_types: Array.from(new Set(priorities)),
                planned_tools: selectedTools.filter(name => [
                    'community_snapshot',
                    'web_research',
                    'search_urls',
                    'read_webpage',
                    'news_query',
                    'agent_earth_run'
                ].includes(name)),
                avoid: ['baidu', 'search_result_pages_as_final_evidence', 'uncited_or_unverifiable_claims']
            };
        }

        updateFromSourceLibrary(researchPlan, sourceLibrary = null) {
            if (!researchPlan) return null;
            const metrics = sourceLibrary?.metrics || {};
            const gaps = [];
            const sourceTarget = Number(researchPlan.coverage_goals?.sourceTarget || 0);
            const uniqueUrls = Number(metrics.uniqueUrls || 0);
            const readableCount = Number(metrics.readableCount || 0);

            if (sourceTarget > 0 && uniqueUrls > 0 && uniqueUrls < Math.max(4, Math.floor(sourceTarget * 0.35))) {
                gaps.push({
                    id: 'gap-source-breadth',
                    type: 'coverage',
                    severity: 'medium',
                    description: 'Source breadth is still thin relative to the soft target.'
                });
            }
            if (uniqueUrls > 0 && readableCount === 0) {
                gaps.push({
                    id: 'gap-readable-evidence',
                    type: 'readability',
                    severity: 'high',
                    description: 'Sources were found, but no readable evidence item has been captured yet.'
                });
            }

            researchPlan.gaps = gaps;
            researchPlan.updated_at = new Date().toISOString();
            if (metrics.uniqueUrls || metrics.totalSources) {
                researchPlan.status = gaps.some(gap => gap.severity === 'high') ? 'needs_more_evidence' : 'evidence_collecting';
            }
            return researchPlan;
        }
    }

    window.AgentResearchPlan = AgentResearchPlan;
})();
