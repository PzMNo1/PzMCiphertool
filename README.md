# 泡面的 Agent 工具箱（PzMCiphertool）

## 快速启动

### 一键启动（推荐）

双击运行 `backendcipher\start.bat`，会自动完成以下所有步骤：
Redis 启动 → 后端 Maven 构建 → 后端 Spring Boot 启动 → 前端 http-server 启动。

> [!IMPORTANT]
> **Codex CLI / AI 编码工具注意**：Codex CLI 的沙箱环境会拦截 `npx` 等命令（`C:\Users\mi` 目录被沙箱拒绝访问），导致前端无法在沙箱内启动。
> 
> 解决方案：
> 1. **直接双击 `start.bat`**（推荐，不受沙箱限制）
> 2. 在 Codex 中只启动后端（`mvn` + `java -jar`），前端用 VS Code Live Server 或手动在终端运行 `npx http-server`
> 3. 后端的 Maven 构建命令可以在 Codex 中正常运行，只有 `npx` 会被拦截

---

### 手动启动

#### 环境依赖

| 依赖 | 路径 |
|------|------|
| JDK 17 | `d:\10_Leochad\jdk-17.0.12` |
| Maven 3.9 | `d:\10_Leochad\apache-maven-3.9.5` |
| Redis | `d:\10_Leochad\redis` |
| Node.js | 已全局安装 |
| Rust stable | 仅 `frontend-rust/` 需要 |
| Trunk | 仅 `frontend-rust/` 需要 |

#### 1. 启动 Redis

```powershell
Start-Process -FilePath "d:\10_Leochad\redis\redis-server.exe" -WindowStyle Minimized
```

#### 2. 启动后端（Spring Boot，端口 8080）

```powershell
$env:JAVA_HOME = "d:\10_Leochad\jdk-17.0.12"
$env:MAVEN_HOME = "d:\10_Leochad\apache-maven-3.9.5"
$env:PATH = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:PATH"

cd d:\10_Leochad\PzMCiphertool-\backendcipher
mvn clean package -DskipTests -q
java -jar target\ciphertool-backend-1.0.0.jar
```

后端启动后访问：`http://localhost:8080`  
健康检查：`http://localhost:8080/api/auth/health`

#### 3. 启动前端（静态文件服务，端口 5500）

```powershell
cd d:\10_Leochad\PzMCiphertool-\frontendciphertool
npx -y http-server -p 5500 -c-1 --cors
```

前端访问：`http://127.0.0.1:5500`

> 也可以在 VS Code 中使用 Live Server 插件启动前端，默认同样监听 5500 端口。

#### 4. 启动 Rust 渐进重构前端（端口 5173）

Rust 新前端位于 `frontend-rust/`，当前用于渐进式接管电子实验室、知识图谱和 Workflow；旧前端仍可继续在 5500 端口运行。

第一次使用前安装 Rust/WASM 目标和 Trunk：

```powershell
rustup target add wasm32-unknown-unknown
cargo install --locked trunk
```

当前推荐启动方式是先构建 Rust/WASM 产物，再用静态服务器跑 `dist/`：

```powershell
cd d:\10_Leochad\PzMCiphertool-\frontend-rust
trunk build

cd d:\10_Leochad\PzMCiphertool-\frontend-rust\dist
http-server -p 5173 -c-1 --cors
```

Rust 前端访问：`http://127.0.0.1:5173/`

如果 `http-server` 没有全局命令，可以用：

```powershell
npx -y http-server -p 5173 -c-1 --cors
```

端口关系：

```text
5500  旧前端 frontendciphertool
5173  Rust 新前端 frontend-rust
8080  Spring Boot 后端 backendcipher
```

如果 5173 被占用，可以换一个端口：

```powershell
http-server -p 5174 -c-1 --cors
```

停止 5173 服务时先查进程：

```powershell
netstat -ano | findstr :5173
taskkill /PID 进程ID /F
```

也可以尝试直接用 Trunk 开发服务器：

```powershell
cd d:\10_Leochad\PzMCiphertool-\frontend-rust
trunk serve --port 5173 --open
```

---

### LLM 配置

前端统一通过后端代理调用大模型，不在前端保存 API Key。

后端环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | 上游模型 API Key | （必填） |
| `OPENAI_BASE_URL` | 上游 API 地址 | `https://api.deepseek.com/v1` |

支持任何 OpenAI-compatible 上游，只需将 `OPENAI_BASE_URL` 指向对应 `/v1` 基址。

前端通过 `window.CIPHERTOOL_API_BASE`（默认 `http://localhost:8080`）连接后端。
