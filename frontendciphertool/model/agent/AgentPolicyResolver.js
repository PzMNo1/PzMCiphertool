/**
 * AgentPolicyResolver maps intent contracts to executable plan policy.
 *
 * Profile details remain in AgentProfiles. This resolver is the narrow bridge
 * between intent detection and the runtime plan object.
 */
(function () {
    class AgentPolicyResolver {
        constructor(runtime) {
            this.runtime = runtime;
        }

        resolve(intent) {
            const selectedTools = this.runtime.routeTools(intent);
            const parameters = this.runtime.agentProfiles
                ? this.runtime.agentProfiles.buildPlanParameters({ ...intent, selectedTools })
                : this.getFallbackParameters(intent);
            const writingContract = parameters.writingContract || intent?.writingContract || null;
            const qualityGates = parameters.qualityGates || writingContract?.qualityGates || {};

            return {
                selectedTools,
                researchProfile: parameters.researchProfile,
                agentEarthTargetCalls: parameters.agentEarthTargetCalls,
                maxIterations: parameters.maxIterations,
                sourceTarget: parameters.sourceTarget,
                citationTarget: parameters.citationTarget,
                writingContract,
                qualityGates,
                policyFlags: this.buildPolicyFlags(intent, writingContract, parameters, selectedTools)
            };
        }

        buildPolicyFlags(intent = {}, writingContract = null, parameters = {}, selectedTools = []) {
            const evidenceSeeking = Boolean(
                intent.wantsFreshInfo ||
                intent.wantsNewsBrief ||
                intent.wantsAcademicResearch ||
                intent.wantsMarket ||
                intent.wantsBusinessIntel ||
                writingContract?.needsResearch
            );
            const longform = Boolean(writingContract?.active);
            const hasNetworkTools = this.runtime.hasNetworkTools(selectedTools);
            return {
                needsTools: Boolean(intent.wantsTools || selectedTools.length),
                needsResearchPlan: Boolean(longform && writingContract?.needsResearch),
                needsSourceLibrary: Boolean(evidenceSeeking || hasNetworkTools),
                needsOutline: Boolean(longform && writingContract?.needsOutline),
                needsCitations: Boolean(writingContract?.needsCitations || evidenceSeeking),
                needsClaimCheck: Boolean(writingContract?.needsClaimCheck || intent.wantsAcademicResearch),
                needsCounterEvidence: Boolean(intent.wantsAcademicResearch || writingContract?.deliverable === 'literature_review'),
                needsStylePass: Boolean(writingContract?.needsStylePass),
                lightweight: !evidenceSeeking && !longform && !hasNetworkTools,
                deliverable: writingContract?.active ? writingContract.deliverable : 'answer',
                citationStyle: writingContract?.citationStyle || 'numeric',
                sourceTarget: Number(parameters.sourceTarget || 0),
                citationTarget: Number(parameters.citationTarget || 0)
            };
        }

        getFallbackParameters(intent = {}) {
            return {
                researchProfile: 'none',
                agentEarthTargetCalls: 0,
                maxIterations: intent.mode === 'chat' ? 1 : 6,
                sourceTarget: 0,
                citationTarget: 0,
                writingContract: intent.writingContract || null,
                qualityGates: intent.writingContract?.qualityGates || {},
                policyFlags: this.buildPolicyFlags(intent, intent.writingContract || null, {}, [])
            };
        }
    }

    window.AgentPolicyResolver = AgentPolicyResolver;
})();
