/**
 * AgentPolicyResolver —— 极简计划解析。
 *
 * 不再根据意图细分研究模式/写作合同/新闻分类。
 * 产出统一的中性计划：工具全集交给模型自主路由。
 */
(function () {
    class AgentPolicyResolver {
        constructor(runtime) {
            this.runtime = runtime;
        }

        resolve(intent = {}) {
            const selectedTools = this.runtime.routeTools(intent);
            const wantsTools = Boolean(intent.wantsTools || selectedTools.length);
            return {
                selectedTools,
                researchProfile: 'agentic',
                agentEarthTargetCalls: 0,
                maxIterations: wantsTools ? 16 : 1,
                sourceTarget: 0,
                citationTarget: 0,
                writingContract: null,
                qualityGates: {},
                policyFlags: {
                    needsTools: wantsTools,
                    lightweight: !wantsTools,
                    deliverable: 'answer',
                    citationStyle: 'numeric',
                    sourceTarget: 0,
                    citationTarget: 0
                }
            };
        }
    }

    window.AgentPolicyResolver = AgentPolicyResolver;
})();
