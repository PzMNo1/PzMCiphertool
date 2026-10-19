# sendfeedback/ Agents.md

## 功能定位
联系我们 - 用户反馈收集和作者信息展示

## 文件结构
- sendfeedback.js → 反馈主程序
- caifangzuozhe.md → 作者采访文档
- zuozhetupian/ → 作者相关资源
  - zuozhedeBilibili.jpg → B站头像
  - zuozhedezhihu.jpg → 知乎头像
  - zuozhedegongzhonghao.jpg → 公众号二维码
  - zanshangzuozhe.jpg → 赞赏信息

## 后端对应
- FeedbackController.java → 反馈 API
- FeedbackService.java → 反馈业务逻辑

## 绝对禁止
- 在 sendfeedback/ 中创建新文件夹（zuozhetupian/ 已固定）
- 修改作者信息结构（会导致前后端不一致）

## 修改规则
- 改进反馈表单 → 修改 sendfeedback.js
- 更新作者信息 → 修改 caifangzuozhe.md 或替换 zuozhetupian/ 中的文件
- 样式调整 → 在 sendfeedback.js 中内联或创建 sendfeedback.css

## 常见任务

### 新增反馈表单字段
LOCATE: sendfeedback.js
ACTION: 在表单中添加新 input/textarea，修改提交的 DTO
BACKEND: 同时修改后端的 FeedbackCreateRequest.java
TEST: 新字段能正常提交和保存

### 修改作者信息展示
LOCATE: sendfeedback.js（展示逻辑），caifangzuozhe.md（内容）
ACTION: 更新显示文本或替换 zuozhetupian/ 中的图片
TEST: 新信息在前端正确显示

### 实现反馈列表和回复功能
LOCATE: 后端 FeedbackService.java 和 FeedbackController.java
ACTION: 
  1. 添加反馈查询 API
  2. 添加回复 API
  3. 前端编写反馈管理界面
TEST: 用户能查看反馈历史和回复

## 架构约束
- 作者资源本地化：图片文件存在 zuozhetupian/
- 反馈数据持久化：由后端保存到数据库

## 依赖关系
↑ modules.js（路由）
← backendconfig.js（API 配置）
← 后端 API（FeedbackController、FeedbackService）
