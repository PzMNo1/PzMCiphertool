#!/bin/bash
set -e

echo "========================================"
echo "  CipherTool - One Click Start (Linux)"
echo "  Redis + Backend + Nginx frontend"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontendciphertool"
JAR="$SCRIPT_DIR/target/ciphertool-backend-1.0.0.jar"
PORT="${SERVER_PORT:-8080}"
SKIP_BUILD=0
DEV_FRONTEND=0

for arg in "$@"; do
    case "$arg" in
        --no-build) SKIP_BUILD=1 ;;
        --dev-frontend) DEV_FRONTEND=1 ;;
        *) echo "[ERROR] Unknown option: $arg"; exit 1 ;;
    esac
done

# ============ Load project .env ============
if [ -f "$PROJECT_ROOT/.env" ]; then
    while IFS='=' read -r key value; do
        value="${value%$'\r'}"
        [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
        export "$key=$value"
    done < "$PROJECT_ROOT/.env"
fi

if [ -z "$OPENAI_BASE_URL" ]; then
    export OPENAI_BASE_URL="https://api.deepseek.com/v1"
fi
if [ -z "$OPENAI_MODEL" ]; then
    export OPENAI_MODEL="deepseek-flash"
fi

# ============ Portable Environment Override ============
LOCAL_TOOLS="$SCRIPT_DIR/.tools"
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
# export ALIYUN_ACCESS_KEY_ID="your_key_id"
# export ALIYUN_ACCESS_KEY_SECRET="your_key_secret"
# export ALIYUN_SMS_SIGN_NAME="your_sign_name"
# export ALIYUN_SMS_TEMPLATE_CODE="your_template_code"

echo "[1/6] Checking Java..."
if ! java -version >/dev/null 2>&1; then
    echo "[ERROR] Java not found. Install JDK 17 or place it at backendcipher/.tools/jdk"
    exit 1
fi
echo "      Java OK"

echo "[2/6] Stopping old backend..."
OLD_PIDS=$(pgrep -f "ciphertool-backend-1.0.0.jar" || true)
if [ -n "$OLD_PIDS" ]; then
    echo "      Stopping process $OLD_PIDS..."
    kill $OLD_PIDS 2>/dev/null || true
    for _ in $(seq 1 10); do
        pgrep -f "ciphertool-backend-1.0.0.jar" >/dev/null 2>&1 || break
        sleep 1
    done
    pgrep -f "ciphertool-backend-1.0.0.jar" >/dev/null 2>&1 && kill -9 $OLD_PIDS 2>/dev/null || true
fi
echo "      Done"

echo "[3/6] Starting Redis..."
if redis-cli ping >/dev/null 2>&1; then
    echo "      Redis already running"
elif [ -n "$REDIS_HOME" ] && [ -x "$REDIS_HOME/src/redis-server" ]; then
    "$REDIS_HOME/src/redis-server" --daemonize yes >/dev/null 2>&1
    sleep 2
    echo "      Redis started from $REDIS_HOME"
elif [ -n "$REDIS_HOME" ] && [ -x "$REDIS_HOME/redis-server" ]; then
    "$REDIS_HOME/redis-server" --daemonize yes >/dev/null 2>&1
    sleep 2
    echo "      Redis started from $REDIS_HOME"
else
    sudo -n systemctl start redis-server >/dev/null 2>&1 || true
    sleep 1
    if redis-cli ping >/dev/null 2>&1; then
        echo "      Redis started via systemd"
    else
        echo "      [WARN] Redis not running; backend may fail to start"
    fi
fi

echo "[4/6] Building backend..."
if [ "$SKIP_BUILD" -eq 1 ]; then
    echo "      Skipped (--no-build)"
    if [ ! -f "$JAR" ]; then
        echo "[ERROR] $JAR not found; run without --no-build first"
        exit 1
    fi
elif ! command -v mvn >/dev/null 2>&1; then
    echo "[ERROR] Maven not found. Install Maven or place it at backendcipher/.tools/maven"
    exit 1
else
    cd "$SCRIPT_DIR"
    if ! mvn clean package -DskipTests -q; then
        echo "[ERROR] Build failed!"
        exit 1
    fi
    echo "      Build OK"
fi

echo "[5/6] Checking frontend..."
if [ -f "$FRONTEND_DIR/index.html" ]; then
    if [ "$DEV_FRONTEND" -eq 1 ] && command -v npx >/dev/null 2>&1; then
        echo "      Starting dev server on http://127.0.0.1:5500"
        (cd "$FRONTEND_DIR" && nohup npx -y http-server -p 5500 -c-1 --cors >/tmp/ciphertool-frontend.log 2>&1 &)
    else
        echo "      Static files ready; served by Nginx from $FRONTEND_DIR"
    fi
else
    echo "      [WARN] frontendciphertool/index.html not found"
fi

echo "[6/6] Starting backend..."
echo ""
echo "========================================"
echo "  Service: http://localhost:$PORT"
echo "  Health:  http://localhost:$PORT/api/auth/health"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

cd "$SCRIPT_DIR"
exec java ${JAVA_OPTS:--Xms256m -Xmx1024m} -jar "$JAR" --server.address="${SERVER_ADDRESS:-127.0.0.1}"
