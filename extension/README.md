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
- `background.js`: Service Worker，把黑名单编译成 `declarativeNetRequest` 动态规则并保持同步。
- `shared.js`: 域名归一化、校验和匹配的共享逻辑，被 Service Worker、页面脚本和内容脚本共用。
- `content.js`: 内容脚本兜底，拦截缓存等场景下绕过动态规则的页面。
- `popup.html` / `popup.js` / `popup.css`: 扩展弹窗。
- `options.html` / `options.js` / `options.css`: 黑名单管理页面。
- `blocked.html` / `blocked.js` / `blocked.css`: 访问被拦截时显示的页面。
- `shared.css`: 各页面共用样式。
- `icons/`: 扩展图标。
