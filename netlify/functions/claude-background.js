// Background function — runs for up to 15 minutes, no timeout issues.
const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  const { prompt, messages: msgs, jobId, agentIndex } = JSON.parse(event.body);
  const messages = msgs || [{ role: "user", content: prompt }];

  // Agents 0, 1, 2 use Haiku. Agents 3 (Contrarian), 4 (Mentor), 5 (Boardroom) use Opus.
  const model = agentIndex <= 2 ? "claude-haiku-4-5-20251001" : "claude-opus-4-6";

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
