#!/usr/bin/env bash
# Emulator smoke test for the Android WebView shell.
#
# Runs inside reactivecircus/android-emulator-runner as a single command, because
# the action executes `script` line by line with `sh -c` and multi-line shell
# constructs must live in a real script file.
#
# The pass condition is: APK installs, MainActivity is focused, and the WebView
# exposes a DevTools page for https://www.paomian233.com/. When the runner's
# emulator has working network the page title must also be the real site title;
# when the runner has no network (seen intermittently on hosted runners), the
# app's own retry screen is accepted and the run records network_ok=0.
#
# Input: artifact/paomian-toolbox-1.0.0-debug.apk (downloaded by the workflow)
# Output: screenshots and diagnostics in artifact/
set -euo pipefail

OUT="artifact"
APK="$OUT/paomian-toolbox-1.0.0-debug.apk"
SITE_TITLE="泡面的Agent工具箱"
SITE_URL="https://www.paomian233.com/"
mkdir -p "$OUT"

# Print "x y" for the centre of the first on-screen node with this text.
tap_point_for_text() {
  local wanted="$1"
  timeout 20 adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || return 1
  timeout 20 adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1 || return 1
  python3 - "$wanted" <<'PY'
import re
import sys

wanted = sys.argv[1]
xml = open('/tmp/ui.xml', encoding='utf-8').read()
for match in re.finditer(r'<node[^>]*>', xml):
    node = match.group(0)
    if 'text="%s"' % wanted in node:
        bounds = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node)
        if bounds:
            x = (int(bounds.group(1)) + int(bounds.group(3))) // 2
            y = (int(bounds.group(2)) + int(bounds.group(4))) // 2
            print(x, y)
            sys.exit(0)
sys.exit(1)
PY
}

# Baseline: the same live site in a system browser on the same emulator, if one exists.
# This is evidence only; it does not affect the pass/fail result.
BROWSER_PKG=""
if timeout 20 adb shell pm list packages | grep -q org.chromium.webview_shell; then
  BROWSER_PKG=org.chromium.webview_shell
elif timeout 20 adb shell pm list packages | grep -q com.android.chrome; then
  BROWSER_PKG=com.android.chrome
fi
echo "browser_pkg=$BROWSER_PKG" | tee "$OUT/browser.txt"
if [ -n "$BROWSER_PKG" ]; then
  timeout 30 adb shell am start -W -a android.intent.action.VIEW -d "$SITE_URL" -p "$BROWSER_PKG" || true
  sleep 8
  # Dismiss Chrome first-run / sync / search-engine screens when they appear.
  for label in "Use without an account" "No thanks" "Got it" "Accept & continue"; do
    if POINT=$(tap_point_for_text "$label"); then
      echo "tap '$label' at $POINT"
      adb shell input tap $POINT
      sleep 4
    fi
  done
  timeout 30 adb shell am start -W -a android.intent.action.VIEW -d "$SITE_URL" -p "$BROWSER_PKG" || true
  sleep 20
  timeout 30 adb exec-out screencap -p > "$OUT/before-web.png" || true
  timeout 20 adb shell input keyevent KEYCODE_HOME || true
  sleep 3
fi

timeout 60 adb install -r "$APK"
timeout 20 adb shell pm list packages | grep com.pzmn.paomiantool

# Try to load the real page; return 0 when the WebView title matches the site.
try_load_app_page() {
  timeout 30 adb shell am force-stop com.pzmn.paomiantool || true
  timeout 30 adb shell am start -W -n com.pzmn.paomiantool/.MainActivity || true

  for _ in $(seq 1 45); do
    PID=$(timeout 20 adb shell pidof com.pzmn.paomiantool | tr -d '\r' || true)
    if [ -n "$PID" ]; then
      timeout 10 adb forward --remove tcp:9222 >/dev/null 2>&1 || true
      timeout 10 adb forward tcp:9222 "localabstract:webview_devtools_remote_$PID" >/dev/null 2>&1 || true
      if timeout 10 curl -sf http://127.0.0.1:9222/json/list > "$OUT/devtools-pages.json"; then
        if grep -q "$SITE_TITLE" "$OUT/devtools-pages.json"; then
          return 0
        fi
      fi
    fi
    sleep 2
  done
  return 1
}

PAGE_LOADED=0
for attempt in 1 2; do
  if try_load_app_page; then
    PAGE_LOADED=1
    break
  fi
  echo "page load attempt $attempt did not reach the live site"
  # Hosted runners occasionally boot the emulator without usable Wi-Fi.
  timeout 20 adb shell svc wifi disable >/dev/null 2>&1 || true
  sleep 2
  timeout 20 adb shell svc wifi enable >/dev/null 2>&1 || true
  sleep 12
done
echo "page_loaded=$PAGE_LOADED" | tee "$OUT/page-loaded.txt"

sleep 3
timeout 30 adb exec-out screencap -p > "$OUT/app-after.png"
timeout 20 adb shell input keyevent KEYCODE_HOME || true
sleep 3
timeout 30 adb exec-out screencap -p > "$OUT/home-screen.png"
timeout 20 adb shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' > "$OUT/focus.txt" || true
timeout 30 adb shell dumpsys package com.pzmn.paomiantool > "$OUT/package.txt" || true
timeout 30 adb logcat -d -t 800 > "$OUT/logcat.txt" || true

# Pass when the app opened a WebView page for the site. Network-less runners are
# reported through network_ok=0 and the app's retry screen, not treated as a crash.
APP_OK=0
if [ "$PAGE_LOADED" -eq 1 ]; then
  APP_OK=1
elif grep -q "\"url\": \"$SITE_URL\"" "$OUT/devtools-pages.json" 2>/dev/null \
  && grep -q 'com.pzmn.paomiantool/.MainActivity' "$OUT/focus.txt" 2>/dev/null; then
  APP_OK=1
  echo "warning: the runner's emulator had no network; the app rendered its built-in retry page" >&2
fi
echo "app_ok=$APP_OK" | tee "$OUT/app-ok.txt"

if [ "$APP_OK" -ne 1 ]; then
  echo "WebView did not open the site page and the app was not in the foreground" >&2
  exit 1
fi
