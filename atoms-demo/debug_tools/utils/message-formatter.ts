/**
 * 消息格式化工具
 * 用于处理和转换 AI SDK 消息格式
 */

import { CoreMessage, ToolCall, ToolResult } from 'ai';

/**
 * 消息格式转换配置
 */
interface FormatConfig {
    removeEmptyContent: boolean;
    normalizeToolMessages: boolean;
    convertPartsToContent: boolean;
    preserveOriginal: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: FormatConfig = {
    removeEmptyContent: true,
    normalizeToolMessages: true,
    convertPartsToContent: true,
    preserveOriginal: false,
};

/**
 * 原始消息类型
 */
interface RawMessage {
    role: string;
    content?: string | null;
    parts?: Array<{
        type: string;
        text?: string;
        toolCallId?: string;
        toolName?: string;
        result?: any;
    }>;
    name?: string;
}

/**
 * 格式化消息选项
 */
interface FormatMessagesOptions {
    config?: Partial<FormatConfig>;
    logSteps?: boolean;
}

/**
 * 格式化消息的核心函数
 * 
 * @param messages - 原始消息数组
 * @param options - 格式化选项
 * @returns 格式化后的消息数组
 * 
 * @example
 * ```typescript
 * const input = [
 *   { role: 'user', content: 'Hello' },
 *   { role: 'assistant', parts: [{ type: 'text', text: 'Hi!' }] }
 * ];
 * const formatted = formatMessages(input);
 * ```
 */
export function formatMessages(
    messages: RawMessage[],
    options: FormatMessagesOptions = {}
): CoreMessage[] {
    const config = { ...DEFAULT_CONFIG, ...options.config };
    const stepLogs: string[] = [];

    if (options.logSteps) {
        stepLogs.push(`[输入] 消息数量: ${messages.length}`);
    }

    const formatted = messages.map((msg, index) => {
        const formattedMsg: any = { role: msg.role };

        // 处理内容字段
        if ('content' in msg && msg.content !== undefined) {
            if (config.removeEmptyContent && msg.content === null) {
                // 移除空内容
            } else {
                formattedMsg.content = msg.content;
            }
        }

        // 处理 parts
        if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
            if (config.convertPartsToContent) {
                // 将 parts 转换为 content
                const parts = msg.parts;
                
                // 分类处理 parts
                const textParts = parts.filter(p => p.type === 'text' && p.text);
                const toolCallParts = parts.filter(p => p.type === 'tool-call');
                const toolResultParts = parts.filter(p => p.type === 'tool-result');

                // 构建内容
                const contentParts: string[] = [];
                
                if (textParts.length > 0) {
                    contentParts.push(textParts.map(p => p.text).join('\n'));
                }

                // 处理工具调用
                if (toolCallParts.length > 0) {
                    const toolCallsContent = toolCallParts.map(p => {
                        if (p.toolCallId && p.toolName) {
                            return `[TOOL_CALL: ${p.toolName}]`;
                        }
                        return '';
                    }).filter(Boolean);
                    contentParts.push(...toolCallsContent);
                }

                // 处理工具结果
                if (toolResultParts.length > 0) {
                    const toolResultsContent = toolResultParts.map(p => {
                        if (p.toolCallId && p.result !== undefined) {
                            const resultStr = typeof p.result === 'string' 
                                ? p.result 
                                : JSON.stringify(p.result);
                            return `[TOOL_RESULT: ${resultStr}]`;
                        }
                        return '';
                    }).filter(Boolean);
                    contentParts.push(...toolResultsContent);
                }

                if (contentParts.length > 0) {
                    formattedMsg.content = contentParts.join('\n');
                }

                if (options.logSteps) {
                    stepLogs.push(`[消息 ${index}] 转换 parts: ${parts.length} 个 parts -> ${contentParts.length} 个内容块`);
                }
            } else {
                // 保留 parts 格式
                formattedMsg.parts = msg.parts;
            }
        }

        // 处理工具消息的规范化
        if (config.normalizeToolMessages && msg.role === 'tool') {
            if (msg.name) {
                formattedMsg.name = msg.name;
            }
            if ('content' in msg && typeof msg.content === 'object') {
                // 将对象内容转换为字符串
                formattedMsg.content = typeof msg.content === 'string'
                    ? msg.content
                    : JSON.stringify(msg.content);
            }
        }

        return formattedMsg;
    });

    if (options.logSteps) {
        stepLogs.push(`[输出] 消息数量: ${formatted.length}`);
    }

    return formatted as CoreMessage[];
}

/**
 * 将 OpenRouter/Gemini 格式的消息转换为 AI SDK 格式
 * 
 * @param messages - 原始消息（来自 OpenRouter/Gemini）
 * @returns AI SDK 格式的消息
 */
export function convertOpenRouterMessages(messages: any[]): CoreMessage[] {
    const converted: CoreMessage[] = [];

    for (const msg of messages) {
        const convertedMsg: any = { role: msg.role };

        // 处理内容
        if (msg.content) {
            if (typeof msg.content === 'string') {
                convertedMsg.content = msg.content;
            } else if (Array.isArray(msg.content)) {
                // 处理内容块（文本、图像等）
                const textBlocks = msg.content.filter((block: any) => 
                    block.type === 'text' && block.text
                );
                
                if (textBlocks.length > 0) {
                    convertedMsg.content = textBlocks.map((block: any) => block.text).join('\n');
                }
            }
        }

        // 处理工具调用
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
            // OpenRouter/Gemini 的工具调用格式
            const toolCalls = msg.tool_calls.map((tc: any) => ({
                toolCallId: tc.id || `call_${Date.now()}_${Math.random()}`,
                toolName: tc.function?.name || tc.name,
                args: tc.function?.arguments || tc.args || {},
            }));

            // 如果已经有 content，追加工具调用信息
            if (convertedMsg.content) {
                convertedMsg.content += '\n\n[工具调用信息]\n';
                convertedMsg.content += toolCalls.map((tc: any) => 
                    `工具: ${tc.toolName}\n参数: ${JSON.stringify(tc.args)}`
                ).join('\n---\n');
            } else {
                convertedMsg.content = `[工具调用]\n${JSON.stringify(toolCalls, null, 2)}`;
            }

            // 添加工具调用标记（如果 SDK 支持）
            // convertedMsg.toolCalls = toolCalls;
        }

        // 处理工具结果
        if (msg.tool_results || msg.role === 'tool') {
            const toolResults = msg.tool_results || (msg.content ? [msg] : []);
            
            for (const result of toolResults) {
                const resultContent = result.content || result.result;
                const resultStr = typeof resultContent === 'string'
                    ? resultContent
                    : JSON.stringify(resultContent);

                if (convertedMsg.content) {
                    convertedMsg.content += `\n[工具结果]\n${resultStr}`;
                } else {
                    convertedMsg.content = `[工具结果]\n${resultStr}`;
                }
            }
        }

        converted.push(convertedMsg as CoreMessage);
    }

    return converted;
}

/**
 * 规范化工具调用参数
 * 处理 AI SDK 可能收到的各种参数格式
 * 
 * @param args - 工具调用参数
 * @param expectedSchema - 期望的参数 Schema
 * @returns 规范化后的参数
 */
export function normalizeToolArgs<T>(
    args: Record<string, any>,
    expectedSchema: Record<string, { type: string; required: boolean }>
): T {
    const normalized: Record<string, any> = {};

    for (const [key, schema] of Object.entries(expectedSchema)) {
        const value = args[key];
        const expectedType = schema.type;

        if (value === undefined || value === null) {
            if (schema.required) {
                console.warn(`[规范化] 必需字段 '${key}' 缺失`);
            }
            continue;
        }

        // 类型转换
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType === expectedType) {
            // 类型匹配，直接使用
            normalized[key] = value;
        } else {
            // 类型不匹配，尝试转换
            console.warn(`[规范化] 字段 '${key}' 类型不匹配: 期望 ${expectedType}，实际 ${actualType}`);

            switch (expectedType) {
                case 'string':
                    if (actualType === 'array') {
                        normalized[key] = (value as any[]).join(' ');
                    } else if (actualType === 'object') {
                        normalized[key] = JSON.stringify(value);
                    } else {
                        normalized[key] = String(value);
                    }
                    break;
                case 'array':
                    if (actualType === 'string') {
                        normalized[key] = (value as string).split(' ').filter(Boolean);
                    } else {
                        normalized[key] = [];
                    }
                    break;
                case 'object':
                    if (actualType === 'string') {
                        try {
                            normalized[key] = JSON.parse(value);
                        } catch {
                            normalized[key] = {};
                        }
                    } else {
                        normalized[key] = value;
                    }
                    break;
                default:
                    normalized[key] = value;
            }

            console.log(`[规范化] 转换后的值: ${JSON.stringify(normalized[key])}`);
        }
    }

    return normalized as T;
}

/**
 * 创建工具调用链
 * 用于模拟多轮工具调用场景
 * 
 * @param initialMessages - 初始消息
 * @param toolSteps - 工具调用步骤
 * @returns 完整的消息链
 */
export function createToolCallChain(
    initialMessages: RawMessage[],
    toolSteps: Array<{
        toolName: string;
        args: Record<string, any>;
        result: any;
        response?: string;
    }>
): CoreMessage[] {
    const chain: CoreMessage[] = [];

    // 添加初始消息
    chain.push(...formatMessages(initialMessages));

    // 添加工具调用步骤
    for (const step of toolSteps) {
        // 助手的消息（包含工具调用）
        const assistantMsg: RawMessage = {
            role: 'assistant',
            parts: [
                { type: 'text', text: step.response || `正在调用 ${step.toolName}...` },
                {
                    type: 'tool-call',
                    toolCallId: `call_${Date.now()}_${Math.random()}`,
                    toolName: step.toolName,
                    args: step.args,
                },
            ],
        };
        chain.push(...formatMessages([assistantMsg]));

        // 工具结果消息
        const toolResultMsg: RawMessage = {
            role: 'tool',
            name: step.toolName,
            content: typeof step.result === 'string'
                ? step.result
                : JSON.stringify(step.result),
        };
        chain.push(...formatMessages([toolResultMsg]));
    }

    return chain;
}

/**
 * 验证消息格式是否符合 AI SDK 要求
 * 
 * @param messages - 要验证的消息
 * @returns 验证结果
 */
export function validateMessageFormat(messages: any[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: string;
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必需是数组
    if (!Array.isArray(messages)) {
        errors.push('消息必须是数组');
        return { isValid: false, errors, warnings, summary: '格式错误' };
    }

    // 检查每条消息
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // 检查角色
        if (!msg.role || typeof msg.role !== 'string') {
            errors.push(`消息 ${i}: 缺少必需的角色字段 'role'`);
        } else {
            const validRoles = ['user', 'assistant', 'system', 'tool', 'function', 'data', 'tool-result'];
            if (!validRoles.includes(msg.role)) {
                warnings.push(`消息 ${i}: 角色 '${msg.role}' 可能不被所有模型支持`);
            }
        }

        // 检查内容或 parts
        const hasContent = 'content' in msg && msg.content !== undefined;
        const hasParts = 'parts' in msg && Array.isArray(msg.parts) && msg.parts.length > 0;

        if (!hasContent && !hasParts) {
            if (msg.role === 'system') {
                // 系统消息允许没有内容
            } else {
                warnings.push(`消息 ${i}: 缺少 'content' 或 'parts' 字段`);
            }
        }

        // 检查工具消息
        if (msg.role === 'tool') {
            if (!msg.name && !msg.tool_name) {
                warnings.push(`消息 ${i}: 工具消息缺少工具名称`);
            }
        }
    }

    // 检查消息顺序
    for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i];
        const next = messages[i + 1];

        // tool 结果后应该是 assistant
        if (current.role === 'tool' && next.role === 'tool') {
            warnings.push(`消息 ${i} 和 ${i + 1}: 连续的工具结果可能需要 assistant 中间消息`);
        }

        // tool 后不能直接是 user
        if (current.role === 'tool' && next.role === 'user') {
            // 这个组合在多轮对话中是有效的
        }
    }

    const summary = errors.length === 0
        ? (warnings.length === 0 ? '格式正确' : '格式基本正确，有警告')
        : '格式错误';

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary,
    };
}

/**
 * 打印消息格式验证结果
 * 
 * @param messages - 消息数组
 * @param title - 标题
 */
export function printMessageValidation(messages: any[], title: string = '消息格式验证'): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(50)}`);

    const validation = validateMessageFormat(messages);
    
    console.log(`\n验证结果: ${validation.isValid ? '✓ 通过' : '✗ 失败'}`);
    console.log(`摘要: ${validation.summary}`);
    console.log(`消息数量: ${messages.length}`);

    if (validation.errors.length > 0) {
        console.log(`\n错误 (${validation.errors.length}):`);
        validation.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (validation.warnings.length > 0) {
        console.log(`\n警告 (${validation.warnings.length}):`);
        validation.warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    console.log('\n消息详情:');
    messages.forEach((msg, i) => {
        const contentPreview = msg.content
            ? (typeof msg.content === 'string'
                ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
                : '[对象]')
            : '[无]';
        console.log(`  [${i}] ${msg.role}: ${contentPreview}`);
    });
}

/**
 * 深度转换消息格式
 * 处理嵌套的工具调用和结果
 * 
 * @param messages - 原始消息
 * @returns 深度转换后的消息
 */
export function deepConvertMessages(messages: any[]): CoreMessage[] {
    return messages.map(msg => {
        const converted: any = { role: msg.role };

        // 递归处理嵌套结构
        function convertValue(value: any): any {
            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value === 'string') {
                return value;
            }

            if (Array.isArray(value)) {
                return value.map(convertValue);
            }

            if (typeof value === 'object') {
                const convertedObj: any = {};
                for (const [key, val] of Object.entries(value)) {
                    // 处理特殊字段名
                    const newKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    convertedObj[newKey] = convertValue(val);
                }
                return convertedObj;
            }

            return value;
        }

        // 转换 content
        if (msg.content !== undefined) {
            converted.content = convertValue(msg.content);
        }

        // 转换 parts
        if (msg.parts) {
            converted.parts = convertValue(msg.parts);
        }

        return converted;
    });
}
