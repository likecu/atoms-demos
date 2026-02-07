import { generateText, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { saveMessage, saveAICallLog } from '@/lib/actions/message';
import { getTools } from './tools';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug_chat.log');

function log(message: string) {
  const time = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${time}] ${message}\n`);
}

/**
 * 创建 OpenRouter Provider
 * 使用官方 @openrouter/ai-sdk-provider 包
 */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

/**
 * POST /api/chat - 处理聊天请求
 * 支持多步工具调用和实时进度追踪
 */
export async function POST(req: Request) {
  log('[API] Chat request received');

  try {
    const body = await req.json();
    const { messages, projectId } = body;

    log(`[API] Messages: ${messages.length}, Project: ${projectId}`);

    // 保存用户消息
    let userMessageId: string | null = null;
    const lastMessage = messages[messages.length - 1];

    if (projectId && lastMessage && lastMessage.role === 'user') {
      log('[API] Saving user message');
      const content = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
      userMessageId = await saveMessage(projectId, 'user', content);
    }

    // 使用经过验证的模型
    const modelId = process.env.GEMINI_MODEL_ID || 'arcee-ai/trinity-large-preview:free';
    log(`[API] Using model: ${modelId}`);

    // 触发后台处理
    (async () => {
      try {
        log('[Background] Starting AI generation with multi-step tools...');

        const systemPrompt = `You are an expert web developer assistant for Atoms Demo.
Your goal is to help users build React components and manage their development environment.

You have access to a secure sandbox environment with the following tools:
- executeBash: Execute shell commands (ls, npm, python, etc.)
- readFile: Read file contents from the filesystem
- writeFile: Create or update files
- listFiles: List directory contents

When the user asks to:
1. Run commands → Use executeBash
2. Check file contents → Use readFile
3. Create/modify files → Use writeFile
4. Browse files → Use listFiles

Always use tools when appropriate. Provide clear explanations of what you're doing.
For code, wrap it in markdown code blocks with the appropriate language tag.`;

        // 获取项目的工具实例
        const tools = getTools(projectId || 'default-user');
        log(`[Background] Tools initialized: ${Object.keys(tools).join(', ')}`);

        // 步骤计数器
        let stepCounter = 0;

        // 使用 generateText 进行多步工具调用
        const result = await generateText({
          model: openrouter(modelId),
          system: systemPrompt,
          messages: messages,
          tools: tools,

          // 允许最多 5 步执行 (防止无限循环)
          stopWhen: stepCountIs(5),

          // 每步完成时的回调
          onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
            stepCounter++;
            const stepNum = stepCounter;

            log(`[Step ${stepNum}] Finished - Reason: ${finishReason}`);
            log(`[Step ${stepNum}] Text: ${text?.substring(0, 100) || 'none'}...`);
            log(`[Step ${stepNum}] Tool Calls: ${toolCalls?.length || 0}`);
            log(`[Step ${stepNum}] Usage: ${JSON.stringify(usage)}`);

            if (!projectId) return;

            // 记录思考文本
            if (text) {
              await saveAICallLog({
                project_id: projectId,
                message_id: userMessageId,
                step_type: 'thinking',
                content: text,
                metadata: {
                  stepNumber: stepNum,
                  finishReason,
                  usage
                }
              });
            }

            // 记录工具调用
            if (toolCalls && toolCalls.length > 0) {
              for (let i = 0; i < toolCalls.length; i++) {
                const call = toolCalls[i];
                const toolResult = toolResults?.[i];

                // 保存工具调用信息
                await saveAICallLog({
                  project_id: projectId,
                  message_id: userMessageId,
                  step_type: 'tool_call',
                  content: `Calling ${call.toolName}`,
                  metadata: {
                    stepNumber: stepNum,
                    toolName: call.toolName,
                    toolCallId: call.toolCallId,
                    args: (call as any).input
                  }
                });

                // 保存工具结果
                if (toolResult) {
                  await saveAICallLog({
                    project_id: projectId,
                    message_id: userMessageId,
                    step_type: 'tool_result',
                    content: JSON.stringify((toolResult as any).output).substring(0, 500),
                    metadata: {
                      stepNumber: stepNum,
                      toolName: call.toolName,
                      toolCallId: (toolResult as any).toolCallId,
                      fullResult: (toolResult as any).output
                    }
                  });
                }
              }
            }
          }
        });

        log('[Background] Generation complete');
        log(`[Background] Total steps: ${result.steps.length}`);
        log(`[Background] Final text length: ${result.text.length}`);
        log(`[Background] Total token usage: ${JSON.stringify(result.usage)}`);

        // 保存 AI 的最终回复
        if (projectId && result.text) {
          await saveMessage(projectId, 'assistant', result.text);
          log('[Background] AI message saved to database');
        }

        // 记录完成状态
        if (projectId) {
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            step_type: 'output' as any,
            content: result.text,
            metadata: {
              totalSteps: result.steps.length,
              totalUsage: result.usage,
              finishReason: result.finishReason
            }
          });
        }

      } catch (error: any) {
        log(`[Background] ERROR: ${error.message}`);
        log(`[Background] Stack: ${error.stack}`);

        // 记录错误
        if (projectId) {
          await saveAICallLog({
            project_id: projectId,
            message_id: userMessageId,
            step_type: 'error' as any,
            content: error.message,
            metadata: {
              stack: error.stack
            }
          });
        }
      }
    })();

    // 立即返回 202 Accepted
    log('[API] Returning 202 Accepted');
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
