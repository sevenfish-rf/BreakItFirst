import { humanizeCaughtError } from "@/lib/provider-errors";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderCallOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  /** Prefer JSON object mode when provider supports it */
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  stage?: "pass1" | "pass2" | "models" | "test";
};

export class ProviderError extends Error {
  status: number;
  body: string;
  stage?: ProviderCallOptions["stage"];

  constructor(
    message: string,
    status: number,
    body: string,
    stage?: ProviderCallOptions["stage"],
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.body = body;
    this.stage = stage;
  }
}

/**
 * Normalize user-provided base URL to an OpenAI-compatible root
 * (…/v1), without a trailing slash.
 */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/chat\/completions$/i, "");
  url = url.replace(/\/responses$/i, "");
  url = url.replace(/\/models$/i, "");
  return url.replace(/\/+$/, "");
}

/**
 * SSRF guard for BYOK. Allows public https, localhost, and private LAN
 * (common for Ollama / vLLM / LiteLLM). Still blocks cloud metadata.
 */
export function assertSafeBaseUrl(raw: string): string {
  const normalized = normalizeBaseUrl(raw);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Invalid provider base URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Provider base URL must be http(s)");
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  // Cloud metadata / link-local — always block
  if (
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    (host.endsWith(".internal") && host.includes("metadata"))
  ) {
    throw new Error("Provider base URL host is not allowed");
  }

  // http only for local / private networks
  const isPrivateIp =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(host); // CGNAT-ish

  if (parsed.protocol === "http:" && !isLocal && !isPrivateIp) {
    throw new Error("HTTP is only allowed for localhost / private LAN providers");
  }

  return normalized;
}

function extractTextFromContent(content: unknown): string | null {
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === "string") {
        parts.push(part);
        continue;
      }
      if (!part || typeof part !== "object") continue;
      const row = part as Record<string, unknown>;
      if (typeof row.text === "string") parts.push(row.text);
      else if (
        row.type === "text" &&
        typeof (row as { text?: string }).text === "string"
      ) {
        parts.push(String(row.text));
      } else if (typeof row.content === "string") {
        parts.push(row.content);
      }
    }
    const joined = parts.join("\n").trim();
    return joined || null;
  }
  return null;
}

function extractChatText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Empty provider response");
  }

  const data = payload as Record<string, unknown>;

  // Chat Completions shape
  if (Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    if (message) {
      const fromMessage = extractTextFromContent(message.content);
      if (fromMessage) return fromMessage;
      // reasoning models sometimes put final text in refusal/null and reasoning elsewhere
      if (typeof message.reasoning === "string" && message.reasoning.trim()) {
        // not ideal as final answer, but better than hard fail if content empty
      }
    }
    if (typeof choice.text === "string" && choice.text.trim()) {
      return choice.text;
    }
    // Some gateways: choices[0].message.reasoning_content + content
    if (message && typeof message.reasoning_content === "string") {
      const c = extractTextFromContent(message.content);
      if (c) return c;
    }
  }

  // Responses API shape
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  if (Array.isArray(data.output)) {
    const parts: string[] = [];
    for (const item of data.output) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.content === "string") {
        parts.push(row.content);
        continue;
      }
      if (!Array.isArray(row.content)) continue;
      for (const c of row.content) {
        if (!c || typeof c !== "object") continue;
        const chunk = c as Record<string, unknown>;
        if (typeof chunk.text === "string") parts.push(chunk.text);
        if (typeof chunk.output_text === "string") parts.push(chunk.output_text);
      }
    }
    if (parts.length) return parts.join("\n");
  }

  throw new Error(
    "Could not parse text from provider response — unexpected JSON shape",
  );
}

function authHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Some local servers accept empty key; only send Authorization when present
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: true; json: unknown } | { ok: false; status: number; body: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) {
      return { ok: true, json: await res.json() };
    }
    return { ok: false, status: res.status, body: await res.text() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, status: 0, body: msg };
  }
}

/**
 * Call an OpenAI-compatible Chat Completions endpoint.
 * Falls back across common param variants and Responses API.
 */
export async function callProvider(
  options: ProviderCallOptions,
): Promise<string> {
  const baseUrl = assertSafeBaseUrl(options.baseUrl);
  const headers = authHeaders(options.apiKey);
  const stage = options.stage;

  const baseBody: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
  };

  // Prefer temperature only when not forced json extraction on picky models
  if (options.temperature !== undefined) {
    baseBody.temperature = options.temperature;
  }

  const maxTokens = options.maxTokens ?? 4096;

  type Variant = Record<string, unknown>;
  const variants: Variant[] = [
    // Modern OpenAI-style
    {
      ...baseBody,
      max_completion_tokens: maxTokens,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    },
    // Classic OpenAI-compatible
    {
      ...baseBody,
      max_tokens: maxTokens,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    },
    // No JSON mode, no temperature (some reasoning models)
    {
      model: options.model,
      messages: options.messages,
      max_completion_tokens: maxTokens,
    },
    {
      model: options.model,
      messages: options.messages,
      max_tokens: maxTokens,
    },
    // Minimal
    {
      model: options.model,
      messages: options.messages,
    },
  ];

  let lastFail: { status: number; body: string } | null = null;
  const chatUrl = `${baseUrl}/chat/completions`;

  for (let i = 0; i < variants.length; i++) {
    const result = await postJson(chatUrl, headers, variants[i], options.signal);
    if (result.ok) {
      try {
        return extractChatText(result.json);
      } catch (parseErr) {
        lastFail = {
          status: 502,
          body:
            parseErr instanceof Error
              ? parseErr.message
              : "Failed to parse provider response",
        };
        continue;
      }
    }

    lastFail = { status: result.status, body: result.body };

    // Auth / not found — don't thrash variants
    if (result.status === 401 || result.status === 403 || result.status === 404) {
      break;
    }

    // If not a param rejection, stop early
    if (
      result.status !== 0 &&
      result.status !== 400 &&
      result.status !== 422 &&
      result.status !== 500
    ) {
      break;
    }
  }

  // Fallback: Responses API
  if (lastFail && (lastFail.status === 404 || lastFail.status === 405)) {
    const responsesBody: Record<string, unknown> = {
      model: options.model,
      input: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
    if (options.temperature !== undefined) {
      responsesBody.temperature = options.temperature;
    }
    if (options.jsonMode) {
      responsesBody.text = { format: { type: "json_object" } };
    }

    const responsesUrl = `${baseUrl}/responses`;
    const responsesRes = await postJson(
      responsesUrl,
      headers,
      responsesBody,
      options.signal,
    );
    if (responsesRes.ok) {
      return extractChatText(responsesRes.json);
    }
    lastFail = { status: responsesRes.status, body: responsesRes.body };
  }

  const status = lastFail?.status ?? 502;
  const body = lastFail?.body ?? "";
  throw new ProviderError(
    humanizeCaughtError(
      { status, body, message: `Provider error (${status})` },
      stage,
    ),
    status,
    body.slice(0, 800),
    stage,
  );
}

export type RemoteModel = {
  id: string;
  ownedBy?: string;
};

/**
 * GET {base}/models — OpenAI-compatible model list.
 */
export async function listProviderModels(params: {
  baseUrl: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<RemoteModel[]> {
  const baseUrl = assertSafeBaseUrl(params.baseUrl);
  const headers = authHeaders(params.apiKey);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers,
      signal: params.signal,
    });
  } catch (err) {
    throw new ProviderError(
      humanizeCaughtError(err, "models"),
      0,
      err instanceof Error ? err.message : "Network error",
      "models",
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ProviderError(
      humanizeCaughtError(
        { status: res.status, body, message: `Models error (${res.status})` },
        "models",
      ),
      res.status,
      body.slice(0, 800),
      "models",
    );
  }

  const json = (await res.json()) as unknown;
  const ids = new Set<string>();

  const collect = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    if (typeof row.id === "string" && row.id.trim()) {
      ids.add(row.id.trim());
    } else if (typeof row.name === "string" && row.name.trim()) {
      ids.add(row.name.trim());
    }
  };

  if (Array.isArray(json)) {
    json.forEach(collect);
  } else if (json && typeof json === "object") {
    const data = (json as Record<string, unknown>).data;
    if (Array.isArray(data)) data.forEach(collect);
    const models = (json as Record<string, unknown>).models;
    if (Array.isArray(models)) models.forEach(collect);
  }

  // Ollama native sometimes uses /api/tags not /v1/models — try sibling if empty
  if (ids.size === 0) {
    try {
      const ollamaBase = baseUrl.replace(/\/v1$/i, "");
      const tagsRes = await fetch(`${ollamaBase}/api/tags`, {
        method: "GET",
        signal: params.signal,
      });
      if (tagsRes.ok) {
        const tagsJson = (await tagsRes.json()) as {
          models?: Array<{ name?: string; model?: string }>;
        };
        for (const m of tagsJson.models ?? []) {
          const id = m.name || m.model;
          if (id) ids.add(id);
        }
      }
    } catch {
      // ignore ollama fallback errors
    }
  }

  return Array.from(ids)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ id }));
}

/**
 * Lightweight connectivity check: list models, or fall back to a tiny completion.
 */
export async function testProviderConnection(params: {
  baseUrl: string;
  apiKey: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<{ ok: true; modelCount: number; sampleModels: string[] } | never> {
  const models = await listProviderModels({
    baseUrl: params.baseUrl,
    apiKey: params.apiKey,
    signal: params.signal,
  });

  if (models.length > 0) {
    return {
      ok: true,
      modelCount: models.length,
      sampleModels: models.slice(0, 8).map((m) => m.id),
    };
  }

  // Models endpoint empty — try a minimal completion if model provided
  if (params.model?.trim()) {
    await callProvider({
      baseUrl: params.baseUrl,
      apiKey: params.apiKey,
      model: params.model.trim(),
      messages: [
        { role: "user", content: 'Reply with exactly: ok' },
      ],
      maxTokens: 16,
      temperature: 0,
      stage: "test",
      signal: params.signal,
    });
    return { ok: true, modelCount: 0, sampleModels: [params.model.trim()] };
  }

  throw new ProviderError(
    "Connected, but no models were returned. Enter a model id manually.",
    200,
    "empty models",
    "test",
  );
}
