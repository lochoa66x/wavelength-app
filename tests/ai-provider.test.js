import test from "node:test";
import assert from "node:assert/strict";

import { callStructuredAI, hasConfiguredProvider } from "../api/_lib/aiProvider.js";

const TOOL = {
  name: "return_test_payload",
  description: "Return a structured test payload.",
  input_schema: {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
  },
};

function jsonResponse(body, { ok = true, status = 200, headers = {} } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] || null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test("OpenAI is primary and uses server-side Responses API structured output", async () => {
  let request;
  const result = await callStructuredAI({
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return jsonResponse({
        model: "gpt-5.6-terra",
        status: "completed",
        output: [{ type: "function_call", name: TOOL.name, arguments: JSON.stringify({ value: "openai" }) }],
        usage: { input_tokens: 12, output_tokens: 4 },
      });
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the test contract.",
    maxTokens: 100,
  });

  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer openai-test-key");
  assert.equal(request.body.store, false);
  assert.equal(request.body.tool_choice.name, TOOL.name);
  assert.deepEqual(request.body.tools[0].parameters, TOOL.input_schema);
  assert.equal(result.provider, "openai");
  assert.deepEqual(result.input, { value: "openai" });
});

test("Anthropic is used only after an OpenAI provider failure", async () => {
  const calls = [];
  const result = await callStructuredAI({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("openai.com")) {
        return jsonResponse({ error: { type: "rate_limit_error", message: "Rate limit reached" } }, { ok: false, status: 429 });
      }
      return jsonResponse({
        model: "claude-sonnet-4-6",
        content: [{ type: "tool_use", name: TOOL.name, input: { value: "anthropic" } }],
        usage: { input_tokens: 10, output_tokens: 3 },
        stop_reason: "tool_use",
      });
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the test contract.",
    maxTokens: 100,
    stage: "provider_fallback_test",
  });

  assert.deepEqual(calls, [
    "https://api.openai.com/v1/responses",
    "https://api.anthropic.com/v1/messages",
  ]);
  assert.equal(result.provider, "anthropic");
  assert.deepEqual(result.input, { value: "anthropic" });
});

test("cancellation never starts a fallback provider request", async () => {
  let calls = 0;
  await assert.rejects(() => callStructuredAI({
    fetchImpl: async () => {
      calls += 1;
      const error = new Error("cancelled");
      error.name = "AbortError";
      throw error;
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the test contract.",
    maxTokens: 100,
  }), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("provider configuration accepts either key and rejects an empty pair", () => {
  assert.equal(hasConfiguredProvider({ openAIKey: "openai", anthropicKey: "" }), true);
  assert.equal(hasConfiguredProvider({ openAIKey: "", anthropicKey: "anthropic" }), true);
  assert.equal(hasConfiguredProvider({ openAIKey: "", anthropicKey: "" }), false);
});
