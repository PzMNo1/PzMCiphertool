# API 中转站功能优化规格说明 v2

> **项目定位**：Ciphertool 是密码学/逻辑/电路实验室工具箱，API 中转站只是附属功能之一  
> **对标参考**：sub2api（仅作参考，不完全照搬）  
> **优化原则**：**不影响主项目体验，保持极简哲学，可选性模块化**

---

## 🎯 核心原则

### ❌ 不应该做的事（避免过度复杂化）

1. **不要把 API 中转站做成独立产品**
   - ❌ 不要增加 10+ 个新页面（sub2api 有 78 个页面）
   - ❌ 不要引入复杂的 OAuth 授权流程
   - ❌ 不要增加联盟营销系统（与密码学实验室无关）
   - ❌ 不要增加代理池管理（过于运维化）

2. **不要破坏现有极简设计**
   - ❌ 不要把侧边栏塞满中转站子菜单
   - ❌ 不要增加大量数据库表（sub2api 有 20+ 张表）
   - ❌ 不要让前端变成 Vue/React 大型应用

3. **不要增加用户心智负担**
   - ❌ 不要强制用户理解"账号池"、"粘性会话"等概念
   - ❌ 不要让普通用户看到过多运维级配置

---

## ✅ 应该做的事（保持实用与极简）

### 🔵 Phase 1 - 核心体验优化（2-3 周）

#### 1.1 **流式响应精确计费** ⭐⭐⭐⭐⭐
**问题**：当前流式响应只估算输入 Token，输出 Token 为 0

**解决方案**（后端）：
```java
// 在 StreamingResponseBody 中解析 SSE 流
private TokenUsage extractStreamUsage(InputStream stream) {
    BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
    long outputTokens = 0;
    String line;
    while ((line = reader.readLine()) != null) {
        if (line.startsWith("data: ")) {
            String json = line.substring(6);
            JsonNode chunk = objectMapper.readTree(json);
            // 累加 usage.completion_tokens
            outputTokens += chunk.path("usage").path("completion_tokens").asLong(0);
        }
    }
    return new TokenUsage(inputTokens, outputTokens);
}
```

**影响**：后端改动，前端无感知，计费更准确

---

#### 1.2 **用户端：可用渠道状态透明化** ⭐⭐⭐⭐
**目的**：让用户知道当前哪些上游可用，提升信任感

**前端**（新增一个简单卡片）：
```html
<!-- 在 apizhongzhuanzhan.js 中新增一个小卡片 -->
<section class="apizz-card apizz-panel">
    <div class="apizz-panel-title">上游状态 <small>实时</small></div>
    <div class="apizz-status-list">
        <div class="apizz-status-item">
            <span class="apizz-status-dot healthy"></span>
            <span>OpenAI 主渠道</span>
            <span class="apizz-muted">延迟 120ms</span>
        </div>
        <div class="apizz-status-item">
            <span class="apizz-status-dot degraded"></span>
            <span>备用渠道 A</span>
            <span class="apizz-muted">延迟 1.2s</span>
        </div>
    </div>
</section>
```

**后端**（新增接口）：
```java
@GetMapping("/api/api-router/channel-status")
public ResponseEntity<List<ChannelStatus>> getChannelStatusForUser() {
    // 返回简化的渠道状态（隐藏敏感信息）
    return ResponseEntity.ok(apiRouterService.getPublicChannelStatus());
}
```

**影响**：一个新卡片，不增加页面，不影响现有布局

---

#### 1.3 **简易公告系统** ⭐⭐⭐
**目的**：维护通知、活动告知

**前端**（顶部横幅）：
```html
<!-- 在 index.html 顶部添加 -->
<div id="announcement-banner" class="banner" style="display:none;">
    <span id="announcement-text"></span>
    <button onclick="dismissAnnouncement()">×</button>
</div>
```

**后端**（简单接口）：
```java
@GetMapping("/api/announcements/latest")
public ResponseEntity<Announcement> getLatestAnnouncement() {
    // 返回最新一条启用的公告
}
```

**影响**：最小化实现，不增加管理页面，管理员直接操作数据库即可

---

### 🟢 Phase 2 - 可选增强功能（按需实现，3-4 周）

#### 2.1 **订阅套餐（可选）** ⭐⭐⭐
**仅在需要商业化时实现**

**简化设计**：
- 只支持 3-5 个固定套餐（基础版、标准版、专业版）
- 不支持自定义套餐、不支持套餐升级/降级
- 购买套餐 = 自动充值对应余额

**数据库**（1 张表）：
```sql
CREATE TABLE subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128),
    price DECIMAL(12, 2),
    quota_usd DECIMAL(12, 2),  -- 直接转为余额
    enabled BOOLEAN DEFAULT TRUE
);
```

**前端**（一个简单页面）：
```
用户端 -> 订阅套餐页 -> 选择套餐 -> 跳转支付 -> 自动充值
```

**影响**：可选功能，不启用时完全不显示

---

#### 2.2 **促销码系统（可选）** ⭐⭐
**仅在搞活动时实现**

**简化设计**：
- 只支持百分比折扣（如 9 折）
- 用户在充值时输入促销码
- 不需要独立管理页面，管理员直接插入数据库

**数据库**（1 张表）：
```sql
CREATE TABLE promo_codes (
    code VARCHAR(64) PRIMARY KEY,
    discount_percent DECIMAL(5, 2),  -- 10 = 9折
    max_uses INT,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMP
);
```

**前端改动**：
- 在充值页面增加"促销码"输入框
- 应用折扣后显示实际支付金额

**影响**：可选功能，平时隐藏促销码输入框

---

#### 2.3 **邀请返佣（可选）** ⭐⭐
**仅在需要推广时实现**

**极简设计**：
- 用户个人中心生成专属邀请链接
- 新用户通过链接注册，邀请人获得一次性返佣
- 不支持多级返佣、不支持提现（直接充值到余额）

**数据库**（2 张表）：
```sql
CREATE TABLE invites (
    referrer_email VARCHAR(128),
    invite_code VARCHAR(32) UNIQUE,
    uses INT DEFAULT 0
);

CREATE TABLE invite_rewards (
    referrer_email VARCHAR(128),
    referee_email VARCHAR(128),
    reward_usd DECIMAL(12, 4),
    created_at TIMESTAMP
);
```

**前端**（一个简单弹窗）：
```html
<div class="invite-modal">
    <h3>邀请好友</h3>
    <input readonly value="https://yoursite.com/?ref=ABC123">
    <button onclick="copyLink()">复制链接</button>
    <p>已邀请 3 人，获得返佣 $5.00</p>
</div>
```

**影响**：可选功能，默认关闭

---

### 🔴 Phase 3 - 明确不实现的功能

#### ❌ 不实现的 sub2api 功能

1. **上游账号管理** - 过于复杂
   - 你的项目只需要"渠道"概念即可
   - OAuth 授权流程太重，不符合极简哲学

2. **用户组管理** - 团队功能非必需
   - 你的项目主要面向个人用户
   - 如需团队隔离，可以让他们各自注册账号

3. **代理池管理** - 运维级功能
   - 增加复杂度，不符合"去服务器化"理念

4. **渠道监控面板** - 过度可视化
   - 当前的"状态健康"页面已足够
   - 不需要实时监控大屏

5. **数据备份功能** - 交给 DBA
   - 备份应该是运维层面的事
   - 不应该在 Web 界面做

6. **内容审核系统** - 非核心需求
   - 你的项目不是公开 API 平台
   - 如需审核，接入第三方服务即可

---

## 📐 架构建议（保持极简）

### 前端布局建议

**当前结构（保持）**：
```
index.html
├─ sidebar（侧边栏）
│  ├─ 加密实验室 ⭐ 核心
│  ├─ 电子实验室 ⭐ 核心
│  ├─ 逻辑谜题 ⭐ 核心
│  ├─ ...
│  └─ API 中转站（可折叠子菜单）
│     ├─ 概览
│     ├─ API Keys
│     ├─ 用量
│     ├─ 充值
│     └─ [可选] 订阅套餐
└─ main content
```

**不要做的**：
- ❌ 不要把 API 中转站拆成 10+ 个独立页面
- ❌ 不要让侧边栏被中转站菜单占满
- ❌ 不要增加二级侧边栏

**建议**：
- ✅ API 中转站保持 4-5 个页面即可
- ✅ 使用标签页切换，而非独立页面
- ✅ 保持赛博朋克风格，与主项目统一

---

### 后端架构建议

**当前结构（保持）**：
```
backendcipher/
├─ ApiRouterController.java ✅ 保留
├─ ApiRouterService.java    ✅ 保留
├─ OpenAiCompatibleController.java ✅ 保留
└─ RiskControlService.java  ✅ 保留
```

**不要做的**：
- ❌ 不要拆分成 10+ 个 Service
- ❌ 不要引入 AccountService、GroupService、ProxyService 等
- ❌ 不要增加 20+ 张数据库表

**建议**：
- ✅ 只增加必要的 2-3 张表（如 subscription_plans、promo_codes）
- ✅ 功能逻辑继续放在 ApiRouterService 中
- ✅ 保持单体应用，不要微服务化

---

## 🎨 UI/UX 优化建议

### 保持一致性

1. **颜色主题**
   - 继续使用赛博朋克蓝绿色
   - 不要引入新的配色方案

2. **卡片布局**
   - 继续使用现有的 `apizz-card` 样式
   - 不要重新设计 UI 组件

3. **字体图标**
   - 继续使用现有的图标库
   - 不要引入新的依赖

### 简化用户流程

**充值流程**（保持简单）：
```
用户 -> 点击"充值" -> 输入金额 -> [可选: 促销码] -> 选择支付方式 -> 支付 -> 完成
```

**不要增加**：
- ❌ 套餐选择页（除非真的需要）
- ❌ 配额计算器
- ❌ 多步骤向导

---

## 📊 数据库表优化（最小化）

### 核心表（已有，保留）
```
✅ api_router_keys         - API Keys
✅ api_router_usage_logs   - 用量日志
✅ api_router_wallets      - 钱包
✅ api_router_ledger       - 账务流水
✅ api_router_channels     - 渠道
✅ api_router_model_prices - 模型价格
✅ api_router_orders       - 订单
✅ api_router_redeem_codes - 兑换码
```

### 可选新增表（按需）
```
⚪ subscription_plans      - 订阅套餐（可选）
⚪ promo_codes             - 促销码（可选）
⚪ invites                 - 邀请码（可选）
⚪ invite_rewards          - 邀请返佣（可选）
⚪ announcements           - 公告（可选）
```

### 不增加的表
```
❌ upstream_accounts       - 过于复杂
❌ user_groups             - 非必需
❌ group_members           - 非必需
❌ sticky_sessions         - 非必需
❌ proxies                 - 运维功能
❌ channel_monitors        - 过度监控
```

---

## 🎯 最终建议（分阶段实施）

### 立即优化（1-2 周）

1. **流式响应精确计费** ⭐⭐⭐⭐⭐
   - 后端改动，前端无感知
   - 提升计费准确性

2. **用户端渠道状态展示** ⭐⭐⭐⭐
   - 新增一个小卡片
   - 提升用户信任感

3. **简易公告系统** ⭐⭐⭐
   - 顶部横幅通知
   - 不增加管理页面

---

### 可选实现（按需，2-3 周）

4. **订阅套餐** ⭐⭐⭐（仅在商业化时）
5. **促销码** ⭐⭐（仅在搞活动时）
6. **邀请返佣** ⭐⭐（仅在推广时）

---

### 明确不做

7. ❌ 上游账号管理
8. ❌ 用户组管理
9. ❌ 代理池管理
10. ❌ 渠道监控面板
11. ❌ 数据备份功能
12. ❌ 内容审核系统
13. ❌ OAuth 授权流程

---

## 💡 总结

### 核心原则

1. **保持极简** - API 中转站是附属功能，不是主角
2. **可选性** - 所有新功能都是可选的，不影响核心体验
3. **模块化** - 新功能可以独立开关，不用就不显示
4. **统一风格** - 不破坏现有的赛博朋克风格
5. **渐进增强** - 先做核心优化，商业功能按需实现

### 工作量估算

- **Phase 1（核心优化）**：1-2 周
- **Phase 2（可选功能）**：每个 2-3 天
- **Phase 3（不实现）**：节省 6-8 周

### 与 sub2api 的差异

| 维度 | sub2api | Ciphertool 优化方案 |
|------|---------|---------------------|
| 定位 | 专业 API 中转平台 | 实验室工具箱的附属功能 |
| 页面数 | 78 个 | 4-5 个 |
| 数据库表 | 20+ 张 | 8-13 张 |
| 核心功能 | 账号池、智能调度 | 简单中转、计费准确 |
| 复杂度 | 高 | 低 |
| 开发周期 | 3-4 月 | 1-2 周（核心） |

---

**文档版本**：v2.0（精简版）  
**创建时间**：2026-06-02  
**核心理念**：保持 Ciphertool 的极简哲学，不过度复杂化
