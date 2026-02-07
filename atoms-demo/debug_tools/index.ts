/**
 * 调试工具主入口
 * 用于验证 AI SDK 工具调用流程
 */

import { generateText, CoreMessage, ToolCall, ToolResult } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

// 导入自定义工具
import { TypeChecker } from './utils/type-checker';
import { SchemaValidator } from './utils/schema-validator';
import { MessageFormatter } from './utils/message-formatter';

// 环境配置
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
            process.env[key] = value;
        }
    });
}

// 工具 Schema 定义
const executeBashSchema = z.object({
    command: z.string().describe('要执行的 bash 命令'),
});

const readFileSchema = z.object({
    path: z.string().describe('要读取的文件路径'),
});

const writeFileSchema = z.object({
    path: z.string().describe('文件路径'),
    content: z.string().describe('文件内容'),
});

const listFilesSchema = z.object({
    path: z.string().optional().describe('要列出的目录路径'),
});

// 测试场景
const testScenarios = [
    {
        name: '基础消息测试',
        messages: [
            { role: 'user', content: '你好，请列出当前目录的文件' }
        ],
        expectedToolCalls: false,
    },
    {
        name: '工具调用测试 - listFiles',
        messages: [
            { role: 'user', content: '列出当前目录的文件' }
        ],
        expectedToolCalls: true,
        expectedToolName: 'listFiles',
    },
    {
        name: '工具调用测试 - executeBash',
        messages: [
            { role: 'user', content: '执行 ls -la 命令' }
        ],
        expectedToolCalls: true,
        expectedToolName: 'executeBash',
    },
    {
        name: '多轮对话测试',
        messages: [
            { role: 'user', content: '列出文件' },
            { role: 'assistant', content: '我将执行 listFiles 工具' },
            { role: 'tool', name: 'listFiles', content: '{"files": ["index.ts", "package.json"]}' },
            { role: 'user', content: '现在读取 index.ts' }
        ],
        expectedToolCalls: true,
        expectedToolName: 'readFile',
    },
];

/**
 * 打印分隔线
 */
function printDivider(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
}

/**
 * 打印 JSON 格式化结果
 */
function printJSON(label: string, data: any) {
    console.log(`${label}:`);
    console.log(JSON.stringify(data, null, 2));
}

/**
 * 运行测试场景
 */
async function runTestScenario(scenario: typeof testScenarios[0]) {
    printDivider(`测试场景: ${scenario.name}`);

    // 格式化消息
    const formattedMessages = MessageFormatter.formatMessages(scenario.messages as any);
    console.log('\n[步骤 1] 格式化后的消息:');
    printJSON('formattedMessages', formattedMessages);

    // 验证消息类型
    const messageValidation = TypeChecker.validateMessageTypes(formattedMessages);
    console.log('\n[步骤 2] 消息类型验证:');
    console.log(`  - 是否有效: ${messageValidation.isValid}`);
    console.log(`  - 消息数量: ${messageValidation.messageCount}`);
    if (!messageValidation.isValid) {
        console.log(`  - 错误信息: ${messageValidation.errors.join(', ')}`);
    }

    // 验证工具参数
    const toolSchemas = {
        executeBash: executeBashSchema,
        readFile: readFileSchema,
        writeFile: writeFileSchema,
        listFiles: listFilesSchema,
    };

    console.log('\n[步骤 3] 工具 Schema 验证:');
    for (const [toolName, schema] of Object.entries(toolSchemas)) {
        const validation = SchemaValidator.validateSchema(schema);
        console.log(`  - ${toolName}: ${validation.isValid ? '✓' : '✗'}`);
        if (!validation.isValid) {
            console.log(`    错误: ${validation.errors.join(', ')}`);
        }
    }

    // 尝试生成文本（使用模拟模式）
    try {
        console.log('\n[步骤 4] 尝试调用 AI 模型...');

        // 跳过实际的 API 调用，只验证参数格式
        const mockResult = {
            success: true,
            simulatedToolCalls: scenario.expectedToolCalls ? [
                {
                    toolCallId: 'mock_call_1',
                    toolName: scenario.expectedToolName,
                    args: scenario.expectedToolName === 'listFiles'
                        ? { path: '.' }
                        : { command: 'ls -la' },
                }
            ] : [],
        };

        console.log(`  - 模拟调用成功: ${mockResult.success}`);
        if (mockResult.simulatedToolCalls.length > 0) {
            console.log('  - 模拟的工具调用:');
            mockResult.simulatedToolCalls.forEach((call, index) => {
                console.log(`    [${index + 1}] ${call.toolName}`);
                console.log(`        toolCallId: ${call.toolCallId}`);
                console.log(`        args: ${JSON.stringify(call.args)}`);

                // 验证参数类型
                const schema = toolSchemas[call.toolName as keyof typeof toolSchemas];
                if (schema) {
                    const argsValidation = SchemaValidator.validateObject(call.args, schema);
                    console.log(`        参数验证: ${argsValidation.isValid ? '✓' : '✗'}`);
                    if (!argsValidation.isValid) {
                        console.log(`        参数错误: ${argsValidation.errors.join(', ')}`);
                        console.log(`        期望类型: ${argsValidation.expectedType}`);
                        console.log(`        实际类型: ${argsValidation.actualType}`);
                    }
                }
            });
        }

        return {
            scenario: scenario.name,
            success: true,
            messageValidation,
            toolCalls: mockResult.simulatedToolCalls,
        };

    } catch (error: any) {
        console.error(`  - 调用失败: ${error.message}`);
        return {
            scenario: scenario.name,
            success: false,
            error: error.message,
            messageValidation,
        };
    }
}

/**
 * 验证工具调用参数格式
 */
async function validateToolCallFormat() {
    printDivider('验证工具调用参数格式');

    // 测试用例：模拟 AI 返回的工具调用参数
    const testCases = [
        {
            name: '字符串参数 (正确)',
            args: { command: 'ls -la' },
            schema: executeBashSchema,
            expectedValid: true,
        },
        {
            name: '数组参数 (错误 - 模拟你的情况)',
            args: { command: ['ls', '-la'] },  // 注意：这是数组而非字符串
            schema: executeBashSchema,
            expectedValid: false,
        },
        {
            name: '嵌套对象参数 (错误)',
            args: { command: { cmd: 'ls', flags: ['-la'] } },
            schema: executeBashSchema,
            expectedValid: false,
        },
        {
            name: '空参数 (错误)',
            args: {},
            schema: executeBashSchema,
            expectedValid: false,
        },
        {
            name: '正确格式的 listFiles 参数',
            args: { path: '.' },
            schema: listFilesSchema,
            expectedValid: true,
        },
        {
            name: '可选参数为空 (正确)',
            args: {},
            schema: listFilesSchema,
            expectedValid: true,
        },
    ];

    console.log('\n测试用例验证结果:\n');

    for (const testCase of testCases) {
        const result = SchemaValidator.validateObject(testCase.args, testCase.schema);

        const status = result.isValid === testCase.expectedValid ? '✓' : '✗';
        console.log(`${status} ${testCase.name}`);
        console.log(`   输入参数: ${JSON.stringify(testCase.args)}`);
        console.log(`   验证结果: ${result.isValid ? '通过' : '失败'}`);

        if (!result.isValid) {
            console.log(`   错误信息: ${result.errors.join('; ')}`);
            if (result.expectedType) {
                console.log(`   期望类型: ${result.expectedType}`);
            }
            if (result.actualType) {
                console.log(`   实际类型: ${result.actualType}`);
            }
        }
        console.log('');
    }
}

/**
 * 分析错误原因
 */
function analyzeError(error: any) {
    printDivider('错误分析');

    if (error.errors && Array.isArray(error.errors)) {
        console.log('检测到 Zod 验证错误:');
        console.log(JSON.stringify(error.errors, null, 2));

        error.errors.forEach((err: any, index: number) => {
            console.log(`\n[错误 ${index + 1}]`);
            console.log(`  - 路径: ${err.path ? err.path.join('.') : '根路径'}`);
            console.log(`  - 期望类型: ${err.expected}`);
            console.log(`  - 实际类型: ${err.code === 'invalid_type' ? err.received : 'N/A'}`);
            console.log(`  - 消息: ${err.message}`);
        });

        console.log('\n建议解决方案:');
        console.log('1. 检查 OpenRouter/Gemini 返回的工具调用参数格式');
        console.log('2. 确保 convertPartsToContent 函数正确处理工具调用消息');
        console.log('3. 在 tools.ts 中使用防御性编程处理参数类型');
        console.log('4. 添加参数类型转换逻辑');
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          AI SDK 工具调用调试工具 v1.0                         ║');
    console.log('║                                                              ║');
    console.log('║  目的: 诊断和修复 invalid_union 错误                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // 1. 验证工具调用参数格式
    await validateToolCallFormat();

    // 2. 运行测试场景
    printDivider('运行测试场景');

    const results: Array<{
        scenario: string;
        success: boolean;
        error?: string;
        messageValidation?: any;
        toolCalls?: any[];
    }> = [];

    for (const scenario of testScenarios) {
        const result = await runTestScenario(scenario);
        results.push(result);
        console.log('');
    }

    // 3. 汇总结果
    printDivider('测试结果汇总');

    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`总测试数: ${results.length}`);
    console.log(`通过: ${passedCount}`);
    console.log(`失败: ${failedCount}`);

    if (failedCount > 0) {
        console.log('\n失败的测试:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.scenario}: ${r.error || '未知错误'}`);
        });
    }

    // 4. 提供修复建议
    printDivider('修复建议');

    console.log(`
根据调试结果，以下是修复 invalid_union 错误的建议:

1. **参数类型转换**
   在 tools.ts 的 execute 函数中添加类型转换逻辑:
   \`\`\`typescript
   execute: async ({ command }: { command: string | any[] }) => {
       const cmdString = Array.isArray(command)
           ? command.join(' ')
           : command;
       // 使用 cmdString 执行命令
   }
   \`\`\`

2. **消息格式验证**
   在 convertPartsToContent 函数中添加工具消息验证:
   \`\`\`typescript
   function convertPartsToContent(messages) {
       return messages.map(msg => {
           if (msg.role === 'tool') {
               return {
                   role: 'tool',
                   content: typeof msg.content === 'string'
                       ? msg.content
                       : JSON.stringify(msg.content)
               };
           }
           // ... 其他处理
       });
   }
   \`\`\`

3. **Schema 调整**
   允许工具参数为数组或字符串:
   \`\`\`typescript
   const executeBashSchema = z.object({
       command: z.union([
           z.string(),
           z.array(z.string())
       ]).describe('命令字符串或命令数组'),
   });
   \`\`\`

4. **添加调试日志**
   在 route.ts 的 onStepFinish 回调中添加参数日志:
   \`\`\`typescript
   onStepFinish: (step) => {
       console.log('[Debug] Step:', JSON.stringify(step, null, 2));
       if (step.toolCalls) {
           step.toolCalls.forEach(tc => {
               console.log('[Debug] Tool call:', {
                   toolName: tc.toolName,
                   args: JSON.stringify(tc.args),
                   argsType: typeof tc.args?.command
               });
           });
       }
   }
   \`\`\`
`);
}

/**
 * 快速验证模式
 */
export async function quickValidate(args: any, schema: z.ZodSchema) {
    console.log('\n快速验证模式:');
    console.log(`输入参数: ${JSON.stringify(args)}`);
    console.log(`Schema: ${schema._def.typeName}`);

    try {
        const result = schema.parse(args);
        console.log('✓ 验证通过');
        return { success: true, data: result };
    } catch (error: any) {
        console.log('✗ 验证失败');
        analyzeError(error);
        return { success: false, error };
    }
}

// 运行主函数
main().catch(console.error);
