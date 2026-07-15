# Chrome Site Blocker

一个 Chrome Manifest V3 网站屏蔽插件。用户可以维护一个本地黑名单，访问名单中的网站时会被跳转到扩展内置的拦截页。

## 功能

- 在弹窗里一键屏蔽或取消屏蔽当前网站。
- 在选项页管理屏蔽列表。
- 支持 `example.com` 和 `*.example.com` 形式的域名规则，最多 500 条。
- 使用 Chrome `declarativeNetRequest` 动态规则拦截主页面请求。
- 不包含远程脚本、分析 SDK 或外部服务调用。

## 目录结构

- `extension/`: 插件源码。
- `tests/`: 共享域名逻辑的单元测试（`npm test`）。
- `scripts/package.sh`: 生成 Chrome Web Store 可上传的 zip 包。
- `PRIVACY.md`: 隐私说明。
- `SECURITY.md`: 安全报告说明。
- `CHANGELOG.md`: 版本记录。

## 开发加载

1. 打开 Chrome，进入 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择本项目下的 `extension/` 目录。

## 打包

运行：

```sh
./scripts/package.sh
```

输出文件：

- `dist/site-blocker-extension.zip`

这个 zip 的根目录就是 `manifest.json`，适合上传 Chrome Web Store。

如果你需要同时生成 `.crx`，请把私钥放在项目外，或设置 `CHROME_EXTENSION_KEY` 指向私钥路径，然后提供 Chrome 可执行文件路径：

```sh
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
CHROME_EXTENSION_KEY="/path/to/site-blocker-extension.pem" \
./scripts/package.sh
```

## 权限说明

- `declarativeNetRequest`: 根据用户配置的规则拦截或重定向网站访问。
- `storage`: 在本机保存启用状态和屏蔽列表。
- `http://*/*`、`https://*/*`: 允许用户屏蔽任意网站，同时供内容脚本兜底使用——当页面来自缓存、动态规则尚未生效时，由内容脚本比对黑名单后跳转到拦截页。内容脚本只读取页面域名，不读取页面内容。

## 发布提醒

- 不要提交 `dist/`、`.crx`、`.zip`、`keys/` 或 `*.pem`。
- 私钥应保存在密码管理器或其他安全位置。
- 发布 Chrome Web Store 前，请检查 `manifest.json` 的 `name`、`description`、`version` 和图标。
