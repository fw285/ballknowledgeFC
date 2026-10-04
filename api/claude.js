// Draft Night FC: server function that talks to Claude.
// Your Anthropic API key lives in Vercel's environment variables, never in the page.
const hits = new Map();
const LIMIT_PER_MIN = 40;

module.exports = async (req, res) => {
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

  const model = tier === "quick"
    ? (process.env.MODEL_QUICK || "claude-haiku-4-5-20251001")
    : (process.env.MODEL_DEFAULT || "claude-sonnet-5-5");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: tier === "quick" ? 1200 : 4000,
        system: "You are the referee and commentator for a friendly football draft game. When asked for JSON, reply with only valid JSON.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status === 429 ? 429 : 502).json({ error: (j.error && j.error.type) || "upstream_error", message: (j.error && j.error.message) || "" });
    }
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text, truncated: j.stop_reason === "max_tokens" });
  } catch (e) {
    return res.status(502).json({ error: "upstream_error", message: String(e) });
  }
};
