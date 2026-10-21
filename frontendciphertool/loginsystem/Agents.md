# loginsystem/ Agents.md

## 功能定位
登录认证系统 - 短信验证码登录、令牌管理、会话控制

## 文件结构
- auth.js → 认证主程序（短信验证、登录流程）
- auth.css → 样式

## 后端对应
- AuthController.java → 认证 API
- AuthService.java → 认证业务逻辑
- AliyunSmsConfig.java → 短信配置
- AliyunSmsServiceImpl.java → 短信发送实现

## 关键流程
1. 用户输入手机号 → 前端调用 `/api/auth/send-code`
2. 后端调用阿里云号码认证（短信认证）发送验证码
3. 用户输入验证码 → 前端调用 `/api/auth/login`
4. 后端验证码检查 + 生成 JWT Token
5. 前端保存 Token 到 localStorage/sessionStorage
6. 后续请求在 Authorization header 中携带 Token

## 绝对禁止
- 修改 Token 生成逻辑（在 AuthService 中）
- 在 auth.js 中存储明文密码
- 修改短信验证码格式（后端生成规则）
- 在客户端验证验证码（应该在后端验证）

## 修改规则
- 改进登录 UI → 修改 auth.js 的表单和提示
- 样式调整 → 修改 auth.css（复用 0_zhuyeyangshi.css 变量）
- 修改短信内容 → 短信认证使用平台赠送模板，内容不可改；只能调整 TemplateParam 的 code/min

## 常见任务

### 更改验证码发送方式
LOCATE: 后端 AliyunSmsServiceImpl.java
ACTION: 修改 `SendSmsVerifyCode` 的 `TemplateParam`（code/min）
TEST: 收到的短信格式正确

### 修改验证码有效期
LOCATE: 后端 AuthService.java（或 RedisConfig.java）
ACTION: 修改验证码过期时间（通常 5 分钟）
TEST: 超时后验证码失效

### 集成其他登录方式（如微信）
STEP 1: 后端添加新的 login endpoint（如 `/api/auth/wechat`)
STEP 2: 前端在 auth.js 中添加新的登录按钮和流程
STEP 3: 处理 OAuth 回调并保存 Token
TEST: 登录流程完整且 Token 有效

### 实现登出
LOCATE: auth.js
ACTION: 清除本地 Token 和用户信息，重定向到登录页
TEST: 登出后无法访问受保护资源

## 状态管理
- Token 存储位置：localStorage（持久化）或 sessionStorage（会话）
- 用户信息缓存：前端 localStorage 中的 user 对象
- Token 检查：请求拦截器中自动添加 Authorization header

## 依赖关系
↑ modules.js（路由）
← backendconfig.js（API 配置）
← 后端 API（AuthController、AuthService、SmsService）
← 外部服务（阿里云号码认证短信认证 API）
