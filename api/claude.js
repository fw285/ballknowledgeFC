// Draft Night FC: server function that talks to Claude.
// Your Anthropic API key lives in Vercel's environment variables, never in the page.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  (required) your key from console.anthropic.com
//   ACCESS_CODE        (recommended) a password players type in the lobby
//   MODEL_QUICK        (optional) model for referee rulings, default claude-haiku-4-5-20251001
//   MODEL_DEFAULT      (optional) model for the match dossier/commentary, default claude-sonnet-5-5

const hits = new Map(); // simple per-IP rate limit (per server instance)
const LIMIT_PER_MIN = 40;

const MODEL_QUICK = () => process.env.MODEL_QUICK || "claude-haiku-4-5-20251001";
const MODEL_DEFAULT = () => process.env.MODEL_DEFAULT || "claude-sonnet-5-5";

async function callClaude(model, maxTokens, prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      system: "You are the referee and commentator for a friendly football draft game. When asked for JSON, reply with only valid JSON.",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const j = await r.json().catch(() => ({}));
  return { r, j };
}

module.exports = async (req, res) => {
  // Health check: open /api/claude in a browser. Add ?test=1&code=YOUR_ACCESS_CODE to make one tiny real call per model.
  if (req.method === "GET") {
    const out = {
      functionDeployed: true,
      apiKeySet: !!process.env.ANTHROPIC_API_KEY,
      accessCodeSet: !!process.env.ACCESS_CODE,
      models: { referee: MODEL_QUICK(), commentary: MODEL_DEFAULT() }
    };
    const q = req.query || {};
    const wantTest = q.test === "1" || /[?&]test=1/.test(req.url || "");
    const codeOk = !process.env.ACCESS_CODE || q.code === process.env.ACCESS_CODE || new RegExp("[?&]code=" + encodeURIComponent(process.env.ACCESS_CODE) + "(&|$)").test(req.url || "");
    if (wantTest && !codeOk) out.test = "Add &code=YOUR_ACCESS_CODE to the address to run the live test.";
    if (wantTest && codeOk && out.apiKeySet) {
      for (const [label, model] of [["referee", MODEL_QUICK()], ["commentary", MODEL_DEFAULT()]]) {
        try {
          const { r, j } = await callClaude(model, 5, "Say ok.");
          out["test_" + label] = r.ok ? "ok" : `${r.status} ${(j.error && j.error.message) || "error"}`;
        } catch (e) { out["test_" + label] = "network error: " + String(e); }
      }
    }
    return res.status(200).json(out);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const code = String(req.headers["x-access-code"] || "");
  if (process.env.ACCESS_CODE && code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "bad_code" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "missing_key", message: "ANTHROPIC_API_KEY is not set on the server." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= LIMIT_PER_MIN) return res.status(429).json({ error: "rate_limited" });
  recent.push(now); hits.set(ip, recent);

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const prompt = body && body.prompt;
  const tier = body && body.tier === "quick" ? "quick" : "default";
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 60000) {
    return res.status(400).json({ error: "bad_prompt" });
  }

  const model = tier === "quick" ? MODEL_QUICK() : MODEL_DEFAULT();

  try {
    const { r, j } = await callClaude(model, tier === "quick" ? 1200 : 4000, prompt);
    if (!r.ok) {
      return res.status(r.status === 429 ? 429 : 502).json({ error: (j.error && j.error.type) || "upstream_error", message: (j.error && j.error.message) || "" });
    }
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text, truncated: j.stop_reason === "max_tokens" });
  } catch (e) {
    return res.status(502).json({ error: "upstream_error", message: String(e) });
  }
};
