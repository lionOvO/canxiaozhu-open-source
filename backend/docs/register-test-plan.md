# 餐小助 PC 注册功能测试说明

## 已实现接口

- `POST /api/v2/auth/sms/send`：发送阿里云短信验证码。
- `POST /api/v2/auth/register`：校验短信验证码并创建商户账号。
- `POST /api/v2/auth/login`：账号、邮箱或手机号登录。
- `GET /api/v2/auth/me`：通过 Bearer token 恢复当前登录用户。

## 配置要求

- `ALIYUN_ACCESS_KEY_ID`：阿里云 AccessKey ID。
- `ALIYUN_ACCESS_KEY_SECRET`：阿里云 AccessKey Secret。
- `ALIYUN_SMS_SIGN_NAME`：阿里云短信签名。
- `ALIYUN_SMS_TEMPLATE_CODE`：阿里云短信模板 Code。
- 当前项目兼容读取 `ALIBABA_SMS_SIGN_NAME` 和 `ALIYUN_PNVS_SCHEME_CODE`，但正式环境建议改成上面的标准变量名。

## 手工测试用例

1. 打开 PC 端 `/register`，输入无效手机号，点击“获取验证码”，应提示手机号无效。
2. 输入有效手机号，点击“获取验证码”，按钮进入倒计时；若阿里云配置正确，手机应收到验证码。
3. 使用错误验证码提交注册，应提示验证码错误或已过期。
4. 两次密码不一致提交，应提示“两次输入的密码不一致”。
5. 密码少于 8 位或不包含字母数字，应被后端拒绝。
6. 使用已注册用户名、邮箱或手机号提交，应提示已被注册。
7. 注册成功后应自动进入 `/dashboard`，刷新页面仍保持登录。
8. 使用注册时填写的用户名、邮箱或手机号都应能登录。

## 已完成自动验证

- 前端 `npm run build` 通过。
- 后端 `npm run build` 通过。
- `prisma db push --skip-generate` 已同步当前 SQLite 开发库。
- Fastify 注入测试验证：
- 无效手机号发送验证码返回 `400`。
- 无验证码注册返回 `400`。
- 老账号登录返回 `200`。
- Bearer token 调用 `/auth/me` 返回 `200`。
