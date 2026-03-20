// Stores AI-generated responses for each expert (by index)
let responses = ["", "", "", "", "", ""];

// Stores follow-up conversation history per expert
let chatHistories = [[], [], [], [], [], []];

// Cached prompt templates loaded from /prompts/*.md
let promptTemplates = {};

// ─── Markdown rendering ───────────────────────────────────────────────────────

function parseInlineMd(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(text) {
  var container = document.createDocumentFragment();
  text.split(/\r?\n/).forEach(function(rawLine) {
    var line = rawLine.trimEnd();
    var el;
    var h3 = line.match(/^###\s+(.+)/);
    var h2 = line.match(/^##\s+(.+)/);
    var h1 = line.match(/^#\s+(.+)/);
    if (h3) { el = document.createElement("h3"); el.className = "md-h3"; el.innerHTML = parseInlineMd(h3[1]); }
    else if (h2) { el = document.createElement("h2"); el.className = "md-h2"; el.innerHTML = parseInlineMd(h2[1]); }
    else if (h1) { el = document.createElement("h1"); el.className = "md-h1"; el.innerHTML = parseInlineMd(h1[1]); }
    else if (line.trim() === "---" || line.trim() === "***") { el = document.createElement("hr"); el.className = "md-hr"; }
    else if (/^[\s]*[-*+] /.test(line)) { el = document.createElement("li"); el.className = "md-li"; el.innerHTML = parseInlineMd(line.replace(/^[\s]*[-*+] /, "")); }
    else if (/^\d+\. /.test(line)) { el = document.createElement("li"); el.className = "md-li md-oli"; el.innerHTML = parseInlineMd(line.replace(/^\d+\. /, "")); }
    else if (line.trim() === "") { el = document.createElement("div"); el.className = "md-spacer"; }
    else { el = document.createElement("p"); el.className = "md-p"; el.innerHTML = parseInlineMd(line); }
    container.appendChild(el);
  });
  return container;
}

// ─── Show / hide panels ───────────────────────────────────────────────────────

function showAgent(index) {
  document.querySelectorAll(".agent-panel").forEach(function (p) {
    p.classList.remove("active");
  });
  document.querySelectorAll(".nav-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  document.getElementById("agent-" + index).classList.add("active");
  document.querySelectorAll(".nav-btn")[index].classList.add("active");
}

// ─── Load prompt templates from /prompts/*.md ─────────────────────────────────

const PROMPT_FILES = [
  "psychologist",
  "political-strategist",
  "negotiation-expert",
  "contrarian",
  "mentor",
  "boardroom",
];

async function loadPrompts() {
  await Promise.all(PROMPT_FILES.map(async function (name, i) {
    try {
      const res = await fetch("/prompts/" + name + ".md");
      if (res.ok) promptTemplates[i] = await res.text();
    } catch (e) {
      // Will fall back to empty string — generate() will catch the missing prompt
    }
  }));
}

// ─── Build prompts ────────────────────────────────────────────────────────────

function buildPrompt(index) {
  const template = promptTemplates[index] || "";
  const conflict = document.getElementById("conflictDescription").value || "not specified";

  const notes = [];
  document.querySelectorAll("#agent-" + index + " textarea").forEach(function (ta) {
    if (ta.value.trim()) notes.push(ta.value.trim());
  });
  const userNotes = notes.length ? "\n\nUser's responses:\n" + notes.join("\n\n") : "";

  const psych    = responses[0] ? "\n\nPsychologist's advice:\n" + responses[0] : "";
  const politics = responses[1] ? "\n\nPolitical Strategist's advice:\n" + responses[1] : "";
  const negot    = responses[2] ? "\n\nNegotiation Expert's advice:\n" + responses[2] : "";
  const contrary = responses[3] ? "\n\nContrarian's advice:\n" + responses[3] : "";
  const mentor   = responses[4] ? "\n\nMentor's advice:\n" + responses[4] : "";

  return template
    .replace("{{conflict}}", conflict)
    .replace("{{userNotes}}", userNotes)
    .replace("{{psych}}", psych)
    .replace("{{politics}}", politics)
    .replace("{{negot}}", negot)
    .replace("{{contrary}}", contrary)
    .replace("{{mentor}}", mentor)
    .trim();
}

// ─── Append a chat bubble ─────────────────────────────────────────────────────

function appendChatBubble(chatArea, role, text) {
  const msg = document.createElement("div");
  msg.className = "chat-message " + role;
  msg.textContent = text;
  chatArea.insertBefore(msg, chatArea.lastChild);
}

// ─── Display a response with copy button and follow-up chat ──────────────────

function showResponse(index, text) {
  const area = document.getElementById("response-" + index);
  area.className = "response-area visible";
  area.innerHTML = "";

  const mdDiv = document.createElement("div");
  mdDiv.appendChild(renderMarkdown(text));
  area.appendChild(mdDiv);

  const btn = document.createElement("button");
  btn.className = "copy-response-btn";
  btn.textContent = "Copy response";
  btn.onclick = function () {
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied!";
      setTimeout(function () { btn.textContent = "Copy response"; }, 2000);
    });
  };
  area.appendChild(btn);

  const chatArea = document.createElement("div");
  chatArea.className = "chat-area";

  if (chatHistories[index] && chatHistories[index].length > 0) {
    chatHistories[index].forEach(function (msg) {
      appendChatBubble(chatArea, msg.role, msg.content);
    });
  }

  const inputRow = document.createElement("div");
  inputRow.className = "chat-input-row";

  const input = document.createElement("textarea");
  input.className = "followup-input";
  input.placeholder = "Ask a follow-up question... (Enter to send, Shift+Enter for new line)";
  input.rows = 2;

  const askBtn = document.createElement("button");
  askBtn.className = "followup-btn";
  askBtn.textContent = "Ask →";
  askBtn.onclick = function () {
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    followUp(index, question, chatArea, askBtn);
  };

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askBtn.click();
    }
  });

  inputRow.appendChild(input);
  inputRow.appendChild(askBtn);
  chatArea.appendChild(inputRow);
  area.appendChild(chatArea);
}

// ─── Follow-up conversation ───────────────────────────────────────────────────

async function followUp(index, question, chatArea, askBtn) {
  askBtn.disabled = true;
  askBtn.textContent = "Thinking...";

  appendChatBubble(chatArea, "user", question);

  const thinking = document.createElement("div");
  thinking.className = "chat-message assistant chat-thinking";
  thinking.textContent = "Thinking...";
  chatArea.insertBefore(thinking, chatArea.lastChild);

  const messages = [
    { role: "user", content: buildPrompt(index) },
    { role: "assistant", content: responses[index] }
  ];
  chatHistories[index].forEach(function (msg) {
    messages.push(msg);
  });
  messages.push({ role: "user", content: question });

  chatHistories[index].push({ role: "user", content: question });

  const jobId = "job-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  try {
    await fetch("/.netlify/functions/claude-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, jobId: jobId, agentIndex: index })
    });

    const result = await pollForResult(jobId, thinking);
    chatHistories[index].push({ role: "assistant", content: result });
    saveChatHistories();

    thinking.className = "chat-message assistant";
    thinking.textContent = result;

  } catch (error) {
    thinking.className = "chat-message assistant error";
    thinking.textContent = "Error: " + error.message;
    chatHistories[index].pop();
  }

  askBtn.disabled = false;
  askBtn.textContent = "Ask →";
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function generate(index) {
  const conflict = document.getElementById("conflictDescription").value.trim();
  if (!conflict) {
    alert("Please describe your conflict situation at the top first.");
    return;
  }

  if (index === 5 && !responses[0] && !responses[1] && !responses[2] && !responses[3] && !responses[4]) {
    alert("Get advice from at least one expert first before convening the Boardroom.");
    return;
  }

  const responseArea = document.getElementById("response-" + index);
  const btn = document.querySelector("#agent-" + index + " .generate-btn");

  const jobId = "job-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  btn.disabled = true;
  btn.textContent = "Thinking...";
  responseArea.className = "response-area loading";
  responseArea.textContent = index === 5
    ? "The boardroom is convening... this may take a couple of minutes."
    : "Your advisor is thinking...";

  try {
    await fetch("/.netlify/functions/claude-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildPrompt(index), jobId: jobId, agentIndex: index })
    });

    const result = await pollForResult(jobId, responseArea);
    responses[index] = result;
    saveResponses();
    showResponse(index, result);

  } catch (error) {
    responseArea.className = "response-area error";
    responseArea.textContent = "Something went wrong: " + error.message;
  }

  btn.disabled = false;
  btn.textContent = "Regenerate →";
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

function pollForResult(jobId, responseArea) {
  return new Promise(function (resolve, reject) {
    let attempts = 0;
    const maxAttempts = 150;

    const interval = setInterval(async function () {
      attempts++;

      if (attempts % 5 === 0) {
        responseArea.textContent = "Still thinking... (" + (attempts * 2) + "s)";
      }

      if (attempts > maxAttempts) {
        clearInterval(interval);
        reject(new Error("Timed out. Please try again."));
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/poll?jobId=" + jobId);
        const data = await res.json();

        if (data.status === "done") {
          clearInterval(interval);
          resolve(data.result);
        } else if (data.status === "error") {
          clearInterval(interval);
          reject(new Error(data.error || "Something went wrong."));
        }
      } catch (err) {
        // Network blip — keep trying
      }
    }, 2000);
  });
}

// ─── Save & load ──────────────────────────────────────────────────────────────

function save() {
  const data = { conflictDescription: document.getElementById("conflictDescription").value };
  document.querySelectorAll("textarea").forEach(function (ta) {
    data[ta.id] = ta.value;
  });
  localStorage.setItem("conflictAdvisor", JSON.stringify(data));
}

function saveResponses() {
  localStorage.setItem("conflictAdvisorResponses", JSON.stringify(responses));
}

function saveChatHistories() {
  localStorage.setItem("conflictAdvisorChats", JSON.stringify(chatHistories));
}

function load() {
  const saved = localStorage.getItem("conflictAdvisor");
  if (saved) {
    const data = JSON.parse(saved);
    if (data.conflictDescription) document.getElementById("conflictDescription").value = data.conflictDescription;
    document.querySelectorAll("textarea").forEach(function (ta) {
      if (data[ta.id]) ta.value = data[ta.id];
    });
  }

  const savedResponses = localStorage.getItem("conflictAdvisorResponses");
  if (savedResponses) {
    responses = JSON.parse(savedResponses);
    while (responses.length < 6) responses.push("");
  }

  const savedChats = localStorage.getItem("conflictAdvisorChats");
  if (savedChats) {
    chatHistories = JSON.parse(savedChats);
    while (chatHistories.length < 6) chatHistories.push([]);
  }

  responses.forEach(function (text, index) {
    if (text) {
      showResponse(index, text);
      const btn = document.querySelector("#agent-" + index + " .generate-btn");
      if (btn) btn.textContent = "Regenerate →";
    }
  });
}

function clearAll() {
  if (confirm("Clear all your notes and advisor responses?")) {
    localStorage.removeItem("conflictAdvisor");
    localStorage.removeItem("conflictAdvisorResponses");
    localStorage.removeItem("conflictAdvisorChats");
    responses = ["", "", "", "", "", ""];
    chatHistories = [[], [], [], [], [], []];
    document.getElementById("conflictDescription").value = "";
    document.querySelectorAll("textarea").forEach(function (ta) { ta.value = ""; });
    document.querySelectorAll(".response-area").forEach(function (r) {
      r.className = "response-area";
      r.textContent = "";
    });
    window.location.reload();
  }
}

// ─── Copy questions & answers ─────────────────────────────────────────────────

function copyNotes(index) {
  const agentNames = ["Psychologist", "Political Strategist", "Negotiation Expert", "Contrarian", "Mentor", "The Boardroom"];
  const conflict = document.getElementById("conflictDescription").value || "Not specified";

  let text = "CONFLICT SITUATION:\n" + conflict + "\n\n";
  text += "=== " + agentNames[index] + " ===\n\n";

  document.querySelectorAll("#agent-" + index + " .question").forEach(function (q) {
    const label = q.querySelector("label").textContent.trim();
    const answer = q.querySelector("textarea").value.trim();
    text += label + "\n";
    text += (answer || "(No answer provided)") + "\n\n";
  });

  navigator.clipboard.writeText(text).then(function () {
    showToast("Notes copied!");
  });
}

// ─── Export all as PDF ────────────────────────────────────────────────────────

function exportAllPDF() {
  if (!window.jspdf) {
    alert("PDF library not loaded. Make sure you have an internet connection.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 2 * margin;
  let y = margin;

  function checkPage(needed) {
    if (y + (needed || 14) > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addText(text, size, bold, r, g, b) {
    doc.setFontSize(size || 10);
    doc.setTextColor(r || 40, g || 40, b || 40);
    doc.setFont(undefined, bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(String(text || ""), maxWidth);
    checkPage(lines.length * (size || 10) * 0.45 + 4);
    doc.text(lines, margin, y);
    y += lines.length * (size || 10) * 0.45 + 4;
  }

  function addDivider() {
    checkPage(10);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  const agentNames = ["Psychologist", "Political Strategist", "Negotiation Expert", "Contrarian", "Mentor", "The Boardroom"];

  // Cover info
  addText("Conflict Advisor Report", 20, true, 20, 20, 20);
  addText(new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }), 10, false, 120, 120, 120);
  y += 6;
  addDivider();

  addText("CONFLICT SITUATION", 11, true, 80, 80, 80);
  y += 2;
  addText(document.getElementById("conflictDescription").value || "Not specified", 10, false, 40, 40, 40);

  // Each advisor
  agentNames.forEach(function (name, index) {
    doc.addPage();
    y = margin;

    addText(name, 16, true, 20, 20, 20);
    y += 4;

    // Questions & answers
    document.querySelectorAll("#agent-" + index + " .question").forEach(function (q) {
      const label = q.querySelector("label").textContent.trim();
      const answer = q.querySelector("textarea").value.trim();
      addText(label, 9, true, 80, 80, 80);
      addText(answer || "(No answer provided)", 9, false, 60, 60, 60);
      y += 2;
    });

    y += 4;
    addDivider();

    addText("ADVISOR'S ANALYSIS", 10, true, 80, 80, 80);
    y += 2;

    if (responses[index]) {
      addText(responses[index], 10, false, 40, 40, 40);
    } else {
      addText("No response generated yet.", 10, false, 150, 150, 150);
    }
  });

  doc.save("conflict-advisor-report.pdf");
}

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message || "Copied!";
  toast.classList.add("show");
  setTimeout(function () { toast.classList.remove("show"); }, 2000);
}

// ─── Vote feature ─────────────────────────────────────────────────────────────

var ADVISOR_META = {
  PSYCHOLOGIST:         { name: "Psychologist",       icon: "🧠" },
  POLITICAL_STRATEGIST: { name: "Political Strategist", icon: "♟️" },
  NEGOTIATION_EXPERT:   { name: "Negotiation Expert",  icon: "🤝" },
  CONTRARIAN:           { name: "Contrarian",          icon: "😈" },
  MENTOR:               { name: "Mentor",              icon: "🧭" },
};

function buildVoteQuestionsPrompt() {
  var conflict = document.getElementById("conflictDescription").value || "not specified";
  var summaries = [
    responses[0] ? "Psychologist: " + responses[0].slice(0, 250) : "",
    responses[1] ? "Political Strategist: " + responses[1].slice(0, 250) : "",
    responses[2] ? "Negotiation Expert: " + responses[2].slice(0, 250) : "",
    responses[3] ? "Contrarian: " + responses[3].slice(0, 250) : "",
    responses[4] ? "Mentor: " + responses[4].slice(0, 250) : "",
    responses[5] ? "Boardroom synthesis: " + responses[5].slice(0, 250) : "",
  ].filter(Boolean).join("\n\n");

  return "You are the Mentor — chair of this advisory session. Distill the core decision into 3-5 yes/no questions for the full panel to vote on.\n\nConflict:\n\"" + conflict + "\"\n\n" + (summaries ? "Advisor perspectives:\n" + summaries + "\n\n" : "") + "Rules:\n- The FIRST question must always be the fundamental binary: take action vs. do not act.\n- Subsequent questions address what kind of action, if any.\n- Keep each question short and directly answerable with yes or no.\n- No personal details about the user.\n\nOutput ONLY this format, one per line:\nQUESTION: [question text]";
}

function buildVotingPrompt(question) {
  var conflict = document.getElementById("conflictDescription").value || "not specified";
  var ctx = [
    responses[0] ? "Psychologist: " + responses[0].slice(0, 150) : "",
    responses[1] ? "Political Strategist: " + responses[1].slice(0, 150) : "",
    responses[2] ? "Negotiation Expert: " + responses[2].slice(0, 150) : "",
    responses[3] ? "Contrarian: " + responses[3].slice(0, 150) : "",
    responses[4] ? "Mentor: " + responses[4].slice(0, 150) : "",
  ].filter(Boolean).join("\n");

  return "Simulate a vote among five advisors on this question. Each votes YES or NO and gives exactly one sentence explaining their reasoning — staying in character.\n\nQuestion: \"" + question + "\"\n\nConflict: \"" + conflict + "\"\n\n" + ctx + "\n\nOutput ONLY in this exact format, one line per advisor:\nPSYCHOLOGIST|YES|One sentence reason.\nPOLITICAL_STRATEGIST|YES|One sentence reason.\nNEGOTIATION_EXPERT|NO|One sentence reason.\nCONTRARIAN|NO|One sentence reason.\nMENTOR|YES|One sentence reason.";
}

function parseVoteQuestions(text) {
  return text.split("\n")
    .map(function(line) { return line.trim(); })
    .filter(function(line) { return line.toUpperCase().startsWith("QUESTION:"); })
    .map(function(line) { return line.replace(/^QUESTION:\s*/i, "").trim(); });
}

function parseVotes(text) {
  var votes = [];
  text.split("\n").forEach(function(line) {
    var parts = line.trim().split("|");
    if (parts.length >= 3) {
      var key = parts[0].trim().toUpperCase().replace(/\s+/g, "_");
      var voteVal = parts[1].trim().toUpperCase();
      var reason = parts.slice(2).join("|").trim();
      var meta = ADVISOR_META[key];
      if (meta && (voteVal === "YES" || voteVal === "NO")) {
        votes.push({ name: meta.name, icon: meta.icon, vote: voteVal, reason: reason });
      }
    }
  });
  return votes;
}

function displayVoteResults(questions) {
  var container = document.getElementById("vote-results");
  container.innerHTML = "";

  questions.forEach(function(qData, qIndex) {
    var yesCount = qData.votes.filter(function(v) { return v.vote === "YES"; }).length;
    var noCount  = qData.votes.filter(function(v) { return v.vote === "NO"; }).length;
    var total = qData.votes.length || 1;
    var yesPct = Math.round((yesCount / total) * 100);

    var badgeClass, badgeText;
    if (qIndex === 0) {
      if (yesCount > noCount)      { badgeClass = "action";    badgeText = "Take action — " + yesCount + " YES · " + noCount + " NO"; }
      else if (noCount > yesCount) { badgeClass = "no-action"; badgeText = "Do not act — " + noCount + " NO · " + yesCount + " YES"; }
      else                         { badgeClass = "split";     badgeText = "Split decision — " + yesCount + " YES · " + noCount + " NO"; }
    } else {
      if (yesCount > noCount)      { badgeClass = "action";    badgeText = yesCount + " YES · " + noCount + " NO"; }
      else if (noCount > yesCount) { badgeClass = "no-action"; badgeText = noCount + " NO · " + yesCount + " YES"; }
      else                         { badgeClass = "split";     badgeText = "Split — " + yesCount + " YES · " + noCount + " NO"; }
    }

    var card = document.createElement("div");
    card.className = "vote-question-card";

    var qText = document.createElement("div");
    qText.className = "vote-question-text";
    qText.textContent = qData.question;
    card.appendChild(qText);

    var badge = document.createElement("div");
    badge.className = "vote-decision-badge " + badgeClass;
    badge.textContent = badgeText;
    card.appendChild(badge);

    var rows = document.createElement("div");
    rows.className = "vote-rows";
    qData.votes.forEach(function(v) {
      var row = document.createElement("div");
      row.className = "vote-row";

      var advisorDiv = document.createElement("div");
      advisorDiv.className = "vote-advisor";
      advisorDiv.innerHTML = "<span class='vote-icon'>" + v.icon + "</span><span class='vote-name'>" + v.name + "</span>";

      var voteBadge = document.createElement("span");
      voteBadge.className = "vote-badge " + v.vote.toLowerCase();
      voteBadge.textContent = v.vote;

      var reason = document.createElement("span");
      reason.className = "vote-reason";
      reason.textContent = v.reason;

      row.appendChild(advisorDiv);
      row.appendChild(voteBadge);
      row.appendChild(reason);
      rows.appendChild(row);
    });
    card.appendChild(rows);

    var tally = document.createElement("div");
    tally.className = "vote-tally";
    tally.innerHTML = "<div class='vote-tally-bar'><div class='vote-tally-fill' style='width:" + yesPct + "%'></div></div><div class='vote-tally-counts'>" + yesCount + " YES · " + noCount + " NO</div>";
    card.appendChild(tally);

    container.appendChild(card);
  });
}

async function generateVote() {
  var conflict = document.getElementById("conflictDescription").value.trim();
  if (!conflict) { alert("Please describe your conflict situation first."); return; }

  var hasResponse = responses.some(function(r) { return r; });
  if (!hasResponse) { alert("Get advice from at least one advisor before convening the vote."); return; }

  var btn = document.querySelector("#agent-6 .generate-btn");
  var statusDiv = document.getElementById("vote-status");
  var resultsDiv = document.getElementById("vote-results");

  btn.disabled = true;
  btn.textContent = "Convening...";
  statusDiv.className = "vote-status visible";
  statusDiv.textContent = "The Mentor is framing the key questions...";
  resultsDiv.innerHTML = "";

  try {
    // Step 1: Generate questions
    var qJobId = "job-" + Date.now() + "-vq";
    await fetch("/.netlify/functions/claude-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildVoteQuestionsPrompt(), jobId: qJobId, agentIndex: 6 })
    });
    var questionsText = await pollForResult(qJobId, statusDiv);
    var questions = parseVoteQuestions(questionsText);
    if (!questions.length) throw new Error("Could not generate questions — please try again.");

    // Step 2: Vote on each question
    var voteResults = [];
    for (var i = 0; i < questions.length; i++) {
      statusDiv.textContent = "Advisors voting on question " + (i + 1) + " of " + questions.length + "...";
      var vJobId = "job-" + Date.now() + "-vv" + i;
      await fetch("/.netlify/functions/claude-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildVotingPrompt(questions[i]), jobId: vJobId, agentIndex: 6 })
      });
      var votesText = await pollForResult(vJobId, statusDiv);
      voteResults.push({ question: questions[i], votes: parseVotes(votesText) });
    }

    statusDiv.className = "vote-status";
    displayVoteResults(voteResults);

  } catch (err) {
    statusDiv.textContent = "Error: " + err.message;
  }

  btn.disabled = false;
  btn.textContent = "Re-convene the Vote →";
}

// ─── Start ────────────────────────────────────────────────────────────────────
loadPrompts().then(load);
