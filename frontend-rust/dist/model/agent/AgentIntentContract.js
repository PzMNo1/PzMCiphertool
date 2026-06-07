/**
 * AgentIntentContract turns a user turn into a structured intent contract.
 *
 * This is a mechanical extraction from AgentRuntime.createPlan. It does not add
 * new routing rules; it only names the existing signals so policy resolution can
 * happen outside the run loop.
 */
(function () {
    class AgentIntentContractBuilder {
        constructor(runtime) {
            this.runtime = runtime;
        }

        build(userMessage, options = {}) {
            const rawMessage = String(userMessage || '');
            const text = rawMessage.toLowerCase();
            const hasAttachments = Boolean(options.hasAttachments);
            const recentText = Array.isArray(options.messages)
                ? options.messages.slice(-8).map(msg => String(msg?.content || '')).join('\n').toLowerCase()
                : '';
            const directFreshInfo = /(最新|今天|现在|昨天|今年|新闻|搜索|查找|联网|网上|网页|网址|资料|来源|引用|链接|官网|文档|价格|政策|法规|版本|更新|发布|趋势|社区|前沿|现状|进展|进度|到了什么|最佳实践|推荐|对比|排名|论文|研究|评测|天气|current|latest|today|news|search|web|url|source|citation|weather|price|release|version|docs|documentation|paper|benchmark|recommend|compare|trend|state of the art|frontier|progress)/i.test(rawMessage)
                || this.hasFreshInfoSignal(rawMessage);
            const directCommunityScan = /(前沿社区|技术社区|开发者社区|社区|hacker news|github trending|product hunt|v2ex|reddit|lobsters)/i.test(rawMessage);
            const terseResearchFollowUp = /^(继续|继续吧|获取|获取吧|总结|总结吧|告诉我|说吧|再查|再查一下|查吧|拉出来|展开|深挖|继续获取|开始)$/i.test(rawMessage.trim());
            const directNewsBrief = this.isBroadDailyNewsRequest(rawMessage);
            const hasRecentResearchContext = /(web_research|read_webpage|search_urls|agent run 状态|["']?mode["']?\s*:\s*["']?(research|news_brief)|["']?researchprofile["']?\s*:\s*["']?news_brief|论文|研究|学术|来源|引用|检索|前沿|github trending|hacker news|product hunt|nature photonics|arxiv|doi|source ids?)/i.test(recentText);
            const hasRecentCommunityContext = /(社区|community|github trending|hacker news|product hunt|v2ex|reddit|lobsters|local llama|localllama)/i.test(recentText);
            const wantsCommunityScan = directCommunityScan || (terseResearchFollowUp && hasRecentCommunityContext);
            const industrySignal = /(产业|行业|研报|研究报告|行业报告|分析报告|市场规模|市场空间|市场份额|竞争格局|产业链|供应链|商业化|量产|投资|估值|营收|利润|毛利|capex|opex|tam|sam|som|cagr|asp|bom|unit economics|go[-\s]?to[-\s]?market|公司|企业|商业|竞品|市场|融资|财报|产品分析|business|company|market intelligence|competitor|industry|funding|earnings|product analysis)/i.test(rawMessage);
            const strongAcademicSignal = /(学术|论文|期刊|会议|顶会|顶刊|同行评审|正式发表|预印本|文献综述|系统综述|arxiv|airxiv|aixiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|review|journal|conference|proceedings|peer[-\s]?reviewed|publication|preprint|state of the art)/i.test(rawMessage);
            const researchTopicSignal = /(研究进展|研究到了|前沿|前沿研究|光学|光子|量子|物理|材料|生物|医学|化学|benchmark|评测)/i.test(rawMessage);
            const directAcademicResearch = !wantsCommunityScan
                && (strongAcademicSignal || (!industrySignal && researchTopicSignal));
            const hasRecentAcademicContext = /(论文|学术|期刊|会议|研究进展|前沿研究|arxiv|airxiv|nature|science|optica|ieee|acm|pubmed|doi|paper|academic|literature|journal|conference|proceedings|peer[-\s]?reviewed|publication|preprint|nature photonics)/i.test(recentText);
            const academicFollowUp = hasRecentAcademicContext
                && /(全是|都是|还有|有没有|其它|其他|换成|不要|除了|正式|期刊|会议|顶会|顶刊|同行评审|发表|非\s*arxiv|非\s*airxiv|non[-\s]?arxiv|beyond\s+arxiv|journal|conference|proceedings|peer[-\s]?reviewed|publication|published|not\s+arxiv|instead\s+of\s+arxiv)/i.test(rawMessage);
            let wantsAcademicResearch = directAcademicResearch || academicFollowUp || (terseResearchFollowUp && hasRecentAcademicContext);
            const wantsNewsBrief = directNewsBrief || (terseResearchFollowUp && /["']?mode["']?\s*:\s*["']?news_brief|["']?researchprofile["']?\s*:\s*["']?news_brief/i.test(recentText));
            let wantsFreshInfo = wantsNewsBrief || wantsAcademicResearch || directFreshInfo || (terseResearchFollowUp && hasRecentResearchContext);
            const newsBriefScope = wantsNewsBrief ? this.getNewsBriefScope(rawMessage) : null;
            const focusedNewsBrief = newsBriefScope && newsBriefScope.focus !== 'broad';
            const wantsCrypto = /(base64|凯撒|caesar|morse|摩斯|rot13|hex|哈希|hash|维吉尼亚|vigenere|频率|二进制|binary|url编码|解码|加密|解密|cipher)/i.test(userMessage);
            const wantsMath = /(计算|换算|单位|随机|calculate|convert|math|sqrt|sin|cos|\d+\s*[+\-*/%]\s*\d+)/i.test(userMessage);
            const wantsProject = !hasAttachments && /(代码|项目|文件|目录|读取|搜索文件|构建|测试|补丁|修改|java|javascript|css|html|read file|search files|build|test|patch|code|project|workspace)/i.test(userMessage);
            const wantsMarket = /(股票|行情|股价|币价|金融|财经|stock|quote|price|finance|crypto|ticker)/i.test(userMessage);
            const wantsLocalService = /(餐厅|咖啡|咖啡店|酒店|民宿|景点|附近|本地|评分|点评|路线|旅行|旅游|行程|地图|local|nearby|restaurant|coffee|hotel|attraction|rating|reviews|travel|trip|itinerary|map)/i.test(userMessage);
            const wantsMediaCreation = /(作图|生成|创作|海报|图片|图像|插画|视频|音频|音乐|封面|poster|image|picture|illustration|video|audio|music|cover|generate|create)/i.test(userMessage);
            const wantsBusinessIntel = industrySignal;
            const writingContract = this.buildWritingContract(rawMessage, {
                wantsAcademicResearch,
                wantsNewsBrief,
                hasAttachments
            });
            const wantsLongformWriting = writingContract.deliverable !== 'none';
            const wantsResearchWriting = wantsLongformWriting && writingContract.needsResearch;
            const wantsIndustryResearch = wantsBusinessIntel
                || ['research_report', 'white_paper'].includes(writingContract.deliverable);
            if (['paper', 'literature_review'].includes(writingContract.deliverable)) {
                wantsAcademicResearch = true;
            }
            if (wantsResearchWriting) {
                wantsFreshInfo = true;
            }
            const agentEarthExcluded = wantsCrypto || wantsMath || wantsProject;
            const agentEarthRelevant = wantsFreshInfo
                || wantsMarket
                || wantsNewsBrief
                || wantsResearchWriting
                || wantsLocalService
                || wantsMediaCreation
                || wantsBusinessIntel
                || hasAttachments
                || Boolean(options.toolEnabled);
            const wantsAgentEarth = !agentEarthExcluded && agentEarthRelevant;
            const wantsTools = Boolean(options.toolEnabled || wantsFreshInfo || wantsResearchWriting || wantsCrypto || wantsMath || wantsProject || wantsMarket || wantsAgentEarth || hasAttachments);
            const mode = wantsNewsBrief ? 'news_brief' : wantsFreshInfo ? 'research' : wantsTools ? 'agent' : 'chat';

            return {
                rawMessage,
                text,
                mode,
                recentText,
                hasAttachments,
                toolEnabled: Boolean(options.toolEnabled),
                wantsFreshInfo,
                wantsCrypto,
                wantsMath,
                wantsProject,
                wantsMarket,
                wantsAgentEarth,
                wantsTools,
                wantsAcademicResearch,
                wantsNewsBrief,
                wantsCommunityScan,
                focusedNewsBrief,
                wantsLocalService,
                wantsMediaCreation,
                wantsBusinessIntel,
                wantsIndustryResearch,
                wantsLongformWriting,
                wantsResearchWriting,
                writingContract,
                newsBriefScope
            };
        }

        buildWritingContract(userMessage, signals = {}) {
            const raw = String(userMessage || '');
            const lower = raw.toLowerCase();
            const deliverable = this.detectWritingDeliverable(raw);
            if (deliverable === 'none') {
                return {
                    deliverable: 'none',
                    active: false,
                    needsResearch: false,
                    needsOutline: false,
                    needsCitations: false,
                    needsClaimCheck: false,
                    needsStylePass: false,
                    audience: 'general',
                    depth: 'none',
                    citationStyle: 'numeric',
                    styleProfile: 'default',
                    qualityGates: {}
                };
            }

            const academicDeliverable = ['paper', 'literature_review'].includes(deliverable);
            const reportDeliverable = ['research_report', 'white_paper'].includes(deliverable);
            const depth = /(深度|完整|全面|系统|详尽|长文|万字|long[-\s]?form|deep|comprehensive|in-depth|full)/i.test(raw)
                || academicDeliverable
                || reportDeliverable
                ? 'deep'
                : /(简短|快速|概要|提纲|brief|quick|short|outline)/i.test(raw)
                ? 'quick'
                : 'standard';
            const sourceSignal = /(来源|引用|参考文献|资料|数据|证据|调研|研究|论文|文献|官网|报告|citation|source|reference|bibliography|data|evidence|research)/i.test(raw);
            const needsResearch = academicDeliverable || reportDeliverable || sourceSignal || depth === 'deep' || Boolean(signals.hasAttachments);
            const audience = this.detectWritingAudience(raw, deliverable);
            const citationStyle = this.detectCitationStyle(raw, deliverable);
            const styleProfile = this.detectWritingStyleProfile(raw, deliverable, audience);
            const minSources = this.getWritingMinSources(deliverable, depth, needsResearch);
            const targetLength = this.getWritingTargetLength(deliverable, depth);

            return {
                deliverable,
                active: true,
                needsResearch,
                needsOutline: true,
                needsCitations: needsResearch,
                needsClaimCheck: needsResearch || academicDeliverable || reportDeliverable,
                needsStylePass: true,
                audience,
                depth,
                citationStyle,
                styleProfile,
                targetLength,
                qualityGates: {
                    minSources,
                    minCitations: needsResearch ? Math.max(4, Math.ceil(minSources * 0.65)) : 0,
                    minSections: depth === 'quick' ? 3 : academicDeliverable ? 6 : 5,
                    requireLead: true,
                    requireOutline: true,
                    requireClaimSupport: needsResearch || academicDeliverable || reportDeliverable,
                    requireReadableCadence: true
                }
            };
        }

        detectWritingDeliverable(userMessage) {
            const raw = String(userMessage || '');
            if (/(文献综述|综述论文|系统综述|literature review|systematic review|review article)/i.test(raw)) return 'literature_review';
            if (/(学术论文|论文|期刊论文|会议论文|paper|research paper|manuscript)/i.test(raw)) return 'paper';
            if (/(白皮书|white paper|whitepaper)/i.test(raw)) return 'white_paper';
            if (/(研报|研究报告|行业报告|分析报告|深度报告|调研报告|research report|market report|industry report|analysis report)/i.test(raw)) return 'research_report';
            if (/(深度文章|长文|专栏文章|公众号文章|博客文章|文章|essay|article|long[-\s]?form|feature story|op-ed)/i.test(raw)) return 'article';
            return 'none';
        }

        detectWritingAudience(userMessage, deliverable) {
            const raw = String(userMessage || '');
            if (/(投资人|高管|管理层|董事会|决策者|老板|executive|board|investor|decision maker)/i.test(raw)) return 'executive';
            if (/(开发者|工程师|技术|架构师|研究员|专家|technical|engineer|developer|expert|practitioner)/i.test(raw)) return 'technical';
            if (/(学术|导师|审稿|期刊|会议|大学|研究者|academic|reviewer|scholar|professor)/i.test(raw) || ['paper', 'literature_review'].includes(deliverable)) return 'academic';
            if (/(大众|小白|普通读者|公众号读者|general reader|public|beginner)/i.test(raw)) return 'general';
            return deliverable === 'research_report' ? 'executive' : 'general';
        }

        detectCitationStyle(userMessage, deliverable) {
            const raw = String(userMessage || '');
            if (/\bAPA\b/i.test(raw)) return 'APA';
            if (/\bMLA\b/i.test(raw)) return 'MLA';
            if (/\bIEEE\b/i.test(raw)) return 'IEEE';
            if (/(GB\/T|国标|中文参考文献)/i.test(raw)) return 'GB/T';
            return ['paper', 'literature_review'].includes(deliverable) ? 'numeric-academic' : 'numeric';
        }

        detectWritingStyleProfile(userMessage, deliverable, audience) {
            const raw = String(userMessage || '');
            if (/(风格化|有特色|现代|吸引人|故事感|叙事|专栏|公众号|feature|narrative|modern|distinctive)/i.test(raw)) return 'modern_feature';
            if (['paper', 'literature_review'].includes(deliverable)) return 'academic_clear';
            if (['research_report', 'white_paper'].includes(deliverable) || audience === 'executive') return 'executive_research';
            return 'modern_feature';
        }

        getWritingMinSources(deliverable, depth, needsResearch) {
            if (!needsResearch) return 0;
            const base = {
                paper: 16,
                literature_review: 22,
                research_report: 14,
                white_paper: 14,
                article: 8
            }[deliverable] || 8;
            if (depth === 'quick') return Math.max(4, Math.floor(base * 0.5));
            if (depth === 'deep') return Math.ceil(base * 1.25);
            return base;
        }

        getWritingTargetLength(deliverable, depth) {
            const deep = {
                paper: '3500-6000 words or equivalent Chinese length',
                literature_review: '4500-8000 words or equivalent Chinese length',
                research_report: '3000-6000 words or equivalent Chinese length',
                white_paper: '3500-6500 words or equivalent Chinese length',
                article: '2200-4200 words or equivalent Chinese length'
            };
            const standard = {
                paper: '2200-3800 words or equivalent Chinese length',
                literature_review: '2600-4500 words or equivalent Chinese length',
                research_report: '1800-3500 words or equivalent Chinese length',
                white_paper: '2200-4000 words or equivalent Chinese length',
                article: '1400-2600 words or equivalent Chinese length'
            };
            if (depth === 'quick') return '800-1600 words or equivalent Chinese length';
            return (depth === 'deep' ? deep : standard)[deliverable] || standard.article;
        }

        hasFreshInfoSignal(userMessage) {
            return /(\u4eca\u5929|\u4eca\u65e5|\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u6700\u8fd1|\u73b0\u5728|\u6700\u65b0|\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|\u641c\u7d22|\u67e5\u627e|\u8054\u7f51|\u6765\u6e90|\u5f15\u7528|\u94fe\u63a5|current|latest|today|recently|last few days|these days|news|headlines|brief|search|web|source|citation)/i.test(String(userMessage || ''));
        }

        isBroadDailyNewsRequest(userMessage) {
            const raw = String(userMessage || '');
            const text = raw.toLowerCase();
            const asksNews = /(\u4eca\u5929|\u4eca\u65e5|\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u6700\u8fd1|\u73b0\u5728|\u6700\u65b0|\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|news|today|recently|last few days|these days|headlines|daily brief|top stories)/i.test(raw);
            const categoryMatches = this.getNewsBriefCategoryMatches(raw).length;
            const broadScopeSignal = /(\u7efc\u5408|\u5168\u666f|\u603b\u89c8|\u5168\u90e8|\u5404\u7c7b|\u591a\u9886\u57df|\u56fd\u5185\u5916|\u6d77\u5185\u5916|overall|broad|across categories)/i.test(raw);
            const aggregateSignal = broadScopeSignal || /(\u5934\u6761|\u8981\u95fb|top news|headlines)/i.test(raw);
            const summarySignal = /(\u603b\u7ed3|\u6982\u89c8|\u6574\u7406|\u68b3\u7406|\u770b\u770b|\u6709\u4ec0\u4e48|\u54ea\u4e9b|\u7b80\u62a5|brief|summary|roundup|digest|overview)/i.test(raw);
            const simpleDailyNews = /(\u4eca\u5929|\u4eca\u65e5|\u6700\u65b0|today|daily).{0,12}(\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5|news|headlines|brief)|(\u65b0\u95fb|\u5934\u6761|\u8981\u95fb|\u7b80\u62a5).{0,12}(\u4eca\u5929|\u4eca\u65e5|\u6700\u65b0|today|daily)/i.test(raw)
                || /^(\u65b0\u95fb|\u4eca\u65e5\u65b0\u95fb|\u4eca\u5929\u65b0\u95fb|news|today news)$/i.test(raw.trim());
            const recentEventsQuestion = /(\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u8fd9\u4e24\u5929|\u6700\u8fd1|recently|last few days|these days).{0,16}(\u53d1\u751f\u4e86\u4ec0\u4e48|\u6709\u4ec0\u4e48\u4e8b|\u6709\u4ec0\u4e48\u65b0\u95fb|\u5927\u4e8b|\u8981\u95fb|\u52a8\u6001|what happened|what is happening|what's going on)/i.test(raw);
            const aiSignal = /(^|[^a-z])ai([^a-z]|$)|\u4eba\u5de5\u667a\u80fd|\u5927\u6a21\u578b|\u667a\u80fd\u4f53|openai|anthropic|deepmind|llm|machine learning/i.test(text);
            const technologyOnlySignal = categoryMatches === 1 && /(\u79d1\u6280|\u79d1\u5b66|technology|science|tech)/i.test(raw);
            if (recentEventsQuestion && !(aiSignal || technologyOnlySignal)) return true;
            if (!asksNews) return false;
            if (categoryMatches >= 2 || broadScopeSignal) return true;
            if (aiSignal || technologyOnlySignal) return false;
            if (categoryMatches === 1) return summarySignal || aggregateSignal || simpleDailyNews;
            return aggregateSignal || summarySignal || simpleDailyNews;
        }

        getNewsBriefScope(userMessage) {
            const raw = String(userMessage || '');
            const categories = this.getNewsBriefCategoryMatches(raw);
            const broadScopeSignal = /(\u7efc\u5408|\u5168\u666f|\u603b\u89c8|\u5168\u90e8|\u5404\u7c7b|\u591a\u9886\u57df|\u56fd\u5185\u5916|\u6d77\u5185\u5916|overall|broad|across categories)/i.test(raw);
            const recentEventsQuestion = /(\u8fd9\u51e0\u5929|\u6700\u8fd1\u51e0\u5929|\u8fd1\u51e0\u5929|\u8fc7\u53bb\u51e0\u5929|\u8fd9\u4e24\u5929|\u6700\u8fd1|recently|last few days|these days).{0,16}(\u53d1\u751f\u4e86\u4ec0\u4e48|\u6709\u4ec0\u4e48\u4e8b|\u6709\u4ec0\u4e48\u65b0\u95fb|\u5927\u4e8b|\u8981\u95fb|\u52a8\u6001|what happened|what is happening|what's going on)/i.test(raw);
            const focus = !broadScopeSignal && !recentEventsQuestion && categories.length === 1
                ? categories[0]
                : 'broad';
            return {
                focus,
                categories: focus === 'broad' ? categories : [focus],
                broad: focus === 'broad'
            };
        }

        getNewsBriefCategoryMatches(userMessage) {
            const raw = String(userMessage || '');
            const tests = [
                ['domestic', /(\u56fd\u5185|\u4e2d\u56fd|china|domestic)/i],
                ['international', /(\u56fd\u9645|\u4e16\u754c|\u5168\u7403|world|international|global)/i],
                ['finance', /(\u8d22\u7ecf|\u7ecf\u6d4e|\u5e02\u573a|\u91d1\u878d|finance|business|market|markets|economy)/i],
                ['technology', /(\u79d1\u6280|\u79d1\u5b66|technology|science|tech)/i],
                ['society', /(\u793e\u4f1a|\u4f53\u80b2|\u5a31\u4e50|\u6587\u5a31|\u6587\u5316|society|sports|entertainment|culture)/i]
            ];
            return tests.filter(([, pattern]) => pattern.test(raw)).map(([key]) => key);
        }
    }

    window.AgentIntentContractBuilder = AgentIntentContractBuilder;
})();
