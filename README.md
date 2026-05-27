怎么打开这个项目

1.如果你安装了VS Code 或者 cursor，那么可以安装live server插件，然后在目录栏里右键index.html，选择Open with live server来打开。

2.如果你已经安装了 Node.js，直接在终端输入命令并回车：npx http-server，终端会显示访问地址，通常是 http://127.0.0.1:8080。按住 Ctrl 点击链接即可打开。

3.如果你已经安装了cursor，那么可以按 Ctrl + Shift + P 打开搜索框，输入>Simple Browser: Show（注意大小写和英文冒号），然后回车，然后在框里输入 http://127.0.0.1:5500/你解压工程后的文件夹名称/index.html，
一般是http://127.0.0.1:5500/08_Ciphertool/frontendciphertool/index.html。
这样你就可以不需要浏览器，直接在代码编辑器的右侧分栏中直接看到网页效果。

### 💡 如何配置大模型 (LLM) 与 Agent 的 API Key

本项目使用 DeepSeek API 驱动大模型与智能 Agent 助手。由于安全防泄露设计，API Key 配置文件（`agentmaster.local.js`）默认已被 `.gitignore` 忽略，不会上传至公开仓库。

#### 1. 本地开发配置方式（本地永久生效）：
在前端目录 `frontendciphertool/agentmaster/` 下，手动新建一个名为 **`agentmaster.local.js`** 的文件，并写入以下代码：
```javascript
window.AGENTMASTER_CONFIG = {
    apiKey: "你的_DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-v4-flash",
    useNativeTools: false
};

window.DEEPSEEK_CONFIG = {
    apiKey: window.AGENTMASTER_CONFIG.apiKey,
    baseUrl: window.AGENTMASTER_CONFIG.baseUrl,
    defaultModel: window.AGENTMASTER_CONFIG.model,
    reasonerModel: window.AGENTMASTER_CONFIG.model
};
```

#### 2. 在线部署/演示环境配置方式（如 GitHub Pages，快捷免代码）：
如果您直接访问线上部署的演示网页，无需修改代码，只需在浏览器中一键配置 LocalStorage 即可（数据仅安全地保存在您本人的浏览器里，不经过任何服务器）：
1. 用浏览器打开部署后的网页（例如您的 GitHub Pages 链接）。
2. 按 **F12**（或右键网页空白处选择 **“检查”**），切换到 **Console (控制台)** 标签页。
3. 复制并在光标处粘贴执行以下两行代码（请将 `'你的_DEEPSEEK_API_KEY'` 替换为您真实的 DeepSeek Key）：
   ```javascript
   localStorage.setItem('DEEPSEEK_API_KEY', '你的_DEEPSEEK_API_KEY');
   localStorage.setItem('AGENTMASTER_API_KEY', '你的_DEEPSEEK_API_KEY');
   ```
4. 执行完毕后**刷新页面**，即可完美解锁并使用大模型和智能 Agent 助手！



开发文档
## 1. 项目简介
基于Python/HTML/CSS/JS/TS构建，不依赖任何框架
工程的UI、前后端算法、部署、函数作用等都是作者从0-1原生构建

本文档的宗旨是，让开发者更好地理解这个项目的构成、开发、维护；
目的是让每位开发者规避过多认知负荷，不在繁琐的“框架、流程、库”上花费大量时间
以及同未来的开发者们颠覆未来几年的应用设计路线

---

## 2. 工程历史介绍

本工程采用简单暴力直接的DOM，摒弃多余复杂的操作。

设计哲学上采用Unix哲学，Getting Real，Zen、Less but Better，以及乔布斯的SITUS的结合
也就是作者认为的：在极简暴力、文件为王的全局复用中逐渐驾驭复杂体系

如：
1.在999_funtion.js里仅一个updateAll就掌握了所有密码卡片从前到后的函数作用和扩展核心。
2.一个搜索框就能在所有模块通用，且互不影响
3.workflow模块不采用臃肿的前端画线，让工作流后端化。

**在开发灵感上，作者大量参考了马斯克的第一性原理、各学术前沿论文、科幻小说、以及现实各种跨领域的工作经验，来逐渐形成自己的taste**

首先，根据摩尔定律做宏观推算，那么计算机每9年快1000倍；
再根据各科幻小说作品结合，你可以想象到未来的手机可能会是透明银行卡大小的卡片
嗯，然后面板投影在满大街的空气上。这样可能是一个不太注重个人隐私的时代。
硬件方面的想象就到这了，然后就是软件方面的想象。

那么作者应该做出什么样的UI来适配这个未来硬件呢？
    作者在《Science》发现吴教授团队通过Oz技术让实验者看到了前所未有的蓝绿色
    作者以这个样本作为颜色主题，尝试用蓝绿色进行高光阴影叠加
    再结合摩尔定律、科幻小说、工作领域想象出晶莹剔透的蚀刻电路版
    作者在工作开发上接触Linux系统较多

部署思维：全局变量化、去APP化、去接口化、去框架化、甚至是去服务器化


1.  **输入同步**：
    无论你在"经典区"还是"现代区"的主输入框（`#mainInput`）打字，代码会自动把内容同步到所有区域的输入框，确保你切换页面时数据还在。

2.  **事件驱动 (The Heartbeat)**：
    在 `cipher/999_funtion.js` 中，有一个全选监听器：
    ```javascript
    document.querySelectorAll('#mainInput, input, textarea, select').forEach(el => {
        el.addEventListener('input', updateAll);
    });
    ```
    这意味着：**页面上任何一个输入框或下拉菜单发生变化，都会触发 `updateAll()` 函数。**

3.  **全量刷新 (updateAll)**：
    `updateAll()` 函数被触发后，会做以下流水线工作：
    *   **读取**：获取主输入框的文本 `t`。
    *   **参数获取**：获取各个密码卡片特有的设置（比如凯撒的偏移量、栅栏的栏数）。
    *   **计算与回填**：调用对应的算法对象（如 `Caesar.e(t, s)`），算出结果，直接塞回对应的结果显示框（如 `innerHTML = ...`）。

---

## 3. 实战教程：如何添加一个新的密码模块？

假设我们要添加一个 **"倒序密码 (Reverse Cipher)"**（把文本倒过来写），请跟随以下步骤：

### 第一步：添加界面 (UI)
打开 `cipher/0_cipher_div_batch.js`，找到 `CIPHER_CLASSIC_MODERN_DIV_BATCH` 里的经典区/现代区 HTML。在 `<div id="mimaqu" ...>` 内部找到合适的位置，插入一个新的卡片代码：

```html
<!-- 在 cipher/0_cipher_div_batch.js 的 CIPHER_CLASSIC_MODERN_DIV_BATCH 中添加 -->
<div class="card">
    <div class="badge">倒序密码 Reverse</div>
    <div class="result" id="reverseResult"></div>
</div>
```
> **注意**：一定要给结果 `div` 起一个唯一的 ID，比如 `reverseResult`。

### 第二步：实现逻辑 (Logic)
打开 `cipher/1_cipherlab.js`，在文件头部或中间，定义算法对象。

```javascript
// 在 1_cipherlab.js 中添加
const ReverseCipher = {
    // 加密 (e = encrypt)
    e: (text) => {
        return text.split('').reverse().join('');
    },
    // 解密 (d = decrypt)，倒序的解密就是再倒序一次
    d: (text) => {
        return text.split('').reverse().join('');
    }
};
```

### 第三步：连接逻辑 (Binding)
打开 `cipher/999_funtion.js`，找到 `updateAll()` 函数。在函数内部添加调用代码：

```javascript
async function updateAll() {
    let t = inputClassic.value; // 获取主输入
    // ... 前面的一大堆代码 ...

    // === 在这里添加你的新代码 ===
    // 1. 计算结果
    let reverseEncrypted = ReverseCipher.e(t);
    let reverseDecrypted = ReverseCipher.d(t);
    
    // 2. 显示结果 (找到你在第一步定义的 id)
    // 检查元素是否存在，防止报错
    const reverseEl = document.getElementById('reverseResult');
    if (reverseEl) {
        reverseEl.textContent = `加密: ${reverseEncrypted}\n解密: ${reverseDecrypted}`;
    }
}
```

**完成！** 保存文件，刷新网页，你现在的密码工具箱里就多了一个会自动更新的"倒序密码"模块。

---

## 4. 算法分类与常用工具

工程中的算法主要封装为 **Object（对象）** 或 **Class（类）**，通常包含 `e` (encrypt/加密) 和 `d` (decrypt/解密) 两个方法。

### 常用工具函数 (Utils)
在编写新模块时，你可能会用到这些通用处理：
1.  **清理输入**: `t.replace(/\s/g, "")` —— 去除所有空格，常用于古典密码处理。
2.  **转大写**: `t.toUpperCase()` —— 规范化输入。
3.  **大整数处理**: `BigInt` —— 用于大数进制转换。
4.  **文本编码**: `new TextEncoder().encode(t)` —— 用于将字符串转为字节数组（在 Base64 或 Hash 算法中常用）。

---

## 5. 工程文件详解 (File Structure & Descriptions)

为了方便维护，工程文件按照功能模块进行了分类。以下是每个文件/目录的具体作用：

### 📂 根目录 (Root)
*   **`index.html`**: **入口文件**。定义了网页的基础骨架、侧边栏导航和各模块的容器（Container）。此时容器是空的，等待 JS 填充。
*   **`modules.js`**: **内容仓库与加载器**。
    *   **HTML 仓库**: 变量 `MODULES` 存储页面级模块（电子实验室、工作流、知识图谱、Agent、API 中转站、联系我们等）的 HTML 字符串。
    *   **模块注入与脚本调度**: 负责把页面级模块注入容器，并调度各功能区批量加载器。加密实验室的经典区/现代区和 cipher 脚本已经从 `modules.js` 抽离到 `cipher/0_cipher_div_batch.js`。
*   **`0_zhuyeyangshi.css`**: **全局样式表**。定义了赛博朋克风格、霓虹灯效果、卡片布局、侧边栏样式等。
*   **`0_sidebar_funtion.js`**: **导航交互逻辑**。处理侧边栏点击事件，负责在不同模块（div）之间切换显示/隐藏。

### 📂 cipher/ (密码学核心逻辑)
这是"加密实验室"的核心代码库。
*   **`0_cipher_div_batch.js`**: **加密实验室批量入口**。
    *   保存经典区、现代区的 HTML 字符串 `CIPHER_CLASSIC_MODERN_DIV_BATCH`。
    *   保存 `CIPHER_SCRIPT_BATCH`，并提供 `loadCipherScriptBatch(loadBatch)` 顺序加载 cipher 脚本，避免工具函数早于算法脚本执行。
*   **`1_cipherlab.js`**: **核心算法库**。
    *   包含了大多数基础算法（凯撒、维吉尼亚、栅栏、培根等）。
    *   主要负责算法对象和算法函数定义。
*   **`999_funtion.js`**: **加密实验室绑定层**。
    *   包含 `updateAll()`，负责监听输入、读取 DOM 参数、调用算法并回填结果。
    *   经典区/现代区 UI 里的 DOM id 需要和这里保持一致。
*   **`2_ADFGXCipher.js`**: 独立文件。实现了 ADFGX 和 ADFVGX 这种复杂的棋盘+置换密码。
*   **`3_Enigma.js`**: 独立文件。实现了二战恩尼格玛机（Enigma）的模拟逻辑，包括转子、反射器、插板的设置。
*   **`4_MD5.js`**: 独立文件。包含 MD5 哈希算法的实现。
*   **`6_semaphore.js`**: 独立文件。实现了旗语（Semaphore）和盲文的可视化逻辑（绘制图片或 canvas）。
*   **`888_chinese_code_table.js`**: **数据文件**。存储中文电码（Chinese Telegraph Code）的对照表。
*   **`888_CornerMap.js`**: **数据文件**。存储四角号码的对照字典。

### 📂 logic/ (逻辑谜题)
这是"逻辑谜题区"的独立算法集合。当前主页面通过 `logic/logicbatch.js` 批量加载逻辑题算法和 `logic/logicdiv/` 下的 UI 片段，不再依赖一堆独立 HTML 小页面跳转。

### 📂 model/ (大模型与AI)
涉及 AI 对话和智能助手的功能。
*   **`script.js`**: 大模型（Da Mo Xing）聊天界面的前端交互逻辑，处理发送消息、显示气泡等。
*   **`cipher_bridge_auto.js`**: **桥接脚本**。尝试将密码工具的计算能力暴露给 AI，或者让 AI 能够调用密码工具的函数。
*   **`2_damoxing.css`**: 大模型聊天界面的专用样式。

### 📂 workflow/ (工作流)
*   **`workflow.js`**: 处理工作流模块的逻辑（可能是类似 Coze 的节点式处理或批量任务处理）。
*   **`1_workflow.css`**: 工作流模块的样式。

### 📂 zhishitupu/ (知识图谱)
*   **`zhishitupu.js`**: 知识图谱的渲染逻辑（可能使用了 D3.js 或类似库来绘制节点和连线）。
*   **`3_zhishitupu.css`**: 知识图谱的专用样式。

---

## 6. 开发者注意事项

1.  **修改页面级 UI**: 侧边栏和顶层容器在 `index.html`；电子实验室、工作流、知识图谱、Agent、API 中转站、联系我们等页面级模块在 `modules.js`。
2.  **修改加密实验室经典区/现代区 UI**: 去 `cipher/0_cipher_div_batch.js`，不要再把经典区/现代区的大段卡片 HTML 塞回 `modules.js`。
3.  **新增 cipher 脚本**: 如果添加 `cipher/5_NewCipher.js` 这类脚本，要注册到 `cipher/0_cipher_div_batch.js` 的 `CIPHER_SCRIPT_BATCH`，不是注册到 `modules.js`。
4.  **新增空间类模块**: 在 `spacepuzzle/` 下新增模块 JS 后，注册到 `spacepuzzle/spacepuzzlebatch.js`。空间类样式目前随 JS 注入，不再保留独立 `.css` 文件。
5.  **异步问题**: 现代加密（SHA/MD5）使用了浏览器原生 Crypto API，是异步的。在 `updateAll` 中调用它们时记得使用 `await`，否则用户会看到 `[object Promise]`。

---

## 7. 项目布局总览

这个项目整体是 **原生前端静态站 + Spring Boot 后端** 的结构。

```text
PzMCiphertool-
├─ README.md                         根说明文档
├─ README2.md                        备用/历史说明文档
├─ .env                              环境变量
├─ .github/                          GitHub workflow
├─ .vscode/                          VS Code 配置
├─ .claude/                          Claude/agent 相关配置
├─ Agent聊天记录/                    本地 Agent 聊天记录
├─ backendcipher/                    Java Spring Boot 后端
└─ frontendciphertool/               原生 HTML/CSS/JS 前端
```

### 前端：`frontendciphertool/`

这是主要用户界面。目录里没有 `package.json`，所以它不是 React/Vue/Vite 这类框架项目，而是原生静态网页。

```text
frontendciphertool/
├─ index.html                        前端入口页面
├─ modules.js                        页面级模块 HTML 仓库 + 脚本调度器
├─ 0_zhuyeyangshi.css                全局样式
├─ 0_sidebar_funtion.js              侧边栏/页面切换逻辑
├─ favicon.svg
├─ cipher/                           加密/解密实验室，含经典区/现代区 UI 批量入口
├─ electronic/                       电子电路实验室，内含 CircuitJS 资源
├─ workflow/                         工作流模块
├─ zhishitupu/                       知识图谱模块
├─ model/                            大模型聊天/Agent 前端逻辑
├─ apizhongzhuanzhan/                API 中转站前端
├─ loginsystem/                      登录认证前端
├─ sendfeedback/                     联系/反馈模块
├─ logic/                            逻辑谜题模块
├─ wordsearch/                       单词搜索模块
├─ spacepuzzle/                      空间谜题，如魔方
└─ agentmaster/                      全局悬浮助手
```

前端运行方式大致是：

1. `index.html` 定义侧边栏和各模块容器，并在 `modules.js` 前先加载 `cipher/0_cipher_div_batch.js`。
2. `modules.js` 的 `MODULES` 对象保存页面级 HTML：加密实验室外壳、电子实验室、工作流、知识图谱、大模型、API 中转站、反馈页等。
3. 加密实验室的经典区/现代区 HTML 由 `cipher/0_cipher_div_batch.js` 提供，通过 `${window.CIPHER_CLASSIC_MODERN_DIV_BATCH || ''}` 注入到 `modules.js` 的加密实验室外壳里。
4. 通用脚本由 `modules.js` 的 `coreScripts` 批量加载；cipher 脚本由 `cipher/0_cipher_div_batch.js` 的 `CIPHER_SCRIPT_BATCH` 顺序加载。
5. 逻辑谜题由 `logic/logicbatch.js` 管理 UI 片段和具体谜题 JS；空间类由 `spacepuzzle/spacepuzzlebatch.js` 统一加载公共 UI 和 8 个空间谜题模块。

### 核心前端模块

```text
cipher/
├─ 0_cipher_div_batch.js             经典区/现代区 HTML + cipher 脚本顺序加载入口
├─ 1_cipherlab.js                    主算法库，定义基础密码算法对象/函数
├─ 2_ADFGXCipher.js                  ADFGX/ADFGVX
├─ 3_Enigma.js                       Enigma 模拟
├─ 4_MD5.js                          MD5
├─ 6_semaphore.js                    旗语/可视化
├─ 888_chinese_code_table.js         中文电码数据表
├─ 888_CornerMap.js                  四角号码数据
├─ shiyongshuoming/                  使用说明页脚本与样式
└─ 999_funtion.js                    DOM 绑定、输入监听、updateAll() 和结果回填
```

```text
logic/
├─ logicbatch.js                     逻辑谜题分批加载入口
├─ logicdiv/                         逻辑谜题 UI 片段
└─ js/                               逻辑谜题具体实现
```

```text
model/
├─ main.js
├─ script.js
├─ AgentRuntime.js
├─ ChatUI.js
├─ DeepSeekClient.js
├─ HistoryManager.js
├─ ToolRegistry.js
└─ 2_damoxing.css
```

`model/` 是大模型聊天/Agent 相关前端逻辑，可能会调用后端 `/api/chat`、历史记录和工具接口。

### 空间类模块：`frontendciphertool/spacepuzzle/`

空间类模块目前已经整理为“公共 UI 基座 + 批量加载器 + 8 个具体谜题模块”的结构。`modules.js` 不再直接引用每个空间类文件，而是只引用 `spacepuzzle/spacepuzzlebatch.js`；该文件会先加载 `spacepuzzle_ui.js`，再加载 8 个具体模块。空间类样式已经随 JS 注入，`spacepuzzle/` 下不再保留独立 `.css` 文件。

```text
spacepuzzle/
├─ spacepuzzle_ui.js                 空间类公共 UI 样式与工具函数
├─ spacepuzzlebatch.js               空间类批量加载入口
├─ rubikscube/
│  └─ nubikscube.js                  标准三维魔方
├─ huarongdao/
│  └─ huarongdao.js                  数字华容道
├─ qiqiaoban/
│  └─ qiqiaoban.js                   七巧板
├─ jinzitamofang/
│  └─ jinzitamofang.js               金字塔魔方
├─ rubiksclock/
│  └─ rubiksclock.js                 Rubik's Clock
├─ skewbmofang/
│  └─ skewbmofang.js                 Skewb 魔方
├─ squreonemofang/
│  └─ squreonemofang.js              Square-1 魔方
└─ Pentomino/
   └─ Pentomino.js                   Pentomino 五连方
```

当前 `spacepuzzle/` 下没有独立 `.css` 文件。公共布局样式放在 `spacepuzzle_ui.js`，例如 `space-workspace`、`space-control-panel`、`space-display-panel`、`space-cube-hud`、步骤条、统计卡片等；每个具体模块只保留自己的棋盘、3D 模型、贴纸、钟盘或谜题专属样式。

### 后端：`backendcipher/`

后端是 Maven + Spring Boot 3.2.0 + Java 17。

```text
backendcipher/
├─ pom.xml                           Maven 配置
├─ README.md
├─ start.bat                         Windows 启动脚本
├─ start.sh                          Linux/macOS 启动脚本
├─ Aliyunsmsmd/                      阿里云短信相关文档
├─ modelchathistory/                 聊天历史 JSON 存储
└─ src/main/
   ├─ java/com/ciphertool/
   │  ├─ CipherToolApplication.java  Spring Boot 入口
   │  ├─ config/                     CORS、Redis、阿里云短信配置
   │  ├─ controller/                 API 控制器
   │  ├─ dto/                        请求/响应 DTO
   │  ├─ exception/                  全局异常处理
   │  └─ service/                    业务服务与实现
   └─ resources/
      ├─ application.yml
      └─ application-dev.yml
```

后端主要接口分组：

```text
/api/auth
├─ POST /send-code                   发送验证码
├─ POST /login                       登录
└─ GET  /health                      健康检查

/api/chat
├─ POST /completions                 聊天补全，SSE 流式输出
├─ GET  /history                     获取聊天历史
└─ POST /history                     保存聊天历史

/api/crawler
├─ POST /search
├─ POST /webpage
├─ POST /search_urls
├─ POST /read_webpage
├─ POST /news
└─ POST /weather
```

### 项目性质总结

这是一个“泡面的 Agent 工具箱 / Puzzlehunt / CTF / 电子实验室 / 大模型助手”综合工具站。前端承担大量 UI 和本地算法逻辑，尤其是密码学工具；后端主要负责需要服务端能力的部分：短信登录、Redis、聊天代理、聊天历史、网页搜索/爬取等。

一个关键维护点：前端很多 UI 不在 `index.html`。页面级 UI 主要在 `frontendciphertool/modules.js`；加密实验室经典区/现代区 UI 和 cipher 脚本列表在 `frontendciphertool/cipher/0_cipher_div_batch.js`；逻辑谜题由 `logic/logicbatch.js`、`logic/logicdiv/` 和 `logic/js/` 分层管理；空间类由 `spacepuzzle/spacepuzzlebatch.js` 和各谜题 JS 管理，样式随 JS 注入。新增功能时要同时确认 UI 入口、业务 JS 和对应批量加载列表。
