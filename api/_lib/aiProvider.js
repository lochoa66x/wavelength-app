const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

function providerErrorCategory(status, payload) {
  const message = String(payload?.error?.message || payload?.message || "").toLowerCase();
  if (/credit|billing|spend|usage limit|quota/.test(message) || status === 402) return "billing";
  if (status === 401 || status === 403) return "authentication";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "provider_unavailable";
  return "invalid_request";
}

async function readProviderError(response) {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text ? { message: text.slice(0, 500) } : {};
    } catch {
      return {};
    }
  }
}

function upstreamError(provider, response, payload) {
  const error = new Error(`${provider} processing request failed`);
  error.upstream = true;
  error.provider = provider;
  error.status = Number(response?.status) || null;
  error.category = providerErrorCategory(error.status, payload);
  error.requestId = String(
    response?.headers?.get?.("x-request-id")
      || response?.headers?.get?.("request-id")
      || payload?.request_id
      || "",
  ).slice(0, 120);
  error.providerType = String(payload?.error?.type || payload?.type || "").slice(0, 80);
  return error;
}

function missingStructuredOutput(provider, toolName) {
  const error = new Error(`${provider} did not return structured data for ${toolName}`);
  error.upstream = true;
  error.provider = provider;
  error.category = "invalid_output";
  return error;
}

function parseArguments(value, provider, toolName) {
  try {
    const parsed = JSON.parse(String(value || ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid object");
    return parsed;
  } catch {
    throw missingStructuredOutput(provider, toolName);
  }
}

async function callOpenAI({ fetchImpl, apiKey, model, tool, prompt, system, images, maxTokens, signal }) {
  const content = [
    ...images.map(({ media_type, data }) => ({
      type: "input_image",
      image_url: `data:${media_type};base64,${data}`,
      detail: "high",
    })),
    { type: "input_text", text: prompt },
  ];
  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: [{ role: "user", content }],
      max_output_tokens: maxTokens,
      store: false,
      parallel_tool_calls: false,
      tools: [{
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
        strict: false,
      }],
      tool_choice: { type: "function", name: tool.name },
    }),
    signal,
  });
  if (!response.ok) throw upstreamError("openai", response, await readProviderError(response));
  const data = await response.json();
  const call = (data.output || []).find((item) => item.type === "function_call" && item.name === tool.name);
  if (!call?.arguments) throw missingStructuredOutput("openai", tool.name);
  return {
    input: parseArguments(call.arguments, "openai", tool.name),
    provider: "openai",
    model: data.model || model,
    usage: {
      inputTokens: Number.isFinite(data.usage?.input_tokens) ? data.usage.input_tokens : null,
      outputTokens: Number.isFinite(data.usage?.output_tokens) ? data.usage.output_tokens : null,
    },
    stopReason: data.status || null,
  };
}

async function callAnthropic({ fetchImpl, apiKey, model, tool, prompt, system, images, maxTokens, signal }) {
  const content = images.length
    ? [
        ...images.map(({ media_type, data }) => ({
          type: "image",
          source: { type: "base64", media_type, data },
        })),
        { type: "text", text: prompt },
      ]
    : prompt;
  const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      system,
      messages: [{ role: "user", content }],
    }),
    signal,
  });
  if (!response.ok) throw upstreamError("anthropic", response, await readProviderError(response));
  const data = await response.json();
  const call = (data.content || []).find((item) => item.type === "tool_use" && item.name === tool.name);
  if (!call?.input) throw missingStructuredOutput("anthropic", tool.name);
  return {
    input: call.input,
    provider: "anthropic",
    model: data.model || model,
    usage: {
      inputTokens: Number.isFinite(data.usage?.input_tokens) ? data.usage.input_tokens : null,
      outputTokens: Number.isFinite(data.usage?.output_tokens) ? data.usage.output_tokens : null,
    },
    stopReason: data.stop_reason || null,
  };
}

function safeFailureLog(error, { stage, attempt }) {
  console.warn("[ai-provider] attempt failed", JSON.stringify({
    stage,
    attempt,
    provider: error?.provider || "unknown",
    status: error?.status || null,
    category: error?.category || (error?.name === "AbortError" ? "timeout" : "unknown"),
    providerType: error?.providerType || null,
    requestId: error?.requestId || null,
  }));
}

export function hasConfiguredProvider({ openAIKey, anthropicKey }) {
  return Boolean(String(openAIKey || "").trim() || String(anthropicKey || "").trim());
}

export async function callStructuredAI({
  fetchImpl = globalThis.fetch,
  openAIKey,
  anthropicKey,
  openAIModel = DEFAULT_OPENAI_MODEL,
  anthropicModel = DEFAULT_ANTHROPIC_MODEL,
  tool,
  prompt,
  system,
  images = [],
  maxTokens,
  signal,
  stage = tool?.name || "structured_generation",
}) {
  const attempts = [];
  if (String(openAIKey || "").trim()) {
    attempts.push({
      provider: "openai",
      run: () => callOpenAI({ fetchImpl, apiKey: openAIKey, model: openAIModel, tool, prompt, system, images, maxTokens, signal }),
    });
  }
  if (String(anthropicKey || "").trim()) {
    attempts.push({
      provider: "anthropic",
      run: () => callAnthropic({ fetchImpl, apiKey: anthropicKey, model: anthropicModel, tool, prompt, system, images, maxTokens, signal }),
    });
  }
  if (!attempts.length) {
    const error = new Error("No AI processing provider is configured");
    error.configuration = true;
    throw error;
  }

  let lastError;
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    try {
      return await attempt.run();
    } catch (error) {
      lastError = error;
      safeFailureLog(error, { stage, attempt: index + 1 });
      if (error?.name === "AbortError" || signal?.aborted || index === attempts.length - 1) throw error;
      console.info("[ai-provider] falling back", JSON.stringify({
        stage,
        from: attempt.provider,
        to: attempts[index + 1].provider,
      }));
    }
  }
  throw lastError;
}
