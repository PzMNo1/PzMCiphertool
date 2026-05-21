@echo off
chcp 65001 >nul
echo ========================================
echo   CipherTool Backend - One Click Start
echo ========================================
echo.

REM ============ Environment Configuration ============
set JAVA_HOME=D:\10_Leochad\jdk-17.0.12
set MAVEN_HOME=D:\10_Leochad\apache-maven-3.9.5
set REDIS_HOME=D:\10_Leochad\redis
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%

REM ============ Aliyun SMS Configuration ============
REM Set these environment variables before running
REM set ALIYUN_ACCESS_KEY_ID=your_key_id
REM set ALIYUN_ACCESS_KEY_SECRET=your_key_secret
REM set ALIYUN_SMS_SIGN_NAME=your_sign_name
REM set ALIYUN_SMS_TEMPLATE_CODE=your_template_code

echo [1/5] Checking Java...
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java not found at %JAVA_HOME%
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
tasklist /FI "IMAGENAME eq redis-server.exe" 2>NUL | find /I "redis-server.exe" >NUL
if %ERRORLEVEL% equ 0 (
    echo       Redis already running
) else (
    start /MIN "" "%REDIS_HOME%\redis-server.exe"
    timeout /t 2 /nobreak >nul
    echo       Redis started
)

echo [4/5] Building project...
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
