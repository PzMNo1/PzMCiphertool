#!/usr/bin/env bash
# Emulator smoke test for the Android WebView shell.
#
# Runs inside reactivecircus/android-emulator-runner as a single command, because
# the action executes `script` line by line with `sh -c` and multi-line shell
# constructs must live in a real script file.
#
# Input: artifact/paomian-toolbox-1.0.0-debug.apk (downloaded by the workflow)
# Output: screenshots and diagnostics in artifact/
set -euo pipefail

OUT="artifact"
APK="$OUT/paomian-toolbox-1.0.0-debug.apk"
mkdir -p "$OUT"

# Baseline: the same live site in a system browser on the same emulator, if one exists.
BROWSER_PKG=""
if adb shell pm list packages | grep -q org.chromium.webview_shell; then
  BROWSER_PKG=org.chromium.webview_shell
elif adb shell pm list packages | grep -q com.android.chrome; then
  BROWSER_PKG=com.android.chrome
fi
echo "browser_pkg=$BROWSER_PKG" | tee "$OUT/browser.txt"
if [ -n "$BROWSER_PKG" ]; then
  adb shell am start -W -a android.intent.action.VIEW -d https://www.paomian233.com/ -p "$BROWSER_PKG" || true
  sleep 30
  adb exec-out screencap -p > "$OUT/before-web.png" || true
  adb shell input keyevent KEYCODE_HOME || true
  sleep 3
fi

adb install -r "$APK"
adb shell pm list packages | grep com.pzmn.paomiantool
adb shell am start -W -n com.pzmn.paomiantool/.MainActivity

# The debug build enables WebView DevTools; wait until the page title is loaded.
PAGE_LOADED=0
for _ in $(seq 1 60); do
  PID=$(adb shell pidof com.pzmn.paomiantool | tr -d '\r' || true)
  if [ -n "$PID" ]; then
    adb forward tcp:9222 "localabstract:webview_devtools_remote_$PID" >/dev/null 2>&1 || true
    if curl -sf http://127.0.0.1:9222/json/list > "$OUT/devtools-pages.json"; then
      if grep -q '泡面的Agent工具箱' "$OUT/devtools-pages.json"; then
        PAGE_LOADED=1
        break
      fi
    fi
  fi
  sleep 2
done
echo "page_loaded=$PAGE_LOADED" | tee "$OUT/page-loaded.txt"

sleep 3
adb exec-out screencap -p > "$OUT/app-after.png"
adb shell input keyevent KEYCODE_HOME
sleep 3
adb exec-out screencap -p > "$OUT/home-screen.png"
adb shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' > "$OUT/focus.txt" || true
adb shell dumpsys package com.pzmn.paomiantool > "$OUT/package.txt" || true
adb logcat -d -t 800 > "$OUT/logcat.txt" || true

if [ "$PAGE_LOADED" -ne 1 ]; then
  echo "WebView page did not report the expected title within 120s" >&2
  exit 1
fi
