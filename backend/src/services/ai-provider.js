"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiProvider = createAiProvider;
var openai_1 = require("openai");
var env_js_1 = require("../config/env.js");
var systemPrompt = [
    '你是“餐小助”的经营分析助手，服务对象是餐饮老板和店长。',
    '你的回答必须只基于提供的数据，不要编造门店情况。',
    '表达要像靠谱的经营顾问，直接、清楚、少术语。',
    '优先回答利润、采购、会员召回、差评和当天动作优先级。',
    '先给结论，再补两到三条最重要的依据，最后给一到两条可执行建议。',
    '如果问题无法从现有数据判断，要明确说“现有数据不足”，并指出还缺什么信息。',
].join('\n');
var MockAiProvider = /** @class */ (function () {
    function MockAiProvider() {
    }
    MockAiProvider.prototype.providerName = function () {
        return 'mock';
    };
    MockAiProvider.prototype.answerVoiceQuestion = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var normalized;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                normalized = context.question.trim();
                if (normalized.includes('这周')) {
                    return [2 /*return*/, {
                            id: "assistant-".concat(Date.now()),
                            role: 'assistant',
                            content: '这周整体比上周稳一点，利润在回升，但午市客单价还没完全拉回来。现在最值得盯的是叶菜损耗和外卖包装，这两项先压住，利润会更扎实。',
                            confidence: 0.84,
                            references: [
                                { label: '昨日利润', value: "".concat(context.dashboard.profit, " \u5143") },
                                { label: '今日状态', value: context.dashboard.operationLabel },
                                { label: '重点异常', value: (_b = (_a = context.report.abnormalities[0]) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : '叶菜损耗偏高' },
                            ],
                        }];
                }
                if (normalized.includes('采购')) {
                    return [2 /*return*/, {
                            id: "assistant-".concat(Date.now()),
                            role: 'assistant',
                            content: '采购单里现在最该盯的是叶菜和打包盒。一个直接影响损耗，一个直接影响外卖差评，优先级都比补常规干货更高。',
                            confidence: 0.81,
                            references: [
                                { label: '待确认采购', value: '明日采购单' },
                                { label: '临期提醒', value: (_d = (_c = context.report.abnormalities[1]) === null || _c === void 0 ? void 0 : _c.title) !== null && _d !== void 0 ? _d : '叶菜损耗率超阈值' },
                            ],
                        }];
                }
                return [2 /*return*/, {
                        id: "assistant-".concat(Date.now()),
                        role: 'assistant',
                        content: '我已经把你的问题和当前门店经营数据对上了。你可以继续追问利润原因、采购单、客户召回或者差评处理，我会按现有数据给出判断。',
                        confidence: 0.79,
                        references: [
                            { label: '未处理待办', value: "".concat(context.dashboard.todos.length, " \u6761") },
                            { label: 'AI 日报', value: context.dashboard.aiHeadline },
                        ],
                    }];
            });
        });
    };
    return MockAiProvider;
}());
var OpenAiCompatibleProvider = /** @class */ (function () {
    function OpenAiCompatibleProvider(provider, apiKey, model, baseURL) {
        this.provider = provider;
        this.model = model;
        this.client = new openai_1.default(__assign({ apiKey: apiKey }, (baseURL ? { baseURL: baseURL } : {})));
    }
    OpenAiCompatibleProvider.prototype.providerName = function () {
        return this.provider;
    };
    OpenAiCompatibleProvider.prototype.answerVoiceQuestion = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.responses.create({
                            model: this.model,
                            store: false,
                            input: [
                                {
                                    role: 'system',
                                    content: [
                                        {
                                            type: 'input_text',
                                            text: systemPrompt,
                                        },
                                    ],
                                },
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'input_text',
                                            text: JSON.stringify({
                                                question: context.question,
                                                shopId: context.shopId,
                                                dashboard: context.dashboard,
                                                dailyReport: context.report,
                                            }, null, 2),
                                        },
                                    ],
                                },
                            ],
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                id: response.id,
                                role: 'assistant',
                                content: response.output_text,
                                confidence: 0.9,
                                references: [
                                    { label: '模型', value: this.model },
                                    { label: '门店', value: "".concat(context.shopId) },
                                ],
                            }];
                }
            });
        });
    };
    return OpenAiCompatibleProvider;
}());
var OpenAiProvider = /** @class */ (function (_super) {
    __extends(OpenAiProvider, _super);
    function OpenAiProvider() {
        if (!env_js_1.env.openAiApiKey) {
            throw new Error('AI_PROVIDER=openai 时必须配置 OPENAI_API_KEY');
        }
        return _super.call(this, 'openai', env_js_1.env.openAiApiKey, env_js_1.env.openAiModel) || this;
    }
    return OpenAiProvider;
}(OpenAiCompatibleProvider));
var QwenProvider = /** @class */ (function (_super) {
    __extends(QwenProvider, _super);
    function QwenProvider() {
        if (!env_js_1.env.qwenApiKey) {
            throw new Error('AI_PROVIDER=qwen 时必须配置 QWEN_API_KEY');
        }
        return _super.call(this, 'qwen', env_js_1.env.qwenApiKey, env_js_1.env.qwenModel, env_js_1.env.qwenBaseUrl) || this;
    }
    return QwenProvider;
}(OpenAiCompatibleProvider));
function createAiProvider() {
    switch (env_js_1.env.aiProvider) {
        case 'openai':
            return new OpenAiProvider();
        case 'qwen':
            return new QwenProvider();
        default:
            return new MockAiProvider();
    }
}
