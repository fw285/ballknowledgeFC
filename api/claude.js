// Draft Night FC: server function that talks to Claude.
// Your Anthropic API key lives in Vercel's environment variables, never in the page.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY or finnapikey  (required) your key from console.anthropic.com
//   ACCESS_CODE or Access_code       (recommended) a password players type in the lobby
//   MODEL_FAST         (optional) model for the referee's first look (no web search), default claude-sonnet-5-5
//                      Also used for Claude's picks when you play against it and the pre-match dossier.
//                      A fast, cheap model (e.g. claude-haiku-5-5) suits it: rulings come back quicker.
//   MODEL_QUICK        (optional) model for referee rulings that need a web search, default claude-sonnet-5-5
//   MODEL_DEFAULT      (optional) model for the match dossier/commentary, default claude-sonnet-5-5
//   WEB_SEARCH         (optional) set to "off" to stop the referee looking things up

const hits = new Map(); // simple per-IP rate limit (per server instance)
const LIMIT_PER_MIN = 40;
const TIME_BUDGET_MS = 50000; // stay under Vercel's 60 s limit

// Read a setting by any of several names, ignoring capitalization.
function env(...names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  const want = names.map(n => n.toLowerCase());
  for (const [k, v] of Object.entries(process.env)) if (v && want.includes(k.toLowerCase())) return v;
  return "";
}
const API_KEY = () => env("ANTHROPIC_API_KEY", "finnapikey").trim();
const ACCESS = () => env("ACCESS_CODE", "Access_code").trim();
const SEARCH_ON = () => env("WEB_SEARCH").toLowerCase() !== "off";

const MODEL_FAST = () => env("MODEL_FAST") || "claude-sonnet-5-5";
const MODEL_QUICK = () => env("MODEL_QUICK") || "claude-sonnet-5-5";
const MODEL_DEFAULT = () => env("MODEL_DEFAULT") || "claude-sonnet-5-5";

function seasonNow() {
  const d = new Date(), y = d.getUTCFullYear();
  return d.getUTCMonth() >= 6 ? `${y}/${String(y + 1).slice(2)}` : `${y - 1}/${String(y).slice(2)}`;
}
function systemPrompt() {
  const today = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `You are the referee and commentator for a friendly football draft game. Today is ${today}; the current club season is ${seasonNow()}. When asked for JSON, your final reply must be only valid JSON.`;
}

// One Claude call. With search on, Claude may run web searches on Anthropic's side first.
async function callClaude(model, maxTokens, prompt, searches = 0) {
  const started = Date.now();
  const base = { model, max_tokens: maxTokens, system: systemPrompt() };
  if (searches > 0) base.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: searches }];
  const messages = [{ role: "user", content: prompt }];
  let r, j, rounds = 0;
  for (;;) {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY(), "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ ...base, messages })
    });
    j = await r.json().catch(() => ({}));
    // A long search turn can pause; send it back unchanged to let Claude finish.
    if (r.ok && j.stop_reason === "pause_turn" && rounds < 3 && Date.now() - started < TIME_BUDGET_MS - 15000) {
      messages.length = 1; messages.push({ role: "assistant", content: j.content });
      rounds++; continue;
    }
    break;
  }
  return { r, j };
}

// Keep only Claude's final answer: the text after its last search.
function finalText(content) {
  const blocks = content || [];
  let last = -1;
  blocks.forEach((b, i) => { if (b.type === "server_tool_use" || b.type === "web_search_tool_result") last = i; });
  return blocks.slice(last + 1).filter(b => b.type === "text").map(b => b.text).join("");
}

module.exports = async (req, res) => {
  // Health check: open /api/claude in a browser. Add ?test=1&code=YOUR_ACCESS_CODE to make tiny real calls.
  if (req.method === "GET") {
    const out = {
      functionDeployed: true,
      apiKeySet: !!API_KEY(),
      accessCodeSet: !!ACCESS(),
      webSearch: SEARCH_ON(),
      models: { refereeFast: MODEL_FAST(), referee: MODEL_QUICK(), commentary: MODEL_DEFAULT() }
    };
    const q = req.query || {};
    const wantTest = q.test === "1" || /[?&]test=1/.test(req.url || "");
    const given = String(q.code || "").trim();
    const codeOk = !ACCESS() || given === ACCESS() || given.toLowerCase() === ACCESS().toLowerCase();
    if (wantTest && !codeOk) out.test = "Add &code=YOUR_ACCESS_CODE to the address to run the live test.";
    if (wantTest && codeOk && out.apiKeySet) {
      for (const [label, model] of [["refereeFast", MODEL_FAST()], ["referee", MODEL_QUICK()], ["commentary", MODEL_DEFAULT()]]) {
        try {
          const { r, j } = await callClaude(model, 5, "Say ok.");
          out["test_" + label] = r.ok ? "ok" : `${r.status} ${(j.error && j.error.message) || "error"}`;
        } catch (e) { out["test_" + label] = "network error: " + String(e); }
      }
      if (SEARCH_ON()) {
        try {
          const { r, j } = await callClaude(MODEL_QUICK(), 300,
            "Use one web search to find which club Kylian Mbappé plays for right now. Reply with just the club name.", 1);
          const n = j.usage && j.usage.server_tool_use && j.usage.server_tool_use.web_search_requests;
          out.test_search = r.ok ? `ok (${n || 0} search) → ${finalText(j.content).trim().slice(0, 60)}` : `${r.status} ${(j.error && j.error.message) || "error"}`;
        } catch (e) { out.test_search = "network error: " + String(e); }
      }
    }
    return res.status(200).json(out);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const code = String(req.headers["x-access-code"] || "").trim();
  if (ACCESS() && code !== ACCESS() && code.toLowerCase() !== ACCESS().toLowerCase()) {
    return res.status(401).json({ error: "bad_code" });
  }
  if (!API_KEY()) {
    return res.status(500).json({ error: "missing_key", message: "The API key is not set on the server." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= LIMIT_PER_MIN) return res.status(429).json({ error: "rate_limited" });
  recent.push(now); hits.set(ip, recent);

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const prompt = body && body.prompt;
  const tier = body && (body.tier === "quick" || body.tier === "fast") ? body.tier : "default";
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 60000) {
    return res.status(400).json({ error: "bad_prompt" });
  }

  const model = tier === "fast" ? MODEL_FAST() : tier === "quick" ? MODEL_QUICK() : MODEL_DEFAULT();
  const searches = tier === "fast" ? 0 : body.search && SEARCH_ON() ? (tier === "quick" ? 2 : 4) : 0;

  try {
    const { r, j } = await callClaude(model, tier === "default" ? 4000 : 1500, prompt, searches);
    if (!r.ok) {
      return res.status(r.status === 429 ? 429 : 502).json({ error: (j.error && j.error.type) || "upstream_error", message: (j.error && j.error.message) || "" });
    }
    const used = (j.usage && j.usage.server_tool_use && j.usage.server_tool_use.web_search_requests) || 0;
    return res.status(200).json({ text: finalText(j.content), truncated: j.stop_reason === "max_tokens", searches: used });
  } catch (e) {
    return res.status(502).json({ error: "upstream_error", message: String(e) });
  }
};
