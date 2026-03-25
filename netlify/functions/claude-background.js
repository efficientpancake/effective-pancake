// Background function — runs for up to 15 minutes, no timeout issues.
const { getStore } = require("@netlify/blobs");

const VALID_AGENT_INDICES = [0, 1, 2, 3, 4, 5, 6];
const JOB_ID_PATTERN = /^job-\d+-[a-z0-9]+$/;

exports.handler = async function (event) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const secret = event.headers["x-function-secret"];
  if (!secret || secret !== process.env.FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // ── Input validation ────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { prompt, messages: msgs, jobId, agentIndex } = body;

  if (!jobId || typeof jobId !== "string" || !JOB_ID_PATTERN.test(jobId)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid jobId" }) };
  }

  if (!VALID_AGENT_INDICES.includes(agentIndex)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid agentIndex" }) };
  }

  const messages = msgs || (prompt ? [{ role: "user", content: prompt }] : null);
  if (!messages || !messages.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "No prompt or messages provided" }) };
  }

  // ── Model selection ─────────────────────────────────────────────────────────
  // Agents 0-2 use Sonnet. Agents 3 (Contrarian), 4 (Mentor), 5 (Boardroom) use Opus. Agent 6 (Vote) uses Sonnet.
  const model = (agentIndex <= 2 || agentIndex === 6) ? "claude-sonnet-4-6" : "claude-opus-4-6";

  const store = getStore({
    name: "jobs",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN
  });

  try {
    await store.set(jobId, JSON.stringify({ status: "pending" }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: agentIndex === 5 ? 8000 : 6000,
        messages: messages
      })
    });

    const data = await response.json();
    console.log("Anthropic status:", response.status, "Model:", model);

    if (data.content && data.content[0]) {
      await store.set(jobId, JSON.stringify({
        status: "done",
        result: data.content[0].text
      }));
    } else {
      await store.set(jobId, JSON.stringify({
        status: "error",
        error: data.error?.message || "Unknown error from Claude"
      }));
    }
  } catch (err) {
    console.log("Background function error:", err.message);
    await store.set(jobId, JSON.stringify({
      status: "error",
      error: err.message
    }));
  }
};
