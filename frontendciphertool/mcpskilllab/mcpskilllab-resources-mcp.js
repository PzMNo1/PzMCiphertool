(function () {
    const capabilityResources = [
        {
            id: 'cap-files',
            name: '读代码与改文件',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['文件', '代码', '编辑'],
            use: '直接读项目文件、只改你指定的那一段、按原样新建文件，不用你复制粘贴。',
            what: '由 read / write / edit 三个工具组成：read 按行读文件，edit 只替换目标片段，write 新建或整体重写。改之前会先读原文，所以不会凭空覆盖你的代码。',
            steps: [
                { title: '说清楚改哪里', text: '例如：「把 src/app.js 里 fetchData 的超时改成 10 秒，其他逻辑别动」。给文件路径和具体位置，比说「优化一下」有效得多。' },
                { title: '我会先读再改', text: '先读原文件确认上下文，再做局部替换，并回报改了哪几行。' },
                { title: '自己复查', text: '让 Agent 顺手跑一次测试或打开 diff；不满意就说「刚才那处回退」，不会影响其他改动。' }
            ],
            notes: [
                '大文件会分段读取，不会一次塞满上下文。',
                '只读模式下只能看不能写；要改文件先把权限切到可写。'
            ],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-find',
            name: '找文件与搜内容',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['搜索', '仓库', '定位'],
            use: '按文件名通配符找文件、按正则搜代码内容，适合在大仓库里快速定位。',
            what: 'glob 按 **/*.ts 这类模式列文件；grep 用正则在文件内容里找并给出行号。两个工具都会自动跳过依赖目录和二进制文件。',
            steps: [
                { title: '描述你要找的东西', text: '例如：「找所有调用 sendEmail 的地方」或「列出 src 下所有 .test.ts」。' },
                { title: '我会先缩小范围', text: '先列候选文件再读关键片段，不会把整个仓库读一遍。' },
                { title: '接着可以直接改', text: '定位到具体文件后，可以马上让我改，不用再贴路径。' }
            ],
            notes: ['正则语法按 ripgrep 规则，写错会直接报错而不是静默返回空。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-shell',
            name: '执行命令与后台任务',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['终端', '构建', '测试'],
            use: '直接跑构建、测试、脚本和系统命令；跑得久的自动转后台，随时看输出或停掉。',
            what: '直接执行 PowerShell 命令，支持工作目录、超时和后台运行。长任务会返回一个任务号，可以随时读取新增输出、结束进程。',
            steps: [
                { title: '直接说要跑什么', text: '例如：「跑 npm test，把失败的那条和原因给我」。不用自己开终端复制结果。' },
                { title: '长任务自动转后台', text: '启动服务、跑大构建时会转到后台，你可以继续问别的问题，我按需取输出。' },
                { title: '随时停止', text: '说「停掉刚才那个服务」即可结束后台任务，不会残留进程。' }
            ],
            notes: [
                '命令在项目工作目录里执行；换目录要在指令里说明。',
                '危险权限（写工作区外、联网）受权限预设限制，必要时会先问你。'
            ],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-web-search',
            name: '联网搜索',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['搜索', '实时', '资料'],
            use: '实时搜网页并给出可点开的来源链接，适合查最新版本、官方文档和新闻。',
            what: '把问题拆成多个关键词去搜，合并结果后按相关性给你摘要和链接。信息来自外部网页，我会标出来源，重要结论建议点开原文核对。',
            steps: [
                { title: '问具体问题', text: '例如：「Tailwind 4 现在怎么装？给官方文档链接」。比「查一下前端框架」更容易得到有用结果。' },
                { title: '看来源再决定', text: '回答里会带链接；需要细节就说「打开第 2 个链接读一下」，我会抓正文。' },
                { title: '需要最新数据就用它', text: '模型知识有截止时间，版本号、价格、发布会这类信息优先走搜索。' }
            ],
            notes: ['搜索结果属于外部内容，不会当作指令执行。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-web-fetch',
            name: '抓取网页正文',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['网页', '阅读', '资料'],
            use: '把指定链接抓成可读正文，读文档、博客、issue 时不用你手动复制。',
            what: '抓取一个 http/https 地址，去掉导航和广告后保留正文；页面很长时只取关键段落。',
            steps: [
                { title: '给我链接', text: '例如：「读一下 https://example.com/docs 的安装章节，按步骤整理」。' },
                { title: '我会提炼而不是全文复述', text: '默认给结论和步骤；要原文片段会说清楚引用的是哪一段。' }
            ],
            notes: ['需要登录或强依赖 JavaScript 渲染的页面可能抓不全，这种情况我会说明。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-todo',
            name: '拆任务与跟踪进度',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['计划', '多步任务'],
            use: '把多步任务拆成清单，边做边更新状态，长任务不会做到一半忘了后面。',
            what: '用 todo 列表记录每一步：待办、进行中、完成。清单会显示在会话里，你随时能看到做到哪了。',
            steps: [
                { title: '给一个多步任务', text: '例如：「把登录页拆成组件、补测试、再改样式」。' },
                { title: '我会先列清单再动手', text: '每完成一步就勾掉，发现顺序要调整会先说明。' },
                { title: '中途加需求', text: '直接说「再加一步：补个埋点」，清单会更新，不用重开任务。' }
            ],
            notes: ['一两步就能完成的小事不会建清单，避免噪音。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-plan',
            name: '先出方案再动手',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['方案', '评审'],
            use: '大改动前先给一份可评审的方案，你确认后再写代码。',
            what: '进入计划模式后，我只会读代码和调研，不会改文件；产出一份带步骤和取舍的方案，你批准后才开始执行。',
            steps: [
                { title: '提出需求并说明要方案', text: '例如：「先别改，给我一个把鉴权从 session 换成 JWT 的方案」。' },
                { title: '看方案再拍板', text: '方案里会写清楚改哪些文件、风险点、回滚方式。' },
                { title: '批准后执行', text: '确认方案后我按步骤改，遇到和方案不一致的地方会停下来问。' }
            ],
            notes: ['计划模式下不会写文件，适合动核心代码前先用。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-subagent',
            name: '子 Agent 并行处理',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['并行', '委派'],
            use: '把互不依赖的几件事分给子 Agent 同时做，最后汇总结果，省时间。',
            what: '每个子 Agent 有独立的上下文，可以同时查资料、读不同模块或各写一块代码；它只把结论交回来，不占主对话的上下文。',
            steps: [
                { title: '说清要并行哪几件事', text: '例如：「分头查这三个库的接入方式，最后给我一张对比表」。' },
                { title: '我会拆任务并同时启动', text: '子任务之间不共享上下文，所以每件事要能独立完成。' },
                { title: '汇总后统一给你', text: '结果会合并成一份，不会把每个子 Agent 的中间过程都倒出来。' }
            ],
            notes: ['需要互相参考的步骤不适合并行，会改成一个接一个做。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-workflow',
            name: '多 Agent 工作流',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['批量', '编排', '审计'],
            use: '对几十个文件、上百条数据做同一套处理时，用脚本编排一批子 Agent 并行跑。',
            what: '写一段 JavaScript 编排脚本：把清单扇出给多个子 Agent，按阶段收集结构化结果。适合批量审查、迁移、逐条核对这类重复工作。',
            steps: [
                { title: '给出清单和判断标准', text: '例如：「把这 40 个页面的文案逐条检查是否符合规范，输出问题列表」。' },
                { title: '我会先写编排脚本', text: '脚本里定义每个子 Agent 的输入、输出格式和阶段，再统一执行。' },
                { title: '按结构化结果汇总', text: '跑完给你一张表，失败或空结果会单独标出来。' }
            ],
            notes: ['工作流适合量大且规则一致的任务；只有两三件小事用子 Agent 就够。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-goal',
            name: '长期目标自动推进',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['长任务', '自动继续'],
            use: '一件要跑很多轮的事，立成目标后会自动一轮轮推进，不用每次催「继续」。',
            what: '把目标写进会话，每轮结束后自动继续下一轮，直到目标完成或被叫停。适合大重构、批量迁移、持续调研。',
            steps: [
                { title: '说清最终要什么', text: '例如：「把整个项目从 Vue2 迁到 Vue3，直到构建和测试全过」。' },
                { title: '我会持续做并汇报', text: '每轮结束说明做到哪、下一步做什么；有问题会停下来问。' },
                { title: '随时暂停或改目标', text: '说「暂停」或「目标改成先只迁登录模块」即可。' }
            ],
            notes: ['目标会跨轮保留，适合确实需要多轮的任务；一次性需求不必建目标。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-schedule',
            name: '定时提醒与周期任务',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['定时', '提醒'],
            use: '指定时间或周期触发一件事，例如每天九点提醒、每周一汇总。',
            what: '支持一次性的「多久之后 / 某个时间点」，也支持每天、每周和 cron 表达式；到点会把任务内容发回这个会话。',
            steps: [
                { title: '说时间和要做的事', text: '例如：「每周一早上 9 点提醒我检查部署队列」。' },
                { title: '确认时区', text: '默认按本地时区；跨时区就说清楚，例如「按 UTC 每天 0 点」。' },
                { title: '可以随时改或删', text: '说「把那个提醒改到 10 点」或「取消每周汇总」即可。' }
            ],
            notes: ['应用关闭期间到点的提醒不会补发；恢复后只发最近一次。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-ask',
            name: '关键选择先问你',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['确认', '选择'],
            use: '遇到会影响结果的岔路时先停下来问你，而不是自己猜一个继续做。',
            what: '需要你在几个方案里选、或者缺关键信息（比如数据库地址、发布环境）时，会弹出选项或问题，等你回答再继续。',
            steps: [
                { title: '提前说清偏好', text: '例如：「不确定的先问我，别自己决定」。' },
                { title: '看到问题直接选', text: '选项里会写清楚每个选择的后果，选完我继续。' }
            ],
            notes: ['简单小事不会频繁打断；只有确实影响结果的决策才会问。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-office-word',
            name: 'Word 文档',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Office', '文档', 'docx'],
            use: '按你的要求生成或修改 Word 文档：报告、说明书、合同模板都能直接出 .docx。',
            what: '用 python-docx 读写 .docx：设置标题层级、表格、页眉页脚、样式，改完还会做一次结构校验。',
            steps: [
                { title: '给内容和格式要求', text: '例如：「写一份 8 页的项目周报，含进度表和三张截图，标题用黑体二号」。' },
                { title: '我先出初稿', text: '生成 .docx 交付文件，直接点开就能看。' },
                { title: '按批注改', text: '说「第三部分改成表格」「加上页码」这类具体修改即可。' }
            ],
            notes: ['复杂排版（如公文红头、双栏）建议给一个模板文件，我照着套。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-office-excel',
            name: 'Excel 表格',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Office', '表格', 'xlsx'],
            use: '读写 .xlsx：清洗数据、加公式、做透视和图表，公式结果会真正算出来再交付。',
            what: '用 openpyxl 读写单元格、样式、公式和图表；涉及公式时会用 LibreOffice 重算一遍，确保打开文件看到的不是空值。',
            steps: [
                { title: '给数据和要求', text: '例如：「把这个 CSV 按月份汇总，加同比列和折线图」。' },
                { title: '我会先确认口径', text: '金额单位、空值处理、日期格式这类会影响结果的点会先问清楚。' },
                { title: '交付后自查', text: '我会抽几行核对合计和公式，避免出现 #REF!。' }
            ],
            notes: ['超大表格（几十万行）建议先用 CSV 处理，再导入 Excel。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-office-ppt',
            name: 'PPT 演示',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Office', '演示', 'pptx'],
            use: '生成或改写 .pptx：汇报、方案、培训课件，按页给你内容和版式。',
            what: '用 python-pptx 创建幻灯片，设置版式、标题、要点、图片和备注；可以基于你给的模板保持公司风格。',
            steps: [
                { title: '说明场合和页数', text: '例如：「做一个 12 页的技术方案汇报，给管理层看，少代码多结论」。' },
                { title: '先定大纲', text: '先给每页标题和要点，你确认后我再排版。' },
                { title: '按页改', text: '说「第 5 页换成对比表」「统一改成深色主题」即可。' }
            ],
            notes: ['给模板文件能最大程度保留字体、配色和母版。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-office-pdf',
            name: 'PDF 导出',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Office', 'PDF', '导出'],
            use: '把 Word、Excel、PPT 转成 PDF，保留分页和字体。',
            what: '用 LibreOffice 无头模式转换，支持批量；转完会检查页数和文件大小，避免出现空白页。',
            steps: [
                { title: '给我源文件', text: '例如：「把这份 docx 转成 PDF，A4 纵向」。' },
                { title: '转换并检查', text: '转换后我会报告页数和异常，交付 PDF 文件。' }
            ],
            notes: ['源文件里的特殊字体如果本机没有，会被替换，排版可能轻微偏移。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-office-render',
            name: '文档渲染检查',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Office', '预览', '排版'],
            use: '把文档渲染成图片，用眼睛检查版式有没有错位、溢出和空白页。',
            what: '用 LibreOffice 把 docx/pptx/xlsx 渲染成图片，逐页查看布局；发现问题可以定位到具体页再改。',
            steps: [
                { title: '让我先看效果', text: '例如：「把这份 PPT 渲染出来，检查有没有文字溢出」。' },
                { title: '我按页检查', text: '报告哪几页有问题、问题是什么，再直接改源文件。' }
            ],
            notes: ['渲染结果和 Office 原生显示可能有细微差异，以关键页为准。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-image',
            name: '看图与截图理解',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['图片', '截图', '视觉'],
            use: '直接看设计稿、报错截图和照片，按图里的内容回答或改代码。',
            what: '支持 PNG/JPEG/WebP/GIF，可以读本地文件，也可以读你粘贴到对话里的图片；大图会先缩放再理解。',
            steps: [
                { title: '把图发给我', text: '直接粘贴，或说「看一下 assets/error.png」。' },
                { title: '说明你想知道什么', text: '例如：「照这张设计稿把登录页改出来」「这个报错是什么原因」。' }
            ],
            notes: ['超大图会压缩，细节（小字、1px 线）可能看不清，必要时截局部。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-present',
            name: '交付文件卡片',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['交付', '文件'],
            use: '把做好的文档、表格、图片放到对话里，点一下就能打开或另存。',
            what: '生成的文件会作为交付卡片附在回复下方，带预览和「用本机程序打开」；不用去文件夹里翻。',
            steps: [
                { title: '正常提需求', text: '例如：「做一份季度复盘 PPT」。' },
                { title: '做完直接给卡片', text: '结果会附在回复里，点卡片就能打开。' }
            ],
            notes: ['交付的是本机文件，移动或删除后卡片会失效。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-deps',
            name: '运行环境与依赖路径',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['Python', 'Node', '环境'],
            use: '直接拿到随附 Python、Node.js、pnpm 的绝对路径，装库和跑脚本不用猜环境。',
            what: '返回内置运行时的真实路径，可以拿它执行 pip/npm 安装或运行脚本，避免系统里多个版本互相干扰。',
            steps: [
                { title: '需要装库或跑脚本时直接说', text: '例如：「用项目自带的 Python 装 pandas，然后跑这个脚本」。' },
                { title: '我会先取路径再执行', text: '安装和运行都用同一个解释器，不会装到别处去。' }
            ],
            notes: ['随附环境改不了系统 PATH，只影响当前任务。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-session',
            name: '翻历史会话',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['历史', '检索'],
            use: '在以前的会话里搜结论和决定，不用自己翻聊天记录。',
            what: '按关键词搜索历史会话，读取某次对话的具体事件；只在你授权的工作区范围内查。',
            steps: [
                { title: '描述要找的内容', text: '例如：「上次我们定的缓存方案是什么？在哪个会话里」。' },
                { title: '我给出处', text: '会说明来自哪次会话、大概什么时候，必要时引用原文。' }
            ],
            notes: ['会话内容涉及隐私，只在本机查询。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-sandbox',
            name: '权限与沙箱',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['权限', '安全', '沙箱'],
            use: '限制 Agent 只能读、只能改工作区，或在动系统前必须问你，防止误操作。',
            what: '三档权限预设：只读（看代码不改）、工作区可写（默认）、完全访问；写工作区外、联网等操作会按策略拦截或请求确认。',
            steps: [
                { title: '按场景选预设', text: '看代码用只读；日常开发用工作区可写；确实要改系统配置才用完全访问。' },
                { title: '被拦截时看提示', text: '提示会说明是哪条策略拒绝的；确认没问题再切权限重试。' }
            ],
            notes: ['权限越宽，误改的风险越大；完成任务后建议切回工作区可写。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-mcp',
            name: '接入 MCP 服务',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['MCP', '扩展', '工具'],
            use: '让 Agent 用上外部工具：GitHub、浏览器、数据库、Notion 等，都通过 MCP 接入。',
            what: 'MCP 是让 AI 调用外部工具的通用协议。接入后，外部工具会以 mcp__服务名__工具名 出现在 Agent 的工具列表里，像内置工具一样调用。',
            steps: [
                { title: '先挑一个服务', text: '到「MCP 服务」页选一个，每张卡都写了用途和现成配置。' },
                { title: '按三步接上', text: '准备密钥 → 粘贴配置 → 重启验证，卡里的「怎么用」有完整片段。' },
                { title: '只开需要的工具', text: '接入时用最小权限的 Token；不用了就删掉配置，别长期挂着高权限服务。' }
            ],
            notes: [
                'MCP 服务由第三方提供，能力和风险都以它自己的文档为准。',
                'DSH 通过 dsh-mcp-client 插件接入，配置写在 profile 的 cordis.patch.yml 里。'
            ],
            url: 'https://modelcontextprotocol.io/',
            docs: 'https://modelcontextprotocol.io/specification'
        },
        {
            id: 'cap-skills',
            name: '把流程做成技能',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['技能', 'SKILL.md', '复用'],
            use: '把固定的做事步骤写成技能文件，以后同类任务按你的规矩执行，不用每次重复解释。',
            what: '技能就是一个含 SKILL.md 的文件夹：写清楚什么时候用、按什么步骤做、有哪些限制；需要时再加载脚本和参考资料。',
            steps: [
                { title: '说清楚要固化的流程', text: '例如：「以后所有发布都按这个清单走，做成技能」。' },
                { title: '我会生成 SKILL.md', text: '包含触发条件、步骤、检查项和常见错误。' },
                { title: '下次自动按技能做', text: '同类任务会先看技能再执行，减少遗漏。' }
            ],
            notes: ['技能里可以带脚本，但执行前要确认脚本来源可信。'],
            url: 'https://agentskills.io/',
            docs: 'https://agentskills.io/'
        },
        {
            id: 'cap-plugins',
            name: '安装与查看插件',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['插件', '扩展'],
            use: '给 DSH 加插件来扩展工具、界面和模型接入；先看清每个插件负责什么再装。',
            what: '插件是独立的 npm 包，通过 profile 配置装载。内置插件覆盖文件、终端、网页、会话等能力，也可以接第三方插件包。',
            steps: [
                { title: '先查插件清单', text: '到「DSH 插件」页按名字或用途搜，卡片写清了每个包做什么。' },
                { title: '装到自己的 profile', text: '在 profile 的 cordis.patch.yml 里加一条 loader 配置，重启 DSH 生效。' },
                { title: '确认状态', text: '设置 → 插件 → 插件列表能看到它，且没有失败标记，就说明装好了。' }
            ],
            notes: ['插件能访问本机能力和密钥，只装你信任来源的包。'],
            url: 'https://www.npmjs.com/org/deepseek-ai',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        },
        {
            id: 'cap-models',
            name: '切换模型与推理强度',
            type: 'DSH Capability',
            category: 'dsh',
            categories: ['dsh'],
            source: 'Official',
            tags: ['模型', '推理', '成本'],
            use: '按任务难度换模型和推理强度：日常改动用快模型，难题换强模型。',
            what: 'DSH 支持多个模型提供方；不同模型的上下文长度、价格和推理能力不同，推理强度（off→max）也会影响耗时和成本。',
            steps: [
                { title: '日常任务用快模型', text: '改文案、跑脚本、简单重构，快模型足够且便宜。' },
                { title: '难题再换强模型', text: '架构设计、复杂 bug 才切到强模型，并调高推理强度。' },
                { title: '子任务也能指定', text: '可以让子 Agent 用便宜模型跑，主任务保持强模型。' }
            ],
            notes: ['模型能力差异明显，重要产出换模型后建议复核一遍。'],
            url: 'https://github.com/deepseek-ai/deepseek-harness',
            docs: 'https://github.com/deepseek-ai/deepseek-harness'
        }
    ];

    const mcpResources = [
        {
            id: 'mcp-filesystem',
            name: 'Filesystem（本地文件）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['文件', '本地', '读写'],
            use: '让任意 MCP 客户端在指定目录里读、写、搜索文件，目录之外的路径访问不到。',
            what: 'Model Context Protocol 官方维护的本地文件服务。启动时把允许访问的目录作为参数传进去，它只能操作这些目录。',
            steps: [
                { title: '确认能启动', text: '需要 Node.js 18 以上。先在终端跑一次，把 D:\\work 换成你要开放的目录：', code: 'npx -y @modelcontextprotocol/server-filesystem D:\\work' },
                { title: '写进客户端配置', text: '把这段加到 Claude Desktop 的 claude_desktop_config.json，或 Cursor 的 .cursor/mcp.json：', code: '{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\\\work"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '重启客户端后问一句：「列出 D:\\work 下的文件」，能返回目录内容就说明接通了。' }
            ],
            notes: ['只把项目目录传进去，不要直接开放整个磁盘。'],
            url: 'https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem',
            docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
        },
        {
            id: 'mcp-github',
            name: 'GitHub（仓库与 PR）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['GitHub', '仓库', 'PR'],
            use: '让 Agent 查仓库、读 Issue 和 PR、搜代码、看 Actions，不用你截图转述。',
            what: 'GitHub 官方远程 MCP 服务，用 Streamable HTTP 接入，凭 Personal Access Token 鉴权。工具覆盖仓库、Issue、PR、代码搜索和 Actions。',
            steps: [
                { title: '建一个最小权限 Token', text: 'GitHub → Settings → Developer settings → Tokens，只勾选要用的仓库和权限（读代码就选 Contents: Read）。' },
                { title: '写进客户端配置', text: '远程服务直接填 URL 和 Authorization；把 ghp_xxx 换成你的 Token：', code: '{\n  "mcpServers": {\n    "github": {\n      "url": "https://api.githubcopilot.com/mcp/",\n      "headers": { "Authorization": "Bearer ghp_xxx" }\n    }\n  }\n}' },
                { title: '重启并验证', text: '问一句：「列出我最近打开的 PR」，能返回列表就说明接通了。' }
            ],
            notes: ['Token 只放环境变量或本地配置，不要提交到仓库。', '不需要写权限时别给 write，避免 Agent 误改 Issue。'],
            url: 'https://www.npmjs.com/package/@modelcontextprotocol/server-github',
            docs: 'https://github.com/github/github-mcp-server'
        },
        {
            id: 'mcp-playwright',
            name: 'Playwright（浏览器自动化）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['浏览器', '自动化', '测试'],
            use: '让 Agent 真的打开浏览器点页面：填表单、走流程、截图、复现前端 bug。',
            what: 'Microsoft 官方 Playwright MCP 服务。用可访问性树而不是截图来理解页面，所以点击和输入更稳，也支持多标签和文件上传。',
            steps: [
                { title: '首次运行会下载浏览器', text: '需要 Node.js 18 以上；第一次执行会自动装 Chromium：', code: 'npx -y @playwright/mcp@latest' },
                { title: '写进客户端配置', text: '加 --headless 可以无界面运行，调试时去掉它方便看：', code: '{\n  "mcpServers": {\n    "playwright": {\n      "command": "npx",\n      "args": ["-y", "@playwright/mcp@latest", "--headless"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「打开 example.com，把页面标题读给我」，能返回标题就说明接通了。' }
            ],
            notes: ['自动化会使用你的登录态，测试账号比主账号更安全。'],
            url: 'https://www.npmjs.com/package/@playwright/mcp',
            docs: 'https://github.com/microsoft/playwright-mcp'
        },
        {
            id: 'mcp-chrome-devtools',
            name: 'Chrome DevTools（调性能与网络）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['浏览器', '性能', '调试'],
            use: '让 Agent 看控制台报错、网络请求和性能轨迹，定位前端问题而不是靠猜。',
            what: 'Chrome 团队维护的 DevTools MCP 服务：可以开页面、读 console、查 network、录 performance trace，并给出可操作的优化建议。',
            steps: [
                { title: '确认本机有 Chrome', text: '需要 Node.js 22 以上和已安装的 Chrome：', code: 'npx -y chrome-devtools-mcp@latest' },
                { title: '写进客户端配置', text: '需要连你已经开着的 Chrome 时，加 --browserUrl：', code: '{\n  "mcpServers": {\n    "chrome-devtools": {\n      "command": "npx",\n      "args": ["-y", "chrome-devtools-mcp@latest"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「打开 localhost:3000，看看控制台有没有报错」，能返回报错列表就说明接通了。' }
            ],
            notes: ['连接已登录的浏览器会带上你的账号状态，排查第三方站点时注意隐私。'],
            url: 'https://www.npmjs.com/package/chrome-devtools-mcp',
            docs: 'https://github.com/ChromeDevTools/chrome-devtools-mcp'
        },
        {
            id: 'mcp-context7',
            name: 'Context7（最新库文档）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Community',
            tags: ['文档', '依赖', '版本'],
            use: '查第三方库的最新用法和版本差异，避免模型拿旧版本文档写代码。',
            what: 'Upstash 提供的文档检索服务，按库名拉取对应版本的官方文档片段，直接给 Agent 用。',
            steps: [
                { title: '直接启动即可', text: '基础用法不需要密钥；有 API Key 时可以用 --api-key 提高额度：', code: 'npx -y @upstash/context7-mcp' },
                { title: '写进客户端配置', text: '把这段加到客户端配置里：', code: '{\n  "mcpServers": {\n    "context7": {\n      "command": "npx",\n      "args": ["-y", "@upstash/context7-mcp"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「用 context7 查 Next.js 15 的 middleware 写法」，能返回对应版本文档就说明接通了。' }
            ],
            notes: ['文档来自社区索引，关键 API 仍以官方文档为准。'],
            url: 'https://www.npmjs.com/package/@upstash/context7-mcp',
            docs: 'https://github.com/upstash/context7'
        },
        {
            id: 'mcp-notion',
            name: 'Notion（笔记与数据库）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['Notion', '知识库', '数据库'],
            use: '让 Agent 读你的 Notion 页面、写会议纪要、查数据库条目。',
            what: 'Notion 官方 MCP 服务，通过 Integration Token 访问你授权过的页面和数据库。',
            steps: [
                { title: '创建 Integration 并授权页面', text: '在 Notion 创建 Integration 拿到 ntn_ 开头的 Token，再到目标页面 → 连接 → 添加这个 Integration，否则会 404。' },
                { title: '写进客户端配置', text: 'Notion 用 OPENAPI_MCP_HEADERS 传鉴权头，注意整段是 JSON 字符串：', code: '{\n  "mcpServers": {\n    "notion": {\n      "command": "npx",\n      "args": ["-y", "@notionhq/notion-mcp-server"],\n      "env": {\n        "OPENAPI_MCP_HEADERS": "{\\"Authorization\\":\\"Bearer ntn_xxx\\",\\"Notion-Version\\":\\"2022-06-28\\"}"\n      }\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「列出我授权页面下的子页面」，能返回标题就说明接通了。' }
            ],
            notes: ['Token 权限跟着 Integration 走，只授权需要的页面。'],
            url: 'https://www.npmjs.com/package/@notionhq/notion-mcp-server',
            docs: 'https://github.com/makenotion/notion-mcp-server'
        },
        {
            id: 'mcp-supabase',
            name: 'Supabase（数据库后端）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['数据库', '后端', 'SQL'],
            use: '让 Agent 查表结构、跑 SQL、看日志和边缘函数，排查后端问题。',
            what: 'Supabase 官方 MCP 服务，用 Personal Access Token 访问项目；支持只读模式，能防止误写生产库。',
            steps: [
                { title: '生成 Access Token', text: 'Supabase Dashboard → Account → Access Tokens 创建，建议先用只读模式：', code: 'npx -y @supabase/mcp-server-supabase@latest --access-token=sbp_xxx --read-only' },
                { title: '写进客户端配置', text: '去掉 --read-only 才有写权限：', code: '{\n  "mcpServers": {\n    "supabase": {\n      "command": "npx",\n      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only"],\n      "env": { "SUPABASE_ACCESS_TOKEN": "sbp_xxx" }\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「列出我的 Supabase 项目」，能返回项目列表就说明接通了。' }
            ],
            notes: ['生产库默认只读；确需写操作时先备份，再单独开权限。'],
            url: 'https://www.npmjs.com/package/@supabase/mcp-server-supabase',
            docs: 'https://github.com/supabase-community/supabase-mcp'
        },
        {
            id: 'mcp-sentry',
            name: 'Sentry（报错与性能）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['监控', '报错', '排查'],
            use: '让 Agent 直接查线上报错、堆栈和影响范围，不用你复制错误摘要。',
            what: 'Sentry 官方 MCP 服务，用 User Auth Token 读取 issue、事件和性能数据；支持只读和指定组织。',
            steps: [
                { title: '创建 User Auth Token', text: 'Sentry → Settings → Auth Tokens 创建，权限至少包含 event:read 和 project:read：', code: 'npx -y @sentry/mcp-server@latest --access-token=sntrys_xxx' },
                { title: '写进客户端配置', text: '组织名可选，写上能减少歧义：', code: '{\n  "mcpServers": {\n    "sentry": {\n      "command": "npx",\n      "args": ["-y", "@sentry/mcp-server@latest", "--access-token=sntrys_xxx"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「最近的未解决 issue 有哪些？按影响用户数排序」，能返回列表就说明接通了。' }
            ],
            notes: ['Token 只读就够排查用；不要给项目写权限。'],
            url: 'https://www.npmjs.com/package/@sentry/mcp-server',
            docs: 'https://github.com/getsentry/sentry-mcp'
        },
        {
            id: 'mcp-memory',
            name: 'Memory（跨会话记忆）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['记忆', '知识图谱'],
            use: '把用户偏好、项目约定存成知识图谱，下次会话还能查到。',
            what: '官方 Memory 服务：用实体和关系保存信息，支持检索和更新；数据存在本地 JSON 文件里。',
            steps: [
                { title: '指定保存位置', text: '通过 MEMORY_FILE_PATH 指定文件，不设就用默认路径：', code: 'npx -y @modelcontextprotocol/server-memory' },
                { title: '写进客户端配置', text: '把路径换成你自己的：', code: '{\n  "mcpServers": {\n    "memory": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-memory"],\n      "env": { "MEMORY_FILE_PATH": "D:\\\\mcp\\\\memory.json" }\n    }\n  }\n}' },
                { title: '重启并验证', text: '说「记住：部署脚本在 scripts/deploy.ps1」，再问「部署脚本在哪」，能答出来就说明生效了。' }
            ],
            notes: ['记忆文件是明文，别往里存密钥。'],
            url: 'https://www.npmjs.com/package/@modelcontextprotocol/server-memory',
            docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory'
        },
        {
            id: 'mcp-sequential-thinking',
            name: 'Sequential Thinking（拆解复杂问题）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Official',
            tags: ['推理', '拆解'],
            use: '给 Agent 一个显式的分步思考草稿区，复杂问题先列步骤再下结论。',
            what: '官方顺序思考服务：把问题拆成可修改的思考步骤，支持回退和分支，适合架构设计和多约束排查。',
            steps: [
                { title: '直接启动', text: '无依赖、不需要密钥：', code: 'npx -y @modelcontextprotocol/server-sequential-thinking' },
                { title: '写进客户端配置', text: '把这段加到客户端配置：', code: '{\n  "mcpServers": {\n    "sequential-thinking": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「用 sequential thinking 拆一下：为什么登录偶发 401」，能看到分步推理就说明接通了。' }
            ],
            notes: ['它只是思考草稿，不会替你做验证。'],
            url: 'https://www.npmjs.com/package/@modelcontextprotocol/server-sequential-thinking',
            docs: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking'
        },
        {
            id: 'mcp-firecrawl',
            name: 'Firecrawl（批量抓网页）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Community',
            tags: ['爬取', '网页', '搜索'],
            use: '批量抓取、搜索和抽取网页内容，适合做资料收集和竞品调研。',
            what: 'Firecrawl 的 MCP 服务：支持搜索、抓取单页、爬整站、提取结构化字段；用 API Key 计费。',
            steps: [
                { title: '准备 API Key', text: '到 firecrawl.dev 注册拿 fc- 开头的 Key，先跑一次确认：', code: 'npx -y firecrawl-mcp' },
                { title: '写进客户端配置', text: '把 Key 换成你自己的：', code: '{\n  "mcpServers": {\n    "firecrawl": {\n      "command": "npx",\n      "args": ["-y", "firecrawl-mcp"],\n      "env": { "FIRECRAWL_API_KEY": "fc-xxx" }\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「抓取 example.com 的正文并总结成三点」，能返回内容就说明接通了。' }
            ],
            notes: ['抓取按额度计费，别对整站无脑爬。', '遵守目标站点的 robots 和服务条款。'],
            url: 'https://www.npmjs.com/package/firecrawl-mcp',
            docs: 'https://github.com/firecrawl/firecrawl-mcp-server'
        },
        {
            id: 'mcp-dbhub',
            name: 'DBHub（数据库直连）',
            type: 'MCP Server',
            category: 'mcp',
            categories: ['mcp'],
            source: 'Community',
            tags: ['数据库', 'SQL', 'PostgreSQL'],
            use: '用一个服务连接 PostgreSQL、MySQL、SQLite 等数据库，让 Agent 查表结构和数据。',
            what: 'Bytebase 的数据库 MCP 服务，用连接串接入；默认只读更安全，支持多种数据库。',
            steps: [
                { title: '准备只读连接串', text: '建议单独建一个只读账号，先用本地库试：', code: 'npx -y @bytebase/dbhub --dsn "postgres://readonly:pass@localhost:5432/app"' },
                { title: '写进客户端配置', text: 'DSN 里有密码，用环境变量或本地配置保存，别提交：', code: '{\n  "mcpServers": {\n    "dbhub": {\n      "command": "npx",\n      "args": ["-y", "@bytebase/dbhub", "--dsn", "postgres://readonly:pass@localhost:5432/app"]\n    }\n  }\n}' },
                { title: '重启并验证', text: '问：「列出所有表名和行数」，能返回结果就说明接通了。' }
            ],
            notes: ['连接串包含密码，最好像示例一样用只读账号。', '生产库建议只读，写操作走人工流程。'],
            url: 'https://www.npmjs.com/package/@bytebase/dbhub',
            docs: 'https://github.com/bytebase/dbhub'
        }
    ];

    const groups = (window.MCPSKILLLAB_RESOURCE_GROUPS || [])
        .filter(group => group && group.id !== 'dsh' && group.id !== 'mcp');
    groups.push({
        id: 'dsh',
        resources: capabilityResources
    });
    groups.push({
        id: 'mcp',
        resources: mcpResources
    });
    window.MCPSKILLLAB_RESOURCE_GROUPS = groups;
})();
