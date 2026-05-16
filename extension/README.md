# Site Blocker Chrome Extension

一个 Chrome Manifest V3 扩展，用于屏蔽你配置的网站。

## 功能

- 在弹窗里一键把当前网站加入或移出黑名单。
- 在设置页维护黑名单。
- 使用 Chrome Manifest V3 `declarativeNetRequest` 动态规则拦截主页面请求。
- 访问黑名单域名或其子域名时跳转到扩展内置拦截页。
- 支持 `example.com`、`*.example.com` 这类域名规则，最多 500 条。

## 本地安装

1. 打开 Chrome，进入 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择当前 `extension/` 目录。
5. 打开想屏蔽的网站，点击扩展图标，再点「加入黑名单」。

## 文件结构

- `manifest.json`: 扩展声明。
- `background.js`: 导航拦截逻辑。
- `popup.html` / `popup.js`: 扩展弹窗。
- `options.html` / `options.js`: 黑名单管理页面。
- `blocked.html` / `blocked.js`: 访问被拦截时显示的页面。
