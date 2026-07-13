/**
 * AgentCitationNormalizer owns final-answer citation/source-section mechanics.
 *
 * AgentRuntime remains the run-loop owner. This module handles only structural
 * citation invariants: source-section splitting, canonical citation numbering,
 * evidence-backed source rebuilds, and light final-answer normalization.
 */
(function () {
    class AgentCitationNormalizer {
        constructor(runtime) {
            this.runtime = runtime;
        }

        normalizeFinalResearchAnswer(content, plan, runState = null) {
            const runtime = this.runtime;
            const text = String(content || '');
            const hasEvidence = Array.isArray(runState?.evidenceLedger) && runState.evidenceLedger.length > 0;
            const hasSourceSection = this.hasSourceHeading(text);
            if (!text || (!runtime.isResearchLikeMode(plan?.mode) && !hasEvidence && !hasSourceSection)) return text;
            if (hasEvidence) {
                return this.rebuildEvidenceBackedSourceSection(text, runState, plan);
            }
            return runtime.normalizeSourceSection(text, runState, plan);
        }

        rebuildEvidenceBackedSourceSection(text, runState = null, plan = null) {
            const runtime = this.runtime;
            const value = String(text || '').trimEnd();
            if (!value) return value;

            const sourcePolicyPlan = runtime.resolveSourcePolicyPlan(plan, runState, value);
            const sourceParts = this.splitFinalSourceSection(value);
            const evidenceCatalog = runtime.buildEvidenceCitationCatalog(runState?.evidenceLedger || [], sourcePolicyPlan);
            if (!evidenceCatalog.length) {
                return sourceParts.hasSourceSection
                    ? runtime.normalizeSourceSection(value, runState, sourcePolicyPlan)
                    : value;
            }

            const targetCount = this.getCitationRepairTarget(sourcePolicyPlan, evidenceCatalog.length, sourceParts.body);
            const registry = this.createCitationRegistry();
            const usedEvidenceKeys = new Set();
            let autoCitationCount = 0;

            const lines = sourceParts.body.split('\n');
            const repairedLines = lines.map(line => {
                if (!this.isCitationCandidateLine(line)) return line;

                const existingIds = runtime.extractCitationMarkers(line);
                const claimText = runtime.cleanClaimForCitationMatch(line);
                const canonicalIds = [];
                const shouldDiversify = runtime.isNewsBriefPlan(sourcePolicyPlan)
                    || registry.entries.length < targetCount;

                existingIds.forEach(oldId => {
                    const resolved = this.resolveExistingCitationToEvidence(oldId, sourceParts.rawSourceMap, evidenceCatalog);
                    const resolvedScore = resolved ? runtime.scoreEvidenceClaimMatch(claimText, resolved) : 0;
                    const exactSourceMapping = Boolean(sourceParts.rawSourceMap?.has?.(String(oldId)))
                        && !runtime.isNewsBriefPlan(sourcePolicyPlan)
                        && !this.isWeakEvidenceForFinalSource(resolved);
                    if (resolved && (exactSourceMapping || this.isEvidenceClaimMatchAcceptable(resolved, resolvedScore, sourcePolicyPlan, true, shouldDiversify))) {
                        if (shouldDiversify && registry.useCount(resolved) > 0) return;
                        const id = registry.add(resolved);
                        if (id) {
                            canonicalIds.push(id);
                            usedEvidenceKeys.add(runtime.getEvidenceCandidateKey(resolved));
                        }
                    }
                });

                if (canonicalIds.length === 0 && existingIds.length > 0) {
                    const best = this.selectCitationMatches(claimText, evidenceCatalog, usedEvidenceKeys, 3, sourcePolicyPlan, true, registry, true);
                    best.forEach(match => {
                        const id = registry.add(match.entry);
                        if (id) {
                            canonicalIds.push(id);
                            usedEvidenceKeys.add(runtime.getEvidenceCandidateKey(match.entry));
                        }
                    });
                }

                if (!existingIds.length && registry.entries.length < targetCount) {
                    const best = this.selectCitationMatches(claimText, evidenceCatalog, usedEvidenceKeys, 1, sourcePolicyPlan, false, registry, true)[0];
                    if (this.isEvidenceClaimMatchAcceptable(best?.entry, best?.score, sourcePolicyPlan)) {
                        const id = registry.add(best.entry);
                        if (id) {
                            canonicalIds.push(id);
                            usedEvidenceKeys.add(runtime.getEvidenceCandidateKey(best.entry));
                            autoCitationCount += 1;
                        }
                    }
                }

                if (existingIds.length && registry.entries.length < targetCount && canonicalIds.length < 2) {
                    const supplemental = this.selectCitationMatches(claimText, evidenceCatalog, usedEvidenceKeys, 3, sourcePolicyPlan, true, registry, true);
                    supplemental.forEach(match => {
                        const id = registry.add(match.entry);
                        if (id && !canonicalIds.includes(id)) {
                            canonicalIds.push(id);
                            usedEvidenceKeys.add(runtime.getEvidenceCandidateKey(match.entry));
                            autoCitationCount += 1;
                        }
                    });
                }

                if (!canonicalIds.length) {
                    return existingIds.length ? this.removeCitationMarkers(line) : line;
                }
                return this.appendCanonicalCitationMarkers(line, canonicalIds);
            });

            if (registry.entries.length === 0) {
                return sourceParts.hasSourceSection
                    ? runtime.normalizeSourceSection(value, runState, sourcePolicyPlan)
                    : value;
            }

            const sourceLines = registry.entries.map(entry => `[${entry.id}] ${entry.body}`);
            const repairedBody = runtime.cleanRepeatedCitationMarkers(repairedLines.join('\n')).trimEnd();
            if (runState?.metrics) {
                runState.metrics.auto_citation_repairs = autoCitationCount;
                runState.metrics.canonical_source_count = registry.entries.length;
            }
            return runtime.normalizeFinalAnswerText(`${repairedBody}\n\n\u6765\u6e90\uff1a\n${sourceLines.join('\n')}`);
        }

        splitFinalSourceSection(text) {
            const value = String(text || '').trimEnd();
            const matches = Array.from(value.matchAll(this.sourceHeadingPattern()));
            if (!matches.length) {
                return {
                    body: value,
                    rawSourceMap: new Map(),
                    hasSourceSection: false
                };
            }

            const match = matches[matches.length - 1];
            const headingStart = match.index + (match[1] ? match[1].length : 0);
            const body = this.stripTrailingSourceSections(value.slice(0, headingStart));
            const sourceBlock = value.slice(headingStart);
            const heading = this.matchSourceHeadingAtStart(sourceBlock);
            const rawSources = heading ? sourceBlock.slice(heading[0].length).trim() : '';
            const rawSourceMap = new Map();
            Array.from(rawSources.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]\s*|$)/g)).forEach(item => {
                const id = String(item[1]);
                const bodyText = this.runtime.cleanSourceEntryText(item[2]);
                if (bodyText && !rawSourceMap.has(id)) rawSourceMap.set(id, bodyText);
            });
            return {
                body,
                rawSourceMap,
                hasSourceSection: true
            };
        }

        sourceHeadingPattern() {
            return /(^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(\u6765\u6e90|\u53c2\u8003|Sources|References)\s*(?:\*\*)?\s*[:\uff1a]?\s*(?:\*\*)?\s*(?=\n|$)/gi;
        }

        matchSourceHeadingAtStart(value) {
            return String(value || '').match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(\u6765\u6e90|\u53c2\u8003|Sources|References)\s*(?:\*\*)?\s*[:\uff1a]?\s*(?:\*\*)?\s*/i);
        }

        hasSourceHeading(value) {
            return this.sourceHeadingPattern().test(String(value || ''));
        }

        stripTrailingSourceSections(value) {
            let body = String(value || '').trimEnd();
            while (body) {
                const matches = Array.from(body.matchAll(this.sourceHeadingPattern()));
                if (!matches.length) return body;
                const match = matches[matches.length - 1];
                const headingStart = match.index + (match[1] ? match[1].length : 0);
                const trailing = body.slice(headingStart);
                if (!this.looksLikeSourceSection(trailing)) return body;
                body = body.slice(0, headingStart).trimEnd();
            }
            return body;
        }

        looksLikeSourceSection(value) {
            const heading = this.matchSourceHeadingAtStart(value);
            const body = heading ? String(value || '').slice(heading[0].length).trim() : String(value || '').trim();
            if (!body) return true;
            const sourceLikeLines = body
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => /\[\d+\]|https?:\/\/|agentearth\.ai|[\u2014-]{2,}/i.test(line));
            return sourceLikeLines.length >= 2 || /https?:\/\/|\[\d+\]/.test(body);
        }

        createCitationRegistry() {
            const runtime = this.runtime;
            const byKey = new Map();
            const entries = [];
            const keyUseCounts = new Map();
            return {
                entries,
                useCount: entry => {
                    const key = runtime.getEvidenceCandidateKey(entry);
                    return key ? (keyUseCounts.get(key) || 0) : 0;
                },
                add: entry => {
                    const key = runtime.getEvidenceCandidateKey(entry);
                    if (!key) return '';
                    if (byKey.has(key)) {
                        keyUseCounts.set(key, (keyUseCounts.get(key) || 0) + 1);
                        return byKey.get(key);
                    }
                    const body = runtime.formatEvidenceSource(entry);
                    if (!body) return '';
                    const id = String(entries.length + 1);
                    byKey.set(key, id);
                    keyUseCounts.set(key, 1);
                    entries.push({ id, key, entry, body });
                    return id;
                }
            };
        }

        resolveExistingCitationToEvidence(sourceId, rawSourceMap, evidenceCatalog) {
            const runtime = this.runtime;
            const rawBody = rawSourceMap?.get?.(String(sourceId)) || '';
            if (rawBody) {
                const stableRef = typeof runtime.extractStableSourceReference === 'function'
                    ? runtime.extractStableSourceReference({}, rawBody)
                    : null;
                const rawUrl = runtime.normalizeCitationUrl(stableRef?.url || runtime.extractFirstUrlFromText(rawBody));
                const rawTitle = runtime.normalizeCitationTitle(rawBody
                    .replace(/https?:\/\/\S+/ig, '')
                    .replace(/\b(?:pmid|arxiv|doi)\s*[:：]?\s*(?:10\.\d{4,9}\/[^\s"'<>）)]+|[0-9]{4}\.[0-9]{4,5}(?:v\d+)?|\d{5,10})\b/ig, ''));
                const byUrl = rawUrl
                    ? evidenceCatalog.find(entry => runtime.normalizeCitationUrl(entry.url || '') === rawUrl)
                    : null;
                if (byUrl) return byUrl;
                if (rawTitle) {
                    const byTitle = evidenceCatalog.find(entry => {
                        const title = runtime.normalizeCitationTitle(entry.title || '');
                        return title && (title.includes(rawTitle) || rawTitle.includes(title));
                    });
                    if (byTitle) return byTitle;
                }
            }

            const sameSourceId = evidenceCatalog.filter(entry => String(entry?.source_id ?? '').trim() === String(sourceId));
            if (sameSourceId.length === 1) return sameSourceId[0];
            if (sameSourceId.length > 1) {
                const readable = sameSourceId
                    .filter(entry => !this.isWeakEvidenceForFinalSource(entry))
                    .sort((a, b) => runtime.scoreEvidenceSource(b) - runtime.scoreEvidenceSource(a));
                return readable[0] || null;
            }
            return null;
        }

        getCitationRepairTarget(plan = null, availableCount = 0, body = '') {
            const runtime = this.runtime;
            const configured = Number(plan?.citationTarget || 0);
            const bodyCitationLines = this.countCitationCandidateLines(body);
            const evidenceBound = Math.max(1, Number(availableCount) || 0);
            const baseTarget = configured > 0
                ? configured
                : runtime.isNewsBriefPlan(plan)
                    ? Math.max(24, Math.ceil(bodyCitationLines * 0.7))
                    : runtime.isEvidenceSeekingPlan(plan)
                        ? 18
                        : 8;
            const bodyTarget = runtime.isNewsBriefPlan(plan)
                ? Math.max(16, Math.ceil(bodyCitationLines * 0.7))
                : runtime.isEvidenceSeekingPlan(plan)
                    ? Math.max(10, Math.ceil(bodyCitationLines * 0.55))
                    : Math.max(6, Math.ceil(bodyCitationLines * 0.35));
            return Math.max(1, Math.min(baseTarget, evidenceBound, bodyTarget));
        }

        getCitationAutoMatchScore(plan = null) {
            const runtime = this.runtime;
            if (runtime.isNewsBriefPlan(plan)) return 5;
            if (runtime.isAcademicResearchPlan(plan)) return 7;
            return 6;
        }

        isEvidenceClaimMatchAcceptable(entry, score = 0, plan = null, allowExistingRepair = false, diversifying = false) {
            if (!entry || !Number.isFinite(Number(score))) return false;
            const minimumScore = allowExistingRepair
                ? (diversifying && this.runtime.isNewsBriefPlan(plan) ? 4 : 5)
                : this.getCitationAutoMatchScore(plan);
            return Number(score) >= minimumScore;
        }

        selectCitationMatches(claimText, catalog, usedEvidenceKeys, limit, plan = null, allowExistingRepair = false, registry = null, preferUnused = false) {
            const runtime = this.runtime;
            const candidates = runtime.findBestEvidenceMatchesForClaim(
                claimText,
                catalog,
                usedEvidenceKeys,
                Math.max(12, Math.max(1, limit) * 4)
            ).filter(match => this.isEvidenceClaimMatchAcceptable(
                match?.entry,
                match?.score,
                plan,
                allowExistingRepair,
                preferUnused
            ));
            if (!candidates.length) return [];

            const unused = candidates.filter(match => {
                const key = runtime.getEvidenceCandidateKey(match.entry);
                return key && !usedEvidenceKeys.has(key) && (!registry?.useCount || registry.useCount(match.entry) === 0);
            });
            const pool = preferUnused && unused.length ? unused : candidates;
            return pool.slice(0, Math.max(1, limit));
        }

        countCitationCandidateLines(body) {
            return String(body || '')
                .split('\n')
                .filter(line => this.isCitationCandidateLine(line))
                .length;
        }

        isCitationCandidateLine(line) {
            const runtime = this.runtime;
            const raw = String(line || '');
            const text = runtime.cleanOneLine(runtime.stripCitationMarkers(raw));
            if (text.length < 12) return false;
            if (/^\s*#{1,6}\s+/.test(raw)) return false;
            if (/^\s*(```|---+|===+)/.test(raw)) return false;
            if (/^\s*\|/.test(raw) && !/\[[0-9,，\s]+\]|[\p{L}\p{N}\u4e00-\u9fff].*\|.*[\p{L}\p{N}\u4e00-\u9fff]/u.test(raw)) return false;
            if (this.matchSourceHeadingAtStart(raw) || /^\s*(\u5f15\u7528|Citations?)\s*[:\uff1a]?/i.test(raw)) return false;
            if (/^\s*\[[^\]]+\]\s*$/.test(raw)) return false;
            return /[\p{L}\p{N}\u4e00-\u9fff]/u.test(text);
        }

        appendCanonicalCitationMarkers(line, ids = []) {
            const uniqueIds = Array.from(new Set((ids || []).map(id => String(id || '').trim()).filter(Boolean)));
            if (!uniqueIds.length) return line;
            const cleaned = String(line || '')
                .replace(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g, '')
                .replace(/\s+([，。！？；：、,.!?;:])/g, '$1')
                .replace(/\s{2,}/g, ' ')
                .trimEnd();
            const marker = uniqueIds.map(id => `[${id}]`).join('');
            if (!cleaned) return marker;
            return `${cleaned} ${marker}`;
        }

        removeCitationMarkers(line) {
            return String(line || '')
                .replace(/\[((?:\d+\s*(?:[,，]\s*\d+\s*)*))\]/g, '')
                .replace(/\s+([，。！？；：、,.!?;:])/g, '$1')
                .replace(/\s{2,}/g, ' ')
                .trimEnd();
        }

        isWeakEvidenceForFinalSource(entry) {
            if (!entry || entry.error) return true;
            if (['page_read_error', 'source_read_error'].includes(entry.kind)) return true;
            if (['source_candidate', 'search_result'].includes(entry.kind)) {
                return !this.runtime.isStrongStableCitationCandidate?.(entry);
            }
            if (entry.kind === 'raw_url_reference') return true;
            if (['low', 'unknown'].includes(entry.trustLevel || 'unknown') && !this.runtime.isStrongStableCitationCandidate?.(entry)) return true;
            return false;
        }
    }

    window.AgentCitationNormalizer = AgentCitationNormalizer;
})();
