# 泡面工具箱 Android 壳

把 `https://www.paomian233.com/` 装进一个原生 Android WebView 壳里，得到一个可以安装、有桌面图标、没有浏览器地址栏的 App。

## 功能

- 启动即打开线上站点，桌面图标名「泡面工具箱」。
- 网页登录态、localStorage、Cookie 与浏览器一致（WebView 独立存储）。
- 支持网页里的文件选择（相册/文件）、相机/麦克风权限申请、JavaScript 弹窗。
- 支持下载：普通 http(s) 下载走系统 DownloadManager；生成图片/视频常见的 `blob:`、`data:` 下载会保存到「下载/PzMTool」。
- 站外链接、支付宝/微信等 app scheme 交给系统浏览器或对应 App 打开。
- 全屏视频、返回键回退网页历史、断网时显示原生重试页。

## 构建

需要 JDK 17 和 Android SDK（`ANDROID_HOME` 指向 SDK）。

```bash
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

也可以直接用仓库里的 GitHub Actions：`.github/workflows/android.yml`。

- 推送到 `main` 或提 PR 且改动 `android/**` 时，自动构建 debug APK 并上传 artifact。
- 手动运行（Actions → Android APK → Run workflow）时，还会在 Android 14 模拟器里安装并启动一次，上传截图 artifact。

## 安装

debug 包使用 Android 默认 debug 签名，可以直接侧载：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

手机上下载 APK 后允许「安装未知应用」即可安装。上架商店前需要换成自己的 release 签名，并把 `applicationId`、版本号确认好。

## 修改入口

- 起始地址：`app/build.gradle` 里的 `START_URL`（默认 `https://www.paomian233.com/`）。
- UA 后缀：`APP_USER_AGENT_SUFFIX`。
- 图标：`app/src/main/res/mipmap-*` 与 `mipmap-anydpi-v26/ic_launcher.xml`，与站点 `frontendciphertool/icons/` 使用同一套源图。

## 已知边界

- WebView 的能力随系统 WebView 版本变化；很老的机器上 WebGL/WebGPU 模块可能降级。
- 支付跳转到外部浏览器后，不会自动跳回 App；当前站内充值仍以二维码 + 人工审核为主。
- 没有推送、没有离线包内嵌；离线打开时由 PWA service worker 缓存兜底，首次打开仍需联网。
