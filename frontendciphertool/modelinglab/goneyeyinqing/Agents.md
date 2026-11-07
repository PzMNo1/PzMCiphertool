# goneyeyinqing/ Agents.md

## 功能定位
建模实验室 · 工业建模子模块。自研工业建模界面已整体移除，当前子模块是开源浏览器 CAD 应用 **Cascade Studio** 的全屏嵌入入口。

Cascade Studio 是 MIT 许可的浏览器端 CAD 环境，基于 OpenCascade.js，支持草图、拉伸、布尔、圆角、参数化脚本、STEP / STL / OBJ 导入导出。

## 文件结构
- industrial.html → Cascade Studio 全屏 iframe 容器；保持无自有工具栏、无回退面板的纯嵌入
- Agents.md → 本说明

## 外部项目
- 应用地址：https://zalo.github.io/CascadeStudio/
- 源码：https://github.com/zalo/CascadeStudio
- 许可：MIT

## 修改规则
- 本子模块不再维护自研建模 UI、OCCT 包装层或零件模板
- 升级 Cascade Studio 时只更新 `industrial.html` 中的应用 URL 和版本说明
- 不要恢复 `industrial.js` / `industrial.css` / `industrial-parts.js` / `industrial-viewer.js`
- 不在嵌入页叠加自定义 UI；外部项目地址与许可见本文件

## 依赖关系
↑ `../modelinglab.js`（建模实验室子页签）
→ Cascade Studio 官方 GitHub Pages 应用（iframe）
→ 外部网络
