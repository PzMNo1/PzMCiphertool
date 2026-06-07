/**
 * AgentSourceLibrary turns the evidence ledger into a compact source catalog.
 *
 * It is a passive artifact: it summarizes what has been observed and does not
 * decide whether the model may answer.
 */
(function () {
    class AgentSourceLibrary {
        constructor(runtime) {
            this.runtime = runtime;
        }

        shouldCreate(plan = {}) {
            return this.runtime.isEvidenceSeekingPlan(plan)
                || Boolean(plan?.policyFlags?.needsSourceLibrary)
                || Boolean(plan?.writingContract?.needsResearch);
        }

        create(plan = {}) {
            if (!this.shouldCreate(plan)) return null;
            const now = new Date().toISOString();
            return {
                id: `slib-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
                kind: 'source_library',
                status: 'active',
                created_at: now,
                updated_at: now,
                mode: plan.mode || 'chat',
                researchProfile: plan.researchProfile || 'none',
                sources: [],
                metrics: this.emptyMetrics()
            };
        }

        emptyMetrics() {
            return {
                totalSources: 0,
                uniqueUrls: 0,
                readableCount: 0,
                primarySourceCount: 0,
                highAuthorityCount: 0,
                averageAuthorityScore: 0,
                sourceTypeCounts: {}
            };
        }

        update(sourceLibrary, evidence = []) {
            if (!sourceLibrary) return null;
            const items = Array.isArray(evidence) ? evidence : [];
            const byKey = new Map();
            items.forEach(entry => {
                const key = this.sourceKey(entry);
                if (!key) return;
                const current = byKey.get(key);
                if (!current || this.score(entry) > this.score(current)) {
                    byKey.set(key, entry);
                }
            });

            const sources = Array.from(byKey.values())
                .sort((a, b) => this.score(b) - this.score(a))
                .slice(0, 80)
                .map((entry, index) => this.toSourceItem(entry, index + 1));

            sourceLibrary.sources = sources;
            sourceLibrary.metrics = this.buildMetrics(sources, items);
            sourceLibrary.updated_at = new Date().toISOString();
            sourceLibrary.status = sources.length ? 'populated' : 'active';
            return sourceLibrary;
        }

        sourceKey(entry = {}) {
            return this.runtime.cleanUrl(entry.url || '')
                || this.runtime.cleanOneLine(entry.title || '').toLowerCase()
                || this.runtime.cleanOneLine(entry.source_id || '').toLowerCase();
        }

        score(entry = {}) {
            if (this.runtime.evidenceLedgerService) {
                return this.runtime.evidenceLedgerService.scoreSource(entry);
            }
            let score = 0;
            if (entry.url) score += 4;
            if (entry.title) score += 3;
            if (entry.content_preview || entry.snippet) score += 1;
            if (entry.primarySource) score += 3;
            score += Math.round((Number(entry.authorityScore || 0) || 0) * 6);
            if (entry.error) score -= 8;
            return score;
        }

        toSourceItem(entry = {}, index = 1) {
            return {
                id: entry.id || `src-${index}`,
                source_id: entry.source_id || '',
                title: entry.title || entry.url || `Source ${index}`,
                url: entry.url || '',
                host: this.runtime.extractHostname(entry.url || ''),
                kind: entry.kind || 'unknown',
                tool: entry.tool || '',
                sourceType: entry.sourceType || 'unknown',
                trustLevel: entry.trustLevel || 'unknown',
                authorityScore: Number(entry.authorityScore || 0) || 0,
                recencyScore: Number(entry.recencyScore || 0) || 0,
                primarySource: Boolean(entry.primarySource),
                readable: ['opened_source', 'opened_page', 'community_snapshot_item', 'external_tool_result'].includes(entry.kind) && !entry.error,
                error: entry.error || null,
                observed_at: entry.observed_at || ''
            };
        }

        buildMetrics(sources = [], evidence = []) {
            const stats = this.runtime.getResearchEvidenceStats(evidence);
            const sourceTypeCounts = {};
            sources.forEach(source => {
                const type = source.sourceType || 'unknown';
                sourceTypeCounts[type] = (sourceTypeCounts[type] || 0) + 1;
            });
            return {
                totalSources: sources.length,
                uniqueUrls: stats.uniqueUrls || 0,
                readableCount: stats.readableCount || 0,
                primarySourceCount: stats.primarySourceCount || 0,
                highAuthorityCount: stats.highAuthorityCount || 0,
                averageAuthorityScore: stats.averageAuthorityScore || 0,
                sourceTypeCounts: Object.keys(sourceTypeCounts).length ? sourceTypeCounts : (stats.sourceTypeCounts || {})
            };
        }
    }

    window.AgentSourceLibrary = AgentSourceLibrary;
})();
