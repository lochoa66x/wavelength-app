import test from "node:test";
import assert from "node:assert/strict";

import {
  callStructuredAI,
  hasConfiguredProvider,
  makeOpenAIStrictSchema,
  structuredOutputRetryBudget,
} from "../api/_lib/aiProvider.js";

const TOOL = {
  name: "return_test_payload",
  description: "Return a structured test payload.",
  input_schema: {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
  },
};

const STRICT_TOOL = {
  ...TOOL,
  strict: true,
  input_schema: {
    ...TOOL.input_schema,
    additionalProperties: false,
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

test("strict OpenAI tools use a recursively closed schema and low reasoning when requested", async () => {
  let request;
  await callStructuredAI({
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return jsonResponse({
        id: "resp_strict",
        model: "gpt-5.6-terra",
        status: "completed",
        output: [{ type: "function_call", status: "completed", name: STRICT_TOOL.name, arguments: JSON.stringify({ value: "ok" }) }],
      });
    },
    openAIKey: "openai-test-key",
    tool: STRICT_TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 100,
    reasoningEffort: "low",
  });

  assert.equal(request.tools[0].strict, true);
  assert.equal(request.tools[0].parameters.additionalProperties, false);
  assert.equal(request.reasoning.effort, "low");
});

test("strict schema conversion rejects optional properties instead of silently changing semantics", () => {
  assert.throws(
    () => makeOpenAIStrictSchema({
      type: "object",
      properties: { required: { type: "string" }, optional: { type: "string" } },
      required: ["required"],
    }),
    /optional properties/i,
  );
});

test("OpenAI retries an incomplete max-output response with a larger budget", async () => {
  const budgets = [];
  const result = await callStructuredAI({
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      budgets.push(body.max_output_tokens);
      if (budgets.length === 1) {
        return jsonResponse({
          id: "resp_incomplete",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output: [{ type: "reasoning", status: "incomplete" }],
          usage: { input_tokens: 100, output_tokens: 100, output_tokens_details: { reasoning_tokens: 90 } },
        });
      }
      return jsonResponse({
        id: "resp_complete",
        model: "gpt-5.6-terra",
        status: "completed",
        output: [{ type: "function_call", status: "completed", name: TOOL.name, arguments: JSON.stringify({ value: "retried" }) }],
      });
    },
    openAIKey: "openai-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 4_200,
  });

  assert.deepEqual(budgets, [4_200, structuredOutputRetryBudget(4_200)]);
  assert.equal(result.input.value, "retried");
});

test("OpenAI retries malformed function arguments before falling back", async () => {
  let calls = 0;
  const result = await callStructuredAI({
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ status: "completed", output: [{ type: "function_call", status: "completed", name: TOOL.name, arguments: '{"value":' }] });
      }
      return jsonResponse({ status: "completed", output: [{ type: "function_call", status: "completed", name: TOOL.name, arguments: JSON.stringify({ value: "valid" }) }] });
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 100,
  });

  assert.equal(calls, 2);
  assert.equal(result.provider, "openai");
});

test("OpenAI retries a schema-invalid strict payload", async () => {
  let calls = 0;
  const result = await callStructuredAI({
    fetchImpl: async () => {
      calls += 1;
      const input = calls === 1 ? {} : { value: "valid" };
      return jsonResponse({
        status: "completed",
        output: [{ type: "function_call", status: "completed", name: STRICT_TOOL.name, arguments: JSON.stringify(input) }],
      });
    },
    openAIKey: "openai-test-key",
    tool: STRICT_TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 100,
  });

  assert.equal(calls, 2);
  assert.equal(result.input.value, "valid");
});

test("OpenAI refusal is classified and falls back without retrying the refusal", async () => {
  const calls = [];
  const result = await callStructuredAI({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("openai.com")) {
        return jsonResponse({
          status: "completed",
          output: [{ type: "message", status: "completed", content: [{ type: "refusal", refusal: "Cannot comply" }] }],
        });
      }
      return jsonResponse({
        content: [{ type: "tool_use", name: TOOL.name, input: { value: "fallback" } }],
        stop_reason: "tool_use",
      });
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 100,
  });

  assert.equal(calls.filter((url) => url.includes("openai.com")).length, 1);
  assert.equal(result.provider, "anthropic");
});

test("OpenAI retries a missing or incomplete function call then uses Anthropic", async () => {
  const calls = [];
  const result = await callStructuredAI({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("openai.com") && calls.length === 1) {
        return jsonResponse({ status: "completed", output: [{ type: "message", status: "completed" }] });
      }
      if (url.includes("openai.com")) {
        return jsonResponse({ status: "completed", output: [{ type: "function_call", status: "incomplete", name: TOOL.name, arguments: "" }] });
      }
      return jsonResponse({
        model: "claude-sonnet-4-6",
        content: [{ type: "tool_use", name: TOOL.name, input: { value: "fallback" } }],
        usage: { input_tokens: 10, output_tokens: 3 },
        stop_reason: "tool_use",
      });
    },
    openAIKey: "openai-test-key",
    anthropicKey: "anthropic-test-key",
    tool: TOOL,
    prompt: "Return the value.",
    system: "Follow the contract.",
    maxTokens: 100,
  });

  assert.equal(calls.filter((url) => url.includes("openai.com")).length, 2);
  assert.equal(calls.filter((url) => url.includes("anthropic.com")).length, 1);
  assert.equal(result.provider, "anthropic");
});

test("the final Anthropic billing error retains the preceding OpenAI output failures", async () => {
  await assert.rejects(
    () => callStructuredAI({
      fetchImpl: async (url) => {
        if (url.includes("openai.com")) return jsonResponse({ status: "completed", output: [] });
        return jsonResponse(
          { type: "invalid_request_error", error: { type: "invalid_request_error", message: "Workspace spend limit reached" } },
          { ok: false, status: 400, headers: { "request-id": "req_billing" } },
        );
      },
      openAIKey: "openai-test-key",
      anthropicKey: "anthropic-test-key",
      tool: TOOL,
      prompt: "Return the value.",
      system: "Follow the contract.",
      maxTokens: 100,
      correlationId: "tailor-test",
    }),
    (error) => {
      assert.equal(error.provider, "anthropic");
      assert.equal(error.category, "billing");
      assert.equal(error.correlationId, "tailor-test");
      assert.deepEqual(error.providerFailures.map((failure) => failure.category), [
        "missing_tool_call",
        "missing_tool_call",
        "billing",
      ]);
      return true;
    },
  );
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
