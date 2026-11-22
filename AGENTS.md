# AGENTS.md — PzMCiphertool / 泡面的 Agent 工具箱

本项目是 `https://www.paomian233.com` 的 Agent 工具箱：静态前端 + Spring Boot 后端 + PWA。
本文件记录项目结构、运行方式、已完成/在进行的工作和硬约束，避免后续 agent 重复踩坑或遗忘任务。
更细的模块说明见各子目录的 `Agents.md`（例如 `frontendciphertool/model/Agents.md`、`frontendciphertool/agentmaster/Agents.md`）。

## 1. 目录结构

```
frontendciphertool/      主站静态前端（无构建，直接由 nginx 提供）
  index.html             主页面（含悬浮 agent 输入框、PWA manifest/sw 注册）
  modules.js             主站模块装载、agent 页面 #user-input 等
  agentmaster/           悬浮球/agentmaster：agentmaster.js、agentmaster.css
  model/                 Agent 工具箱：ChatUI.js、main.js、RechargeModal.js、工具/协议
  cipher/ electronic/ logic/ spacepuzzle/ wordsearch/ zhishitupu/ ...
  vendor/                前端依赖（three、3d-force-graph 等）
backendcipher/           Spring Boot 3.2 后端（Java 17，Maven）
frontend-rust/           Rust/WASM 渐进重构前端（部分模块，非主站默认入口）
docs/                    视觉对比、模块说明
scripts/                 Research Agent / 导出 / 校验脚本
public/ backendconfig.js 等
```

## 2. 生产运行方式（Linux 服务器）

- 前端根目录：`/home/ubuntu/10_Leochad/08_Ciphertool/frontendciphertool`，由 nginx 在 443 提供；`/api/` 反代到 8080。
- 后端：`backendcipher/target/ciphertool-backend-1.0.0.jar`，systemd 服务 `ciphertool.service`，监听 `127.0.0.1:8080`。
- 数据库：H2 文件 `/home/ubuntu/.ciphertool/ciphertool.mv.db`；Redis 本地；Flyway 管理表结构。
- 余额/资讯页：独立 Python 服务 `/srv/wxbot/workspace/ops/balance-monitor`，监听 8099，经 nginx `/balance-0ed197a49e/` 对外。
- PWA：`frontendciphertool/sw.js`；静态资源通过 `?v=YYYYMMDD-NN` 版本号和 `CACHE_VERSION` 控制缓存。

常用命令：

```bash
# 后端
cd /home/ubuntu/10_Leochad/08_Ciphertool/backendcipher
mvn -q -DskipTests package
systemctl restart ciphertool.service
curl -sS http://127.0.0.1:8080/api/auth/health

# 前端（无构建；改完直接验证公网）
curl -k -sS https://www.paomian233.com/ | head
node --check frontendciphertool/model/ChatUI.js

# 余额/资讯服务
systemctl status balance-monitor
curl -sS 'http://127.0.0.1:8099/api/news?token=<admin-token>' | head
```

## 3. 开发约定（硬约束）

1. **前端没有构建步骤**：直接改 `frontendciphertool/` 下的 HTML/JS/CSS；不要引入需要打包的框架。
2. 改了 JS/CSS 必须同时处理缓存：改 `?v=YYYYMMDD-NN` 引用，并提升 `sw.js` 的 `CACHE_VERSION`；否则用户会看到旧页面。
3. **后端改完必须重新打包并重启 `ciphertool.service`**；只改源码不重启等于没上线。
4. 不把 token、cookie、手机号、API key、数据库文件、用户聊天内容提交进仓库；密钥走环境变量/服务器私有配置。
5. **不在主服务器上执行任意用户代码**。任何“编程/IDE/代码运行”功能必须在独立沙箱（容器/gVisor/Firecracker 或托管沙箱）里跑，禁止直接 `eval`/子进程跑用户代码。
6. 移动端优先：底部安全区、触摸滑动、HyperOS/微信内置浏览器都要验证；不要挡悬浮球、侧边栏和输入框。
7. 文案用中文、直接、少 AI 腔；不要用「不是…而是」「不在于…而在于」这类模板句。
8. 不要擅自扩大需求，不要替用户加“登录同步/自动同步”等未确认的功能。

## 4. 已完成（截至 2026-11-22）

- 主站 / PWA / GitHub Pages 部署；单字母 `g` 触发 Pages 部署。
- 余额监控页：服务器状态、四家余额、可点击充值卡、PWA/Web Push；三个资讯板块（全球趋势/科技前沿/技术社区）中文翻译 + 模型筛选，固定在 7:30、11:10、16:10、19:20、23:10、04:10 刷新；科研雷达已从该页面移除。
- Agent 工具箱：视频创作（Muse）、作图模式、知识图谱、侧边栏、右侧栏、悬浮球径向菜单、置顶按钮误触修复、16:9 悬浮球、欢迎面板。
- 充值：充值弹窗、套餐接口、订单/额度骨架；`/api/agent-recharge/plans` 已可用。
- 微信通道：图片/文件/视频双向收发、CDN 超时修复；GitHub PR 绑定。
- 已明确放弃：远程控制手机/AutoX/ADB、JSAPI 支付自动确认、文章代写、QQ 性能优化。

## 5. 进行中 / 待办

- **编程产物工作区（隐藏面板）**：左下角 `bottom: 31.2%`，2–3cm 半透明竖线，右滑展开；面板为文件树 + Monaco 预览 + iframe 预览 + 下载/zip；支持网页、PPT、Word、Excel，Office 服务端生成；不执行任意用户代码。
- **充值额度调整**：普通免费用户研报 2/天、agentmaster 5/天、图片 10/天、视频 5/天；9.9 套餐 100 图/20 视频/3 研报/5 agentmaster；19.9 套餐 250 图/50 视频/6 研报/12 agentmaster。需要后端 usage 限额 + 套餐字段 + 前端展示一起改。
- **科研雷达**：一手源追踪、可验证假设；需要按“发现→筛选→证据→实验→写作→投稿”的单流程重做，降低 token 和面板数量。
- **长按语音免登录**：公共 ASR 或限流方案。
- **PWA/安卓壳**：PR #11 仍未合并；Android 打包方向待定。
- **支付自动确认**：个人收款码无法回调；需要商户号/支付宝当面付/聚合支付或人工确认。
- 知识图谱 `vendor/three/three.min.js` 在某些嵌套路径下仍需绝对路径；新增子路径时验证。

## 6. 验证清单

- 前端：`curl` 公网页面/JS 是否为新内容；手机微信内置浏览器和 PWA 各测一次。
- 后端：`/api/auth/health`、相关接口 200；看 `ciphertool` 日志是否有 `NoResourceFoundException`/500。
- PWA：改完 `sw.js` 版本后，完全关闭再打开，确认旧缓存清掉。
- 不把“能编译”当成“已上线”：部署路径和 systemd 服务是两回事。
