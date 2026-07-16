/**
 * AgentCitationVerifier maps final-answer citation markers back to evidence.
 *
 * It owns verification mechanics only. Evidence extraction/scoring lives in
 * AgentEvidenceLedger, with AgentRuntime exposing compatibility helpers.
 */
(function () {
    class AgentCitationVerifier {
        constructor(runtime) {
            this.runtime = runtime;
        }

        verify(runState, finalContent, citationMarkers) {
            const runtime = this.runtime;
            const sourceLines = this.extractCitationSourceLines(finalContent);
            const matched = [];
            const unmatched = [];
            const weak = [];
            const citedEvidenceIds = new Set();
            const evidenceBySourceId = new Map();
            const evidenceByUrl = new Map();
            const evidenceByTitle = new Map();

            runState.evidenceLedger.forEach(entry => {
                const sourceIds = [
                    entry.source_id,
                    entry.sourceId,
                    /^\d+$/.test(String(entry.source_id || '')) ? Number(entry.source_id) : ''
                ].map(value => String(value ?? '').trim()).filter(Boolean);
                sourceIds.forEach(sourceId => runtime.pushMapValue(evidenceBySourceId, sourceId, entry));
                const normalizedUrl = runtime.normalizeCitationUrl(entry.url || '');
                if (normalizedUrl) runtime.pushMapValue(evidenceByUrl, normalizedUrl, entry);
                const normalizedTitle = runtime.normalizeCitationTitle(entry.title || '');
                if (normalizedTitle) runtime.pushMapValue(evidenceByTitle, normalizedTitle, entry);
            });

            citationMarkers.forEach(marker => {
                const sourceLine = sourceLines.get(marker) || {};
                const candidates = new Map();
                (evidenceBySourceId.get(marker) || []).forEach(entry => candidates.set(entry.id, entry));
                const lineUrl = runtime.normalizeCitationUrl(sourceLine.url || '');
                if (lineUrl) {
                    (evidenceByUrl.get(lineUrl) || []).forEach(entry => candidates.set(entry.id, entry));
                }
                const lineTitle = runtime.normalizeCitationTitle(sourceLine.title || '');
                if (lineTitle) {
                    (evidenceByTitle.get(lineTitle) || []).forEach(entry => candidates.set(entry.id, entry));
                }

                const entries = Array.from(candidates.values());
                if (!entries.length) {
                    unmatched.push({
                        marker,
                        source_line: sourceLine.raw || ''
                    });
                    return;
                }

                const claimId = `citation:${marker}`;
                entries.forEach(entry => {
                    entry.usedInFinalAnswer = true;
                    if (!Array.isArray(entry.claimIds)) entry.claimIds = [];
                    if (!entry.claimIds.includes(claimId)) entry.claimIds.push(claimId);
                    citedEvidenceIds.add(entry.id);
                });

                const strongestTrustLevel = this.getStrongestTrustLevel(entries);
                const matchedItem = {
                    marker,
                    evidence_ids: entries.map(entry => entry.id),
                    source_line: sourceLine.raw || '',
                    strongestTrustLevel
                };
                matched.push(matchedItem);
                if (entries.every(entry => this.isWeakEvidence(entry))) {
                    weak.push({
                        marker,
                        evidence_ids: matchedItem.evidence_ids,
                        reason: 'citation only maps to search candidates, raw URLs, errors, or low-trust evidence'
                    });
                }
            });

            return {
                matched,
                unmatched,
                weak,
                citedEvidenceCount: citedEvidenceIds.size,
                uncitedEvidenceCount: Math.max(0, runState.evidenceLedger.length - citedEvidenceIds.size)
            };
        }

        extractCitationSourceLines(text) {
            const runtime = this.runtime;
            const lines = String(text || '').split('\n');
            const sources = new Map();
            lines.forEach(line => {
                const marker = line.match(/\[(\d+)\]/);
                if (!marker) return;
                const url = (line.match(/https?:\/\/[^\s"'<>）)]+/i) || [])[0] || '';
                const title = line
                    .replace(/\[(\d+)\]/g, '')
                    .replace(/https?:\/\/[^\s"'<>）)]+/ig, '')
                    .replace(/^[-*•\s:：]+/, '')
                    .trim();
                sources.set(String(marker[1]), {
                    raw: runtime.cleanOneLine(line),
                    url: runtime.cleanUrl(url),
                    title: runtime.cleanOneLine(title)
                });
            });
            return sources;
        }

        getStrongestTrustLevel(entries) {
            const rank = { unknown: 0, low: 1, medium: 2, high: 3, primary: 4 };
            return entries.reduce((best, entry) => {
                const level = entry.trustLevel || 'unknown';
                return (rank[level] || 0) > (rank[best] || 0) ? level : best;
            }, 'unknown');
        }

        isWeakEvidence(entry) {
            if (!entry || entry.error) return true;
            if (['source_candidate', 'search_result', 'raw_url_reference', 'page_read_error', 'source_read_error'].includes(entry.kind)) return true;
            return ['low', 'unknown'].includes(entry.trustLevel || 'unknown');
        }
    }

    window.AgentCitationVerifier = AgentCitationVerifier;
})();
