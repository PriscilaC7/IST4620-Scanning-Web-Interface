// =====================================================
// Scanning AI Tool — Frontend Logic
// Handles scan requests, result rendering, and AI calls.
// All API calls go through the local Express server —
// the browser never touches nmap or Anthropic directly.
// =====================================================

/* ── Element references ───────────────────────────── */
const targetInput   = document.getElementById('target-input');
const scanBtn       = document.getElementById('scan-btn');
const scanSpinner   = document.getElementById('scan-spinner');

const rawPanel      = document.getElementById('raw-panel');
const rawOutput     = document.getElementById('raw-output');
const rawToggle     = document.getElementById('raw-toggle');

const resultsPanel  = document.getElementById('results-panel');
const resultsBody   = document.getElementById('results-body');
const noPortsMsg    = document.getElementById('no-ports-msg');

const aiPanel       = document.getElementById('ai-panel');
const aiNoScan      = document.getElementById('ai-no-scan');
const aiControls    = document.getElementById('ai-controls');
const aiReportBtn   = document.getElementById('ai-report-btn');
const aiAskBtn      = document.getElementById('ai-ask-btn');
const aiQuestion    = document.getElementById('ai-question');
const aiSpinner     = document.getElementById('ai-spinner');
const aiResponse    = document.getElementById('ai-response');

// Stores the latest raw scan output for AI queries
let lastScanRaw = '';

/* ── Load approved target from server ─────────────── */
async function loadTarget() {
  try {
    const res = await fetch('/api/target');
    const data = await res.json();
    targetInput.value = data.target;
  } catch {
    targetInput.value = 'Error loading target';
  }
}

/* ── Run scan ─────────────────────────────────────── */
scanBtn.addEventListener('click', async () => {
  const target = targetInput.value.trim();
  if (!target) return;

  // UI: disable button, show spinner, clear old results
  scanBtn.disabled = true;
  scanSpinner.classList.remove('hidden');
  rawPanel.classList.add('hidden');
  resultsPanel.classList.add('hidden');
  aiControls.classList.add('hidden');
  aiNoScan.classList.remove('hidden');
  aiResponse.classList.add('hidden');
  clearError('scan-error');

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target })
    });

    const data = await res.json();

    if (!res.ok) {
      showError('scan-panel', data.error || 'Scan failed.');
      return;
    }

    // Store raw output for AI use
    lastScanRaw = data.raw || '';

    // Show raw output section
    rawOutput.textContent = lastScanRaw;
    rawPanel.classList.remove('hidden');
    rawToggle.textContent = 'Hide';

    // Render results table
    renderResultsTable(data.ports || []);
    resultsPanel.classList.remove('hidden');

    // Unlock AI assistant
    aiNoScan.classList.add('hidden');
    aiControls.classList.remove('hidden');

  } catch (err) {
    showError('scan-panel', `Request failed: ${err.message}`);
  } finally {
    scanBtn.disabled = false;
    scanSpinner.classList.add('hidden');
  }
});

/* ── Toggle raw output ────────────────────────────── */
rawToggle.addEventListener('click', () => {
  const hidden = rawOutput.classList.toggle('hidden');
  rawToggle.textContent = hidden ? 'Show' : 'Hide';
});

/* ── Render parsed results table ──────────────────── */
function renderResultsTable(ports) {
  resultsBody.innerHTML = '';

  if (ports.length === 0) {
    noPortsMsg.classList.remove('hidden');
    return;
  }
  noPortsMsg.classList.add('hidden');

  for (const p of ports) {
    const tr = document.createElement('tr');

    // Apply color class based on port state
    const stateClass =
      p.state === 'open'     ? 'state-open'
      : p.state === 'closed' ? 'state-closed'
      : 'state-filtered';

    tr.innerHTML = `
      <td>${escHtml(p.port)}</td>
      <td>${escHtml(p.protocol)}</td>
      <td class="${stateClass}">${escHtml(p.state)}</td>
      <td>${escHtml(p.service)}</td>
    `;
    resultsBody.appendChild(tr);
  }
}

/* ── AI: generate full report ─────────────────────── */
aiReportBtn.addEventListener('click', () => askAI(''));

/* ── AI: custom question ──────────────────────────── */
aiAskBtn.addEventListener('click', () => {
  const q = aiQuestion.value.trim();
  if (!q) {
    aiQuestion.focus();
    return;
  }
  askAI(q);
});

/* ── askAI: shared AI request handler ─────────────── */
async function askAI(question) {
  if (!lastScanRaw) return;

  aiReportBtn.disabled = true;
  aiAskBtn.disabled = true;
  aiSpinner.classList.remove('hidden');
  aiResponse.classList.add('hidden');
  clearError('ai-error');

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResults: lastScanRaw, question })
    });

    const data = await res.json();

    if (!res.ok) {
      showError('ai-panel', data.error || 'AI request failed.');
      return;
    }

    // Display the AI response
    aiResponse.textContent = data.response;
    aiResponse.classList.remove('hidden');

  } catch (err) {
    showError('ai-panel', `AI request failed: ${err.message}`);
  } finally {
    aiReportBtn.disabled = false;
    aiAskBtn.disabled = false;
    aiSpinner.classList.add('hidden');
  }
}

/* ── Utility: show inline error inside a card ─────── */
function showError(cardId, message) {
  clearError(cardId + '-error');
  const card = document.getElementById(cardId);
  const box = document.createElement('div');
  box.className = 'error-box';
  box.id = cardId + '-error';
  box.textContent = message;
  card.appendChild(box);
}

function clearError(errorId) {
  const existing = document.getElementById(errorId);
  if (existing) existing.remove();
}

/* ── Utility: escape HTML to prevent XSS ─────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Init ─────────────────────────────────────────── */
loadTarget();
