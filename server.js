// =====================================================
// Scanning AI Tool - Express Backend
// Authorized lab use only. Scans only the configured
// APPROVED_TARGET from .env — all other targets blocked.
// =====================================================

require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load the single approved target from environment.
// Default to localhost if not set, to prevent accidental external scans.
const APPROVED_TARGET = (process.env.APPROVED_TARGET || '127.0.0.1').trim();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── /api/target ─────────────────────────────────────
// Sends the approved target to the frontend so it can
// pre-fill the input without exposing how it was set.
app.get('/api/target', (req, res) => {
  res.json({ target: APPROVED_TARGET });
});

// ── /api/scan ────────────────────────────────────────
// Runs a light TCP scan against the approved target only.
// Rejects any request whose target field does not exactly
// match APPROVED_TARGET.
app.post('/api/scan', (req, res) => {
  const requestedTarget = (req.body.target || '').trim();

  // Safety gate — only allow the configured lab target
  if (requestedTarget !== APPROVED_TARGET) {
    return res.status(403).json({
      error: `Unauthorized target. This tool may only scan the approved lab target: ${APPROVED_TARGET}`
    });
  }

  // Light TCP scan: top 20 ports, no version detection, no scripts
  // -sT  = full TCP connect (no raw sockets needed, safe and non-stealthy)
  // --top-ports 20 = only the 20 most common ports
  // -T3  = normal timing (polite)
  const cmd = `nmap -sT --top-ports 20 -T3 ${APPROVED_TARGET}`;

  console.log(`[scan] Running: ${cmd}`);

  exec(cmd, { timeout: 90000 }, (error, stdout, stderr) => {
    if (error) {
      // nmap exits non-zero on some warnings; return what we have
      return res.status(500).json({
        error: `Scan failed: ${error.message}`,
        raw: stderr || stdout || ''
      });
    }

    const ports = parseNmapOutput(stdout);
    res.json({ raw: stdout, ports });
  });
});

// ── parseNmapOutput ───────────────────────────────────
// Extracts port/state/service rows from nmap plain-text output.
// Matches lines like:  80/tcp   open   http
function parseNmapOutput(output) {
  const ports = [];
  for (const line of output.split('\n')) {
    const match = line.match(/^(\d+)\/(tcp|udp)\s+(\S+)\s+(.+)$/);
    if (match) {
      ports.push({
        port: match[1],
        protocol: match[2],
        state: match[3],
        service: match[4].trim()
      });
    }
  }
  return ports;
}

// ── /api/ai ───────────────────────────────────────────
// Proxies a request to the Anthropic API so the API key
// stays server-side and never reaches the browser.
app.post('/api/ai', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      error: 'No API key found. Add ANTHROPIC_API_KEY=your_key to your .env file and restart the server.'
    });
  }

  const { scanResults, question } = req.body;

  if (!scanResults) {
    return res.status(400).json({ error: 'No scan results provided.' });
  }

  // Build the prompt — either answer a specific question or generate a full report
  const userPrompt = question
    ? `Here are the network scan results from an authorized lab exercise:\n\n${scanResults}\n\nQuestion: ${question}`
    : `You are a cybersecurity instructor reviewing a student's authorized lab scan.\n\nAnalyze the following nmap output and provide:\n1. A brief summary of what was found\n2. An explanation of each open port and its typical service\n3. Any observations about the host's posture\n4. A short lab report paragraph suitable for submission\n\nScan results:\n\n${scanResults}`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a cybersecurity education assistant. You help students understand authorized lab scan results. Keep explanations clear and educational. Never suggest offensive or unauthorized actions.',
      messages: [{ role: 'user', content: userPrompt }]
    });

    res.json({ response: message.content[0].text });
  } catch (err) {
    console.error('[ai] Anthropic API error:', err.message);
    res.status(500).json({ error: `AI request failed: ${err.message}` });
  }
});

// ── Start server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  Scanning AI Tool');
  console.log(`  Listening at http://localhost:${PORT}`);
  console.log(`  Approved target: ${APPROVED_TARGET}`);
  console.log(`  AI assistant: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured (add ANTHROPIC_API_KEY to .env)'}`);
  console.log('');
});
