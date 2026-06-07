/**
 * AgentEvidenceLedger owns evidence capture and ledger maintenance.
 *
 * AgentRuntime remains the run-loop owner. This module converts tool results
 * into normalized evidence entries, deduplicates them, caps ledger growth, and
 * exposes source scoring/stat helpers for citation and coverage checks.
 */
(function () {
    class AgentEvidenceLedger {
        constructor(runtime) {
            this.runtime = runtime;
            this.maxEvidenceItems = 160;
        }

        extractEntries(toolName, result) {
            const runtime = this.runtime;
            const parsed = runtime.safeParseJson(result);
            const entries = [];
            const now = new Date().toISOString();

            if (parsed && Array.isArray(parsed.sources)) {
                parsed.sources.forEach(source => {
                    entries.push(this.normalizeEntry({
                        kind: 'source_candidate',
                        tool: toolName,
                        source_id: source.id,
                        title: source.title,
                        url: source.url,
                        query: source.query,
                        search_source: source.source,
                        snippet: source.snippet,
                        observed_at: now
                    }));
                });
            }

            if (parsed && Array.isArray(parsed.evidence)) {
                parsed.evidence.forEach(item => {
                    entries.push(this.normalizeEntry({
                        kind: item.error ? 'source_read_error' : 'opened_source',
                        tool: toolName,
                        source_id: item.source_id,
                        title: item.title,
                        url: item.url,
                        content_preview: item.content,
                        error: item.error,
                        truncated: item.truncated,
                        observed_at: now
                    }));
                });
            }

            if (parsed && Array.isArray(parsed.communities)) {
                parsed.communities.forEach(community => {
                    (community.items || []).forEach((item, index) => {
                        entries.push(this.normalizeEntry({
                            kind: 'community_snapshot_item',
                            tool: toolName,
                            source_id: `${community.id || community.name}-${index + 1}`,
                            title: item.title,
                            url: item.url,
                            community: community.name || community.id,
                            error: community.error || item.error,
                            observed_at: parsed.retrieved_at || now
                        }));
                    });
                });
            }

            if (parsed && parsed.provider === 'AgentEarth') {
                const selectedTool = parsed.recommend?.selected_tool || {};
                const title = selectedTool.tool_name || selectedTool.name || 'AgentEarth professional tool result';
                const executeText = this.extractAgentEarthText(parsed.execute);
                entries.push(this.normalizeEntry({
                    kind: 'external_tool_result',
                    tool: toolName,
                    source_id: 'agent-earth',
                    title,
                    url: selectedTool.tool_url || '',
                    content_preview: executeText || runtime.previewValue(parsed.execute, 500),
                    observed_at: now
                }));
            }

            if (parsed && parsed.url && (parsed.content || parsed.error)) {
                entries.push(this.normalizeEntry({
                    kind: parsed.error ? 'page_read_error' : 'opened_page',
                    tool: toolName,
                    url: parsed.url,
                    content_preview: parsed.content,
                    error: parsed.error,
                    filter: parsed.filter_applied,
                    chunk_index: parsed.chunk_index,
                    total_chunks: parsed.total_chunks,
                    observed_at: parsed.retrieved_at || now
                }));
            }

            if (Array.isArray(parsed)) {
                parsed.forEach((item, index) => {
                    entries.push(this.normalizeEntry({
                        kind: 'search_result',
                        tool: toolName,
                        source_id: index + 1,
                        title: item.title,
                        url: item.url,
                        snippet: item.snippet,
                        search_source: item.source,
                        observed_at: now
                    }));
                });
            }

            if (!entries.length) {
                runtime.extractUrls(String(result || '')).forEach((url, index) => {
                    entries.push(this.normalizeEntry({
                        kind: 'raw_url_reference',
                        tool: toolName,
                        source_id: index + 1,
                        url,
                        observed_at: now
                    }));
                });
            }

            return entries
                .filter(Boolean)
                .sort((a, b) => this.scoreSource(b) - this.scoreSource(a));
        }

        addEntry(runState, entry) {
            if (!runState || !entry) return null;
            if (!Array.isArray(runState.evidenceLedger)) runState.evidenceLedger = [];
            const normalizedEntry = window.AgentContract?.normalizeEvidenceEntry
                ? window.AgentContract.normalizeEvidenceEntry(entry, { runId: runState.runId })
                : { ...entry, id: `evd-${Date.now().toString(36)}-${runState.evidenceLedger.length + 1}`, runId: runState.runId };
            const key = [normalizedEntry.kind, normalizedEntry.source_id, normalizedEntry.url, normalizedEntry.title].filter(Boolean).join('|').toLowerCase();
            const existingIndex = runState.evidenceLedger.findIndex(existing => existing.dedupe_key === key);
            if (existingIndex >= 0) {
                if (this.scoreSource(normalizedEntry) <= this.scoreSource(runState.evidenceLedger[existingIndex])) return null;
                runState.evidenceLedger.splice(existingIndex, 1);
            }
            if (runState.evidenceLedger.length >= this.maxEvidenceItems) {
                const weakestIndex = this.findWeakestIndex(runState.evidenceLedger);
                if (weakestIndex < 0 || this.scoreSource(normalizedEntry) <= this.scoreSource(runState.evidenceLedger[weakestIndex])) return null;
                runState.evidenceLedger.splice(weakestIndex, 1);
            }
            const stored = { ...normalizedEntry, dedupe_key: key };
            runState.evidenceLedger.push(stored);
            this.updateMetrics(runState);
            this.runtime.emitEvent(runState, 'evidence.added', {
                evidence_id: stored.id,
                kind: stored.kind,
                source_id: stored.source_id,
                title: stored.title,
                url: stored.url,
                tool: stored.tool,
                trustLevel: stored.trustLevel,
                trustReason: stored.trustReason,
                sourceType: stored.sourceType,
                authorityScore: stored.authorityScore,
                recencyScore: stored.recencyScore,
                primarySource: stored.primarySource,
                sourceProfileReason: stored.sourceProfileReason,
                contentHash: stored.contentHash
            }, { stage: 'observe', visibility: 'history' });
            return stored;
        }

        normalizeEntry(entry) {
            const runtime = this.runtime;
            const normalized = {
                kind: entry.kind || 'unknown',
                tool: entry.tool || '',
                source_id: entry.source_id ?? '',
                title: runtime.cleanOneLine(entry.title || ''),
                url: runtime.cleanUrl(entry.url || ''),
                observed_at: entry.observed_at || new Date().toISOString()
            };
            ['query', 'search_source', 'community', 'filter', 'chunk_index', 'total_chunks', 'truncated', 'error'].forEach(key => {
                if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') normalized[key] = entry[key];
            });
            if (entry.snippet) normalized.snippet = runtime.previewValue(entry.snippet, 320);
            if (entry.content_preview) normalized.content_preview = runtime.previewValue(entry.content_preview, 500);
            if (!normalized.title && !normalized.url && !normalized.error) return null;
            return normalized;
        }

        scoreSource(entry) {
            let score = 0;
            if (entry?.url) score += 4;
            if (entry?.title) score += 3;
            if (entry?.snippet || entry?.content_preview) score += 1;
            if (['opened_source', 'opened_page'].includes(entry?.kind)) score += 4;
            score += Math.round((Number(entry?.authorityScore || 0) || 0) * 6);
            score += Math.round((Number(entry?.recencyScore || 0) || 0) * 2);
            if (entry?.primarySource) score += 3;
            if (entry?.error) score -= 8;
            return score;
        }

        findWeakestIndex(evidence = []) {
            if (!Array.isArray(evidence) || !evidence.length) return -1;
            let weakestIndex = 0;
            let weakestScore = this.scoreSource(evidence[0]);
            evidence.forEach((entry, index) => {
                const score = this.scoreSource(entry);
                if (score < weakestScore) {
                    weakestScore = score;
                    weakestIndex = index;
                }
            });
            return weakestIndex;
        }

        getDomains(evidence = []) {
            return new Set((Array.isArray(evidence) ? evidence : [])
                .map(entry => this.runtime.extractHostname(entry?.url || ''))
                .filter(Boolean));
        }

        getResearchStats(evidence = []) {
            const items = Array.isArray(evidence) ? evidence : [];
            const uniqueUrls = new Set(items.map(entry => this.runtime.cleanUrl(entry?.url || '')).filter(Boolean));
            const hosts = this.getDomains(items);
            const readableKinds = new Set(['opened_source', 'opened_page', 'community_snapshot_item']);
            const candidateKinds = new Set(['source_candidate', 'search_result', 'community_snapshot_item']);
            const sourceTypeCounts = {};
            let authorityTotal = 0;
            let authorityCount = 0;
            items.forEach(entry => {
                const type = entry?.sourceType || 'unknown';
                sourceTypeCounts[type] = (sourceTypeCounts[type] || 0) + 1;
                if (Number.isFinite(Number(entry?.authorityScore))) {
                    authorityTotal += Number(entry.authorityScore);
                    authorityCount += 1;
                }
            });
            return {
                uniqueUrls: uniqueUrls.size,
                hosts,
                readableCount: items.filter(entry => readableKinds.has(entry?.kind) && !entry?.error).length,
                candidateCount: items.filter(entry => candidateKinds.has(entry?.kind) && !entry?.error).length,
                errorCount: items.filter(entry => entry?.error || /error/i.test(entry?.kind || '')).length,
                primarySourceCount: items.filter(entry => entry?.primarySource && !entry?.error).length,
                highAuthorityCount: items.filter(entry => Number(entry?.authorityScore || 0) >= 0.75 && !entry?.error).length,
                averageAuthorityScore: authorityCount ? Number((authorityTotal / authorityCount).toFixed(3)) : 0,
                sourceTypeCounts
            };
        }

        updateMetrics(runState) {
            if (!runState) return;
            if (!runState.metrics) runState.metrics = {};
            const evidence = Array.isArray(runState.evidenceLedger) ? runState.evidenceLedger : [];
            const stats = this.getResearchStats(evidence);
            runState.metrics.evidence_items = evidence.length;
            runState.metrics.unique_source_urls = new Set(evidence.map(item => item.url).filter(Boolean)).size;
            runState.metrics.primary_source_count = stats.primarySourceCount;
            runState.metrics.high_authority_source_count = stats.highAuthorityCount;
            runState.metrics.average_authority_score = stats.averageAuthorityScore;
            runState.metrics.source_type_counts = stats.sourceTypeCounts;
        }

        extractAgentEarthText(executeResponse) {
            if (!executeResponse || typeof executeResponse !== 'object') return '';
            if (executeResponse.result_preview) return String(executeResponse.result_preview);
            const result = executeResponse.result;
            if (Array.isArray(result)) {
                return result
                    .map(item => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') return item.text || item.content || item.url || JSON.stringify(item);
                        return '';
                    })
                    .filter(Boolean)
                    .join('\n');
            }
            if (typeof result === 'string') return result;
            if (result && typeof result === 'object') return result.text || result.content || JSON.stringify(result);
            return '';
        }
    }

    window.AgentEvidenceLedger = AgentEvidenceLedger;
})();
