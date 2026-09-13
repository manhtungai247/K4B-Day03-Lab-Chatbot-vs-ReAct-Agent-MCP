/**
 * 🏫 VINUNI AI COURSE - DAY 03 LAB DEMO UI
 * Frontend Application Logic (Vanilla JavaScript)
 */

let currentProvider = "gemini";
let currentStepMode = false;
let stepQueue = [];
let currentStepIndex = 0;
let cachedTestCases = [];

// ==============================================================================
// 1. INITIALIZATION ON DOM READY
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  fetchTestCases();
  fetchMcpToolsAndDatabase();
  refreshWaterfallTrace();

  // Listen to step mode toggle
  const stepToggle = document.getElementById("stepModeCheckbox");
  if (stepToggle) {
    stepToggle.addEventListener("change", (e) => {
      currentStepMode = e.target.checked;
    });
  }
});

// ==============================================================================
// 2. TAB SWITCHING
// ==============================================================================
function switchTab(tabId) {
  const tabs = ["chat", "arena", "sandbox", "waterfall"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${capitalize(t)}`);
    const pane = document.getElementById(`pane${capitalize(t)}`);
    if (btn && pane) {
      if (t === tabId) {
        btn.classList.add("active");
        pane.classList.add("active");
      } else {
        btn.classList.remove("active");
        pane.classList.remove("active");
      }
    }
  });

  if (tabId === "waterfall") {
    refreshWaterfallTrace();
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ==============================================================================
// 3. PROVIDER TOGGLE (GEMINI VS MOCK)
// ==============================================================================
async function switchProvider(provider) {
  currentProvider = provider;
  const btnGemini = document.getElementById("btnGemini");
  const btnMock = document.getElementById("btnMock");

  if (provider === "gemini") {
    btnGemini.classList.add("active");
    btnMock.classList.remove("active", "mock");
  } else {
    btnMock.classList.add("active", "mock");
    btnGemini.classList.remove("active");
  }

  try {
    await fetch("/api/set-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: provider })
    });
  } catch (err) {
    console.warn("Could not sync provider to backend:", err);
  }
}

// ==============================================================================
// 4. TEST CASES LOADER
// ==============================================================================
async function fetchTestCases() {
  try {
    const res = await fetch("/api/test-cases");
    if (!res.ok) return;
    const data = await res.json();
    cachedTestCases = data;
    renderTestCases(data);
  } catch (err) {
    console.error("Error loading test cases:", err);
  }
}

function renderTestCases(tests) {
  const container = document.getElementById("testCasesList");
  if (!container || !tests.length) return;

  container.innerHTML = "";
  tests.forEach(tc => {
    const card = document.createElement("div");
    card.className = "tc-card";
    card.onclick = () => loadTestCase(tc.id);

    const complexityClass = tc.complexity ? tc.complexity.toLowerCase() : "medium";
    card.innerHTML = `
      <div class="tc-card-header">
        <span class="tc-id">${tc.id}</span>
        <span class="tc-badge ${complexityClass}">${tc.type}</span>
      </div>
      <p class="tc-question">${escapeHtml(tc.question)}</p>
    `;
    container.appendChild(card);
  });
}

function loadTestCase(tcId) {
  const tc = cachedTestCases.find(t => t.id === tcId);
  if (!tc) return;

  const chatInput = document.getElementById("chatInput");
  const arenaInput = document.getElementById("arenaInput");

  if (chatInput) chatInput.value = tc.question;
  if (arenaInput) arenaInput.value = tc.question;

  // Auto-focus and highlight
  chatInput.focus();
}

// ==============================================================================
// 5. MCP TOOLS & STUDENT DB LOADER
// ==============================================================================
async function fetchMcpToolsAndDatabase() {
  try {
    const res = await fetch("/api/mcp-tools");
    if (!res.ok) return;
    const data = await res.json();

    renderStudentDb(data.database || {});
  } catch (err) {
    console.error("Error loading MCP info:", err);
  }
}

function renderStudentDb(db) {
  const container = document.getElementById("studentDbList");
  if (!container) return;

  container.innerHTML = "";
  const entries = Object.entries(db);
  if (entries.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: var(--text-muted);">Chưa có dữ liệu sinh viên.</div>`;
    return;
  }

  entries.forEach(([id, info]) => {
    const item = document.createElement("div");
    item.className = "db-item";
    item.innerHTML = `
      <div>
        <div class="db-item-name">${escapeHtml(info.full_name || id)} <span style="font-size: 10px; color: var(--agent-cyan);">(${id})</span></div>
        <div class="db-item-sub">GPA: ${info.gpa} | Cố vấn: ${escapeHtml(info.advisor || "Chưa có")}</div>
      </div>
      <button style="background:transparent; border:none; color:var(--agent-indigo); cursor:pointer; font-size:12px;" onclick="queryStudentDirectly('${id}')" title="Tra cứu mã này">
        🔍
      </button>
    `;
    container.appendChild(item);
  });
}

function queryStudentDirectly(studentId) {
  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.value = `Hãy tra cứu thông tin học vụ của sinh viên ${studentId}.`;
    handleChatSubmit(new Event("submit"));
  }
}

// ==============================================================================
// 6. CHAT & REACT STREAMING
// ==============================================================================
async function handleChatSubmit(e) {
  if (e) e.preventDefault();

  const chatInput = document.getElementById("chatInput");
  const query = chatInput.value.trim();
  if (!query) return;

  // Append user message
  appendUserMessage(query);
  chatInput.value = "";

  const btnSend = document.getElementById("btnSend");
  if (btnSend) btnSend.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        provider: currentProvider
      })
    });

    const data = await res.json();
    if (!res.ok) {
      appendErrorMessage(data.error || "Lỗi khi gọi Tác tử AI.");
      return;
    }

    if (currentStepMode) {
      // Step-by-step playback mode
      initStepByStepPlayback(data.trace || []);
    } else {
      // Instant full trace render
      renderFullReActTrace(data.trace || []);
    }

  } catch (err) {
    appendErrorMessage("Không thể kết nối tới server: " + err.message);
  } finally {
    if (btnSend) btnSend.disabled = false;
  }
}

function appendUserMessage(text) {
  const container = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(row);
  scrollToBottom();
}

function appendErrorMessage(text) {
  const container = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "message-row agent";
  row.innerHTML = `
    <div class="react-stream">
      <div class="react-card" style="border-color: var(--danger-rose);">
        <div class="react-card-header" style="color: var(--danger-rose);">
          <span>⚠️ Lỗi Thực Thi Tác Tử</span>
        </div>
        <div class="react-card-body" style="color: #FDA4AF;">
          ${escapeHtml(text)}
        </div>
      </div>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
}

function renderFullReActTrace(traces) {
  const container = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "message-row agent";

  const streamDiv = document.createElement("div");
  streamDiv.className = "react-stream";

  traces.forEach(item => {
    const card = createCardForTraceItem(item);
    if (card) streamDiv.appendChild(card);
  });

  row.appendChild(streamDiv);
  container.appendChild(row);
  scrollToBottom();
}

function createCardForTraceItem(item) {
  const card = document.createElement("div");
  const latStr = item.latency_ms ? `${item.latency_ms} ms` : "";

  if (item.action_type === "TOOL_EXECUTION") {
    card.className = "react-card action";
    card.innerHTML = `
      <div class="react-card-header">
        <span>🛠️ Step ${item.step}: Action Proposed & MCP Execution</span>
        <span class="latency-tag">${latStr}</span>
      </div>
      <div class="react-card-body">
        <div><strong>Gọi Tool:</strong> <code style="color: var(--warning-amber); font-weight: 700;">${item.tool_name}</code></div>
        <pre class="json-view">${JSON.stringify(item.arguments || {}, null, 2)}</pre>
        <div style="margin-top: 10px; font-weight: 600; color: var(--agent-cyan);">👁️ Observation từ MCP Server:</div>
        <pre class="json-view" style="border-color: rgba(6, 182, 212, 0.3);">${JSON.stringify(item.observation || {}, null, 2)}</pre>
      </div>
    `;
  } else if (item.action_type === "FINAL_ANSWER") {
    card.className = "react-card final";
    card.innerHTML = `
      <div class="react-card-header">
        <span>🏁 Step ${item.step}: Final Answer (Kết Luận ReAct)</span>
        <span class="latency-tag">${latStr}</span>
      </div>
      <div class="react-card-body">
        ${item.thought ? `<div style="font-size: 13px; color: #A5B4FC; margin-bottom: 8px;">🧠 <em>${escapeHtml(item.thought)}</em></div>` : ""}
        <div style="white-space: pre-wrap; font-weight: 500;">${escapeHtml(item.output || "")}</div>
      </div>
    `;
  } else {
    // General thought / step
    card.className = "react-card thought";
    card.innerHTML = `
      <div class="react-card-header">
        <span>🧠 Step ${item.step}: Reasoning Thought</span>
        <span class="latency-tag">${latStr}</span>
      </div>
      <div class="react-card-body">
        ${escapeHtml(item.thought || item.output || "")}
      </div>
    `;
  }

  return card;
}

// ==============================================================================
// 7. STEP-BY-STEP PLAYBACK CONTROLLER
// ==============================================================================
let activeStreamDiv = null;

function initStepByStepPlayback(traces) {
  stepQueue = traces;
  currentStepIndex = 0;

  const bar = document.getElementById("stepControllerBar");
  if (bar) bar.classList.add("active");

  const container = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "message-row agent";
  activeStreamDiv = document.createElement("div");
  activeStreamDiv.className = "react-stream";
  row.appendChild(activeStreamDiv);
  container.appendChild(row);

  updateStepControllerUI();
  executeNextStep();
}

function executeNextStep() {
  if (currentStepIndex >= stepQueue.length) {
    const bar = document.getElementById("stepControllerBar");
    if (bar) bar.classList.remove("active");
    return;
  }

  const item = stepQueue[currentStepIndex];
  const card = createCardForTraceItem(item);
  if (card && activeStreamDiv) {
    activeStreamDiv.appendChild(card);
    scrollToBottom();
  }

  currentStepIndex++;
  updateStepControllerUI();
}

function updateStepControllerUI() {
  const statusText = document.getElementById("stepStatusText");
  const detailText = document.getElementById("stepDetailText");
  const btnNext = document.getElementById("btnStepNext");

  if (!statusText || !detailText || !btnNext) return;

  if (currentStepIndex >= stepQueue.length) {
    statusText.textContent = "✅ Đã hoàn tất toàn bộ chuỗi ReAct Loop!";
    detailText.textContent = "Bạn có thể gửi câu hỏi tiếp theo.";
    btnNext.textContent = "Hoàn tất";
  } else {
    const item = stepQueue[currentStepIndex];
    statusText.textContent = `Tạm dừng trước Step ${item.step}: ${item.action_type}`;
    detailText.textContent = `Bấm 'Tiếp tục' để nạp kết quả bước tiếp theo`;
    btnNext.textContent = "Tiếp tục bước tiếp theo ⏭️";
  }
}

function clearChat() {
  const container = document.getElementById("chatMessages");
  if (container) {
    container.innerHTML = `
      <div class="message-row agent">
        <div class="react-stream">
          <div class="react-card final">
            <div class="react-card-header">
              <span>🤖 VinUni ReAct Agent (Cấp 3 - MCP Enhanced)</span>
              <span class="latency-tag">Ready</span>
            </div>
            <div class="react-card-body">
              Hội thoại đã được làm mới. Hãy đặt câu hỏi hoặc chọn 1 Test Case bên trái để tiếp tục!
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function scrollToBottom() {
  const container = document.getElementById("chatMessages");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// ==============================================================================
// 8. TAB 2: SIDE-BY-SIDE ARENA (BATTLE MODE)
// ==============================================================================
async function runArenaBattle() {
  const input = document.getElementById("arenaInput");
  const query = input.value.trim();
  if (!query) return;

  const btn = document.getElementById("btnArenaSubmit");
  const chatbotOutput = document.getElementById("arenaChatbotOutput");
  const agentOutput = document.getElementById("arenaAgentOutput");

  if (btn) btn.disabled = true;
  chatbotOutput.innerHTML = `<div style="color: var(--text-muted);">⏳ Chatbot Baseline đang suy nghĩ...</div>`;
  agentOutput.innerHTML = `<div style="color: var(--text-muted);">⏳ ReAct Agent đang gọi MCP Server...</div>`;

  try {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        provider: currentProvider
      })
    });

    const data = await res.json();

    // Render Chatbot Output
    chatbotOutput.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 500;">${escapeHtml(data.chatbot_response || "Không có phản hồi")}</div>
      <div style="padding: 10px; background: rgba(244, 63, 94, 0.1); border-left: 3px solid var(--danger-rose); border-radius: 4px; font-size: 12px; color: #FDA4AF;">
        <strong>Phân tích Agentic Fit:</strong> Chatbot Baseline không kết nối MCP Server, chỉ dựa vào System Prompt tĩnh. Khi gặp dữ liệu thời gian thực (như hồ sơ SV), Chatbot sẽ từ chối hoặc bịa đặt (Hallucination).
      </div>
    `;

    // Render ReAct Agent Output
    let toolStr = "";
    if (data.agent_traces && data.agent_traces.length > 0) {
      const toolEvent = data.agent_traces.find(t => t.action_type === "TOOL_EXECUTION");
      if (toolEvent) {
        toolStr = `
          <div style="margin-top: 10px; padding: 8px 12px; background: rgba(6, 182, 212, 0.08); border-radius: 6px; border: 1px solid rgba(6, 182, 212, 0.2); font-size: 12px;">
            <div style="color: var(--agent-cyan); font-weight: 600;">🛠️ Đã gọi MCP Tool: ${toolEvent.tool_name}</div>
            <div style="color: var(--text-secondary); font-size: 11px;">Tham số: ${JSON.stringify(toolEvent.arguments)}</div>
          </div>
        `;
      }
    }

    agentOutput.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 500;">${escapeHtml(data.agent_response || "Không có phản hồi")}</div>
      ${toolStr}
      <div style="margin-top: 12px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success-emerald); border-radius: 4px; font-size: 12px; color: #6EE7B7;">
        <strong>Bằng chứng Grounded:</strong> Dữ liệu được truy xuất trực tiếp từ vinuni-academic-mcp-server qua giao thức JSON-RPC 2.0, loại bỏ hoàn toàn nguy cơ ảo giác.
      </div>
    `;

  } catch (err) {
    chatbotOutput.innerHTML = `<div style="color: var(--danger-rose);">Lỗi: ${err.message}</div>`;
    agentOutput.innerHTML = `<div style="color: var(--danger-rose);">Lỗi: ${err.message}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ==============================================================================
// 9. TAB 3: MCP TOOL SANDBOX
// ==============================================================================
function handleSandboxToolChange() {
  const toolSelect = document.getElementById("sandboxToolSelect");
  const groupDatetime = document.getElementById("groupDatetime");
  const groupAdvisor = document.getElementById("groupAdvisor");

  if (toolSelect.value === "schedule_appointment") {
    groupDatetime.style.display = "flex";
    groupAdvisor.style.display = "flex";
  } else {
    groupDatetime.style.display = "none";
    groupAdvisor.style.display = "none";
  }
}

async function executeSandboxTool() {
  const toolSelect = document.getElementById("sandboxToolSelect");
  const studentId = document.getElementById("sandboxStudentId").value.trim();
  const datetimeStr = document.getElementById("sandboxDatetime").value.trim();
  const advisorName = document.getElementById("sandboxAdvisor").value.trim();
  const resultBox = document.getElementById("sandboxJsonResult");
  const btn = document.getElementById("btnExecuteSandbox");

  let args = { student_id: studentId };
  if (toolSelect.value === "schedule_appointment") {
    args.datetime_str = datetimeStr;
    args.advisor_name = advisorName;
  }

  btn.disabled = true;
  resultBox.textContent = "// Đang gửi yêu cầu JSON-RPC 2.0 tới MCP Server...";

  try {
    const res = await fetch("/api/mcp-execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: toolSelect.value,
        arguments: args
      })
    });

    const data = await res.json();
    resultBox.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    resultBox.textContent = "// Lỗi: " + err.message;
  } finally {
    btn.disabled = false;
  }
}

// ==============================================================================
// 10. TAB 4: WATERFALL TRACE TIMELINE
// ==============================================================================
async function refreshWaterfallTrace() {
  const container = document.getElementById("waterfallRowsContainer");
  if (!container) return;

  container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">Đang đọc tệp docs/trace_waterfall.json...</div>`;

  try {
    const res = await fetch("/api/trace");
    if (!res.ok) return;
    const traces = await res.json();

    renderWaterfallTimeline(traces);
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger-rose);">Lỗi khi tải trace: ${err.message}</div>`;
  }
}

function renderWaterfallTimeline(traces) {
  const container = document.getElementById("waterfallRowsContainer");
  if (!container) return;

  if (!traces || traces.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">Chưa có sự kiện nào trong trace_waterfall.json.</div>`;
    return;
  }

  // Update Summary Metrics
  const totalStepsElem = document.getElementById("metricTotalSteps");
  const avgLatElem = document.getElementById("metricAvgLatency");
  const toolCallsElem = document.getElementById("metricToolCalls");

  if (totalStepsElem) totalStepsElem.textContent = traces.length;

  let totalLat = 0;
  let toolCount = 0;
  let maxLat = 100;

  traces.forEach(t => {
    const l = t.latency_ms || 10;
    totalLat += l;
    if (l > maxLat) maxLat = l;
    if (t.action_type === "TOOL_EXECUTION") toolCount++;
  });

  if (avgLatElem) avgLatElem.textContent = Math.round(totalLat / traces.length) + " ms";
  if (toolCallsElem) toolCallsElem.textContent = `${toolCount} calls`;

  container.innerHTML = "";
  traces.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = "waterfall-row";

    const lat = t.latency_ms || 10;
    const pct = Math.max(8, Math.min(100, Math.round((lat / maxLat) * 100)));

    let barClass = "general";
    let typeLabel = t.action_type;
    if (t.action_type === "TOOL_EXECUTION") {
      barClass = "tool";
      typeLabel = `🛠️ ${t.tool_name}`;
    } else if (t.action_type === "FINAL_ANSWER") {
      barClass = "final";
      typeLabel = "🏁 Final Answer";
    }

    row.innerHTML = `
      <div class="waterfall-step-num">#${idx + 1}</div>
      <div class="waterfall-type" title="${escapeHtml(t.query || '')}">${typeLabel}</div>
      <div class="waterfall-bar-container">
        <div class="waterfall-bar ${barClass}" style="width: ${pct}%;">
          ${lat} ms
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

// ==============================================================================
// 11. MODAL: ADD STUDENT TO DATABASE
// ==============================================================================
function openAddStudentModal() {
  const modal = document.getElementById("addStudentModal");
  if (modal) modal.classList.add("active");
}

function closeAddStudentModal() {
  const modal = document.getElementById("addStudentModal");
  if (modal) modal.classList.remove("active");
}

async function handleSaveStudent(e) {
  e.preventDefault();

  const studentId = document.getElementById("modalStudentId").value.trim().toUpperCase();
  const fullName = document.getElementById("modalFullName").value.trim();
  const className = document.getElementById("modalClass").value.trim();
  const gpa = parseFloat(document.getElementById("modalGpa").value);
  const email = document.getElementById("modalEmail").value.trim();
  const advisor = document.getElementById("modalAdvisor").value.trim();

  try {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        full_name: fullName,
        class: className,
        gpa: gpa,
        email: email,
        status: "Đang học",
        advisor: advisor
      })
    });

    if (res.ok) {
      closeAddStudentModal();
      await fetchMcpToolsAndDatabase();
      alert(`✅ Đã lưu sinh viên ${studentId} (${fullName}) vào CSDL VinUni thành công!`);
    } else {
      alert("❌ Lỗi khi thêm sinh viên.");
    }
  } catch (err) {
    alert("❌ Lỗi kết nối: " + err.message);
  }
}

// Utilities
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}
