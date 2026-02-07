/**
 * 基础测试场景
 * 包含各种消息格式和工具调用场景的测试用例
 */

import { CoreMessage } from 'ai';
import { z } from 'zod';
import { TypeChecker } from '../utils/type-checker';
import { SchemaValidator } from '../utils/schema-validator';
import { MessageFormatter, formatMessages } from '../utils/message-formatter';

/**
 * 工具参数 Schema 定义
 */
export const toolSchemas = {
    executeBash: z.object({
        command: z.string().describe('要执行的 bash 命令'),
    }),
    
    readFile: z.object({
        path: z.string().describe('要读取的文件路径'),
    }),
    
    writeFile: z.object({
        path: z.string().describe('文件路径'),
        content: z.string().describe('文件内容'),
    }),
    
    listFiles: z.object({
        path: z.string().optional().describe('要列出的目录路径'),
    }),
};

/**
 * 测试场景配置接口
 */
interface TestScenario {
    name: string;
    description: string;
    messages: Array<{
        role: string;
        content?: string;
        parts?: Array<{
            type: string;
            text?: string;
            toolCallId?: string;
            toolName?: string;
            result?: any;
        }>;
        name?: string;
    }>;
    expectedToolCall?: {
        toolName: string;
        args: Record<string, any>;
    };
    validateMessage?: boolean;
    validateArgs?: {
        toolName: string;
        args: Record<string, any>;
        shouldPass: boolean;
    };
}

/**
 * 所有测试场景集合
 */
export const testScenarios: TestScenario[] = [
    {
        name: '场景 1: 基础用户消息',
        description: '最简单的用户消息，不涉及工具调用',
        messages: [
            { role: 'user', content: '你好，请帮我一个忙' }
        ],
        validateMessage: true,
    },
    
    {
        name: '场景 2: 单轮工具调用 - listFiles',
        description: '用户请求列出文件，触发了 listFiles 工具',
        messages: [
            { role: 'user', content: '列出当前目录的文件' }
        ],
        expectedToolCall: {
            toolName: 'listFiles',
            args: { path: '.' }
        },
        validateMessage: true,
        validateArgs: {
            toolName: 'listFiles',
            args: { path: '.' },
            shouldPass: true,
        },
    },
    
    {
        name: '场景 3: 单轮工具调用 - executeBash',
        description: '用户请求执行命令，触发了 executeBash 工具',
        messages: [
            { role: 'user', content: '执行 ls -la 命令' }
        ],
        expectedToolCall: {
            toolName: 'executeBash',
            args: { command: 'ls -la' }
        },
        validateArgs: {
            toolName: 'executeBash',
            args: { command: 'ls -la' },
            shouldPass: true,
        },
    },
    
    {
        name: '场景 4: 多轮对话 - 工具调用后用户追问',
        description: '列出文件后，用户请求读取其中一个文件',
        messages: [
            { role: 'user', content: '列出文件' },
            { 
                role: 'assistant', 
                parts: [
                    { type: 'text', text: '当前目录有以下文件:' },
                    { type: 'tool-call', toolCallId: 'call_1', toolName: 'listFiles', args: {} },
                ]
            },
            { 
                role: 'tool', 
                name: 'listFiles',
                content: JSON.stringify({ files: ['index.ts', 'package.json', 'README.md'] })
            },
            { role: 'user', content: '现在读取 index.ts 文件' }
        ],
        expectedToolCall: {
            toolName: 'readFile',
            args: { path: 'index.ts' }
        },
        validateArgs: {
            toolName: 'readFile',
            args: { path: 'index.ts' },
            shouldPass: true,
        },
    },
    
    {
        name: '场景 5: 嵌套参数测试 - executeBash 接收数组',
        description: '测试当 command 参数是数组时的情况（这是常见错误场景）',
        messages: [
            { role: 'user', content: '运行 npm install' }
        ],
        validateArgs: {
            toolName: 'executeBash',
            args: { command: ['npm', 'install'] },  // 错误格式：数组而非字符串
            shouldPass: false,
        },
    },
    
    {
        name: '场景 6: 嵌套参数测试 - 空参数',
        description: '测试必需参数缺失的情况',
        messages: [
            { role: 'user', content: '读取文件' }
        ],
        validateArgs: {
            toolName: 'readFile',
            args: {},  // 错误格式：缺少必需的 path 参数
            shouldPass: false,
        },
    },
    
    {
        name: '场景 7: 嵌套参数测试 - readFile 接收对象',
        description: '测试当 readFile 的参数是嵌套对象时的情况',
        messages: [
            { role: 'user', content: '读取某个文件' }
        ],
        validateArgs: {
            toolName: 'readFile',
            args: { path: { absolute: '/test/file.ts' } },  // 错误格式：对象而非字符串
            shouldPass: false,
        },
    },
    
    {
        name: '场景 8: 工具调用链 - writeFile 后执行',
        description: '写入文件后立即执行该文件',
        messages: [
            { role: 'user', content: '创建一个 Python 脚本并运行它' }
        ],
        expectedToolCall: {
            toolName: 'writeFile',
            args: { 
                path: 'script.py',
                content: 'print("Hello World")'
            }
        },
    },
    
    {
        name: '场景 9: Parts 格式 - 混合文本和工具调用',
        description: '助手消息包含文本和工具调用混合',
        messages: [
            { 
                role: 'assistant',
                parts: [
                    { type: 'text', text: '我来帮你列出文件。' },
                    { type: 'text', text: '正在执行...' },
                    { type: 'tool-call', toolCallId: 'call_1', toolName: 'listFiles', args: {} },
                ]
            },
            { 
                role: 'tool',
                name: 'listFiles',
                content: JSON.stringify({ files: ['a.ts', 'b.ts', 'c.ts'] })
            },
            {
                role: 'assistant',
                parts: [
                    { type: 'text', text: '文件列表已获取。' },
                    { type: 'text', text: '你想让我读取哪个文件？' }
                ]
            }
        ],
        validateMessage: true,
    },
    
    {
        name: '场景 10: 错误的工具调用格式',
        description: '测试各种错误格式的工具调用',
        messages: [
            { role: 'user', content: '执行命令' }
        ],
        validateArgs: {
            toolName: 'executeBash',
            args: { command: 123 },  // 错误格式：数字而非字符串
            shouldPass: false,
        },
    },
];

/**
 * 运行单个测试场景
 * 
 * @param scenario - 测试场景
 * @param verbose - 是否输出详细信息
 * @returns 测试结果
 */
export async function runScenario(scenario: TestScenario, verbose: boolean = true): Promise<{
    name: string;
    passed: boolean;
    messageValidation?: {
        result: ReturnType<typeof MessageFormatter.validateMessageFormat>;
        formattedMessages: ReturnType<typeof formatMessages>;
    };
    argsValidation?: {
        schema: z.ZodSchema;
        args: Record<string, any>;
        expectedPass: boolean;
        result: ReturnType<typeof SchemaValidator.validateObject>;
    };
    error?: string;
}> {
    if (verbose) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`测试场景: ${scenario.name}`);
        console.log(`描述: ${scenario.description}`);
        console.log('='.repeat(60));
    }

    try {
        // 1. 验证消息格式
        if (scenario.validateMessage) {
            const rawMessages = scenario.messages as any[];
            
            if (verbose) {
                console.log('\n[步骤 1] 原始消息:');
                console.log(JSON.stringify(rawMessages, null, 2));
            }

            // 使用 MessageFormatter 验证
            const validation = MessageFormatter.validateMessageFormat(rawMessages);
            
            if (verbose) {
                console.log('\n[步骤 2] 消息格式验证:');
                console.log(`  - 有效: ${validation.isValid}`);
                console.log(`  - 摘要: ${validation.summary}`);
                
                if (validation.errors.length > 0) {
                    console.log('  - 错误:');
                    validation.errors.forEach(e => console.log(`    * ${e}`));
                }
                if (validation.warnings.length > 0) {
                    console.log('  - 警告:');
                    validation.warnings.forEach(w => console.log(`    * ${w}`));
                }
            }

            // 格式化消息
            const formattedMessages = formatMessages(rawMessages);
            
            if (verbose) {
                console.log('\n[步骤 3] 格式化后的消息:');
                console.log(JSON.stringify(formattedMessages, null, 2));
            }

            // 类型检查
            const typeResult = TypeChecker.validateMessageTypes(formattedMessages as CoreMessage[]);
            
            if (verbose) {
                TypeChecker.formatValidationResult(typeResult, '类型检查结果');
            }
        }

        // 2. 验证工具参数
        if (scenario.validateArgs) {
            const { toolName, args, shouldPass } = scenario.validateArgs;
            const schema = toolSchemas[toolName as keyof typeof toolSchemas];
            
            if (!schema) {
                throw new Error(`未找到工具 Schema: ${toolName}`);
            }

            if (verbose) {
                console.log('\n[步骤 4] 工具参数验证:');
                console.log(`  - 工具名: ${toolName}`);
                console.log(`  - 输入参数: ${JSON.stringify(args)}`);
                console.log(`  - 期望通过: ${shouldPass}`);
            }

            const result = SchemaValidator.validateObject(args, schema);
            
            if (verbose) {
                console.log(`\n${SchemaValidator.formatValidationResult(result)}`);
                
                if (!result.isValid) {
                    console.log('\n[步骤 5] 错误分析:');
                    result.fieldErrors.forEach(err => {
                        console.log(`  - 字段: ${err.field}`);
                        console.log(`    期望: ${err.expected}`);
                        console.log(`    实际: ${err.actual}`);
                        console.log(`    消息: ${err.message}`);
                    });
                }
            }

            const passed = result.isValid === shouldPass;
            
            if (!passed) {
                if (verbose) {
                    console.log(`\n⚠️  警告: 预期 ${shouldPass ? '通过' : '失败'}，实际 ${result.isValid ? '通过' : '失败'}`);
                }
            }

            return {
                name: scenario.name,
                passed,
                argsValidation: {
                    schema,
                    args,
                    expectedPass: shouldPass,
                    result,
                },
            };
        }

        return {
            name: scenario.name,
            passed: true,
        };

    } catch (error: any) {
        if (verbose) {
            console.error(`\n❌ 测试执行失败: ${error.message}`);
        }
        return {
            name: scenario.name,
            passed: false,
            error: error.message,
        };
    }
}

/**
 * 运行所有测试场景
 * 
 * @param scenarios - 测试场景数组
 * @param verbose - 是否输出详细信息
 * @returns 测试汇总结果
 */
export async function runAllScenarios(
    scenarios: TestScenario[] = testScenarios,
    verbose: boolean = true
): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: Array<{
        name: string;
        passed: boolean;
        error?: string;
    }>;
}> {
    if (verbose) {
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║          AI SDK 工具调用测试套件 v1.0                        ║');
        console.log('║                                                              ║');
        console.log(`║  测试场景数量: ${scenarios.length}                                        ║`);
        console.log('╚══════════════════════════════════════════════════════════════╝');
    }

    const results: Array<{
        name: string;
        passed: boolean;
        error?: string;
    }> = [];

    for (const scenario of scenarios) {
        const result = await runScenario(scenario, verbose);
        results.push({
            name: result.name,
            passed: result.passed,
            error: result.error,
        });
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    if (verbose) {
        console.log('\n' + '='.repeat(60));
        console.log('测试结果汇总');
        console.log('='.repeat(60));
        console.log(`\n总测试数: ${results.length}`);
        console.log(`✓ 通过: ${passed}`);
        console.log(`✗ 失败: ${failed}`);
        
        if (failed > 0) {
            console.log('\n失败的测试:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}`);
                if (r.error) {
                    console.log(`    错误: ${r.error}`);
                }
            });
        }
    }

    return {
        total: results.length,
        passed,
        failed,
        results,
    };
}

/**
 * 创建自定义测试场景
 * 
 * @param config - 场景配置
 * @returns 测试场景对象
 */
export function createCustomScenario(config: Partial<TestScenario>): TestScenario {
    return {
        name: config.name || '自定义场景',
        description: config.description || '用户自定义测试场景',
        messages: config.messages || [],
        ...config,
    } as TestScenario;
}

/**
 * 快速测试参数类型
 * 
 * @param toolName - 工具名称
 * @param args - 参数对象
 * @returns 验证结果
 */
export function quickTestArgs(
    toolName: keyof typeof toolSchemas,
    args: Record<string, any>
): {
    isValid: boolean;
    errors: string[];
    suggestion?: string;
} {
    const schema = toolSchemas[toolName];
    const result = SchemaValidator.validateObject(args, schema);

    if (result.isValid) {
        return { isValid: true, errors: [] };
    }

    const errors = result.fieldErrors.map(err => `${err.field}: ${err.message}`);
    const suggestions = result.fieldErrors
        .filter(err => err.expected && err.actual)
        .map(err => SchemaValidator.getTypeConversionSuggestion(err.actual, err.expected));

    return {
        isValid: false,
        errors,
        suggestion: suggestions[0],
    };
}
