# AI 代码生成提示词

## 项目背景
为前端登录系统创建Spring Boot后端，实现真实短信验证码登录功能。

## 技术要求
- Spring Boot 3.x
- Redis 存储验证码
- 阿里云短信 API
- RESTful API 设计
- 代码精简、易扩展

## 已生成文件清单

### 1. pom.xml
Maven配置，包含依赖：
- spring-boot-starter-web
- spring-boot-starter-data-redis
- aliyun-java-sdk-core
- aliyun-java-sdk-dysmsapi
- lombok

### 2. application.yml / application-dev.yml
配置文件，包含：
- 服务端口8080
- Redis连接配置
- 阿里云SMS配置（使用环境变量）

### 3. CipherToolApplication.java
Spring Boot启动类

### 4. AuthController.java
认证控制器：
- POST /api/auth/send-code - 发送验证码
- POST /api/auth/login - 登录验证

### 5. SmsService.java + AliyunSmsServiceImpl.java
短信服务接口和阿里云实现：
- 调用阿里云 SendSms API 发送验证码
- 验证码由后端生成并存储到Redis

### 6. AuthService.java
认证业务逻辑：
- 验证码生成（6位数字）
- Redis 存取验证码
- 发送频率限制（60秒/次，5次/小时）

### 7. DTO类
- SendCodeRequest (phone)
- LoginRequest (phone, code)
- ApiResponse<T> (success, message, data)

### 8. CorsConfig.java
跨域配置，允许前端域名访问

## 阿里云API参考
- 发送短信: https://help.aliyun.com/document_detail/419273.html
- SDK文档: https://help.aliyun.com/document_detail/112148.html

## 前端对接说明

修改 `frontendciphertool/loginsystem/auth.js`：
1. 将模拟API调用改为真实后端地址
2. `handleSendCode()` 调用 `POST /api/auth/send-code`
3. `handleLogin()` 调用 `POST /api/auth/login`
