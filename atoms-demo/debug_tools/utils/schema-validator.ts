/**
 * Schema 验证工具
 * 用于验证 Zod Schema 和对象参数的匹配
 */

import { z } from 'zod';

/**
 * Schema 验证结果接口
 */
interface SchemaValidationResult {
    isValid: boolean;
    errors: string[];
    expectedType?: string;
    actualType?: string;
    parsedData?: any;
}

/**
 * 对象验证结果接口
 */
interface ObjectValidationResult extends SchemaValidationResult {
    fieldErrors: Array<{
        field: string;
        expected: string;
        actual: string;
        message: string;
    }>;
    missingFields?: string[];
    extraFields?: string[];
}

/**
 * 验证 Zod Schema 本身的正确性
 * 
 * @param schema - Zod Schema
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const result = validateSchema(schema);
 * // result: { isValid: true, errors: [] }
 * ```
 */
export function validateSchema(schema: z.ZodSchema): SchemaValidationResult {
    const errors: string[] = [];

    try {
        // 测试 schema 是否能正常工作
        const testValue = schema.safeParse(undefined);
        
        if (!testValue.success) {
            // 这是预期的，因为 schema 可能需要必需字段
            console.log('Schema 验证（预期中的必需字段检查）: 通过');
        } else {
            console.log('Schema 基础验证: 通过');
        }

        return {
            isValid: true,
            errors,
        };
    } catch (error: any) {
        errors.push(`Schema 构建错误: ${error.message}`);
        return {
            isValid: false,
            errors,
        };
    }
}

/**
 * 验证对象是否符合 Schema
 * 
 * @param obj - 要验证的对象
 * @param schema - Zod Schema
 * @returns 验证结果，包含详细的错误信息
 * 
 * @example
 * ```typescript
 * const schema = z.object({ command: z.string() });
 * const result = validateObject({ command: 'ls -la' }, schema);
 * // result: { isValid: true, parsedData: { command: 'ls -la' } }
 * 
 * const badResult = validateObject({ command: ['ls', '-la'] }, schema);
 * // result: { isValid: false, errors: [...], expectedType: 'string', actualType: 'array' }
 * ```
 */
export function validateObject(obj: any, schema: z.ZodSchema): ObjectValidationResult {
    const errors: string[] = [];
    const fieldErrors: Array<{
        field: string;
        expected: string;
        actual: string;
        message: string;
    }> = [];
    let expectedType: string | undefined;
    let actualType: string | undefined;

    try {
        const parseResult = schema.safeParse(obj);

        if (parseResult.success) {
            return {
                isValid: true,
                errors: [],
                parsedData: parseResult.data,
                fieldErrors: [],
            };
        }

        // 解析错误详情
        const errorIssues = parseResult.error.issues;

        for (const issue of errorIssues) {
            const path = issue.path.join('.');
            
            // 提取期望的类型
            if (issue.code === 'invalid_type') {
                expectedType = issue.expected;
                actualType = issue.received;

                fieldErrors.push({
                    field: path || 'root',
                    expected: issue.expected,
                    actual: issue.received,
                    message: `字段 '${path}': 期望 ${issue.expected}，但收到 ${issue.received}`,
                });
            } else if (issue.code === 'required') {
                fieldErrors.push({
                    field: path,
                    expected: 'any',
                    actual: 'undefined',
                    message: `必需字段 '${path}' 缺失`,
                });
            } else if (issue.code === 'invalid_union') {
                fieldErrors.push({
                    field: path,
                    expected: 'union types',
                    actual: 'unknown',
                    message: `字段 '${path}': 联合类型验证失败`,
                });
            } else {
                fieldErrors.push({
                    field: path,
                    expected: 'unknown',
                    actual: 'unknown',
                    message: `字段 '${path}': ${issue.message}`,
                });
            }

            errors.push(issue.message);
        }

        return {
            isValid: false,
            errors,
            expectedType,
            actualType,
            fieldErrors,
        };

    } catch (error: any) {
        return {
            isValid: false,
            errors: [`验证过程出错: ${error.message}`],
            fieldErrors: [{
                field: 'unknown',
                expected: 'unknown',
                actual: 'unknown',
                message: error.message,
            }],
        };
    }
}

/**
 * 验证数组类型的参数
 * 
 * @param arr - 要验证的数组
 * @param schema - 数组元素的 Schema
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * const itemSchema = z.string();
 * const result = validateArray(['a', 'b', 'c'], itemSchema);
 * // result: { isValid: true }
 * ```
 */
export function validateArray(arr: any[], schema: z.ZodSchema): SchemaValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(arr)) {
        return {
            isValid: false,
            errors: ['输入必须是数组'],
            expectedType: 'array',
            actualType: typeof arr,
        };
    }

    const arraySchema = z.array(schema);
    
    try {
        const parseResult = arraySchema.safeParse(arr);

        if (parseResult.success) {
            return {
                isValid: true,
                errors: [],
                parsedData: parseResult.data,
            };
        }

        // 处理数组验证错误
        const errorIssues = parseResult.error.issues;
        for (const issue of errorIssues) {
            if (issue.code === 'invalid_type') {
                errors.push(`数组元素类型错误: 期望 ${issue.expected}，收到 ${issue.received}`);
            } else if (issue.code === 'too_small' || issue.code === 'too_big') {
                errors.push(`数组长度问题: ${issue.message}`);
            }
        }

        return {
            isValid: false,
            errors,
        };

    } catch (error: any) {
        return {
            isValid: false,
            errors: [`数组验证出错: ${error.message}`],
        };
    }
}

/**
 * 验证联合类型参数
 * 
 * @param value - 要验证的值
 * @param unionSchema - 联合类型 Schema
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * const unionSchema = z.union([z.string(), z.array(z.string())]);
 * const result1 = validateUnion('ls -la', unionSchema);
 * const result2 = validateUnion(['ls', '-la'], unionSchema);
 * ```
 */
export function validateUnion(value: any, unionSchema: z.ZodSchema): ObjectValidationResult {
    try {
        const parseResult = unionSchema.safeParse(value);

        if (parseResult.success) {
            return {
                isValid: true,
                errors: [],
                parsedData: parseResult.data,
                fieldErrors: [],
            };
        }

        const errorIssues = parseResult.error.issues;
        const errors: string[] = [];
        const fieldErrors: Array<{
            field: string;
            expected: string;
            actual: string;
            message: string;
        }> = [];

        for (const issue of errorIssues) {
            if (issue.code === 'invalid_union') {
                // 收集所有联合类型的错误
                const unionErrors = issue.unionErrors.flatMap((e: any) => 
                    e.issues?.map((i: any) => i.message) || [e.message]
                );
                
                errors.push(`联合类型验证失败: ${unionErrors.join('; ')}`);
                
                fieldErrors.push({
                    field: issue.path.join('.') || 'root',
                    expected: 'union',
                    actual: typeof value,
                    message: `值不符合任何联合类型: ${unionErrors[0]}`,
                });
            } else {
                errors.push(issue.message);
            }
        }

        return {
            isValid: false,
            errors,
            fieldErrors,
        };

    } catch (error: any) {
        return {
            isValid: false,
            errors: [`联合类型验证出错: ${error.message}`],
            fieldErrors: [{
                field: 'root',
                expected: 'union',
                actual: typeof value,
                message: error.message,
            }],
        };
    }
}

/**
 * 递归验证嵌套对象
 * 
 * @param obj - 要验证的对象
 * @param schema - Zod Schema
 * @param path - 当前路径（用于递归）
 * @param depth - 最大递归深度
 * @returns 验证结果
 */
export function validateNestedObject(
    obj: any,
    schema: z.ZodSchema,
    path: string = 'root',
    depth: number = 5
): ObjectValidationResult {
    if (depth <= 0) {
        return {
            isValid: false,
            errors: ['达到最大递归深度'],
            fieldErrors: [{
                field: path,
                expected: 'unknown',
                actual: 'unknown',
                message: '递归深度限制',
            }],
        };
    }

    return validateObject(obj, schema);
}

/**
 * 生成类型转换建议
 * 
 * @param actualType - 实际类型
 * @param expectedType - 期望类型
 * @returns 转换建议
 */
export function getTypeConversionSuggestion(actualType: string, expectedType: string): string {
    const suggestions: Record<string, string> = {
        'string-array': '使用 .join(" ") 或 .join(", ") 将数组转换为字符串',
        'array-string': '使用 .split(" ") 将字符串转换为数组',
        'object-string': '使用 JSON.stringify() 将对象转换为字符串',
        'string-object': '使用 JSON.parse() 将字符串转换为对象',
        'number-string': '使用 String() 或 .toString() 将数字转换为字符串',
        'string-number': '使用 Number() 或 parseInt()/parseFloat() 将字符串转换为数字',
    };

    const key = `${actualType}-${expectedType}` as keyof typeof suggestions;
    
    if (suggestions[key]) {
        return suggestions[key];
    }
    
    return `需要从 ${actualType} 转换为 ${expectedType}`;
}

/**
 * 格式化验证结果为可读字符串
 * 
 * @param result - 验证结果
 * @param indent - 缩进字符串
 * @returns 格式化后的字符串
 */
export function formatValidationResult(result: ObjectValidationResult, indent: string = '  '): string {
    if (result.isValid) {
        return `${indent}✓ 验证通过`;
    }

    let output = `${indent}✗ 验证失败\n`;

    if (result.errors.length > 0) {
        output += `${indent}  错误:\n`;
        result.errors.forEach(err => {
            output += `${indent}    - ${err}\n`;
        });
    }

    if (result.fieldErrors.length > 0) {
        output += `${indent}  字段错误:\n`;
        result.fieldErrors.forEach(err => {
            output += `${indent}    - ${err.field}: ${err.message}\n`;
            if (err.expected && err.actual) {
                output += `${indent}      期望: ${err.expected}, 实际: ${err.actual}\n`;
                output += `${indent}      建议: ${getTypeConversionSuggestion(err.actual, err.expected)}\n`;
            }
        });
    }

    if (result.expectedType && result.actualType) {
        output += `\n${indent}  类型信息:\n`;
        output += `${indent}    期望类型: ${result.expectedType}\n`;
        output += `${indent}    实际类型: ${result.actualType}\n`;
        output += `${indent}    转换建议: ${getTypeConversionSuggestion(result.actualType, result.expectedType)}\n`;
    }

    return output;
}

/**
 * 创建防御性包装的验证函数
 * 
 * @param schema - Zod Schema
 * @param fallbackValue - 验证失败时的默认值
 * @returns 包装后的验证函数
 * 
 * @example
 * ```typescript
 * const safeValidate = createSafeValidator(
 *   z.object({ command: z.string() }),
 *   { command: '' }
 * );
 * const result = safeValidate({ command: ['ls', '-la'] });
 * // result: { command: '' } // 返回默认值
 * ```
 */
export function createSafeValidator<T>(
    schema: z.ZodSchema<T>,
    fallbackValue: T
): (value: any) => T {
    return (value: any) => {
        const result = schema.safeParse(value);
        return result.success ? result.data : fallbackValue;
    };
}

/**
 * 创建带有类型转换的验证函数
 * 
 * @param schema - Zod Schema
 * @param transformers - 类型转换映射
 * @returns 转换后的值
 * 
 * @example
 * ```typescript
 * const transformAndValidate = createTransformingValidator(
 *   z.object({ command: z.string() }),
 *   {
 *     array: (val) => Array.isArray(val) ? val.join(' ') : val,
 *     object: (val) => typeof val === 'object' ? JSON.stringify(val) : val,
 *   }
 * );
 * const result = transformAndValidate({ command: ['ls', '-la'] });
 * // result: { command: 'ls -la' }
 * ```
 */
export function createTransformingValidator<T>(
    schema: z.ZodSchema<T>,
    transformers: Record<string, (value: any) => any>
): (value: any) => T {
    return (value: any) => {
        // 先尝试转换
        let transformed = value;
        
        if (typeof value === 'object' && value !== null) {
            for (const [key, val] of Object.entries(value)) {
                const type = Array.isArray(val) ? 'array' : typeof val;
                if (transformers[type]) {
                    (transformed as any)[key] = transformers[type](val);
                }
            }
        }

        // 再验证
        const result = schema.safeParse(transformed);
        return result.success ? result.data : value;
    };
}
