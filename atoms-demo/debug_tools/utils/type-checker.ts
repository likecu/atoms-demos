/**
 * 类型检查工具
 * 用于验证消息和参数的类型正确性
 */

import { CoreMessage } from 'ai';

/**
 * 消息类型验证结果接口
 */
interface MessageValidationResult {
    isValid: boolean;
    messageCount: number;
    errors: string[];
    warnings: string[];
    details: MessageTypeDetail[];
}

/**
 * 单个消息类型详情接口
 */
interface MessageTypeDetail {
    index: number;
    role: string;
    hasContent: boolean;
    hasParts: boolean;
    contentType: string | null;
    partsTypes: string[];
}

/**
 * 验证消息数组的类型正确性
 * 
 * @param messages - 消息数组
 * @returns 验证结果对象
 * 
 * @throws 当消息格式存在严重问题时记录错误
 */
export function validateMessageTypes(messages: CoreMessage[]): MessageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: MessageTypeDetail[] = [];

    const validRoles = ['user', 'assistant', 'system', 'tool', 'function', 'data', 'tool-result'];

    messages.forEach((msg, index) => {
        const detail: MessageTypeDetail = {
            index,
            role: typeof msg.role === 'string' ? msg.role : 'unknown',
            hasContent: false,
            hasParts: false,
            contentType: null,
            partsTypes: [],
        };

        // 检查角色类型
        if (typeof msg.role !== 'string') {
            errors.push(`消息 ${index}: 角色类型应为字符串，实际为 ${typeof msg.role}`);
        } else if (!validRoles.includes(msg.role)) {
            warnings.push(`消息 ${index}: 角色 '${msg.role}' 可能不被支持`);
        }

        // 检查内容字段
        if ('content' in msg && msg.content !== undefined && msg.content !== null) {
            detail.hasContent = true;
            detail.contentType = typeof msg.content;

            if (typeof msg.content !== 'string') {
                // AI SDK 允许内容为 null 或 ToolCall/ToolResult
                if (typeof msg.content === 'object' && !Array.isArray(msg.content)) {
                    detail.contentType = 'object';
                    // 检查是否是工具调用
                    if ('toolCallId' in msg.content) {
                        detail.contentType = 'tool-call';
                        warnings.push(`消息 ${index}: 使用了旧版工具调用格式，建议使用 parts`);
                    }
                } else if (Array.isArray(msg.content)) {
                    detail.contentType = 'array';
                    // 检查是否是 parts 数组
                    const hasPartsStructure = msg.content.every(part => 
                        typeof part === 'object' && 
                        part !== null && 
                        'type' in part
                    );
                    if (hasPartsStructure) {
                        detail.contentType = 'parts-array';
                        detail.hasParts = true;
                        detail.partsTypes = msg.content.map((part: any) => part.type);
                    }
                }
            }
        } else if ('parts' in msg && Array.isArray(msg.parts)) {
            detail.hasParts = true;
            detail.partsTypes = msg.parts.map(part => part.type);
        }

        details.push(detail);
    });

    // 检查消息顺序
    let lastRole = '';
    for (const msg of messages) {
        const role = msg.role;
        if (lastRole === 'assistant' && role === 'assistant') {
            warnings.push('连续两个 assistant 消息可能表示缺少工具结果');
        }
        if (lastRole === 'tool' && role === 'user') {
            // 用户可以在工具后发送消息，这是正常的
        }
        lastRole = role;
    }

    return {
        isValid: errors.length === 0,
        messageCount: messages.length,
        errors,
        warnings,
        details,
    };
}

/**
 * 验证单个参数的类型
 * 
 * @param paramName - 参数名称
 * @param value - 参数值
 * @param expectedType - 期望的类型
 * @returns 验证结果
 */
export function validateParameterType(
    paramName: string,
    value: any,
    expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'undefined'
): {
    isValid: boolean;
    actualType: string;
    expectedType: string;
    message: string;
} {
    const actualType = value === undefined ? 'undefined' : Array.isArray(value) ? 'array' : typeof value;
    const isValid = actualType === expectedType || (expectedType === 'undefined' && value === undefined);

    return {
        isValid,
        actualType,
        expectedType,
        message: isValid
            ? `参数 '${paramName}' 类型正确`
            : `参数 '${paramName}' 类型错误: 期望 ${expectedType}，实际为 ${actualType}`,
    };
}

/**
 * 递归验证对象的所有字段类型
 * 
 * @param obj - 要验证的对象
 * @param schema - 期望的类型 schema
 * @returns 验证结果
 */
export function validateObjectTypes(
    obj: Record<string, any>,
    schema: Record<string, { type: string; required: boolean }>
): {
    isValid: boolean;
    fieldErrors: Array<{ field: string; expected: string; actual: string }>;
    fieldWarnings: Array<{ field: string; message: string }>;
} {
    const fieldErrors: Array<{ field: string; expected: string; actual: string }> = [];
    const fieldWarnings: Array<{ field: string; message: string }> = [];

    for (const [field, fieldSchema] of Object.entries(schema)) {
        const value = obj[field];
        const actualType = value === undefined ? 'undefined' : Array.isArray(value) ? 'array' : typeof value;

        // 检查必需字段
        if (fieldSchema.required && value === undefined) {
            fieldErrors.push({
                field,
                expected: fieldSchema.type,
                actual: 'undefined',
            });
            continue;
        }

        // 如果值存在，验证类型
        if (value !== undefined) {
            const expectedType = fieldSchema.type;
            
            // 处理联合类型
            if (expectedType.includes('|')) {
                const allowedTypes = expectedType.split('|').map(t => t.trim());
                if (!allowedTypes.includes(actualType)) {
                    fieldErrors.push({
                        field,
                        expected: expectedType,
                        actual: actualType,
                    });
                }
            } else if (actualType !== expectedType) {
                fieldErrors.push({
                    field,
                    expected: expectedType,
                    actual: actualType,
                });
            }
        }
    }

    return {
        isValid: fieldErrors.length === 0,
        fieldErrors,
        fieldWarnings,
    };
}

/**
 * 深度比较两个对象的类型结构
 * 
 * @param actual - 实际对象
 * @param expected - 期望对象
 * @param path - 当前路径（用于递归）
 * @returns 比较结果
 */
export function deepCompareTypes(
    actual: any,
    expected: any,
    path: string = 'root'
): {
    isMatch: boolean;
    differences: Array<{ path: string; expected: string; actual: string }>;
} {
    const differences: Array<{ path: string; expected: string; actual: string }> = [];

    const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
    const expectedType = expected === null ? 'null' : Array.isArray(expected) ? 'array' : typeof expected;

    if (actualType !== expectedType) {
        differences.push({
            path,
            expected: expectedType,
            actual: actualType,
        });
        return { isMatch: false, differences };
    }

    if (actualType === 'object' && expectedType === 'object') {
        const actualKeys = Object.keys(actual);
        const expectedKeys = Object.keys(expected);

        // 检查缺少的字段
        for (const key of expectedKeys) {
            if (!actualKeys.includes(key)) {
                differences.push({
                    path: `${path}.${key}`,
                    expected: typeof (expected as any)[key],
                    actual: 'undefined',
                });
            }
        }

        // 递归比较
        for (const key of actualKeys) {
            const result = deepCompareTypes(
                actual[key],
                (expected as any)[key],
                `${path}.${key}`
            );
            differences.push(...result.differences);
        }
    }

    return {
        isMatch: differences.length === 0,
        differences,
    };
}

/**
 * 格式化类型验证结果
 * 
 * @param result - 验证结果
 * @param title - 标题
 */
export function formatValidationResult(result: MessageValidationResult, title: string = '类型验证结果'): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(50)}`);

    console.log(`\n总体状态: ${result.isValid ? '✓ 通过' : '✗ 失败'}`);
    console.log(`消息数量: ${result.messageCount}`);

    if (result.errors.length > 0) {
        console.log(`\n错误 (${result.errors.length}):`);
        result.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
        console.log(`\n警告 (${result.warnings.length}):`);
        result.warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    console.log('\n详细消息类型:');
    console.log('-'.repeat(50));
    
    result.details.forEach(detail => {
        const status = detail.hasContent || detail.hasParts ? '✓' : '○';
        console.log(`  [${status}] 消息 ${detail.index}: ${detail.role}`);
        
        if (detail.hasContent) {
            console.log(`      内容类型: ${detail.contentType}`);
        }
        if (detail.hasParts) {
            console.log(`      Parts: [${detail.partsTypes.join(', ')}]`);
        }
    });
}
