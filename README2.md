


# CipherTool 后端全新环境部署指南

如果您正在一台全新的 Windows 电脑上部署并启动 CipherTool 的后端项目，请按照以下步骤配置环境和启动服务。

重启后端指令：
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null; Start-Sleep -Seconds 1; $env:JAVA_HOME = "C:\Program Files\Java\jdk-17.0.13+11"; $env:MAVEN_HOME = "C:\Program Files\apache-maven-3.9.6"; $env:PATH = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:PATH"; cmd /c "c:\Users\Administrator\Desktop\PzMCiphertool-\backendcipher\start.bat"

## 1. 环境准备

后端项目依赖以下基础环境，由于是全新电脑，请依次下载并安装：

### 1.1 安装 Java 开发环境 (JDK 17)
- **下载与安装**: 前往 Oracle 官网或其他发行版（如 OpenJDK、Zulu 等）下载 JDK 17 的 Windows 安装包并完成安装。
- **配置环境变量（可选）**: 建议将 JDK 的 `bin` 目录添加到系统的 `PATH` 环境变量中。

### 1.2 安装项目构建工具 (Apache Maven)
- **下载与解压**: 前往 Maven 官网（maven.apache.org）下载最新的 Binary zip archive 压缩包，解压到您的电脑某个常驻目录（例如：`D:\apache-maven-3.9.5`）。

### 1.3 安装缓存数据库 (Redis for Windows)
- **下载与解压**: 可以在 GitHub 的 Redis-Windows 移植项目（例如 `tporadowski/redis`）中下载最新的 `.zip` 压缩包。解压到某个常驻目录（例如：`D:\redis`）。

---

## 2. 修改启动脚本配置

在项目的 `backendcipher` 目录下，有一个一键启动脚本 `start.bat`。因为旧脚本中硬编码了前开发者电脑上的路径，您需要将其修改为您新电脑上实际安装的路径。

用文本编辑器（如记事本、VS Code）打开 `backendcipher\start.bat` 文件，找到前几行的**环境变量配置区域**，并进行如下修改：

```bat
REM ============ Environment Configuration ============
REM 【重要】请将以下路径修改为您新电脑上实际的解压/安装路径！
set JAVA_HOME=您的JDK安装路径 (例如: C:\Program Files\Java\jdk-17)
set MAVEN_HOME=您的Maven解压路径 (例如: D:\apache-maven-3.9.5)
set REDIS_HOME=您的Redis解压路径 (例如: D:\redis)
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%
```

*(可选)* 如果您的应用需要真正发送短信（阿里云短信服务），您还需要在 `start.bat` 中取消如下注释并填入您的真实密钥信息：
```bat
set ALIYUN_ACCESS_KEY_ID=您的AccessKeyId
set ALIYUN_ACCESS_KEY_SECRET=您的AccessKeySecret
set ALIYUN_SMS_SIGN_NAME=您的短信签名
set ALIYUN_SMS_TEMPLATE_CODE=您的模板代码
```

---

## 3. 启动项目

当上述依赖准备好并且路径修改完成后：

1. 进入项目的 `backendcipher` 文件夹。
2. 双击运行 `start.bat`。
3. 脚本会自动进行如下串行操作：
   - 检查 Java 环境是否正常；
   - 停止已经存在的冲突进程；
   - 在后台窗口自动启动 Redis 数据库服务；
   - 使用 Maven 编译并打包 Java 项目；
   - 启动 Spring Boot 后端主服务。

---

## 4. 验证服务状态

启动完成后，您在控制台中看到类似 `Tomcat started on port 8080` 的提示，说明应用已经就绪。

打开浏览器访问如下健康检查地址：
- `http://localhost:8080/api/auth/health`

**如何关闭服务？**
如果需要停止服务，在运行服务主程序的命令行窗口中按下 `Ctrl + C`，选择 `Y` 终止批处理操作，或者直接关闭命令行窗口即可。相关的 Redis 服务可能仍在后台运行，如需关闭可在任务管理器中结束 `redis-server.exe` 进程。

