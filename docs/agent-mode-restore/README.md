# 打开作图 / 视频历史时恢复对应模式 — 证据

修复目标：点进带有作图或视频生成结果的历史会话时，输入区自动恢复「作图模式」或「视频创作」；普通研究会话保持研究模式。跟进消息不再被当成研究 Agent 请求。

## 对比图

| 文件 | 场景 |
| --- | --- |
| `before-after-image-history.png` | 桌面 1440×900：点进「作图历史：赛博朋克夜景」后输入区对比（含输入区放大） |
| `before-after-video-history.png` | 桌面 1440×900：点进「视频历史：海边日落镜头」后输入区对比（含视频占位符） |
| `before-after-image-followup.png` | 桌面 1440×900：在作图历史里输入「把霓虹灯调亮一点，保持同一张图」后的实际走向 |
| `before-after-mobile-mode.png` | 手机 Pixel 5 393×851：点进作图历史后的模式按钮对比（含按钮区放大） |

- BEFORE 基线：线上 `v20261122-07`（修复前实现）。
- AFTER：线上 `v20261122-08`（本修复，`modules.js` / `model/main.js` / `model/HistoryManager.js` 版本号同步更新）。
- 同场景、同视口、同主题；截图均为线上 `https://www.paomian233.com/` 的真实页面捕获。

## 行为验证（Playwright，Chromium）

- 点进作图历史：`#image-mode-toggle` 点亮，`插件切换` 收起；跟进消息只请求 `/api/images/generations`（1 次，携带上一轮参考图），不再请求 `/api/chat/completions`。
- 点进视频历史：`#video-mode-toggle` 点亮，输入框占位符变为「描述你想创作的视频画面、动作与镜头...」。
- 点进研究历史：两个模式按钮均取消，回到研究模式。
- 发送后会话记录写入 `mode`；刷新页面后仍恢复相同模式。
- 在作图历史里手动切回研究模式并刷新：保持研究模式（显式选择优先于从历史结果推断）。
- 新建对话：回到研究模式，不继承上一个会话的作图/视频模式。
- 全程无 `pageerror`。
