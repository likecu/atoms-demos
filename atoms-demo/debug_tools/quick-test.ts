/**
 * 快速验证工具 - 专门用于诊断 invalid_union 错误
 */

import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
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

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          TypeScript 工具调用参数验证工具 v1.0               ║');
console.log('║                                                              ║');
console.log('║  目的: 诊断 "expected string, received array" 错误          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

// 当前项目的工具 Schema 定义（来自 tools.ts）
const executeBashSchema = z.object({
    command: z.string().describe('The bash command to execute'),
});

const readFileSchema = z.object({
    path: z.string().describe('The relative path to the file to read'),
});

const writeFileSchema = z.object({
    path: z.string().describe('The relative path to the file'),
    content: z.string().describe('The content to write to the file'),
});

const listFilesSchema = z.object({
    path: z.string().optional().describe('The directory to list'),
});

console.log('[' + '='.repeat(60) + ']');
console.log('  步骤 1: 验证 Schema 定义正确性');
console.log('[' + '='.repeat(60) + ']');

const schemas = {
    'executeBash (原始)': executeBashSchema,
    'readFile': readFileSchema,
    'writeFile': writeFileSchema,
    'listFiles': listFilesSchema,
};

for (const [name, schema] of Object.entries(schemas)) {
    try {
        const testResult = schema.safeParse(undefined);
        console.log(`✓ ${name}: Schema 定义有效`);
    } catch (error: any) {
        console.log(`✗ ${name}: Schema 定义错误 - ${error.message}`);
    }
}

console.log('\n[' + '='.repeat(60) + ']');
console.log('  步骤 2: 测试各种参数格式');
console.log('[' + '='.repeat(60) + '\n');

interface TestCase {
    name: string;
    tool: string;
    args: any;
    expected: 'pass' | 'fail';
}

const testCases: TestCase[] = [
    // 正确格式测试
    { name: 'executeBash - 字符串参数', tool: 'executeBash', args: { command: 'ls -la' }, expected: 'pass' },
    { name: 'readFile - 字符串路径', tool: 'readFile', args: { path: '/test/file.ts' }, expected: 'pass' },
    { name: 'writeFile - 完整参数', tool: 'writeFile', args: { path: 'test.txt', content: 'hello' }, expected: 'pass' },
    { name: 'listFiles - 可选参数为空', tool: 'listFiles', args: {}, expected: 'pass' },
    { name: 'listFiles - 指定路径', tool: 'listFiles', args: { path: '/src' }, expected: 'pass' },
    
    // 错误格式测试（模拟你的情况）
    { name: 'executeBash - 数组参数 ✗', tool: 'executeBash', args: { command: ['ls', '-la'] }, expected: 'fail' },
    { name: 'executeBash - 数字参数 ✗', tool: 'executeBash', args: { command: 123 }, expected: 'fail' },
    { name: 'executeBash - 空对象 ✗', tool: 'executeBash', args: {}, expected: 'fail' },
    { name: 'readFile - 数组路径 ✗', tool: 'readFile', args: { path: ['/test', 'file.ts'] }, expected: 'fail' },
    { name: 'readFile - 空参数 ✗', tool: 'readFile', args: {}, expected: 'fail' },
    { name: 'writeFile - 缺失 content ✗', tool: 'writeFile', args: { path: 'test.txt' }, expected: 'fail' },
    { name: 'writeFile - 空字符串 ✗', tool: 'writeFile', args: { path: '', content: '' }, expected: 'fail' },
];

const schemaMap: Record<string, z.ZodSchema> = {
    'executeBash': executeBashSchema,
    'readFile': readFileSchema,
    'writeFile': writeFileSchema,
    'listFiles': listFilesSchema,
};

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
    const schema = schemaMap[testCase.tool];
    const result = schema.safeParse(testCase.args);
    
    const isValid = result.success;
    const isExpected = (isValid && testCase.expected === 'pass') || (!isValid && testCase.expected === 'fail');
    
    if (isExpected) {
        passCount++;
    } else {
        failCount++;
    }
    
    const status = isExpected ? '✓' : '⚠';
    console.log(`${status} ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.args)}`);
    console.log(`   期望: ${testCase.expected === 'pass' ? '通过' : '失败'}`);
    console.log(`   结果: ${isValid ? '通过' : '失败'}`);
    
    if (!isValid) {
        const errorMessages = result.error.issues.map(issue => {
            if (issue.code === 'invalid_type') {
                return `类型错误: 期望 ${issue.expected}, 收到 ${issue.received}`;
            }
            return issue.message;
        });
        console.log(`   错误: ${errorMessages.join('; ')}`);
    }
    console.log('');
}

console.log('[' + '='.repeat(60) + ']');
console.log('  步骤 3: 错误模式分析');
console.log('[' + '='.repeat(60) + '\n');

console.log('测试统计:');
console.log(`  - 总测试数: ${testCases.length}`);
console.log(`  - 符合预期: ${passCount}`);
console.log(`  - 不符合预期: ${failCount}`);

console.log('\n错误模式分析:');
console.log('='.repeat(60));

const invalidTypeErrors = testCases
    .map((tc, i) => {
        const schema = schemaMap[tc.tool];
        const result = schema.safeParse(tc.args);
        return { index: i, ...tc, result };
    })
    .filter(item => !item.result.success)
    .map(item => ({
        name: item.name,
        errors: item.result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            code: issue.code,
            expected: (issue as any).expected,
            received: (issue as any).received,
        })),
    }));

if (invalidTypeErrors.length > 0) {
    console.log('\n检测到的错误类型分布:');
    
    const errorTypeCount: Record<string, number> = {};
    const stringInsteadOfArray: string[] = [];
    
    for (const item of invalidTypeErrors) {
        for (const error of item.errors) {
            const key = `${error.code}:${error.expected || 'N/A'}`;
            errorTypeCount[key] = (errorTypeCount[key] || 0) + 1;
            
            // 检测 "expected string, received array" 模式
            if (error.expected === 'string' && error.received === 'array') {
                stringInsteadOfArray.push(item.name);
            }
        }
    }
    
    for (const [error, count] of Object.entries(errorTypeCount)) {
        const [code, expected] = error.split(':');
        console.log(`  - ${code} (期望 ${expected}): ${count} 次`);
    }
    
    if (stringInsteadOfArray.length > 0) {
        console.log('\n⚠️  检测到 "expected string, received array" 错误:');
        stringInsteadOfArray.forEach(name => console.log(`   - ${name}`));
        console.log('\n这就是导致 invalid_union 错误的原因！');
    }
}

console.log('\n' + '='.repeat(60));
console.log('  步骤 4: 修复建议');
console.log('='.repeat(60));

console.log(`

基于测试结果，以下是修复 "expected string, received array" 错误的建议:

1. **方案一: 参数类型转换 (推荐)**
   在 tools.ts 的 execute 函数中添加类型转换:

   \`\`\`typescript
   executeBash: tool({
       parameters: z.object({
           command: z.string(),
       }),
       execute: async ({ command }) => {
           // 防御性编程: 处理数组或字符串
           const cmdString = Array.isArray(command)
               ? command.join(' ')
               : String(command);
           
           const result = await sandboxManager.execCommand(projectId, [
               '/bin/sh', '-c', cmdString
           ]);
           
           return result;
       }
   })
   \`\`\`

2. **方案二: Schema 调整为联合类型**
   允许参数为字符串或数组:

   \`\`\`typescript
   executeBash: tool({
       parameters: z.object({
           command: z.union([
               z.string(),
               z.array(z.string())
           ]).describe('命令字符串或命令数组'),
       }),
       execute: async ({ command }) => {
           const cmdString = Array.isArray(command)
               ? command.join(' ')
               : command;
           // ...
       }
   })
   \`\`\`

3. **方案三: 在消息转换层处理**
   在 convertPartsToContent 函数中处理:

   \`\`\`typescript
   function convertPartsToContent(messages) {
       return messages.map(msg => {
           if (msg.role === 'assistant' && msg.parts) {
               // 检查并转换工具调用参数
               msg.parts.forEach(part => {
                   if (part.type === 'tool-call' && part.args) {
                       Object.keys(part.args).forEach(key => {
                           if (Array.isArray(part.args[key])) {
                               part.args[key] = part.args[key].join(' ');
                           }
                       });
                   }
               });
           }
           return msg;
       });
   }
   \`\`\`

`);
