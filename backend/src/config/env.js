"use strict";
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var node_process_1 = require("node:process");
function required(name, fallback) {
    var _a;
    var value = (_a = node_process_1.default.env[name]) !== null && _a !== void 0 ? _a : fallback;
    if (!value) {
        throw new Error("Missing required environment variable: ".concat(name));
    }
    return value;
}
function splitOrigins(value) {
    return value
        .split(',')
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
}
exports.env = {
    port: Number((_a = node_process_1.default.env.PORT) !== null && _a !== void 0 ? _a : 3000),
    host: (_b = node_process_1.default.env.HOST) !== null && _b !== void 0 ? _b : '0.0.0.0',
    databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
    corsOrigins: splitOrigins((_c = node_process_1.default.env.CORS_ORIGIN) !== null && _c !== void 0 ? _c : 'http://127.0.0.1:5173,http://localhost:5173'),
    aiProvider: node_process_1.default.env.AI_PROVIDER === 'openai'
        ? 'openai'
        : node_process_1.default.env.AI_PROVIDER === 'qwen'
            ? 'qwen'
            : 'mock',
    openAiApiKey: node_process_1.default.env.OPENAI_API_KEY,
    openAiModel: (_d = node_process_1.default.env.OPENAI_MODEL) !== null && _d !== void 0 ? _d : 'gpt-5',
    qwenApiKey: node_process_1.default.env.QWEN_API_KEY,
    qwenModel: (_e = node_process_1.default.env.QWEN_MODEL) !== null && _e !== void 0 ? _e : 'qwen3.7-plus',
    qwenBaseUrl: (_f = node_process_1.default.env.QWEN_BASE_URL) !== null && _f !== void 0 ? _f : 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};
