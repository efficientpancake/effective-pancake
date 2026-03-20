// Stores AI-generated responses for each expert (by index)
let responses = ["", "", "", "", "", ""];

// Stores follow-up conversation history per expert
let chatHistories = [[], [], [], [], [], []];

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

// ─── Build prompts ────────────────────────────────────────────────────────────

function buildPrompt(index) {
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

  const prompts = [
    // 0: Psychologist
    `You are an expert psychologist specialising in status dynamics, ego, and interpersonal conflict in professional and academic settings.

The conflict situation:
"${conflict}"${userNotes}

Analyse the psychological dynamics at play. What status needs are being triggered on both sides? What unconscious patterns might be driving this conflict? What is the emotionally intelligent path forward — one that protects their self-respect while keeping them strategically safe? Be direct and honest, even if it's uncomfortable to hear.`,

    // 1: Political Strategist
    `You are a sharp political strategist who specialises in navigating power dynamics in institutions — universities, corporations, and hierarchies of all kinds.

The conflict situation:
"${conflict}"${userNotes}

Map the power dynamics. Who holds formal power, and who holds informal power? What leverage does each party have? What are the political risks and opportunities? Give them a clear-eyed strategic playbook — not naive advice about "just talking it out," but real tactics for navigating institutional power while protecting their interests.`,

    // 2: Negotiation Expert
    `You are a world-class negotiation expert trained in both Harvard negotiation principles and real-world high-stakes deal-making.

The conflict situation:
"${conflict}"${userNotes}

Break down this conflict as a negotiation problem. What does each party actually want vs. what they say they want? Where are the zones of possible agreement? What concessions could be made without sacrificing core interests? Design a negotiation approach that maximises their chances of a good outcome without escalating the conflict.`,

    // 3: Contrarian
    `You are a sharp, intellectually honest contrarian. Your job is NOT to be supportive — it is to challenge assumptions, expose blind spots, and ask the questions nobody else will ask. You are not cruel, but you are unflinchingly honest.

The conflict situation:
"${conflict}"${userNotes}

Challenge them. What if they are wrong about this situation? What might they be doing to provoke or escalate this conflict without realising it? What would someone who completely disagrees with their framing say? Be rigorous, not unkind — your goal is to help them see what they cannot see themselves.`,

    // 4: Mentor
    `You are a wise, experienced mentor who has navigated many professional and institutional environments. You have seen careers flourish and derail, and you understand the long game.

The conflict situation:
"${conflict}"${userNotes}

Give them long-term perspective. What is the cost of winning this battle versus losing the war? How does this conflict look from the vantage point of five years from now? What would they regret? What is the wisest, most strategic path — not just for right now, but for who they want to become?`,

    // 5: The Boardroom
    `You are facilitating a high-stakes boardroom session. Five expert advisors have each independently counselled the same person on their conflict, and now they are sitting together to debate, challenge each other, and reach a unified recommendation.

The conflict situation:
"${conflict}"

Here is what each advisor said individually:
${psych}
${politics}
${negot}
${contrary}
${mentor}

Now simulate the boardroom debate. Each advisor should speak in character — challenging the others where they disagree, building on points where they align. The Contrarian should push back on anyone being too soft. The Political Strategist should challenge the Psychologist if they're being too idealistic. The Mentor should provide the long-term check on everyone else.

After the debate, end with a clear section titled "UNIFIED RECOMMENDATION" — a concrete, prioritised action plan that synthesises the best of all five perspectives. This should be practical and specific, not vague.`
  ];

  return prompts[index];
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

  const p = document.createElement("p");
  p.style.whiteSpace = "pre-wrap";
  p.textContent = text;
  area.appendChild(p);

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

// ─── Start ────────────────────────────────────────────────────────────────────
load();
