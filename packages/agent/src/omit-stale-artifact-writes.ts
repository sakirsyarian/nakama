import type { ChatMessage, ToolCall } from "@nakama/core";
import { z } from "zod";

const ARTIFACT_WRITE_TOOLS = new Set(["write_file", "write_docx"]);

const BODY_KEYS = ["content", "markdown"] as const;

export const OMITTED_ARTIFACT_WRITE_BODY =
  "(omitted; call read_file on this path for the current file, including preview-panel edits)";

const JsonArgsSchema = z.record(z.string(), z.json());

type JsonArgs = z.infer<typeof JsonArgsSchema>;

const ToolUseBlockSchema = z.object({
  id: z.string().optional(),
  input: JsonArgsSchema,
  name: z.string(),
  type: z.literal("tool_use"),
});

const FunctionCallBlockSchema = z.object({
  arguments: z.string(),
  id: z.string().optional(),
  name: z.string(),
  type: z.literal("function_call"),
});

const ProviderContentBlockSchema = z.record(z.string(), z.json());

type ProviderContentBlock = z.infer<typeof ProviderContentBlockSchema>;

function sanitizeWriteArgs(args: JsonArgs): JsonArgs {
  let changed = false;
  const next = { ...args };

  for (const key of BODY_KEYS) {
    const val = next[key];
    const parsedStr = z.string().safeParse(val);

    if (parsedStr.success && parsedStr.data.length > 0) {
      next[key] = OMITTED_ARTIFACT_WRITE_BODY;
      changed = true;
    }
  }

  return changed ? next : args;
}

function sanitizeToolCall(call: ToolCall): ToolCall {
  if (!ARTIFACT_WRITE_TOOLS.has(call.name)) {
    return call;
  }

  const arguments_ = sanitizeWriteArgs(call.arguments);

  if (arguments_ === call.arguments) {
    return call;
  }

  return { ...call, arguments: arguments_ };
}

function sanitizeProviderBlock(
  block: ProviderContentBlock
): ProviderContentBlock {
  const toolUse = ToolUseBlockSchema.safeParse(block);

  if (toolUse.success && ARTIFACT_WRITE_TOOLS.has(toolUse.data.name)) {
    const input = sanitizeWriteArgs(toolUse.data.input);

    if (input === toolUse.data.input) {
      return block;
    }

    return { ...block, input };
  }

  const functionCall = FunctionCallBlockSchema.safeParse(block);

  if (
    functionCall.success &&
    ARTIFACT_WRITE_TOOLS.has(functionCall.data.name)
  ) {
    try {
      const parsedArgs = JsonArgsSchema.safeParse(
        JSON.parse(functionCall.data.arguments)
      );

      if (parsedArgs.success) {
        const input = sanitizeWriteArgs(parsedArgs.data);

        if (input !== parsedArgs.data) {
          return { ...block, arguments: JSON.stringify(input) };
        }
      }
    } catch {
      return block;
    }
  }

  return block;
}

export function omitStaleArtifactWriteBodies(
  messages: readonly ChatMessage[]
): ChatMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    const toolCalls = message.toolCalls?.map(sanitizeToolCall);

    const providerContent = Array.isArray(message.providerContent)
      ? message.providerContent.map((rawBlock) => {
          const parsed = ProviderContentBlockSchema.safeParse(rawBlock);

          if (!parsed.success) {
            return rawBlock;
          }

          return sanitizeProviderBlock(parsed.data);
        })
      : message.providerContent;

    const toolCallsChanged =
      toolCalls !== undefined &&
      message.toolCalls !== undefined &&
      toolCalls.some((call, index) => call !== message.toolCalls?.[index]);

    const providerChanged =
      Array.isArray(providerContent) &&
      Array.isArray(message.providerContent) &&
      providerContent.some(
        (block, index) => block !== message.providerContent?.[index]
      );

    if (!(toolCallsChanged || providerChanged)) {
      return message;
    }

    const nextMessage: ChatMessage = { ...message };

    if (toolCallsChanged) {
      nextMessage.toolCalls = toolCalls;
    }

    if (providerChanged) {
      nextMessage.providerContent = providerContent;
    }

    return nextMessage;
  });
}
