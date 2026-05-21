# CipherTool 后端开发计划

## 一、项目概述

为Agent工具箱前端提供短信验证码登录服务，采用 **Spring Boot + Redis** 架构，集成**阿里云短信服务**。

---

## 二、技术栈

| 组件 | 技术选型 |
|------|----------|
| 框架 | Spring Boot 3.2.x |
| 数据存储 | Redis (验证码临时存储) |
| 短信服务 | 阿里云 SMS API |
| 构建工具 | Maven |
| JDK | 17+ |

---

## 三、项目结构

```
backendcipher/
├── src/main/java/com/ciphertool/
│   ├── CipherToolApplication.java        # 启动类
│   ├── config/                           # 配置类
│   │   ├── CorsConfig.java               # 跨域配置
│   │   └── RedisConfig.java              # Redis配置
│   ├── controller/                       # 控制器类
│   │   └── AuthController.java           # 认证控制器
│   ├── exception/                        # 异常处理
│   │   └──GlobalExceptionHandler.java
│   ├── service/
│   │   ├── SmsService.java               # 短信服务接口
│   │   ├── impl/AliyunSmsServiceImpl.java# 阿里云短信实现
│   │   └── AuthService.java              # 认证服务
│   ├── dto/                              # 数据传输对象
│   │   ├── SendCodeRequest.java          # 发送验证码请求
│   │   ├── LoginRequest.java             # 登录请求
│   │   └── ApiResponse.java              # 统一响应
│   └── util/
│       └── CodeGenerator.java            # 验证码生成器
├── src/main/resources/
│   ├── application.yml                   # 主配置
│   └── application-dev.yml               # 开发环境配置
├── pom.xml                               # Maven配置
├── start.bat                             #启动后端服务脚本
└── README.md                             # 详细文档
```

---

## 四、API 设计

### 1. 发送验证码
```
POST /api/auth/send-code
Content-Type: application/json

Request:
{
  "phone": "13800138000"
}

Response (成功):
{
  "success": true,
  "message": "验证码已发送"
}

Response (失败):
{
  "success": false,
  "message": "发送频率过快，请稍后再试"
}
```

### 2. 登录验证
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "phone": "13800138000",
  "code": "123456"
}

Response (成功):
{
  "success": true,
  "message": "登录成功",
  "data": {
    "phone": "138****8000",
    "loginTime": "2025-12-14T10:30:00"
  }
}
```

### 3. 检查登录状态
```
GET /api/auth/status
```

---

## 五、Redis 数据结构

| Key 格式 | Value | TTL |
|----------|-------|-----|
| `sms:code:{phone}` | 6位验证码 | 5分钟 |
| `sms:limit:{phone}` | 发送次数 | 1小时 |
| `sms:lock:{phone}` | 1 | 60秒 |

---

## 六、安全措施

1. **发送频率限制**
   - 同一手机号60秒内只能发送1次
   - 同一手机号1小时内最多5次

2. **验证码安全**
   - 5分钟过期
   - 验证成功后立即删除
   - 错误次数限制（可选）

3. **跨域配置**
   - 仅允许前端域名访问

---

## 七、开发步骤

- [x] 1. 初始化Spring Boot项目
- [x] 2. 配置Redis连接
- [x] 3. 实现阿里云短信服务
- [x] 4. 实现认证Controller
- [x] 5. 配置跨域
- [ ] 6. 本地测试
- [ ] 7. 前端对接

---

## 八、配置项 (application.yml)

```yaml
server:
  port: 8080

spring:
  data:
    redis:
      host: localhost
      port: 6379

aliyun:
  sms:
    access-key-id: ${ALIYUN_ACCESS_KEY_ID}
    access-key-secret: ${ALIYUN_ACCESS_KEY_SECRET}
    sign-name: 你的签名
    template-code: 你的模板CODE
```

---

## 九、注意事项

⚠️ **安全提醒**：
- AccessKey 等敏感信息必须通过环境变量注入，禁止硬编码
- 生产环境启用HTTPS
- 日志中不记录完整验证码