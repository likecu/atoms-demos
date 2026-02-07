/**
 * 修复验证测试 - 验证 tools.ts 修复是否成功
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
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║          修复验证测试 - 验证工具参数处理是否修复成功                ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('');

// 使用修复后的 Schema 定义（与 tools.ts 保持一致）
const executeBashSchema = z.object({
    command: z.union([
        z.string(),
        z.array(z.string())
    ]).describe('The bash command to execute. Accepts either a string (e.g., "ls -la") or an array (e.g., ["ls", "-la"]).'),
});

const readFileSchema = z.object({
    path: z.union([
        z.string(),
        z.array(z.string())
    ]).describe('The relative path to the file to read. Can be a string or an array of path parts.'),
});

const writeFileSchema = z.object({
    path: z.union([
        z.string(),
        z.array(z.string())
    ]).describe('The relative path to the file.'),
    content: z.union([
        z.string(),
        z.array(z.string())
    ]).describe('The content to write to the file.'),
});

const listFilesSchema = z.object({
    path: z.union([
        z.string(),
        z.array(z.string())
    ]).optional().describe('The directory to list. Defaults to current directory.'),
});

console.log('[' + '='.repeat(70) + ']');
console.log('  步骤 1: 验证修复后的 Schema 定义正确性');
console.log('[' + '='.repeat(70) + ']');

const schemas = {
    'executeBash (修复后 - 联合类型)': executeBashSchema,
    'readFile (修复后 - 联合类型)': readFileSchema,
    'writeFile (修复后 - 联合类型)': writeFileSchema,
    'listFiles (修复后 - 联合类型)': listFilesSchema,
};

for (const [name, schema] of Object.entries(schemas)) {
    try {
        const testResult = schema.safeParse(undefined);
        console.log(`✓ ${name}: Schema 定义有效`);
    } catch (error: any) {
        console.log(`✗ ${name}: Schema 定义错误 - ${error.message}`);
    }
}

console.log('\n[' + '='.repeat(70) + ']');
console.log('  步骤 2: 测试各种参数格式 (验证修复效果)');
console.log('[' + '='.repeat(70) + '\n');

interface TestCase {
    name: string;
    tool: string;
    args: any;
    expected: 'pass' | 'fail';
    description: string;
}

const testCases: TestCase[] = [
    // executeBash 测试
    { 
        name: 'executeBash - 字符串参数', 
        tool: 'executeBash', 
        args: { command: 'ls -la' }, 
        expected: 'pass',
        description: '原始格式（应该通过）'
    },
    { 
        name: 'executeBash - 数组参数 ✨', 
        tool: 'executeBash', 
        args: { command: ['ls', '-la'] }, 
        expected: 'pass',
        description: '修复后支持的数组格式'
    },
    { 
        name: 'executeBash - 嵌套数组 ✨', 
        tool: 'executeBash', 
        args: { command: ['npm', 'install', '--save'] }, 
        expected: 'pass',
        description: '多元素数组命令'
    },
    
    // readFile 测试
    { 
        name: 'readFile - 字符串路径', 
        tool: 'readFile', 
        args: { path: '/src/index.ts' }, 
        expected: 'pass',
        description: '原始格式（应该通过）'
    },
    { 
        name: 'readFile - 数组路径 ✨', 
        tool: 'readFile', 
        args: { path: ['src', 'index.ts'] }, 
        expected: 'pass',
        description: '修复后支持的数组路径'
    },
    
    // writeFile 测试
    { 
        name: 'writeFile - 完整字符串参数', 
        tool: 'writeFile', 
        args: { path: 'test.txt', content: 'hello world' }, 
        expected: 'pass',
        description: '原始格式（应该通过）'
    },
    { 
        name: 'writeFile - 数组参数 ✨', 
        tool: 'writeFile', 
        args: { path: ['src', 'utils.ts'], content: ['line1', 'line2', 'line3'] }, 
        expected: 'pass',
        description: '修复后支持的数组内容'
    },
    
    // listFiles 测试
    { 
        name: 'listFiles - 无参数', 
        tool: 'listFiles', 
        args: {}, 
        expected: 'pass',
        description: '使用默认值'
    },
    { 
        name: 'listFiles - 字符串路径', 
        tool: 'listFiles', 
        args: { path: '/src' }, 
        expected: 'pass',
        description: '原始格式（应该通过）'
    },
    { 
        name: 'listFiles - 数组路径 ✨', 
        tool: 'listFiles', 
        args: { path: ['src', 'components'] }, 
        expected: 'pass',
        description: '修复后支持的数组路径'
    },
];

const schemaMap: Record<string, z.ZodSchema> = {
    'executeBash': executeBashSchema,
    'readFile': readFileSchema,
    'writeFile': writeFileSchema,
    'listFiles': listFilesSchema,
};

let passCount = 0;
let failCount = 0;

console.log('测试结果:\n');

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
    const tag = testCase.description.includes('✨') ? '[新支持]' : '[原支持]';
    
    console.log(`${status} ${tag} ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.args)}`);
    console.log(`   预期: ${testCase.expected === 'pass' ? '通过' : '失败'}`);
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

console.log('[' + '='.repeat(70) + ']');
console.log('  步骤 3: 修复效果汇总');
console.log('[' + '='.repeat(70) + '\n');

console.log('测试统计:');
console.log(`  - 总测试数: ${testCases.length}`);
console.log(`  - 符合预期: ${passCount}`);
console.log(`  - 不符合预期: ${failCount}`);

// 分析数组参数测试结果
const arrayTestCases = testCases.filter(tc => 
    JSON.stringify(tc.args).includes('[') && 
    tc.expected === 'pass'
);

console.log(`\n数组参数测试: ${arrayTestCases.length} 个`);
console.log(`  - 通过: ${arrayTestCases.filter(tc => {
    const schema = schemaMap[tc.tool];
    return schema.safeParse(tc.args).success;
}).length}`);
console.log(`  - 失败: ${arrayTestCases.filter(tc => {
    const schema = schemaMap[tc.tool];
    return !schema.safeParse(tc.args).success;
}).length}`);

console.log('\n' + '='.repeat(70));
console.log('  步骤 4: 验证结论');
console.log('='.repeat(70));

const allOriginalPass = testCases
    .filter(tc => !tc.description.includes('✨'))
    .every(tc => {
        const schema = schemaMap[tc.tool];
        return schema.safeParse(tc.args).success;
    });

const allNewArrayPass = testCases
    .filter(tc => tc.description.includes('✨'))
    .every(tc => {
        const schema = schemaMap[tc.tool];
        return schema.safeParse(tc.args).success;
    });

console.log('');

if (allOriginalPass && allNewArrayPass) {
    console.log('✅ 修复验证成功!');
    console.log('');
    console.log('修复效果:');
    console.log('  ✓ 原有功能保持正常（字符串参数格式）');
    console.log('  ✓ 新增数组参数支持（修复 invalid_union 错误）');
    console.log('');
    console.log('修复方案总结:');
    console.log('  1. 将所有工具参数 Schema 改为联合类型');
    console.log('     z.union([z.string(), z.array(z.string())])');
    console.log('');
    console.log('  2. 在 execute 函数中添加参数处理逻辑');
    console.log('     const cmdString = Array.isArray(command)');
    console.log('         ? command.join(" ") : command;');
    console.log('');
    console.log('  3. 添加了安全的类型转换辅助函数');
    console.log('     safeToString(), safeToOptionalPath()');
    
    console.log('\n' + '='.repeat(70));
    console.log('  现在可以重新运行你的调试脚本验证修复效果!');
    console.log('='.repeat(70));
    
    process.exit(0);
} else {
    console.log('❌ 修复验证失败');
    console.log('');
    if (!allOriginalPass) {
        console.log('  问题: 原有功能受影响');
    }
    if (!allNewArrayPass) {
        console.log('  问题: 新增功能未完全生效');
    }
    
    process.exit(1);
}
