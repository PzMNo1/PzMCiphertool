## 登录系统开发指南（短信验证码版）

本文档面向：`08_Ciphertool` 项目的登录系统（`loginsystem`），目标是从 0 搭建一个**真实短信验证码登录**，并承载约 **1000 人次/日** 的访问量，适合个人 / 小团队独立开发者。

---

### 1. 总体架构与目标

- **登录方式**：  
  - 使用 **手机号 + 短信验证码**，无密码登录。
- **整体架构**：
  - **前端**：现有的 `index.html` + `modules.js` + `loginsystem/auth.js` + `auth.css`。
  - **后端**：新增一个 Web 服务（推荐：Node.js + Express）。
  - **数据库**：SQLite / MySQL 均可，存用户与验证码。
  - **短信服务商**：阿里云短信 / 腾讯云短信（二选一或类似国内服务）。
- **用户体验**：
  1. 用户打开 `index.html` → 看到登录界面。
  2. 输入手机号 → 点「发送验证码」→ 收到短信。
  3. 输入验证码 → 点「登录」→ 校验成功后，显示密码工具箱主内容。

---

### 2. 选择并开通短信服务商

#### 2.1 选型建议

- 推荐：**阿里云短信服务** 或 **腾讯云短信（SMS）**。
- 你的体量（~1000 UV/日，验证码约 100 条/日）：
  - 按条计费，每条几分钱，月成本通常在几十元级别。

#### 2.2 在控制台需要完成的操作（以阿里云为例）

1. 注册阿里云账号，并完成 **实名认证**。
2. 打开「短信服务」控制台，依次：
   - **申请短信签名**（例：`密码工具箱`）。
   - **申请短信模板**（例：`您的验证码为：${code}，5分钟内有效。`）。
3. 获取并保存以下信息（后端会用到）：
   - `AccessKeyId`
   - `AccessKeySecret`
   - `SignName`（短信签名）
   - `TemplateCode`（短信模板 Code）

> 以上敏感信息务必通过 **环境变量** 传入后端，**不要写死在代码里**。

---

### 3. 后端整体设计（API + 数据结构）

#### 3.1 必要 API 设计（最小可用集）

1. **POST `/api/send-code`**
   - 入参（JSON）：
     - `phone`: string（手机号）
     - `scene`: string（可选，例如 `"login"`，方便将来扩展不同场景）
   - 主要逻辑：
     1. 校验手机号格式。
     2. 检查该手机号 / IP 的发送频率（防止恶意刷短信）。
     3. 生成 4–6 位数字验证码（例如 `123456`）。
     4. 将验证码写入数据库（带有过期时间，如 5 分钟）。
     5. 调用短信服务商 SDK 发送短信。
   - 返回：
     - 成功：`{ success: true }`
     - 失败：`{ success: false, error: '...' }`

2. **POST `/api/login`**
   - 入参（JSON）：
     - `phone`: string
     - `code`: string
   - 主要逻辑：
     1. 从数据库读取该手机号最新、未使用、未过期的验证码记录。
     2. 校验：
        - 验证码是否存在。
        - 是否已过期。
        - 是否匹配输入的 `code`。
        - 是否错误次数过多。
     3. 如校验通过：
        - 将该验证码标记为已使用。
        - 在 `users` 表中查找该手机号的用户，不存在则创建。
        - 生成登录凭据（推荐：JWT Token 或 Session Cookie）。
   - 返回：
     - 若使用 JWT：`{ success: true, token: '...' }`
     - 或仅返回 `{ success: true }`，登录状态通过 HttpOnly Cookie 保存。

3. **GET `/api/me`**
   - 用于前端判断当前是否已登录。
   - 逻辑：
     1. 从 `Authorization: Bearer <token>` 或 Cookie 中解析 token。
     2. 校验 token 是否有效、是否过期。
     3. 返回当前用户信息（如 `id`, `phone`），或 401 未登录。

4. **POST `/api/logout`（可选）**
   - 用于退出登录：
     - 若使用 JWT：前端清除 token 即可；如需服务端黑名单可扩展。
     - 若使用 Session：服务端删除 session，前端清 cookie（或让它过期）。

#### 3.2 数据库表结构建议

1. `users` 表（用户信息，手机号为主键字段之一）：
   - `id`：主键（自增）
   - `phone`：手机号（唯一索引）
   - `created_at`：注册时间
   - `last_login_at`：最近登录时间

2. `sms_codes` 表（验证码记录）：
   - `id`：主键（自增）
   - `phone`：手机号
   - `code`：验证码（4–6 位数字）
   - `scene`：场景（如 `"login"`）
   - `expired_at`：过期时间
   - `used`：是否已使用（布尔 / 0-1）
   - `created_at`：创建时间
   - 可选：`fail_count`（累计错误次数）

> 也可以改用 Redis 等缓存存储验证码，但对入门和低流量场景，简单数据库表已足够。

---

### 4. 使用 Node.js + Express 实现后端（示例思路）

> 可以根据技术栈更换为其他语言 / 框架，但流程相同。

#### 4.1 初始化项目

在一个新文件夹（如 `sms-auth-server`）中执行：

npm init -y
npm install express jsonwebtoken sqlite3 cors
# 若使用阿里云短信：
npm install @alicloud/pop-core
# 若使用腾讯云短信，则安装对应 SDK- `express`：Web 服务框架。
- `jsonwebtoken`：生成和验证 JWT。
- `sqlite3`：简单数据库，适合本地和小规模部署。
- `cors`：允许跨域调用（前端页面与后端不在同源时需要）。
- `@alicloud/pop-core`：阿里云短信 Node.js SDK。

#### 4.2 环境变量配置

在项目根目录创建 `.env`（部署到云服务器时用平台提供的环境变量配置）：

ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=你的模板CODE
JWT_SECRET=一串足够随机且长度较长的字符串> 切记 `.env` 不要提交到公开仓库。

#### 4.3 核心接口逻辑（伪代码级别）

1. `/api/send-code`：
   - 校验手机号。
   - 检查：该手机号 / IP 的发送频率（如 1 分钟 1 次，1 天 10 次）。
   - 生成随机验证码（例如 `Math.random().toString().slice(2, 8)` 截取 6 位）。
   - 写入 `sms_codes` 表（设置 `expired_at = now + 5 min`，`used = 0`）。
   - 调用短信 SDK：
     - 填入手机号、签名、模板 Code、模板参数（包含 `code`）。
   - 返回结果给前端。

2. `/api/login`：
   - 从请求体中获取 `phone` 与 `code`。
   - 查询 `sms_codes` 表中该手机号最新、未使用的验证码。
   - 校验：
     - 是否存在。
     - 是否在 `expired_at` 之前。
     - `code` 是否相等。
     - 错误次数是否超限（可选）。
   - 校验通过：
     - 将该验证码标记为 `used = 1`。
     - 在 `users` 表中查找 `phone`，如不存在则插入新用户。
     - 使用 `JWT_SECRET` 生成 JWT，payload 包含 `userId`、`phone`。
   - 返回 `{ success: true, token }`。

3. 认证中间件（供 `/api/me` 等使用）：
   - 从请求头 `Authorization: Bearer <token>` 或 Cookie 中拿 token。
   - 使用 `JWT_SECRET` 验证 token。
   - 验证通过：将用户信息挂载到 `req.user`，继续执行。
   - 验证失败：返回 `401 Unauthorized`。

---

### 5. 前端登录系统与后端对接（`loginsystem/auth.js`）

#### 5.1 前端元素结构建议

登录界面通常包含：

- 手机号输入框：例如 `#phoneInput`
- 发送验证码按钮：例如 `#sendCodeBtn`
- 验证码输入框：例如 `#codeInput`
- 登录按钮：例如 `#loginBtn`
- 登录容器（弹窗或整页）：例如 `#loginModal`
- 主内容容器：`<div class="container1"> ... </div>`（已在 `index.html` 中存在）

> 初始状态下，**应隐藏 `.container1` 主内容**，只显示登录界面。

#### 5.2 发送验证码逻辑

在 `auth.js` 中（伪代码）：

const phoneInput = document.getElementById('phoneInput');
const sendCodeBtn = document.getElementById('sendCodeBtn');

sendCodeBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  // TODO: 手机号格式校验

  try {
    const res = await fetch('https://你的后端域名/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, scene: 'login' })
    });
    const data = await res.json();
    if (data.success) {
      // 显示“验证码已发送”，并开始倒计时禁用按钮，如 60 秒
    } else {
      // 提示 data.error
    }
  } catch (e) {
    // 提示网络或服务器错误
  }
});#### 5.3 登录逻辑

const codeInput = document.getElementById('codeInput');
const loginBtn = document.getElementById('loginBtn');

loginBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  const code = codeInput.value.trim();

  try {
    const res = await fetch('https://你的后端域名/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (data.success && data.token) {
      // 简单方案：前端持有 JWT
      localStorage.setItem('auth_token', data.token);

      // 隐藏登录界面，展示主内容
      document.getElementById('loginModal').style.display = 'none';
      document.querySelector('.container1').style.display = 'block';
    } else {
      // 显示 data.error 或通用错误文案
    }
  } catch (e) {
    // 提示网络或服务器异常
  }
});> 若你采用 Cookie + Session 的方案，则无需前端保存 `token`，只要登录成功，后续接口自动附带 Cookie 即可。

#### 5.4 页面加载时的登录状态检查

在 `auth.js` 中：

1. 页面加载后：
   - 若使用 JWT：
     - 从 `localStorage` 获取 `auth_token`。
     - 若有 token，则调用 `/api/me`：
       - 成功：直接显示主内容 `.container1`，隐藏登录层。
       - 失败：清除 token，回到登录状态。
   - 若使用 Cookie：
     - 直接调用 `/api/me`：
       - 若 200：说明已登录，显示主内容。
       - 若 401：说明未登录，显示登录界面。

2. 对于主功能模块（加密实验室等），只要 `.container1` 是否展示由登录状态控制即可，无需对每个模块单独加判断。

---

### 6. 部署与运维（小体量独立开发者方案）

#### 6.1 后端部署方式建议

- **云服务器（ECS / 轻量应用服务器 / Lighthouse 等）**
  - 配置：1 核 2G + 1–3M 带宽，足够你目前的日 1000 人次。
  - 步骤：
    1. 安装 Node.js。
    2. 拉取后端代码仓库。
    3. 执行 `npm install`。
    4. 使用 `pm2` 或 `systemd` 让服务常驻运行。
    5. 使用 **Nginx** 作为反向代理：
       - `https://api.yourdomain.com` → 代理到 `http://127.0.0.1:3000`。

- **Serverless / 函数计算**（阿里云函数计算 / 腾讯云 SCF 等）：
  - 按量计费，低访问量时成本低，但初学者部署略复杂，可作为后续优化方案。

#### 6.2 域名与 HTTPS

1. 注册一个域名（如 `cipherlab.fun`）。
2. 配置 DNS 解析：
   - `www.cipherlab.fun` → 前端站点（静态页面）。
   - `api.cipherlab.fun` → 后端 Node.js 服务。
3. 使用 Let’s Encrypt 或云厂商免费证书为 Nginx 配置 **HTTPS**。
4. 前端中所有请求后端的 URL 改为 `https://api.cipherlab.fun/api/...`，确保验证码与 token 在 TLS 加密通道传输。

---

### 7. 安全与风控要点（简明版）

1. **短信发送频率限制（防刷）**
   - 单手机号：
     - 1 分钟内最多 1 次。
     - 1 小时内最多 5 次。
     - 1 天内最多 10 次（具体阈值可调）。
   - 单 IP 地址也可设置类似限制。
2. **验证码安全**
   - 每条验证码设置**过期时间**（如 5 分钟）。
   - 单条验证码可限制**最大错误输入次数**（如 5 次），超出后即作废。
   - 验证通过后标记为 `used = 1`，避免重复使用。
3. **Token / Session 安全**
   - JWT 过期时间不宜过长（如 7 天）。
   - `JWT_SECRET` 要足够随机，并仅存在于环境变量。
   - 如用 Cookie：设置 `HttpOnly` 和 `Secure`（仅 HTTPS）。
4. **日志与隐私**
   - 日志中不要记录完整验证码。
   - 可以记录：手机号（或打码）、IP、发送时间、成功/失败状态。
5. **合规提醒**
   - 登录界面简要提示：手机号仅用于登录验证和必要的风控。
   - 不要擅自将手机号用于营销短信发送，否则容易被投诉或短信通道被封。

---

### 8. 从零到上线的行动清单（Checklist）

1. **整理现有前端登录界面**
   - 确定 `auth.html` / `index.html` 中，手机号与验证码输入框、按钮的 ID。
   - 默认隐藏 `.container1` 主内容，仅显示登录 UI。
2. **开通短信服务**
   - 完成实名 → 创建签名 → 创建验证码模板。
   - 记录：`AccessKeyId`、`AccessKeySecret`、`SignName`、`TemplateCode`。
3. **搭建后端服务（Node.js 示例）**
   - 初始化项目 → 安装依赖 → 配置 `.env`。
   - 建立 `users`、`sms_codes` 等数据表。
   - 实现 `/api/send-code`、`/api/login`、`/api/me` 等基础接口。
4. **本地联调**
   - 前端 `auth.js` 使用 `fetch('http://localhost:3000/api/...')` 测试。
   - 确认：能收到真实短信、登录成功、主内容正常显示。
5. **部署到云服务器**
   - 部署并常驻运行后端服务。
   - 使用 Nginx 配置域名与 HTTPS。
6. **前端上线**
   - 将 `08_Ciphertool` 静态文件部署到 Web 服务器或静态托管。
   - 修改 `auth.js` 中的 API 地址为 `https://api.你的域名/api/...`。
   - 通过浏览器访问真实线上环境，完整跑一遍登录 → 访问主工具箱流程。
7. **监控与后续优化**
   - 监控短信发送成功率与错误日志。
   - 根据实际情况调整发送频率限制和验证码有效期。
   - 随访问量提升，可考虑 Serverless、Redis 缓存、行为验证码等进一步优化。

---

> 备注：本指南旨在给出「从 0 到可上线」的最小闭环方案。  
> 若你后续确定了具体短信服务商（如阿里云 / 腾讯云）与后端技术栈，我可以再给一份**对应栈的示例代码**（含后端与 `auth.js` 的具体实现）。