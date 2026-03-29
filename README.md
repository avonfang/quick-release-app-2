# 每日释放打卡应用

一个帮助用户进行每日释放打卡的Web应用，支持多用户、数据持久化、统计分析等功能。

## 功能特性

- ✅ 用户认证（登录/注册）
- ✅ 多用户数据隔离
- ✅ 30分钟倒计时
- ✅ 三步确认流程
- ✅ 撒花庆祝动画
- ✅ 数据持久化存储（IndexedDB）
- ✅ 统计分析与数据可视化
- ✅ 移动端适配
- ✅ 深色/浅色主题切换
- ✅ 浏览器通知提醒

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **数据存储**: IndexedDB, localStorage
- **图表库**: Chart.js
- **响应式设计**: CSS Grid, Flexbox, Media Queries
- **通知系统**: Web Notification API

## 项目结构

```
release/
├── css/
│   └── styles.css          # 样式文件
├── js/
│   ├── db.js               # 数据库操作
│   └── script.js           # 主脚本文件
├── auth.html               # 登录/注册页面
├── index.html              # 主页面
├── stats.html              # 统计分析页面
├── .gitignore             # Git忽略文件
└── README.md              # 项目说明
```

## 本地运行

1. 直接打开 `index.html` 文件
2. 或使用本地服务器：
   ```bash
   python -m http.server 8000
   # 然后访问 http://localhost:8000
   ```

## 部署到GitHub Pages

1. 创建GitHub仓库
2. 推送代码：
   ```bash
   git remote add origin https://github.com/your-username/release-app.git
   git push -u origin master
   ```
3. 在GitHub仓库设置中启用Pages
4. 访问生成的URL

## 使用指南

1. **注册/登录**：创建账号或登录现有账号
2. **开始打卡**：在主页面进行每日释放打卡
3. **查看统计**：点击"统计分析"查看打卡数据
4. **主题切换**：点击右下角的月亮/太阳图标切换主题
5. **通知设置**：点击"通知"按钮开启或关闭打卡提醒

## 注意事项

- 数据存储在浏览器的IndexedDB中，清除浏览器数据会丢失数据
- 通知功能需要浏览器权限
- 建议使用现代浏览器（Chrome, Firefox, Edge）以获得最佳体验
