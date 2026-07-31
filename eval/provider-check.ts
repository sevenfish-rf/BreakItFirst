/**
 * Provider preflight for the Q10 stability run.
 *
 * Answers one question before you spend ~60 calls on `eval:stability`:
 * "will this provider + these two model ids actually complete an analysis?"
 * It costs ~2 tiny calls, not 60. Steps, cheapest first:
 *   1. Are the 4 BIF_* env vars present?              (no call)
 *   2. GET /models — base URL reachable + key valid   (1 call; empty list is OK)
 *   3. Is each of PASS1/PASS2 in that list?           (warn only — some gateways
 *      serve models they don't advertise, so a miss is a caution, not a stop)
 *   4. One ~32-token chat call on PASS1               (proves chat works)
 *   5. One ~32-token JSON-mode call on PASS2          (proves the structuring
 *      step's response_format path works — the part most likely to break on a
 *      picky gateway, and the one that turns into 'failed' rows if it doesn't)
 *
 * Never prints the API key; only the provider host. Exit 0 = clear to run the
 * suite; exit 1 = fix the reported line first. Touches no prompt and no schema
 * rule — it only exercises transport, so it is legal under the engine freeze.
 */
import {
  listProviderModels,
  callProvider,
  ProviderError,
} from "../src/lib/provider-client";
import { hostOf } from "./provider-host";

type Env = { baseUrl: string; apiKey: string; pass1: string; pass2: string };

function readEnv(): Env | null {
  const baseUrl = process.env.BIF_BASE_URL?.trim() ?? "";
  const apiKey = process.env.BIF_API_KEY?.trim() ?? "";
  const pass1 = process.env.BIF_PASS1_MODEL?.trim() ?? "";
  const pass2 = process.env.BIF_PASS2_MODEL?.trim() ?? "";
  const missing = [
    !baseUrl && "BIF_BASE_URL",
    !apiKey && "BIF_API_KEY",
    !pass1 && "BIF_PASS1_MODEL",
    !pass2 && "BIF_PASS2_MODEL",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    console.error("Set all four, then re-run. See eval/env.example.");
    return null;
  }
  return { baseUrl, apiKey, pass1, pass2 };
}

async function tinyCall(
  tag: string,
  label: string,
  env: Env,
  model: string,
  jsonMode: boolean,
  problems: string[],
): Promise<void> {
  const t0 = Date.now();
  try {
    const text = await callProvider({
      baseUrl: env.baseUrl,
      apiKey: env.apiKey,
      model,
      messages: [
        jsonMode
          ? {
              role: "user",
              content: 'Return this exact JSON and nothing else: {"ok":true}',
            }
          : { role: "user", content: "Reply with exactly: ok" },
      ],
      maxTokens: 32,
      temperature: 0,
      jsonMode,
      stage: jsonMode ? "pass2" : "pass1",
    });
    const ms = Date.now() - t0;
    const preview = text.trim().slice(0, 48).replace(/\s+/g, " ");
    console.log(`[${tag}] ${label} OK (${ms}ms) — "${preview}"`);
  } catch (err) {
    const status = err instanceof ProviderError ? ` status=${err.status}` : "";
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${tag}] ${label} FAILED${status} — ${msg}`);
    problems.push(label);
  }
}

async function main(): Promise<void> {
  const env = readEnv();
  if (!env) process.exit(1);

  console.log(`Provider preflight → host ${hostOf(env.baseUrl)}`);
  console.log(`  Pass 1 model: ${env.pass1}`);
  console.log(`  Pass 2 model: ${env.pass2}\n`);

  const problems: string[] = [];
  let listedIds: string[] = [];

  // [1/4] Auth + reachability via GET /models.
  try {
    const models = await listProviderModels({
      baseUrl: env.baseUrl,
      apiKey: env.apiKey,
    });
    listedIds = models.map((m) => m.id);
    console.log(`[1/4] GET /models OK — ${listedIds.length} model(s) listed`);
  } catch (err) {
    const status = err instanceof ProviderError ? ` status=${err.status}` : "";
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[1/4] GET /models FAILED${status} — ${msg}`);
    // Not always fatal: some providers block /models but serve chat. The live
    // calls below are the real gate, so record it as a caution and continue.
    problems.push("models endpoint (auth or base URL) — verify below still passed");
  }

  // [2/4] Are the two model ids advertised? Warn only.
  for (const [label, id] of [
    ["Pass 1", env.pass1],
    ["Pass 2", env.pass2],
  ] as const) {
    if (listedIds.length === 0) {
      console.log(
        `[2/4] ${label} "${id}" — cannot verify (no models listed); the live call decides`,
      );
    } else if (listedIds.includes(id)) {
      console.log(`[2/4] ${label} "${id}" — found in model list`);
    } else {
      console.log(
        `[2/4] ${label} "${id}" — NOT advertised (some gateways still serve it; the live call decides)`,
      );
    }
  }

  // [3/4] + [4/4] The real gates: one plain call, one JSON-mode call.
  await tinyCall("3/4", "Pass 1 chat call", env, env.pass1, false, problems);
  await tinyCall("4/4", "Pass 2 JSON-mode call", env, env.pass2, true, problems);

  console.log("");
  if (problems.some((p) => !p.startsWith("models endpoint"))) {
    console.error(`NOT READY — a live call failed: ${problems.join("; ")}`);
    console.error(
      "The full run would just fill REPORT.md with 'failed' rows until this passes.",
    );
    process.exit(1);
  }
  if (problems.length) {
    console.warn(`Caution: ${problems.join("; ")}`);
  }
  console.log("READY — provider completed both a chat call and a JSON-mode call.");
  console.log(
    "Next (cheap): BIF_ONLY=05-hardware-fitness-ring npm run eval:stability   (~12 calls)",
  );
  console.log(
    "Then (full):  npm run eval:stability                                     (~60 calls)",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
