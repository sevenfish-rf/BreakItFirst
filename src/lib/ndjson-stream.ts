const encoder = new TextEncoder();

/**
 * Encode one NDJSON event + ~4KB pad so proxies flush chunks promptly.
 * Padding lines start with `:` (ignored by client).
 */
export function encodeFlushedNdjson(obj: unknown): Uint8Array {
  const line = `${JSON.stringify(obj)}\n`;
  const minBytes = 4096;
  if (line.length >= minBytes) {
    return encoder.encode(line);
  }
  const padLen = minBytes - line.length;
  const pad = `:${" ".repeat(Math.max(0, padLen - 2))}\n`;
  return encoder.encode(line + pad);
}

export const NDJSON_STREAM_HEADERS: Record<string, string> = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-store, no-transform",
  "X-Accel-Buffering": "no",
  "X-Content-Type-Options": "nosniff",
  Connection: "keep-alive",
};
