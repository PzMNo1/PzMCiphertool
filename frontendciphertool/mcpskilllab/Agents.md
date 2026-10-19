# mcpskilllab/ Agents.md

## 功能定位
MCP/Skill 实验室 - 收录 DeepSeek Harness 已内置的能力、可接入的 MCP 服务、以及 Harness 的插件包清单。
每张卡只回答三件事：它具体能做什么、要准备什么、怎么验证。

## 文件结构
- mcpskilllab.js → 模块主程序（卡片、搜索、分页、怎么用指南、共享目录）
- mcpskilllab-config.js → 分类、配置模板、文案与本地存储键
- mcpskilllab-resources.js → 资源管理（总入口，导出结构不可修改）
- mcpskilllab-resources-mcp.js → DSH 能力卡（dsh 分组）+ MCP 服务（mcp 分组）
- mcpskilllab-resources-skills.js → DSH 插件包清单（plugins 分组）

## 资源数据模型
```
{
  id, name, type, category, categories, source, tags,
  use,                       // 一句话具体用途，卡片正文字
  what,                      // 它是什么，1-2 句
  steps: [{ title, text, code }],  // 怎么用，最多 5 步
  notes: [],                 // 注意事项
  pkg, version,              // DSH 插件包名与版本
  url, docs
}
```
- 不再使用 risk / platforms / permissions / installModes / trustScore，卡片也不展示这些字段
- 卡片固定三个动作：官网、收藏、怎么用
- 代码片段必须能直接复制执行；占位符写成 `xxx` 并说明替换成什么

## 分类
- `dsh` DSH 能力、`mcp` MCP 服务、`plugins` DSH 插件
- 旧的 skill / prompt / workflow 等分类保留在配置里，但没有资源时自动隐藏

## 后端对应
- McpLabController.java → 主控制器
- McpLabResourceService.java → 资源管理（启动时按 mcp-lab-resources.json 同步种子，并软删除已下线的旧种子）
- McpLabCheckService.java → 检查和验证

## 绝对禁止
- 修改 mcpskilllab-resources.js 的导出结构（是资源加载的枢纽）
- 在 mcpskilllab/ 根目录创建新文件夹
- 硬编码 GitHub 仓库地址（应该从配置读取）
- 写「适合资源发现」「适合初步风险判断」这类空泛用途

## 修改规则
- 新增/修改 DSH 能力或 MCP 服务 → 修改 mcpskilllab-resources-mcp.js
- 新增/修改 DSH 插件 → 修改 mcpskilllab-resources-skills.js（name/use 取包内 locale/zh.json 的 meta）
- 调整「怎么用」的结构与交互 → mcpskilllab.js 的 getGuide() / renderGuideBody()
- 分类、文案、配置模板 → mcpskilllab-config.js
- 样式调整 → 在 mcpskilllab.js 的 injectStyles() 中改，不新建 css 文件
- 资源列表每页数量（翻页）→ mcpskilllab-config.js 的 pageSize（默认 24，6-120）
- 后端种子资源 → backendcipher/src/main/resources/mcp-lab-resources.json（与 mcp 分组保持一致）

## 常见任务

### 新增一个 MCP 服务
LOCATE: mcpskilllab-resources-mcp.js
ACTION: 加一个 mcp- 前缀的对象，写清 use / what / steps，url 用官方文档或 npm 页面
STRUCTURE:
  {
    id: 'mcp-xxx',
    name: '服务名（做什么）',
    type: 'MCP Server',
    category: 'mcp',
    categories: ['mcp'],
    source: 'Official' | 'Community',
    tags: ['场景关键词'],
    use: '一句话说明它能替用户做什么',
    what: '它是什么、边界在哪',
    steps: [{ title: '准备', text: '...', code: '...' }, { title: '配置', text: '...', code: '...' }, { title: '验证', text: '...' }],
    notes: ['密钥/权限/配额提醒'],
    url: 'https://...',
    docs: 'https://...'
  }
TEST: 卡片正文具体、怎么用弹窗里的片段能复制并直接执行

### 更新 DSH 插件清单
LOCATE: mcpskilllab-resources-skills.js
ACTION: 按 @deepseek-ai 包清单生成对象，name 取 locale/zh.json 的 meta.title，
        use 取 meta.description，缺失时手写一句「这个包负责什么」
TEST: 插件分类计数、搜索、分页正常，版本号显示正确

### 接入外部资源到共享目录
LOCATE: mcpskilllab.js
ACTION: 复用 loadServerResources / submitResourceToServer / importBundleToServer
TEST: 后端不可用时自动回退到内置目录，不阻塞页面渲染

## 架构约束
- 内置目录优先：前端资源文件是完整目录，后端共享目录只做增量覆盖
- 后端种子以 seed 文件为准：不在文件里的旧种子在启动时软删除，前端同时过滤未知 seed
- 验证分离：后端负责校验与存储，前端负责展示
- 本地收藏与自定义资源只存 localStorage

## 依赖关系
↑ modules.js（路由）
↑ backendconfig.js（API 配置）
↑ loginsystem/auth.js（用户认证）
← 后端 API（McpLabController、Service）
← 外部 MCP 服务与 npm 包（资源链接）
