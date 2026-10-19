# apizhongzhuanzhan/ Agents.md

## 功能定位
API 中转站 - API 密钥管理、用量统计、计费管理、支付系统

## 文件结构
- apizhongzhuanzhan.js → 模块主程序（路由和导航）
- apizhongzhuanzhan.css → 样式
- apizz-overview.js → 仪表板概览
- apizz-keys.js → API 密钥管理
- apizz-usage.js → 用量统计
- apizz-billing.js → 计费和账单
- apizz-ops.js → 运营管理

## 数据流
前端 (apizz-*.js) ↔ backendconfig.js ↔ 后端 (ApiRouterController/Service)

## 后端对应
- ApiRouterController.java → 主控制器
- ApiRouterKeyController.java → 密钥管理 API
- ApiRouterBillingController.java → 计费 API
- ApiRouterDashboardController.java → 仪表板 API
- ApiRouterOpsController.java → 运营 API
- ApiRouterService.java → 核心业务服务

## 绝对禁止
- 修改后端的数据库 schema（必须通过 Flyway migration）
- 在前端硬编码业务逻辑（应该交给后端处理）

## 修改规则
- 新增前端页面 → 创建 apizz-{功能}.js，在 apizhongzhuanzhan.js 中路由
- 新增 API 功能 → 后端添加对应的 Controller 和 Service
- 样式调整 → 修改 apizhongzhuanzhan.css（复用 0_zhuyeyangshi.css 变量）

## 常见任务

### 新增仪表板卡片
LOCATE: apizz-overview.js
ACTION: 在卡片列表中添加新卡片配置
TEST: 新卡片在仪表板中显示且数据正确

### 修改计费规则
STEP 1: 后端修改 service/ApiRouterService.java 中的 BillingRate 类
STEP 2: 如需数据库变更，创建新的 Flyway migration
STEP 3: 前端 apizz-billing.js 中更新计费展示逻辑
TEST: 计费计算结果正确

### 支付流程集成
LOCATE: apizz-billing.js（前端），ApiRouterPaymentService.java（后端）
ACTION:
  前端：调用支付 API 获取支付链接
  后端：集成第三方支付（支付宝/微信等）
TEST: 支付流程完整且金额计算无误

### 导出用量数据
LOCATE: apizz-usage.js
ACTION: 实现 CSV/Excel 导出逻辑
TEST: 导出文件格式正确且数据完整

## 架构约束
- 前后端分离：前端仅展示数据，不做业务计算
- 支付安全：所有支付操作在后端进行，前端不处理密钥
- 数据一致性：同一数据在前后端的表示方式保持一致

## 依赖关系
↑ modules.js（路由）
↑ loginsystem/auth.js（用户认证）
↑ backendconfig.js（API 配置）
← 后端 API（ApiRouterController、Service）
