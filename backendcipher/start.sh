#!/bin/bash
echo "========================================"
echo "  CipherTool Backend - One Click Start"
echo "========================================"
echo ""

# ============ Portable Environment Configuration ============
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_TOOLS="$SCRIPT_DIR/.tools"

# Optional project-local tools. Put them here if this machine has no global install:
#   backendcipher/.tools/jdk/bin/java
#   backendcipher/.tools/maven/bin/mvn
#   backendcipher/.tools/redis/src/redis-server or backendcipher/.tools/redis/redis-server
if [ -x "$LOCAL_TOOLS/jdk/bin/java" ]; then
    export JAVA_HOME="$LOCAL_TOOLS/jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
fi
if [ -x "$LOCAL_TOOLS/maven/bin/mvn" ]; then
    export MAVEN_HOME="$LOCAL_TOOLS/maven"
    export PATH="$MAVEN_HOME/bin:$PATH"
fi
if [ -z "$REDIS_HOME" ] && { [ -x "$LOCAL_TOOLS/redis/src/redis-server" ] || [ -x "$LOCAL_TOOLS/redis/redis-server" ]; }; then
    export REDIS_HOME="$LOCAL_TOOLS/redis"
fi

# ============ Aliyun SMS Configuration ============
# Set these environment variables before running, or export them in your shell profile
# export ALIYUN_ACCESS_KEY_ID="your_key_id"
# export ALIYUN_ACCESS_KEY_SECRET="your_key_secret"
# export ALIYUN_SMS_SIGN_NAME="your_sign_name"
# export ALIYUN_SMS_TEMPLATE_CODE="your_template_code"

echo "[1/5] Checking Java..."
if ! java -version >/dev/null 2>&1; then
    echo "[ERROR] Java not found. Install JDK 17, add it to PATH, or place it at backendcipher/.tools/jdk"
    exit 1
fi
echo "      Java OK"

echo "[2/5] Stopping old service if running..."
OLD_PID=$(pgrep -f "ciphertool-backend" 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo "      Stopping process $OLD_PID..."
    kill -9 $OLD_PID 2>/dev/null
fi
sleep 1
echo "      Done"

echo "[3/5] Starting Redis..."
if pgrep -x "redis-server" >/dev/null 2>&1; then
    echo "      Redis already running"
else
    if [ -f "$REDIS_HOME/src/redis-server" ]; then
        $REDIS_HOME/src/redis-server --daemonize yes >/dev/null 2>&1
        sleep 2
        echo "      Redis started"
    elif [ -f "$REDIS_HOME/redis-server" ]; then
        $REDIS_HOME/redis-server --daemonize yes >/dev/null 2>&1
        sleep 2
        echo "      Redis started"
    else
        echo "      Redis not found in backendcipher/.tools/redis or REDIS_HOME; skipping auto-start"
    fi
fi
echo "[4/5] Building project..."
if ! command -v mvn >/dev/null 2>&1; then
    echo "[ERROR] Maven not found. Install Maven, add it to PATH, or place it at backendcipher/.tools/maven"
    exit 1
fi
if ! mvn clean package -DskipTests -q; then
    echo "[ERROR] Build failed!"
    exit 1
fi
echo "      Build OK"

echo "[5/5] Starting backend service..."
echo ""
echo "========================================"
echo "  Service: http://localhost:8080"
echo "  Health:  http://localhost:8080/api/auth/health"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

java -jar target/ciphertool-backend-1.0.0.jar
