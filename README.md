怎么打开这个项目

1.如果你安装了VS Code 或者 cursor，那么可以安装live server插件，然后在目录栏里右键index.html，选择Open with live server来打开。

2.如果你已经安装了 Node.js，直接在终端输入命令并回车：npx http-server，终端会显示访问地址，通常是 http://127.0.0.1:8080。按住 Ctrl 点击链接即可打开。

3.如果你已经安装了cursor，那么可以按 Ctrl + Shift + P 打开搜索框，输入>Simple Browser: Show（注意大小写和英文冒号），然后回车，然后在框里输入 http://127.0.0.1:5500/你解压工程后的文件夹名称/index.html，
一般是http://127.0.0.1:5500/08_Ciphertool/frontendciphertool/index.html。
这样你就可以不需要浏览器，直接在代码编辑器的右侧分栏中直接看到网页效果。




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
    在 `cipher/1_cipherlab.js` 中，有一个全选监听器：
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
打开 `modules.js`，找到 `MODULES` 对象下的 `jiamishiyanshi`（加密实验室）字符串。在 `<div id="mimaqu" ...>` 内部找到合适的位置，插入一个新的卡片代码：

```html
<!-- 在 modules.js 的 jiamishiyanshi 字符串中添加 -->
<div class="card">
    <!-- 1. 标题 -->
    <div class="badge">倒序密码 Reverse</div>
    
    <!-- 2. (可选) 如果有特殊参数，在这里加 input，记得给 id -->
    <!-- <input type="number" id="reverseStep" placeholder="步长"> -->

    <!-- 3. 结果显示区，必须有一个唯一的 id -->
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
继续在 `cipher/1_cipherlab.js` 中，找到底部的 `updateAll()` 函数。在函数内部添加调用代码：

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
    *   **HTML 仓库**: 变量 `MODULES` 存储了所有功能模块（加密、知识图谱等）的 HTML 字符串。
    *   **脚本加载**: 负责动态将 HTML 注入页面，并按顺序加载 `cipher/` 下的脚本。
*   **`0_zhuyeyangshi.css`**: **全局样式表**。定义了赛博朋克风格、霓虹灯效果、卡片布局、侧边栏样式等。
*   **`0_sidebar_funtion.js`**: **导航交互逻辑**。处理侧边栏点击事件，负责在不同模块（div）之间切换显示/隐藏。

### 📂 cipher/ (密码学核心逻辑)
这是"加密实验室"的核心代码库。
*   **`1_cipherlab.js`**: **主控逻辑**。
    *   包含了大多数基础算法（凯撒、维吉尼亚、栅栏、培根等）。
    *   **核心**: 包含 `updateAll()` 函数，它是整个工具箱的"心跳"，负责监听输入并分发任务给各个算法。
*   **`2_ADFGXCipher.js`**: 独立文件。实现了 ADFGX 和 ADFVGX 这种复杂的棋盘+置换密码。
*   **`3_Enigma.js`**: 独立文件。实现了二战恩尼格玛机（Enigma）的模拟逻辑，包括转子、反射器、插板的设置。
*   **`4_MD5.js`**: 独立文件。包含 MD5 哈希算法的实现。
*   **`6_semaphore.js`**: 独立文件。实现了旗语（Semaphore）和盲文的可视化逻辑（绘制图片或 canvas）。
*   **`888_chinese_code_table.js`**: **数据文件**。存储中文电码（Chinese Telegraph Code）的对照表。
*   **`888_CornerMap.js`**: **数据文件**。存储四角号码的对照字典。
*   **`999_funtion.js`**: **工具库**。存放一些通用的辅助函数。

### 📂 logic/ (逻辑谜题)
这是"逻辑谜题区"的独立游戏集合。
*   此目录下的 `*.html`（如 `1_sudoku.html`, `39_nonogram.html`）都是**独立的小网页**。
*   点击主页面的逻辑区按钮会跳转到这些文件。它们有自己独立的 JS 和 CSS（通常在 `logic/js/` 和 `logic/css/` 中）。

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

1.  **修改 UI**: 如果要改界面文字或布局，**不要去 `index.html` 找**，要去 `modules.js` 的字符串里找。
2.  **新增 JS**: 如果你添加了新的 JS 文件（例如 `cipher/5_NewCipher.js`），**必须**在 `modules.js`底部的加载列表中注册它，否则网页不会加载这个文件。
3.  **异步问题**: 现代加密（SHA/MD5）使用了浏览器原生 Crypto API，是异步的。在 `updateAll` 中调用它们时记得使用 `await`，否则用户会看到 `[object Promise]`。

