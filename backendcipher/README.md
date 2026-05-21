# CipherTool Backend

SMS verification code login service for CipherTool.

## Tech Stack

- **Spring Boot 3.2.x** - Web Framework
- **Redis** - Code Storage
- **Aliyun SMS** - SMS Service

## Quick Start

### 1. Requirements

- JDK 17+
- Maven 3.6+
- Redis 6.0+

### 2. Configure Aliyun SMS

Complete these steps in Aliyun console:
1. Enable SMS service
2. Apply for SMS signature
3. Apply for SMS template (variable: `code`, `min`)
4. Get AccessKey ID and Secret

**Current Config:**
- Sign Name: 速通互联验证码
- Template: 您的验证码为${code}。尊敬的客户，以上验证码${min}分钟内有效，请注意保密，切勿告知他人。

### 3. Set Environment Variables

```bash
# Windows (PowerShell)
$env:ALIYUN_ACCESS_KEY_ID="your_access_key_id"
$env:ALIYUN_ACCESS_KEY_SECRET="your_access_key_secret"
$env:ALIYUN_SMS_TEMPLATE_CODE="your_template_code"

# Linux/Mac
export ALIYUN_ACCESS_KEY_ID="your_access_key_id"
export ALIYUN_ACCESS_KEY_SECRET="your_access_key_secret"
export ALIYUN_SMS_TEMPLATE_CODE="your_template_code"
```

### 4. Start Redis

```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Or local install
redis-server
```

### 5. Run Project

```bash
# Build
mvn clean package -DskipTests

# Run
java -jar target/ciphertool-backend-1.0.0.jar

# Or use Maven
mvn spring-boot:run
```

Service runs at `http://localhost:8080`

## API Endpoints

### Send Code

```http
POST /api/auth/send-code
Content-Type: application/json

{
  "phone": "13800138000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "验证码已发送",
  "data": null
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "phone": "138****8000",
    "loginTime": "2025-12-14T10:30:00"
  }
}
```

### Health Check

```http
GET /api/auth/health
```

## Frontend Integration

Update `auth.js`:

```javascript
// Send code
const res = await fetch('http://localhost:8080/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone })
});

// Login
const res = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone, code: code })
});
```

## Configuration

| Config | Env Variable | Default | Description |
|--------|--------------|---------|-------------|
| Port | - | 8080 | HTTP Port |
| Redis Host | REDIS_HOST | localhost | Redis Address |
| Redis Port | REDIS_PORT | 6379 | Redis Port |
| AccessKey ID | ALIYUN_ACCESS_KEY_ID | - | Aliyun Key ID |
| AccessKey Secret | ALIYUN_ACCESS_KEY_SECRET | - | Aliyun Secret |
| Sign Name | ALIYUN_SMS_SIGN_NAME | 速通互联验证码 | SMS Signature |
| Template Code | ALIYUN_SMS_TEMPLATE_CODE | - | SMS Template |

## Security Features

- 60s send interval limit
- Max 5 sends per hour
- 5min code expiration
- Auto delete after verification
- Phone number masking in logs
- CORS configuration

## Project Structure

```
src/main/java/com/ciphertool/
├── CipherToolApplication.java
├── config/
│   ├── AliyunSmsConfig.java
│   ├── CorsConfig.java
│   └── RedisConfig.java
├── controller/
│   └── AuthController.java
├── dto/
│   ├── ApiResponse.java
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   └── SendCodeRequest.java
├── exception/
│   └── GlobalExceptionHandler.java
└── service/
    ├── AuthService.java
    ├── SmsService.java
    └── impl/
        └── AliyunSmsServiceImpl.java
```

## Troubleshooting

### SMS send failed?
1. Check AccessKey is correct
2. Check signature and template are approved
3. Check template variables are `code` and `min`

### Redis connection failed?
1. Ensure Redis is running
2. Check port availability
3. Check firewall settings

### CORS issues?
Dev environment allows all origins. For production, configure specific domains in `application.yml`.
