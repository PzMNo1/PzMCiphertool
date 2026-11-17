# background/ Agents.md

## 功能定位
背景视觉效果 - 页面背景动画和视觉增强

## 文件结构
- background-effects.js → 背景动画效果主程序
- mmmbackground.jpg → 备用背景图片（JPG 格式）
- mmmbackground.webp → 背景图片（WebP 格式，更优化）

## 绝对禁止
- 在 background/ 创建新文件夹
- 添加过于复杂的动画（会影响页面性能）

## 修改规则
- 改进动画效果 → 修改 background-effects.js
- 替换背景图片 → 上传新的图片到此文件夹（同时提供 jpg 和 webp 格式）

## 常见任务

### 添加新的动画效果
LOCATE: background-effects.js
ACTION: 定义新的 CSS 动画或 Canvas 动画
PERFORMANCE: 确保动画帧率 ≥ 30fps，CPU 占用 < 10%
TEST: 动画流畅且不卡顿

### 替换背景图片
ACTION:
  1. 准备背景图（宽度 ≥ 1920px）
  2. 转换为 WebP 格式（优化大小）
  3. 上传 mmmbackground.webp 和 mmmbackground.jpg（后备）
TEST: 各分辨率下背景显示正确

### 优化背景加载性能
TARGET: 背景图片加载
ACTION: 
  1. 使用 WebP 格式减少文件大小
  2. 实现懒加载（首屏不必加载）
  3. 使用 CSS 渐进增强（先显示纯色背景）
TEST: 首屏加载时间不增加

## 架构约束
- 图片格式优化：优先 WebP，后备 JPG
- 动画性能：不能阻塞主线程

## 依赖关系
↑ modules.js 或 index.html（调用初始化）
