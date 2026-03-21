// This function is called every 2 seconds by the app to check if Claude is done.
const { getStore } = require("@netlify/blobs");

const JOB_ID_PATTERN = /^job-\d+-[a-z0-9]+$/;

exports.handler = async function (event) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const secret = event.headers["x-function-secret"];
  if (!secret || secret !== process.env.FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const jobId = event.queryStringParameters?.jobId;

  if (!jobId || typeof jobId !== "string" || !JOB_ID_PATTERN.test(jobId)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid jobId" }) };
  }

  try {
    const store = getStore({
      name: "jobs",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_TOKEN
    });
    const raw = await store.get(jobId);

    // Not ready yet
    if (!raw) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" })
      };
    }

    const data = JSON.parse(raw);

    // Clean up once we've retrieved a completed result
    if (data.status === "done" || data.status === "error") {
      await store.delete(jobId);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
