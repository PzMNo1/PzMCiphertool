@echo off
chcp 65001 >nul
echo ========================================
echo   CipherTool - One Click Start
echo   Redis + Backend + Frontend
echo ========================================
echo.

REM ============ Environment Configuration ============
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set FRONTEND_DIR=%PROJECT_ROOT%\frontendciphertool

REM Java / Maven / Redis paths
if not defined JAVA_HOME set JAVA_HOME=d:\10_Leochad\jdk-17.0.12
if not defined MAVEN_HOME set MAVEN_HOME=d:\10_Leochad\apache-maven-3.9.5
if not defined REDIS_HOME set REDIS_HOME=d:\10_Leochad\redis
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%

REM LLM API Configuration (DeepSeek) - always override system env to avoid stale keys
set OPENAI_API_KEY=sk-8ad75ba59f5b4018af287ca3d2f0ffee
set OPENAI_BASE_URL=https://api.deepseek.com/v1

REM ============ Portable Environment Override ============
set LOCAL_TOOLS=%SCRIPT_DIR%.tools
if exist "%LOCAL_TOOLS%\jdk\bin\java.exe" (
    set JAVA_HOME=%LOCAL_TOOLS%\jdk
    set PATH=%JAVA_HOME%\bin;%PATH%
)
if exist "%LOCAL_TOOLS%\maven\bin\mvn.cmd" (
    set MAVEN_HOME=%LOCAL_TOOLS%\maven
    set PATH=%MAVEN_HOME%\bin;%PATH%
)
if exist "%LOCAL_TOOLS%\redis\redis-server.exe" (
    set REDIS_HOME=%LOCAL_TOOLS%\redis
)

REM ============ Aliyun SMS Configuration ============
REM set ALIYUN_ACCESS_KEY_ID=your_key_id
REM set ALIYUN_ACCESS_KEY_SECRET=your_key_secret
REM set ALIYUN_SMS_SIGN_NAME=your_sign_name
REM set ALIYUN_SMS_TEMPLATE_CODE=your_template_code

echo [1/6] Checking Java...
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java not found. Install JDK 17 or set JAVA_HOME.
    pause
    exit /b 1
)
echo       Java OK

echo [2/6] Stopping old backend...
taskkill /F /IM java.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       Done

echo [3/6] Starting Redis...
if exist "%REDIS_HOME%\redis-server.exe" (
    tasklist /FI "IMAGENAME eq redis-server.exe" 2>NUL | find /I "redis-server.exe" >NUL
    if errorlevel 1 (
        start /MIN "" "%REDIS_HOME%\redis-server.exe"
        timeout /t 2 /nobreak >nul
        echo       Redis started
    ) else (
        echo       Redis already running
    )
) else (
    echo       Redis not found, skipping
)

echo [4/6] Building backend...
where mvn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Maven not found. Install Maven or set MAVEN_HOME.
    pause
    exit /b 1
)
call mvn clean package -DskipTests -q
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo       Build OK

echo [5/6] Starting frontend (http://127.0.0.1:5500)...
REM Kill old http-server on port 5500 if any
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5500.*LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
REM Write a temp script to avoid quote nesting issues in start command
echo @cd /d %FRONTEND_DIR% > "%TEMP%\_ct_frontend.bat"
echo @npx -y http-server -p 5500 -c-1 --cors >> "%TEMP%\_ct_frontend.bat"
start /MIN "CipherTool-Frontend" cmd /c "%TEMP%\_ct_frontend.bat"
echo       Frontend started

echo [6/6] Starting backend...
echo.
echo ========================================
echo   Backend:  http://localhost:8080
echo   Frontend: http://127.0.0.1:5500
echo   Health:   http://localhost:8080/api/auth/health
echo   Press Ctrl+C to stop backend
echo ========================================
echo.

java -jar target\ciphertool-backend-1.0.0.jar

pause
