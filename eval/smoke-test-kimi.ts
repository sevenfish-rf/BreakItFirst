async function main() {
  const baseUrl = "https://blitzbrigade925--ep-kimi-k3-server.us-west.modal.direct/v1";
  const modalKey = process.env.MODAL_KEY || "wk-i5xIxGsYXy23FwImBWnKCR";
  const modalSecret = process.env.MODAL_SECRET || "ws-s87ylE92ETopULnNEXrYTv";
  const model = "moonshotai/Kimi-K3";

  console.log(`=== STEP 2: SMOKE TEST (Modal Kimi K3 Managed Shared API) ===`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${model}`);

  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content: "You are a concise technical assistant. Reply with valid JSON only.",
      },
      {
        role: "user",
        content: "Extract the single point of failure (SPOF) for a 100% remote team relying on a single Slack workspace. Reply in JSON with keys 'spof' and 'reason'.",
      },
    ],
    temperature: 0.3,
    max_tokens: 256,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "spof_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            spof: { type: "string" },
            reason: { type: "string" },
          },
          required: ["spof", "reason"],
          additionalProperties: false,
        },
      },
    },
  };

  const startTime = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${modalKey}.${modalSecret}`,
        "Modal-Key": modalKey,
        "Modal-Secret": modalSecret,
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;
    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Request FAILED (${res.status}): ${errText}`);
      process.exit(1);
    }

    const data = (await res.json()) as Record<string, unknown>;
    console.log(`\n✅ STEP 2 SMOKE TEST SUCCEEDED in ${elapsed}ms!`);

    const choices = data.choices as Array<{ message?: { content?: string } }>;
    console.log(`Response Output:\n${choices?.[0]?.message?.content}`);

    const usage = data.usage as {
      prompt_tokens: number;
      completion_tokens: number;
      prompt_tokens_details?: { cached_tokens?: number };
      completion_tokens_details?: { reasoning_tokens?: number };
    } | undefined;

    if (usage) {
      console.log("\n--- STEP 5: TOKEN USAGE & MEASURED BILLING REPORT ---");
      console.log(`Total Prompt Tokens: ${usage.prompt_tokens}`);
      console.log(`Total Completion Tokens: ${usage.completion_tokens}`);

      const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
      const uncachedTokens = usage.prompt_tokens - cachedTokens;

      const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
      const genTokens = usage.completion_tokens - reasoningTokens;

      console.log(`  - Uncached Prompt Tokens ($3.00/MTok): ${uncachedTokens}`);
      console.log(`  - Cached Prompt Tokens ($0.30/MTok): ${cachedTokens}`);
      console.log(`  - Output Generation Tokens ($15.00/MTok): ${genTokens}`);
      console.log(`  - Output Reasoning Tokens ($15.00/MTok): ${reasoningTokens}`);

      const costUncached = (uncachedTokens / 1_000_000) * 3.00;
      const costCached = (cachedTokens / 1_000_000) * 0.30;
      const costCompletion = (genTokens / 1_000_000) * 15.00;
      const costReasoning = (reasoningTokens / 1_000_000) * 15.00;
      const totalCost = costUncached + costCached + costCompletion + costReasoning;

      console.log(`\n💰 Measured Cost per Call: $${totalCost.toFixed(6)}`);
      console.log(`📊 Estimated Runs Remaining on $30 Credit: ~${Math.floor(30 / (totalCost || 0.0001))} runs`);
    } else {
      console.log("\n⚠️ Provider response omitted usage details object.");
    }
  } catch (err) {
    console.error("❌ Execution Error:", err);
    process.exit(1);
  }
}

main();
