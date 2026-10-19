# cipher/ Agents.md

## 功能定位
加密实验室 - 经典区、现代区、分析区的具体代码

## 文件结构
- 1_cipherlab.js → 加密实验室经典区、现代区大部分卡片算法
- 0_cipher_div_batch.js → 卡片的html div
- {N}_{算法名}.js → 某个密码卡片的长算法（如 2_ADFGXCipher.js、3_Enigma.js、4_MD5.js、6_semaphore.js）
- 10_analyze_cards.js → 分析区卡片
- 777_cardindex.js → 某些密码卡片有衍生子算法，所以需要算法索引切换的交互逻辑
- 888_*.js → 超大型密码表（中文电码表之类的数据）
- 999_funtion.js → 每个密码卡片的从html div到算法之间的交互函数
- 999_fenxi_funtion.js → 分析区密码卡片的从html div到算法之间的交互函数
- shiyongshuoming.js/.css → 使用说明

### 经典区、现代区添加新的密码卡片
STEP 1: 在0_cipher_div_batch.js添加卡片的html div
STEP 2: 在1_cipherlab.js添加极简算法代码（如果算法太长超过200行 则需要另外新增{N}_{算法名}.js）
STEP 3: 在999_funtion.js的async function updateAll()中添加交互函数
STEP 4: 如果需要涉及大型的密码表，则以888_{算法名}.js添加文件

### 分析区添加新的密码卡片
STEP 1: 在0_cipher_div_batch.js添加卡片的html
STEP 2: 在10_analyze_cards.js添加极简算法代码
STEP 3: 在999_fenxi_funtion.js中添加交互函数
STEP 4: 如果需要涉及大型的密码表，则以888_{算法名}.js添加文件

### 优化性能
TARGET: 大数据量算法（如破译）
ACTION: 使用 Web Worker 分流计算，或在 999_funtion.js 中优化通用工具
REFERENCE: 检查是否已有类似优化

## 依赖关系
↑ modules.js（路由）
↑ 999_funtion.js（通用工具）
← 777_cardindex.js（索引查询）
