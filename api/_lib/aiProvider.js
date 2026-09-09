const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const STRUCTURED_OUTPUT_RETRY_CATEGORIES = new Set([
  "incomplete_max_output",
  "incomplete_response",
  "missing_tool_call",
  "incomplete_tool_call",
  "malformed_tool_arguments",
  "schema_validation_failed",
]);

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

function responseMetadata(data) {
  return {
    responseId: String(data?.id || "").slice(0, 120) || null,
    responseStatus: String(data?.status || "").slice(0, 40) || null,
    incompleteReason: String(data?.incomplete_details?.reason || "").slice(0, 80) || null,
    outputItems: (Array.isArray(data?.output) ? data.output : []).slice(0, 12).map((item) => ({
      type: String(item?.type || "unknown").slice(0, 40),
      status: String(item?.status || "").slice(0, 40) || null,
      name: String(item?.name || "").slice(0, 80) || null,
    })),
    inputTokens: Number.isFinite(data?.usage?.input_tokens) ? data.usage.input_tokens : null,
    outputTokens: Number.isFinite(data?.usage?.output_tokens) ? data.usage.output_tokens : null,
    reasoningTokens: Number.isFinite(data?.usage?.output_tokens_details?.reasoning_tokens)
      ? data.usage.output_tokens_details.reasoning_tokens
      : null,
  };
}

function structuredOutputError(provider, toolName, category, metadata = {}) {
  const error = new Error(`${provider} did not return usable structured data for ${toolName}`);
  error.upstream = true;
  error.provider = provider;
  error.category = category;
  Object.assign(error, metadata);
  return error;
}

function validateSchemaValue(value, schema, path = "$") {
  if (!schema || typeof schema !== "object") return null;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return `${path} is outside the allowed enum`;
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return `${path} must be an object`;
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) return `${path}.${key} is required`;
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (!Object.hasOwn(value, key)) continue;
      const issue = validateSchemaValue(value[key], child, `${path}.${key}`);
      if (issue) return issue;
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      const unexpected = Object.keys(value).find((key) => !allowed.has(key));
      if (unexpected) return `${path}.${unexpected} is not allowed`;
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return `${path} must be an array`;
    for (let index = 0; index < value.length; index += 1) {
      const issue = validateSchemaValue(value[index], schema.items, `${path}[${index}]`);
      if (issue) return issue;
    }
  } else if (schema.type === "string" && typeof value !== "string") {
    return `${path} must be a string`;
  } else if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    return `${path} must be a number`;
  } else if (schema.type === "integer" && !Number.isInteger(value)) {
    return `${path} must be an integer`;
  } else if (schema.type === "boolean" && typeof value !== "boolean") {
    return `${path} must be a boolean`;
  }
  return null;
}

export function makeOpenAIStrictSchema(schema, path = "$") {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map((item, index) => makeOpenAIStrictSchema(item, `${path}[${index}]`));
  const normalized = { ...schema };
  if (schema.properties && typeof schema.properties === "object") {
    normalized.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, makeOpenAIStrictSchema(value, `${path}.${key}`)]),
    );
  }
  if (schema.items) normalized.items = makeOpenAIStrictSchema(schema.items, `${path}[]`);
  if (schema.type === "object") {
    const propertyNames = Object.keys(normalized.properties || {});
    const required = new Set(normalized.required || []);
    const optional = propertyNames.filter((key) => !required.has(key));
    if (optional.length) {
      const error = new Error(`Strict tool schema has optional properties at ${path}: ${optional.join(", ")}`);
      error.configuration = true;
      throw error;
    }
    normalized.additionalProperties = false;
  }
  return normalized;
}

function parseArguments(value, provider, tool, metadata) {
  let parsed;
  try {
    parsed = JSON.parse(String(value || ""));
  } catch {
    throw structuredOutputError(provider, tool.name, "malformed_tool_arguments", metadata);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw structuredOutputError(provider, tool.name, "schema_validation_failed", metadata);
  }
  if (tool.strict === true) {
    const issue = validateSchemaValue(parsed, makeOpenAIStrictSchema(tool.input_schema));
    if (issue) throw structuredOutputError(provider, tool.name, "schema_validation_failed", metadata);
  }
  return parsed;
}

async function callOpenAI({ fetchImpl, apiKey, model, tool, prompt, system, images, maxTokens, reasoningEffort, signal }) {
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
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      store: false,
      parallel_tool_calls: false,
      tools: [{
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.strict === true ? makeOpenAIStrictSchema(tool.input_schema) : tool.input_schema,
        strict: tool.strict === true,
      }],
      tool_choice: { type: "function", name: tool.name },
    }),
    signal,
  });
  if (!response.ok) throw upstreamError("openai", response, await readProviderError(response));
  const data = await response.json();
  const metadata = responseMetadata(data);
  if (data.status === "incomplete") {
    throw structuredOutputError(
      "openai",
      tool.name,
      metadata.incompleteReason === "max_output_tokens" ? "incomplete_max_output" : "incomplete_response",
      metadata,
    );
  }
  const refusal = (Array.isArray(data.output) ? data.output : []).some((item) => (
    item?.type === "message"
    && Array.isArray(item.content)
    && item.content.some((content) => content?.type === "refusal")
  ));
  if (refusal) throw structuredOutputError("openai", tool.name, "provider_refusal", metadata);
  if (data.status === "failed" || data.status === "cancelled") {
    throw structuredOutputError("openai", tool.name, "response_failed", metadata);
  }
  if (data.status === "queued" || data.status === "in_progress") {
    throw structuredOutputError("openai", tool.name, "incomplete_response", metadata);
  }
  const call = (data.output || []).find((item) => item.type === "function_call" && item.name === tool.name);
  if (!call) throw structuredOutputError("openai", tool.name, "missing_tool_call", metadata);
  if (call.status && call.status !== "completed") {
    throw structuredOutputError("openai", tool.name, "incomplete_tool_call", metadata);
  }
  if (!call.arguments) throw structuredOutputError("openai", tool.name, "malformed_tool_arguments", metadata);
  return {
    input: parseArguments(call.arguments, "openai", tool, metadata),
    provider: "openai",
    model: data.model || model,
    usage: {
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      reasoningTokens: metadata.reasoningTokens,
    },
    stopReason: data.status || null,
    responseId: metadata.responseId,
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
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.input_schema }],
      tool_choice: { type: "tool", name: tool.name },
      system,
      messages: [{ role: "user", content }],
    }),
    signal,
  });
  if (!response.ok) throw upstreamError("anthropic", response, await readProviderError(response));
  const data = await response.json();
  const call = (data.content || []).find((item) => item.type === "tool_use" && item.name === tool.name);
  if (!call?.input) throw structuredOutputError("anthropic", tool.name, "missing_tool_call");
  return {
    input: call.input,
    provider: "anthropic",
    model: data.model || model,
    usage: {
      inputTokens: Number.isFinite(data.usage?.input_tokens) ? data.usage.input_tokens : null,
      outputTokens: Number.isFinite(data.usage?.output_tokens) ? data.usage.output_tokens : null,
      reasoningTokens: null,
    },
    stopReason: data.stop_reason || null,
  };
}

function safeFailureLog(error, { stage, attempt, providerAttempt, correlationId, maxTokens }) {
  console.warn("[ai-provider] attempt failed", JSON.stringify({
    stage,
    attempt,
    providerAttempt,
    provider: error?.provider || "unknown",
    model: error?.model || null,
    status: error?.status || null,
    category: error?.category || (error?.name === "AbortError" ? "timeout" : "unknown"),
    providerType: error?.providerType || null,
    requestId: error?.requestId || null,
    responseId: error?.responseId || null,
    responseStatus: error?.responseStatus || null,
    incompleteReason: error?.incompleteReason || null,
    outputItems: error?.outputItems || [],
    inputTokens: error?.inputTokens ?? null,
    outputTokens: error?.outputTokens ?? null,
    reasoningTokens: error?.reasoningTokens ?? null,
    maxTokens,
    correlationId: correlationId || null,
  }));
}

export function structuredOutputRetryBudget(maxTokens) {
  const current = Number.isFinite(maxTokens) ? Math.max(1, Math.floor(maxTokens)) : 4_200;
  return Math.min(16_000, Math.max(current + 2_000, Math.ceil(current * 1.35)));
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
  reasoningEffort,
  signal,
  stage = tool?.name || "structured_generation",
  correlationId = null,
}) {
  const providers = [];
  if (String(openAIKey || "").trim()) {
    providers.push({
      provider: "openai",
      model: openAIModel,
      run: (attemptMaxTokens) => callOpenAI({
        fetchImpl,
        apiKey: openAIKey,
        model: openAIModel,
        tool,
        prompt,
        system,
        images,
        maxTokens: attemptMaxTokens,
        reasoningEffort,
        signal,
      }),
    });
  }
  if (String(anthropicKey || "").trim()) {
    providers.push({
      provider: "anthropic",
      model: anthropicModel,
      run: (attemptMaxTokens) => callAnthropic({ fetchImpl, apiKey: anthropicKey, model: anthropicModel, tool, prompt, system, images, maxTokens: attemptMaxTokens, signal }),
    });
  }
  if (!providers.length) {
    const error = new Error("No AI processing provider is configured");
    error.configuration = true;
    throw error;
  }

  let lastError;
  const failures = [];
  let attemptNumber = 0;
  for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
    const candidate = providers[providerIndex];
    const providerAttemptLimit = candidate.provider === "openai" ? 2 : 1;
    let attemptMaxTokens = maxTokens;
    for (let providerAttempt = 1; providerAttempt <= providerAttemptLimit; providerAttempt += 1) {
      attemptNumber += 1;
      try {
        return await candidate.run(attemptMaxTokens);
      } catch (error) {
        error.model ||= candidate.model;
        error.correlationId ||= correlationId;
        lastError = error;
        failures.push({
          provider: candidate.provider,
          category: error?.category || (error?.name === "AbortError" ? "timeout" : "unknown"),
          status: error?.status || null,
          responseId: error?.responseId || null,
        });
        safeFailureLog(error, {
          stage,
          attempt: attemptNumber,
          providerAttempt,
          correlationId,
          maxTokens: attemptMaxTokens,
        });
        if (error?.name === "AbortError" || signal?.aborted) throw error;
        const shouldRetryStructuredOutput = candidate.provider === "openai"
          && providerAttempt < providerAttemptLimit
          && STRUCTURED_OUTPUT_RETRY_CATEGORIES.has(error?.category);
        if (shouldRetryStructuredOutput) {
          const nextMaxTokens = structuredOutputRetryBudget(attemptMaxTokens);
          console.info("[ai-provider] retrying structured output", JSON.stringify({
            stage,
            provider: candidate.provider,
            category: error.category,
            providerAttempt: providerAttempt + 1,
            previousMaxTokens: attemptMaxTokens,
            maxTokens: nextMaxTokens,
            correlationId: correlationId || null,
          }));
          attemptMaxTokens = nextMaxTokens;
          continue;
        }
        break;
      }
    }
    if (providerIndex < providers.length - 1) {
      console.info("[ai-provider] falling back", JSON.stringify({
        stage,
        from: candidate.provider,
        to: providers[providerIndex + 1].provider,
        afterCategory: lastError?.category || null,
        correlationId: correlationId || null,
      }));
    }
  }
  if (lastError) lastError.providerFailures = failures;
  throw lastError;
}
