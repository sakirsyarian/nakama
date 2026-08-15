import type { ChatMessage, ToolCall } from "@nakama/core";

const ARTIFACT_WRITE_TOOLS = new Set(["write_file", "write_docx"]);
const BODY_KEYS = ["content", "markdown"] as const;

export const OMITTED_ARTIFACT_WRITE_BODY =
  "(omitted; call read_file on this path for the current file, including preview-panel edits)";

function sanitizeWriteArgs(
  args: Record<string, unknown>
): Record<string, unknown> {
  let changed = false;
  const next = { ...args };

  for (const key of BODY_KEYS) {
    if (typeof next[key] === "string" && next[key].length > 0) {
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

function sanitizeProviderBlock(block: unknown): unknown {
  if (!block || typeof block !== "object") {
    return block;
  }

  const record = block as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name : "";

  if (
    record.type === "tool_use" &&
    ARTIFACT_WRITE_TOOLS.has(name) &&
    record.input &&
    typeof record.input === "object"
  ) {
    const input = sanitizeWriteArgs(record.input as Record<string, unknown>);
    if (input === record.input) {
      return block;
    }

    return { ...record, input };
  }

  if (
    record.type === "function_call" &&
    ARTIFACT_WRITE_TOOLS.has(name) &&
    typeof record.arguments === "string"
  ) {
    try {
      const parsed: unknown = JSON.parse(record.arguments);
      if (parsed && typeof parsed === "object") {
        const input = sanitizeWriteArgs(parsed as Record<string, unknown>);
        if (input !== parsed) {
          return { ...record, arguments: JSON.stringify(input) };
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
      ? message.providerContent.map(sanitizeProviderBlock)
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

    return {
      ...message,
      ...(toolCallsChanged ? { toolCalls } : {}),
      ...(providerChanged ? { providerContent } : {}),
    };
  });
}
