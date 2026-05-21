#!/bin/bash
echo "========================================"
echo "  CipherTool Backend - One Click Start"
echo "========================================"
echo ""

# ============ Environment Configuration ============
# Adjust these paths for your Linux environment
export JAVA_HOME="/home/ubuntu/10_Leochad/jdk-17.0.12"
export MAVEN_HOME="/home/ubuntu/10_Leochad/apache-maven-3.9.5"
export REDIS_HOME="/home/ubuntu/10_Leochad/redis-7.2.3"
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"

# ============ Aliyun SMS Configuration ============
# Set these environment variables before running, or export them in your shell profile
# export ALIYUN_ACCESS_KEY_ID="your_key_id"
# export ALIYUN_ACCESS_KEY_SECRET="your_key_secret"
# export ALIYUN_SMS_SIGN_NAME="your_sign_name"
# export ALIYUN_SMS_TEMPLATE_CODE="your_template_code"

echo "[1/5] Checking Java..."
if ! java -version >/dev/null 2>&1; then
    echo "[ERROR] Java not found at $JAVA_HOME"
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
    else
        echo "      [ERROR] redis-server not found at $REDIS_HOME/src/"
    fi
fi
echo "[4/5] Building project..."
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

