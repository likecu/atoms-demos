import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { saveMessage } from '@/lib/actions/message';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug_chat.log');

function log(message: string) {
  const time = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${time}] ${message}\n`);
}

/**
 * Configure OpenRouter as OpenAI-compatible provider
 */
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Convert AI SDK parts format to legacy content format
 * Solves compatibility issues with OpenRouter/Google Gemini backend
 */
function convertPartsToContent(messages: Array<{
  role: string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}>): Array<{ role: string; content: string }> {
  return messages.map(msg => {
    if (msg.parts && Array.isArray(msg.parts)) {
      const textContent = msg.parts
        .filter(part => part.type === 'text' && part.text)
        .map(part => part.text!)
        .join('\n');

      return {
        role: msg.role,
        content: textContent || msg.content || ''
      };
    }

    return {
      role: msg.role,
      content: msg.content || ''
    };
  });
}

/**
 * POST /api/chat - Handle chat requests
 * Receives user message and triggers background AI processing via OpenRouter
 */
export async function POST(req: Request) {
  log('[API] Chat request received');
  try {
    const body = await req.json();
    const { messages, projectId } = body;
    log(`[API] Messages received: ${messages.length}, Project ID: ${projectId}`);

    const convertedMessages = convertPartsToContent(messages) as any;

    // Save user's latest message
    const lastMessage = convertedMessages[convertedMessages.length - 1];
    if (projectId && lastMessage && lastMessage.role === 'user') {
      log('[API] Saving user message');
      await saveMessage(projectId, 'user', lastMessage.content);
    }

    // Force model for testing if env not picked up, but try env first
    // Defaulting to Gemini 2.0 Flash Lite for better tool support
    const modelId = process.env.GEMINI_MODEL_ID || 'meta-llama/llama-3.3-70b-instruct:free';
    log(`[API] Triggering background process with model: ${modelId}`);

    // Trigger background processing without awaiting
    (async () => {
      try {
        log('[Background] Starting AI generation...');

        // Define system prompt with tool capabilities
        const systemPrompt = `You are an expert web developer for Atoms Demo. 
            Your goal is to help users build React components or execute commands.
            Always respond with high-quality React code inside markdown code blocks.
            The code will be rendered in a Sandpack preview.
            Use Tailwind CSS for styling.
            
            You have access to a secure sandbox environment via tools:
            - executeBash: Run shell commands (e.g. ls, npm install, python scripts)
            - readFile: Read file contents
            - writeFile: Create/Update files
            - listFiles: List directory contents
            
            When managing files or running commands, use the provided tools.
            When providing code, always wrap it in a single code block with the appropriate language tag (jsx, tsx, or js).
            Do not include multiple code blocks for the same component.`;

        // Get tools for this project context
        // Ensure projectId is valid string, fallback to default if missing
        const tools = (await import('./tools')).getTools(projectId || 'default-user');

        const result = await generateText({
          model: openrouter(modelId),
          system: systemPrompt,
          messages: convertedMessages,
          tools: tools,
          maxSteps: 5, // Allow multi-step tool execution
        });

        const text = result.text;

        if (result.toolCalls && result.toolCalls.length > 0) {
          log(`[Background] Model used ${result.toolCalls.length} tool calls.`);
          result.toolCalls.forEach(tc => log(`[Background] Tool Call: ${tc.toolName} args=${JSON.stringify(tc.args)}`));
        }

        if (projectId && text) {
          log('[Background] Saving assistant response');
          await saveMessage(projectId, 'assistant', text);
          log('[Background] Response saved successfully');
        }
      } catch (err) {
        log(`[Background] Error in AI generation: ${err}`);
        if (projectId) {
          // Save error message carefully
          await saveMessage(projectId, 'system', 'Sorry, I encountered an error while processing your request: ' + (err instanceof Error ? err.message : String(err)));
        }
      }
    })();

    log('[API] Request accepted, returning immediately');
    return new Response(JSON.stringify({ status: 'processing', projectId }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    log(`[API] Error in chat route: ${error}`);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
