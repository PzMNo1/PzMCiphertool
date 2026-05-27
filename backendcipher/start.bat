@echo off
chcp 65001 >nul
echo ========================================
echo   CipherTool Backend - One Click Start
echo ========================================
echo.

REM ============ Portable Environment Configuration ============
set SCRIPT_DIR=%~dp0
set LOCAL_TOOLS=%SCRIPT_DIR%.tools

REM Optional project-local tools. Put them here if this machine has no global install:
REM   backendcipher\.tools\jdk\bin\java.exe
REM   backendcipher\.tools\maven\bin\mvn.cmd
REM   backendcipher\.tools\redis\redis-server.exe
if exist "%LOCAL_TOOLS%\jdk\bin\java.exe" (
    set JAVA_HOME=%LOCAL_TOOLS%\jdk
    set PATH=%JAVA_HOME%\bin;%PATH%
)
if exist "%LOCAL_TOOLS%\maven\bin\mvn.cmd" (
    set MAVEN_HOME=%LOCAL_TOOLS%\maven
    set PATH=%MAVEN_HOME%\bin;%PATH%
)
if not defined REDIS_HOME if exist "%LOCAL_TOOLS%\redis\redis-server.exe" (
    set REDIS_HOME=%LOCAL_TOOLS%\redis
)

REM ============ Aliyun SMS Configuration ============
REM Set these environment variables before running
REM set ALIYUN_ACCESS_KEY_ID=your_key_id
REM set ALIYUN_ACCESS_KEY_SECRET=your_key_secret
REM set ALIYUN_SMS_SIGN_NAME=your_sign_name
REM set ALIYUN_SMS_TEMPLATE_CODE=your_template_code

echo [1/5] Checking Java...
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java not found. Install JDK 17, add it to PATH, or place it at backendcipher\.tools\jdk
    pause
    exit /b 1
)
echo       Java OK

echo [2/5] Stopping old service if running...
for /f "tokens=1" %%i in ('jps -l 2^>nul ^| findstr "ciphertool-backend"') do (
    echo       Stopping process %%i...
    taskkill /PID %%i /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo       Done

echo [3/5] Starting Redis...
if defined REDIS_HOME if exist "%REDIS_HOME%\redis-server.exe" (
    tasklist /FI "IMAGENAME eq redis-server.exe" 2>NUL | find /I "redis-server.exe" >NUL
    if errorlevel 1 (
        start /MIN "" "%REDIS_HOME%\redis-server.exe"
        timeout /t 2 /nobreak >nul
        echo       Redis started
    ) else (
        echo       Redis already running
    )
) else (
    echo       Redis not found in backendcipher\.tools\redis or REDIS_HOME; skipping auto-start
)

echo [4/5] Building project...
where mvn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Maven not found. Install Maven, add it to PATH, or place it at backendcipher\.tools\maven
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

echo [5/5] Starting backend service...
echo.
echo ========================================
echo   Service: http://localhost:8080
echo   Health:  http://localhost:8080/api/auth/health
echo   Press Ctrl+C to stop
echo ========================================
echo.

java -jar target\ciphertool-backend-1.0.0.jar

pause
