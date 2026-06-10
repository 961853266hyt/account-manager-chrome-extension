# 账号切换助手（Chrome 插件）

同一域名下多账号一键切换，基于 Cookie 的保存与恢复实现。

## 功能

- **按 Cookie 名管理（核心）**：每个域名可指定「要管理的 Cookie 名字」，只保存 / 切换登录态相关的那几个，不碰分析、追踪类 Cookie。点 ⚙ 进入设置，列出当前域名所有 Cookie 供勾选，并按启发式（HttpOnly / 名字含 sess、auth、token、sid 等）智能预选；支持 `前缀*` 通配；留空则回退为「全部」
- **保存账号**：把当前站点（按主域名 eTLD+1，含所有子域名）受管理的 Cookie（含 HttpOnly）存为一个命名账号
- **一键切换**：只清除受管理的 Cookie → 写回目标账号的 Cookie → 自动刷新页面（不影响域名下其它 Cookie）
- **更新 / 改名 / 删除**：账号的日常管理
- **导入 / 导出**：账号数据可导出为 JSON 文件，换机器或备份时再导入

## 为什么不直接保存全部 Cookie

全量保存会把分析、A/B 实验、CSRF 临时态、追踪类 Cookie 一起带走，切换时互相污染，反而容易把登录态切坏。主流账号管理器（SessionBox 等）的共识是只管理登录态相关的少量 Cookie，因此本插件把「要管理的 Cookie 名字」做成每域名可配置。

## 开发与构建

```bash
npm install
npm run build   # 产物在 dist/
npm run dev     # 开发模式（CRXJS 热更新）
```

## 安装到 Chrome

1. 执行 `npm run build`
2. 打开 `chrome://extensions`，开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择本项目的 `dist/` 目录
4. 在任意网站登录后，点插件图标 → 输入备注名 → 保存当前账号

## 使用流程

1. 用账号 A 登录某网站 → 打开插件 → 保存为「账号A」
2. 退出登录，用账号 B 登录 → 保存为「账号B」
3. 之后随时点「切换」即可在 A / B 之间一键来回

## 技术栈

- Manifest V3 + `chrome.cookies` / `chrome.storage` API
- React 18 + Vite 5 + [@crxjs/vite-plugin](https://crxjs.dev/)

## 已知限制

- 登录态存在 `localStorage` 中的网站（部分 SPA）只换 Cookie 可能切不干净
- 绑定 IP / 设备指纹的站点，导入到其他机器的 Cookie 可能被服务端拒绝
- `__Host-` 前缀等受限 Cookie 极少数情况下可能写回失败，切换后界面会提示失败条数

## 安全提醒

导出的 JSON 文件包含登录凭证（等同于账号密码），请妥善保管，勿发给不信任的人。
