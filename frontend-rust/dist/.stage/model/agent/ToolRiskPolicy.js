/**
 * AgentToolRiskPolicy owns approval and risk-gate mechanics for tool execution.
 *
 * Tool metadata still comes from ToolRegistry/AgentContract. Runtime keeps the
 * execution loop; this policy handles the approval lifecycle around risky tools.
 */
(function () {
    class AgentToolRiskPolicy {
        constructor(runtime) {
            this.runtime = runtime;
        }

        async requestApproval(runState, name, args, metadata, call, container) {
            if (!runState || !metadata?.requiresApproval) return { status: 'approved', args };
            const runtime = this.runtime;
            runState.metrics.approval_required_count += 1;
            const approvalId = `approval-${runState.runId}-${runState.metrics.approval_required_count}`;
            const payload = {
                approval_id: approvalId,
                tool_call_id: call?.id || '',
                name,
                risk: metadata.risk || 'unknown',
                approvalMode: metadata.approvalMode || 'interactive_gate_v1',
                enforced: true,
                phase: 'phase2_interactive_gate',
                impact: metadata.impact || '',
                arguments_preview: runtime.previewValue(args || {}, 1200)
            };

            if (call) {
                call.status = 'waiting_approval';
                call.approval_required = true;
                call.approval_id = approvalId;
                call.risk = metadata.risk || '';
                call.approval_mode = payload.approvalMode;
                call.waiting_approval_at = new Date().toISOString();
            }

            runtime.ui.setAgentStage(container, 'act', 'active', `等待批准 ${name}`);
            runtime.ui.addAgentTrace(container, 'act', `Approval required before ${name}.`);
            const event = runtime.emitEvent(runState, 'approval.required', payload, { stage: 'act', visibility: 'audit' });

            let decision = null;
            if (runtime.ui?.waitForAgentApproval) {
                decision = await runtime.ui.waitForAgentApproval(container, event, { name, args, metadata });
            } else {
                decision = this.confirmApprovalFallback(name, metadata, args);
            }

            const normalizedDecision = this.normalizeApprovalDecision(decision, args);
            const approved = normalizedDecision.status === 'approved';
            if (approved) {
                runState.metrics.approval_count += 1;
            }
            if (call) {
                call.approval_status = normalizedDecision.status;
                call.approval_resolved_at = new Date().toISOString();
                call.approval_edited_args = Boolean(normalizedDecision.edited);
            }

            runtime.emitEvent(runState, 'approval.resolved', {
                approval_id: approvalId,
                tool_call_id: call?.id || '',
                name,
                status: normalizedDecision.status,
                approved,
                edited: normalizedDecision.edited,
                reason: normalizedDecision.reason || '',
                arguments_preview: runtime.previewValue(normalizedDecision.args || {}, 1200)
            }, { stage: 'act', visibility: 'audit' });

            if (!approved) {
                throw new Error(normalizedDecision.reason || `用户拒绝执行 ${name}`);
            }
            return normalizedDecision;
        }

        normalizeApprovalDecision(decision, originalArgs) {
            const normalized = decision && typeof decision === 'object' ? decision : {};
            const status = normalized.status === 'approved' ? 'approved' : 'rejected';
            const args = normalized.args === undefined ? originalArgs : normalized.args;
            return {
                status,
                args,
                reason: normalized.reason || '',
                edited: JSON.stringify(args || {}) !== JSON.stringify(originalArgs || {})
            };
        }

        confirmApprovalFallback(name, metadata, args) {
            const impact = metadata?.impact ? `\nImpact: ${metadata.impact}` : '';
            const preview = this.runtime.previewValue(args || {}, 900);
            const message = `Approve execution of ${name}?${impact}\n\nArguments:\n${preview}`;
            const approved = typeof window !== 'undefined' && typeof window.confirm === 'function'
                ? window.confirm(message)
                : false;
            return { status: approved ? 'approved' : 'rejected', args };
        }
    }

    window.AgentToolRiskPolicy = AgentToolRiskPolicy;
})();
