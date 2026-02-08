import { generateText, stepCountIs, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { saveMessage, saveAICallLog } from '@/lib/actions/message';
import { getUserMcpConfig } from '@/lib/actions/user';
import { getTools } from './tools';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

function log(message: string) {
  const time = new Date().toISOString();
  console.log(`[${time}] ${message}`);
}

/**
 * 创建 OpenRouter Provider
 * 使用官方 @openrouter/ai-sdk-provider 包
 */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

interface RunAgentParams {
  projectId: string;
  userMessageId: string | null;
  messages: any[];
  parentLogId?: string | null;
  agentLabel?: string;
  depth?: number;
  mcpConfig?: string;
}

/**
 * 递归执行 Agent 逻辑
 */
async function runAgent({
  projectId,
  userMessageId,
  messages,
  parentLogId = null,
  agentLabel = 'Main Agent',
  depth = 0,
  mcpConfig = ''
}: RunAgentParams): Promise<string> {
  const prefix = `[${agentLabel}]`;
  log(`${prefix} Starting execution (Depth: ${depth})`);

  if (depth > 3) {
    throw new Error('Maximum subagent depth reached');
  }

  const modelId = process.env.GEMINI_MODEL_ID || 'arcee-ai/trinity-large-preview:free';

  const systemPrompt = `You are an expert web developer assistant for Atoms Demo.
Your goal is to help users build React components and manage their development environment.

CODE GENERATION GUIDELINES:
When generating web UI code for preview, ALWAYS follow these rules:

1. **For React components (PREFERRED)**:
   - Create a single-file component with "export default function ComponentName()"
   - Import required dependencies from React and libraries (lucide-react, recharts, framer-motion, etc.)
   - Use modern React hooks and best practices
   - Wrap code in \`\`\`jsx or \`\`\`tsx code blocks
   - Example:
     \`\`\`jsx
     import React, { useState } from 'react';
     import { Heart } from 'lucide-react';
     
     export default function MyComponent() {
       return <div>Hello World</div>;
     }
     \`\`\`

2. **For pure HTML/JS projects**:
   - Create a complete self-contained HTML document with <!DOCTYPE html>
   - Include inline CSS in <style> tags or use Tailwind CDN
   - Include inline JavaScript in <script> tags if needed
   - Wrap code in \`\`\`html code blocks
   - Example:
     \`\`\`html
     <!DOCTYPE html>
     <html>
     <head>
       <meta charset="UTF-8">
       <script src="https://cdn.tailwindcss.com"></script>
       <style>/* your styles */</style>
     </head>
     <body>
       <div id="app">Hello World</div>
       <script>/* your JS */</script>
     </body>
     </html>
     \`\`\`

3. **AVOID** creating multi-file Node.js projects (with separate server.js, package.json, etc.) 
   unless the user explicitly requests backend functionality that cannot run in the browser.

AVAILABLE TOOLS:
- executeBash: Execute shell commands (ls, npm, python, etc.)
- readFile: Read file contents from the filesystem
- writeFile: Create or update files
- listFiles: List directory contents
- search_web: Perform web searches to find information
- dispatch_subagent: Dispatch complex sub-tasks to specialized agents

When the user asks to:
1. Run commands → Use executeBash
2. Check file contents → Use readFile
3. Create/modify files → Use writeFile
4. Browse files → Use listFiles
5. Search internet → Use search_web
6. Perform complex research or multi-step coding → Use dispatch_subagent

Always use tools when appropriate. Provide clear explanations of what you're doing.

${mcpConfig ? `\nIMPORTANT: The user has provided the following specific instructions (MCP Protocol) which you MUST follow:\n${mcpConfig}\n` : ''}`;

  // 获取基础工具
  const baseTools = getTools(projectId);

  // 添加 Subagent 调度工具
  const tools = {
    ...baseTools,
    dispatch_subagent: tool({
      description: 'Dispatch a task to a specialized subagent. Use this for complex sub-tasks like specialized research, writing specific code modules, or reviewing changes. The subagent will run in parallel if called multiple times.',
      parameters: z.object({
        agent_role: z.enum(['researcher', 'coder', 'critic', 'planner']).optional().describe('The role of the subagent.'),
        role: z.string().optional().describe('Alias for agent_role.'),
        task_description: z.string().optional().describe('Detailed instructions for the subagent.'),
        task: z.string().optional().describe('Alias for task_description.'),
        description: z.string().optional().describe('Alias for task_description.'),
        context: z.string().optional().describe('Additonal context or data needed by the subagent.'),
        // Add loose params to catch hallucinations and prevent validation errors if loose validation is enabled
        // But Zod will strip unknown keys unless passthrough() is used? 
        // Actually for tool() definition, we usually keep it strict or use .catchall().
        // Let's rely on the fact that sometimes models put stuff in valid fields.
        // But if model provides "query", it will fail validation if not in schema?
        // Yes, standard Zod object defaults to strip() but tool verification might fail?
        // AI SDK might handle it. Let's add them as optional to be safe.
        query: z.string().optional().describe('Alias/Target for research tasks.'),
        type: z.string().optional(),
        max_results: z.number().optional()
      }),
      execute: async (args: any, context: any) => {
        const { toolCallId } = context;
        let { agent_role, task_description, context: agentContext } = args;

        // Handle aliases and hallucinations
        if (!task_description) {
          task_description = args.task || args.description || args.query;
        } else if (args.query) {
          // If both exist, append query
          task_description += `\nFocus on query: ${args.query}`;
        }

        if (args.max_results) {
          task_description += `\nMax results: ${args.max_results}`;
        }

        if (!agent_role) {
          agent_role = args.role || 'researcher'; // Default to researcher if role is missing
        }

        log(`${prefix} Dispatching subagent args: ${JSON.stringify(args)}`);

        if (!task_description) {
          log(`${prefix} Error: Missing required arguments for subagent dispatch.`);
          return {
            status: 'error',
            error: 'Missing required arguments: task_description (or task/description/query) is required.'
          } as any;
        }

        const subMessages = [
          { role: 'system', content: `You are a specialized agent with role: ${agent_role}.\nContext: ${agentContext || 'None'}` },
          { role: 'user', content: task_description }
        ];

        try {
          // Log start of subagent execution
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            parent_log_id: toolCallId,
            agent_label: agent_role,
            step_type: 'thinking',
            content: `Subagent ${agent_role} started execution...`,
            metadata: {
              depth: depth + 1
            }
          });

          // 递归调用
          const result = await runAgent({
            projectId,
            userMessageId,
            messages: subMessages,
            parentLogId: toolCallId, // 将当前工具调用ID作为子代理的父ID
            agentLabel: agent_role,
            depth: depth + 1,
            mcpConfig // Pass basic MCP config to subagents too? Yes.
          });

          return {
            status: 'success',
            result: result
          };
        } catch (error: any) {
          log(`${prefix} Subagent failed: ${error.message}`);

          // Log error to database so UI sees it
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            parent_log_id: toolCallId,
            agent_label: agent_role,
            step_type: 'thinking', // using thinking to show error message in UI stream
            content: `Subagent failed: ${error.message}`,
            metadata: {
              error: true,
              depth: depth + 1
            }
          });

          return {
            status: 'error',
            error: error.message
          };
        }
      }
    }) as any
  };

  // Filter out dispatch_subagent if depth > 0 to prevent infinite recursion for now
  // Or maybe allow 1 level? the check is at top of runAgent (depth > 3). 
  // But if the subagent doesn't HAVE the tool, it won't try to use it and fail.
  if (depth > 0) {
    // Remove dispatch_subagent from available tools for subagents
    // This forces them to do the work themselves using base tools.
    const { dispatch_subagent, ...restTools } = tools;
    // Re-assign tools to be used in generateText
    // We need to re-declare or just pass the filtered object
    // But 'tools' is const in this scope? No, it's const tools = ...
    // We need to create a new variable or cast.
    // Let's change the generateText call to use a computed tools object.
  }

  // Actually, to make it cleaner, let's just define effectiveTools
  const effectiveTools = depth > 0 ? (({ dispatch_subagent, ...rest }) => rest)(tools) : tools;

  let stepCounter = 0;

  try {
    const result = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      messages: messages,
      tools: effectiveTools,

      // 智能停止条件: AI自然完成、达到步数上限或检测到循环
      stopWhen: (steps: any) => {
        const stepsArray = Array.isArray(steps) ? steps : (steps as any).steps;
        if (!stepsArray || stepsArray.length === 0) return false;

        const lastStep = stepsArray[stepsArray.length - 1];
        // 自然停止
        if (lastStep?.finishReason === 'stop') return true;

        // 步数限制
        if (stepsArray.length >= 30) {
          console.warn(`${prefix} Reached maximum steps (30), forcing stop`);
          return true;
        }

        // 检测循环: 最近5步都调用相同工具
        if (stepsArray.length >= 10) {
          const recentSteps = stepsArray.slice(-5);
          const toolNames = recentSteps
            .map((s: any) => s.toolCalls?.map((t: any) => t.toolName).join(','))
            .filter((n: string) => n);

          if (toolNames.length >= 5 && toolNames.every((n: string) => n === toolNames[0])) {
            console.warn(`${prefix} Detected loop, forcing stop`);
            return true;
          }
        }

        return false;
      },

      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        stepCounter++;
        const stepNum = stepCounter;

        log(`${prefix} [Step ${stepNum}] Finished - Reason: ${finishReason}`);

        // 记录思考文本
        if (text) {
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            parent_log_id: parentLogId,
            agent_label: agentLabel,
            step_type: 'thinking',
            content: text,
            metadata: {
              stepNumber: stepNum,
              finishReason,
              usage,
              depth
            }
          });
        }

        // 记录工具调用
        if (toolCalls && toolCalls.length > 0) {
          for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i];
            const toolResult = toolResults?.[i];

            await saveAICallLog({
              project_id: projectId,
              message_id: userMessageId,
              parent_log_id: parentLogId,
              agent_label: agentLabel,
              step_type: 'tool_call',
              content: `Calling ${call.toolName}`,
              metadata: {
                stepNumber: stepNum,
                toolName: call.toolName,
                toolCallId: call.toolCallId,
                args: (call as any).input,
                depth
              }
            });

            if (toolResult) {
              // 截断过长的输出
              const outputStr = JSON.stringify((toolResult as any).output);
              const limit = 2000;
              const truncatedOutput = outputStr.length > limit
                ? outputStr.substring(0, limit) + `... (${outputStr.length - limit} more characters)`
                : outputStr;

              await saveAICallLog({
                project_id: projectId,
                message_id: userMessageId,
                parent_log_id: parentLogId,
                agent_label: agentLabel,
                step_type: 'tool_result',
                content: truncatedOutput,
                metadata: {
                  stepNumber: stepNum,
                  toolName: call.toolName,
                  toolCallId: (toolResult as any).toolCallId,
                  // fullResult: (toolResult as any).output, // 避免存太大的数据
                  depth
                }
              });
            }
          }
        }
      }
    });

    log(`${prefix} Execution complete`);
    return result.text;

  } catch (error: any) {
    log(`${prefix} Error: ${error.message}`);

    await saveAICallLog({
      project_id: projectId,
      message_id: userMessageId,
      parent_log_id: parentLogId,
      agent_label: agentLabel,
      step_type: 'thinking', // 记录为 thinking 或新增 error 类型，这里沿用 error 如果 schema 支持
      content: `Error: ${error.message}`,
      metadata: { error: true, stack: error.stack }
    } as any); // cast as any in case step_type restricts 'error' strictly (interface currently only allows specific strings, but let's check)
    // Actually interface allows 'output' | 'error' ? 
    // AICallLog interface: 'thinking' | 'tool_call' | 'tool_result' | 'output'. 
    // It does NOT have 'error'. I should probably use 'thinking' or 'output' with error metadata.
    // Or I should have updated the interface to support 'error'.
    // The previous code casted to 'any'. I will do the same or use 'output' with error prefix.
    throw error;
  }
}

/**
 * POST /api/chat - 处理聊天请求
 */
export async function POST(req: Request) {
  log('[API] Chat request received');

  try {
    const body = await req.json();
    const { messages, projectId } = body;

    log(`[API] Messages: ${messages.length}, Project: ${projectId}`);

    let userMessageId: string | null = null;
    const lastMessage = messages[messages.length - 1];

    if (projectId && lastMessage && lastMessage.role === 'user') {
      const content = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
      userMessageId = await saveMessage(projectId, 'user', content);
    }

    // Get user MCP config
    const mcpConfig = await getUserMcpConfig();

    // 触发后台异步处理
    (async () => {
      try {
        const finalText = await runAgent({
          projectId,
          userMessageId,
          messages,
          parentLogId: null,
          agentLabel: 'Main Agent',
          depth: 0,
          mcpConfig
        });

        // 仅主代理保存最终消息到 messages 表
        if (projectId && finalText) {
          await saveMessage(projectId, 'assistant', finalText);

          // 记录最终 Output Log
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            step_type: 'output',
            content: finalText,
            metadata: {
              finish: true
            }
          });
        }
      } catch (error: any) {
        log(`[Background] Root Error: ${error.message}`);
        // Log handled in runAgent, but we might want to ensure a final ERROR log at top level?
      }
    })();

    return new Response(
      JSON.stringify({
        status: 'accepted',
        message: 'AI generation started',
        userMessageId
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    log(`[API] ERROR: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
