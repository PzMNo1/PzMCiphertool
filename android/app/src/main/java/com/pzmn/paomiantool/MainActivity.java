package com.pzmn.paomiantool;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * 泡面的Agent工具箱 Android 壳。
 *
 * 用系统 WebView 承载 https://www.paomian233.com/，补齐浏览器壳需要的能力：
 * 文件选择、下载（含 blob:/data: 下载）、外部链接跳转、网页权限、全屏视频、返回键。
 */
public class MainActivity extends Activity {

    private static final String START_URL = BuildConfig.START_URL;
    private static final String USER_AGENT_SUFFIX = BuildConfig.APP_USER_AGENT_SUFFIX;

    private static final int REQUEST_FILE_CHOOSER = 4101;
    private static final int REQUEST_WEB_PERMISSIONS = 4102;
    private static final int REQUEST_STORAGE_PERMISSION = 4103;

    private WebView webView;
    private ProgressBar progressBar;
    private View errorPanel;
    private FrameLayout rootLayout;

    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;
    private Runnable pendingStorageAction;
    private String lastFailedUrl;

    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    @Override
    protected void attachBaseContext(Context newBase) {
        // Android WebView 会把系统字体缩放带进网页；Chrome 默认按 100% 文本缩放渲染。
        // 固定 Activity 的 fontScale 为 1.0，避免系统大字体把固定尺寸的侧边栏胶囊放大。
        Configuration config = new Configuration(newBase.getResources().getConfiguration());
        config.fontScale = 1.0f;
        super.attachBaseContext(newBase.createConfigurationContext(config));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        rootLayout = findViewById(R.id.root);
        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progress);
        errorPanel = findViewById(R.id.error_panel);

        getWindow().setStatusBarColor(Color.parseColor("#0a0a12"));
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a12"));

        Button retryButton = findViewById(R.id.retry_button);
        retryButton.setOnClickListener(v -> {
            errorPanel.setVisibility(View.GONE);
            String target = lastFailedUrl == null || lastFailedUrl.isEmpty() ? START_URL : lastFailedUrl;
            webView.loadUrl(target);
        });

        configureWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // 很多手机把系统字体调大；WebView 默认会把网页文字一起放大，导致侧边栏胶囊
        // 之类的固定尺寸容器看起来变形。Chrome 用的是 100% 文本缩放，这里保持一致。
        settings.setTextZoom(100);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setUserAgentString(settings.getUserAgentString() + " " + USER_AGENT_SUFFIX);

        webView.setBackgroundColor(Color.parseColor("#0a0a12"));
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUri(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUri(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                errorPanel.setVisibility(View.GONE);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    lastFailedUrl = request.getUrl().toString();
                    progressBar.setVisibility(View.GONE);
                    errorPanel.setVisibility(View.VISIBLE);
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // 旧实现仅在 API 23 以下触发；minSdk 24 之后由上面的重载处理。
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress >= 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQUEST_FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    toast("没有可用的文件选择器");
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handlePermissionRequest(request));
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView.HitTestResult hitTestResult = view.getHitTestResult();
                String hitUrl = hitTestResult == null ? null : hitTestResult.getExtra();
                if (hitUrl != null && (hitUrl.startsWith("http://") || hitUrl.startsWith("https://"))) {
                    if (openInWebViewOrBrowser(Uri.parse(hitUrl))) {
                        return false;
                    }
                }

                // window.open()/target=_blank：用一个临时 WebView 接住首次导航，转交主 WebView。
                final WebView popupWebView = new WebView(view.getContext());
                final FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(1, 1);
                popupWebView.setLayoutParams(params);
                popupWebView.setVisibility(View.INVISIBLE);
                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popup, WebResourceRequest request) {
                        openInWebViewOrBrowser(request.getUrl());
                        rootLayout.removeView(popupWebView);
                        popupWebView.destroy();
                        return true;
                    }
                });
                rootLayout.addView(popupWebView);
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                rootLayout.addView(view, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                webView.setVisibility(View.GONE);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                rootLayout.removeView(customView);
                customView = null;
                webView.setVisibility(View.VISIBLE);
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message,
                                     final android.webkit.JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("确定", (dialog, which) -> result.confirm())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message,
                                       final android.webkit.JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("确定", (dialog, which) -> result.confirm())
                    .setNegativeButton("取消", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue,
                                      final android.webkit.JsPromptResult result) {
                final EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue == null ? "" : defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton("确定", (dialog, which) -> result.confirm(input.getText().toString()))
                    .setNegativeButton("取消", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
                return true;
            }
        });

        webView.addJavascriptInterface(new DownloadBridge(), "PzMAndroid");
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                handleDownload(url, userAgent, contentDisposition, mimetype);
            }
        });
    }

    private boolean handleUri(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (scheme.equals("http") || scheme.equals("https")) {
            String host = uri.getHost();
            if (host != null && (host.equals("paomian233.com") || host.endsWith(".paomian233.com"))) {
                return false; // 站内链接留在 WebView。
            }
            openExternal(uri);
            return true;
        }
        if (scheme.equals("blob") || scheme.equals("data")) {
            handleDownload(uri.toString(), "", "", null);
            return true;
        }
        openExternal(uri);
        return true;
    }

    /** 返回 true 表示已在站内 WebView 打开。 */
    private boolean openInWebViewOrBrowser(Uri uri) {
        String host = uri.getHost();
        if (host != null && (host.equals("paomian233.com") || host.endsWith(".paomian233.com"))) {
            webView.loadUrl(uri.toString());
            return true;
        }
        openExternal(uri);
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent;
            if ("intent".equalsIgnoreCase(uri.getScheme())) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, uri);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            toast("没有可打开该链接的应用");
        } catch (Exception e) {
            toast("无法打开该链接");
        }
    }

    private void handleDownload(String url, String userAgent, String contentDisposition, String mimetype) {
        if (url == null) return;
        if (url.startsWith("blob:")) {
            downloadBlob(url, mimetype);
            return;
        }
        if (url.startsWith("data:")) {
            String name = buildFileName(mimetype);
            saveDataUrl(name, mimetype, url);
            return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            toast("暂不支持该下载类型");
            return;
        }
        enqueueHttpDownload(url, userAgent, contentDisposition, mimetype);
    }

    private void enqueueHttpDownload(final String url, final String userAgent,
                                     final String contentDisposition, final String mimetype) {
        Runnable action = () -> {
            try {
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                request.addRequestHeader("User-Agent", userAgent == null ? "" : userAgent);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null && !cookie.isEmpty()) {
                    request.addRequestHeader("Cookie", cookie);
                }
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setAllowedOverMetered(true);
                request.setAllowedOverRoaming(false);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (manager == null) throw new IllegalStateException("DownloadManager unavailable");
                manager.enqueue(request);
                toast("开始下载：" + fileName);
            } catch (Exception e) {
                toast("下载失败：" + e.getMessage());
            }
        };
        runWithLegacyStoragePermission(action);
    }

    private void downloadBlob(String blobUrl, String mimetype) {
        String fileName = buildFileName(mimetype);
        String script = "(function(){"
            + "fetch(" + javaScriptString(blobUrl) + ").then(function(r){return r.blob();}).then(function(blob){"
            + "var reader=new FileReader();reader.onloadend=function(){"
            + "PzMAndroid.saveBlob(" + javaScriptString(fileName) + "," + javaScriptString(mimetype == null ? "" : mimetype) + ",String(reader.result));"
            + "};reader.readAsDataURL(blob);"
            + "}).catch(function(e){PzMAndroid.onDownloadError(String(e));});"
            + "})();";
        webView.evaluateJavascript(script, null);
    }

    private void saveDataUrl(String fileName, String mimetype, String dataUrl) {
        int comma = dataUrl.indexOf(',');
        if (comma < 0) {
            toast("下载失败：无法解析文件内容");
            return;
        }
        try {
            byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
            saveBytes(fileName, mimetype, bytes);
        } catch (Exception e) {
            toast("下载失败：" + e.getMessage());
        }
    }

    private void saveBytes(String fileName, String mimetype, byte[] bytes) {
        String mime = mimetype == null || mimetype.isEmpty() ? "application/octet-stream" : mimetype;
        String safeName = sanitizeFileName(fileName);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PzMTool");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri item = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (item == null) throw new IllegalStateException("无法创建下载文件");
                try (OutputStream out = getContentResolver().openOutputStream(item)) {
                    if (out == null) throw new IllegalStateException("无法写入下载文件");
                    out.write(bytes);
                }
                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(item, done, null, null);
                toast("已保存到下载目录/PzMTool：" + safeName);
            } else {
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) dir = getFilesDir();
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建下载目录");
                File file = new File(dir, safeName);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                }
                toast("已保存：" + file.getAbsolutePath());
            }
        } catch (Exception e) {
            toast("保存失败：" + e.getMessage());
        }
    }

    private void runWithLegacyStoragePermission(Runnable action) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            || checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
            action.run();
            return;
        }
        pendingStorageAction = action;
        requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQUEST_STORAGE_PERMISSION);
    }

    private void handlePermissionRequest(PermissionRequest request) {
        List<String> missing = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.RECORD_AUDIO);
            }
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.CAMERA);
            }
        }
        if (missing.isEmpty()) {
            request.grant(request.getResources());
            return;
        }
        if (pendingPermissionRequest != null) {
            pendingPermissionRequest.deny();
        }
        pendingPermissionRequest = request;
        requestPermissions(missing.toArray(new String[0]), REQUEST_WEB_PERMISSIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQUEST_STORAGE_PERMISSION) {
            boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Runnable action = pendingStorageAction;
            pendingStorageAction = null;
            if (granted && action != null) {
                action.run();
            } else if (!granted) {
                toast("需要存储权限才能保存文件");
            }
            return;
        }

        if (requestCode == REQUEST_WEB_PERMISSIONS) {
            PermissionRequest request = pendingPermissionRequest;
            pendingPermissionRequest = null;
            if (request == null) return;

            List<String> grantable = new ArrayList<>();
            for (String resource : request.getResources()) {
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    grantable.add(resource);
                } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                    && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    grantable.add(resource);
                }
            }
            if (grantable.isEmpty()) {
                request.deny();
            } else {
                request.grant(grantable.toArray(new String[0]));
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_FILE_CHOOSER) {
            Uri[] results = null;
            if (resultCode == RESULT_OK) {
                if (data == null) {
                    results = null;
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            onHideCustomView();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    private void onHideCustomView() {
        if (customView == null) return;
        rootLayout.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("PzMAndroid");
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
    }

    private String buildFileName(String mimetype) {
        String extension = extensionForMime(mimetype);
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
        return "pzm-" + stamp + extension;
    }

    private static String extensionForMime(String mime) {
        if (mime == null) return ".bin";
        switch (mime.toLowerCase(Locale.ROOT)) {
            case "image/png": return ".png";
            case "image/jpeg": return ".jpg";
            case "image/webp": return ".webp";
            case "image/gif": return ".gif";
            case "image/svg+xml": return ".svg";
            case "video/mp4": return ".mp4";
            case "video/webm": return ".webm";
            case "audio/mpeg": return ".mp3";
            case "audio/wav": return ".wav";
            case "application/pdf": return ".pdf";
            case "application/zip": return ".zip";
            case "application/json": return ".json";
            case "text/plain": return ".txt";
            default: return ".bin";
        }
    }

    private static String sanitizeFileName(String name) {
        String cleaned = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        if (cleaned.isEmpty()) cleaned = "download";
        return cleaned;
    }

    private static String javaScriptString(String value) {
        if (value == null) return "''";
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "") + "'";
    }

    private class DownloadBridge {
        @JavascriptInterface
        public void saveBlob(String fileName, String mimeType, String dataUrl) {
            saveDataUrl(fileName, mimeType, dataUrl);
        }

        @JavascriptInterface
        public void onDownloadError(String message) {
            toast("下载失败：" + message);
        }
    }
}
