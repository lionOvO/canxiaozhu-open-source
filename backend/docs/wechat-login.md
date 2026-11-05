# 微信扫码登录配置

餐小助 PC 端使用微信开放平台“网站应用微信登录”能力，不使用模拟扫码。

## 你需要准备

1. 微信开放平台账号，并完成开发者资质认证。
2. 创建“网站应用”，拿到 `AppID` 和 `AppSecret`。
3. 在网站应用里配置授权回调域名。

## 环境变量

本地开发可写入 `backend/.env`：

```env
WECHAT_LOGIN_APP_ID=
WECHAT_LOGIN_APP_SECRET=
WECHAT_LOGIN_REDIRECT_URI=http://localhost:5173/wechat/callback
WECHAT_LOGIN_DEFAULT_SHOP_ID=
```

Docker 测试版写入服务器 `/opt/projects/canteen-helper-docker-test/.env.docker`：

```env
WECHAT_LOGIN_APP_ID=
WECHAT_LOGIN_APP_SECRET=
WECHAT_LOGIN_REDIRECT_URI=http://203.0.113.10:18080/wechat/callback
WECHAT_LOGIN_DEFAULT_SHOP_ID=
```

`WECHAT_LOGIN_DEFAULT_SHOP_ID` 可不填，不填时自动绑定第一家门店。

## 重要限制

微信开放平台网站应用通常要求配置合法回调域名。纯 IP 地址可能无法通过平台配置；如果平台不允许 IP，请等域名备案/解析完成后使用域名作为回调地址。

回调域名只填域名部分，实际环境变量需要填完整回调 URL，例如：

```text
https://你的域名/wechat/callback
```
