import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "@nakama/core";
import {
  OMITTED_ARTIFACT_WRITE_BODY,
  omitStaleArtifactWriteBodies,
} from "./omit-stale-artifact-writes";

describe("omitStaleArtifactWriteBodies", () => {
  test("replaces write_file content but keeps the path", () => {
    const messages: ChatMessage[] = [
      {
        content: "",
        role: "assistant",
        toolCalls: [
          {
            arguments: {
              content: "# Original title\n\nBody the user already deleted.",
              path: "artifacts/scripts/script.md",
            },
            id: "call_1",
            name: "write_file",
          },
        ],
      },
    ];

    const result = omitStaleArtifactWriteBodies(messages);
    const call =
      result[0] && result[0].role === "assistant"
        ? result[0].toolCalls?.[0]
        : undefined;

    expect(call?.arguments.path).toBe("artifacts/scripts/script.md");
    expect(call?.arguments.content).toBe(OMITTED_ARTIFACT_WRITE_BODY);
    expect(
      messages[0] && messages[0].role === "assistant"
        ? messages[0].toolCalls?.[0]?.arguments.content
        : undefined
    ).toBe("# Original title\n\nBody the user already deleted.");
  });

  test("replaces write_docx markdown", () => {
    const messages: ChatMessage[] = [
      {
        content: "",
        role: "assistant",
        toolCalls: [
          {
            arguments: {
              markdown: "# Laporan",
              path: "artifacts/laporan.docx",
            },
            id: "call_2",
            name: "write_docx",
          },
        ],
      },
    ];

    const call = omitStaleArtifactWriteBodies(messages)[0];
    expect(
      call && call.role === "assistant"
        ? call.toolCalls?.[0]?.arguments.markdown
        : undefined
    ).toBe(OMITTED_ARTIFACT_WRITE_BODY);
  });

  test("leaves other tools unchanged", () => {
    const messages: ChatMessage[] = [
      {
        content: "",
        role: "assistant",
        toolCalls: [
          {
            arguments: { path: "MEMORY.md" },
            id: "call_3",
            name: "read_file",
          },
        ],
      },
    ];

    expect(omitStaleArtifactWriteBodies(messages)).toEqual(messages);
  });

  test("strips Anthropic tool_use input bodies", () => {
    const messages: ChatMessage[] = [
      {
        content: "",
        providerContent: [
          {
            id: "toolu_1",
            input: {
              content: "stale script",
              path: "artifacts/script.md",
            },
            name: "write_file",
            type: "tool_use",
          },
        ],
        role: "assistant",
      },
    ];

    const result = omitStaleArtifactWriteBodies(messages);
    const block =
      result[0] && result[0].role === "assistant"
        ? (result[0].providerContent?.[0] as {
            input?: { content?: string; path?: string };
          })
        : undefined;

    expect(block?.input?.path).toBe("artifacts/script.md");
    expect(block?.input?.content).toBe(OMITTED_ARTIFACT_WRITE_BODY);
  });
});
