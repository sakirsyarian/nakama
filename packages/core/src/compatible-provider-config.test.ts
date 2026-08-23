import { describe, expect, test } from "bun:test";
import {
  parseOpenAICompatibleApi,
  validateCustomModels,
} from "./compatible-provider-config";

describe("parseOpenAICompatibleApi", () => {
  test("defaults legacy configurations to chat completions", () => {
    expect(parseOpenAICompatibleApi(undefined)).toBe("chat_completions");
  });

  test("accepts the Responses API format", () => {
    expect(parseOpenAICompatibleApi("responses")).toBe("responses");
  });

  test("rejects unknown API formats", () => {
    expect(() => parseOpenAICompatibleApi("completions")).toThrow(
      "API format must be chat_completions or responses."
    );
  });
});

describe("validateCustomModels", () => {
  test("accepts supportsThinking when it is boolean", () => {
    const models = validateCustomModels([
      {
        default: true,
        id: "qwen3.6-35b",
        name: "Qwen 3.6 35B",
        supportsThinking: true,
      },
    ]);

    expect(models[0]?.supportsThinking).toBe(true);
  });

  test("rejects non-boolean supportsThinking values", () => {
    expect(() =>
      validateCustomModels([
        {
          id: "qwen3.6-35b",
          supportsThinking: "yes",
        },
      ])
    ).toThrow('Model "qwen3.6-35b" has invalid supportsThinking flag.');
  });
});
