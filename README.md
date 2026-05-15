# Scanning AI Web Interface

A local Node.js web application that runs a safe, basic TCP port scan against a single authorized lab target and uses the Claude AI API to explain results and generate a short lab report.

---

## ⚠️ Authorized Lab Use Only

> This tool is intended **exclusively** for authorized coursework, CTF environments, or lab machines you own or have explicit written permission to test.
>
> Scanning hosts without authorization is **illegal** under the Computer Fraud and Abuse Act (CFAA) and equivalent laws worldwide. The tool enforces a single approved target set in `.env` — it will reject attempts to scan any other host.

---

## Features

- Clean dashboard with a locked-down target field
- One-click light TCP scan (`nmap -sT --top-ports 20 -T3`)
- Raw nmap output display
- Parsed results table (Port / Protocol / State / Service)
- AI assistant panel powered by Claude — explains findings and generates a lab report
- API key stored server-side only (never exposed to the browser)

---

## Requirements

| Dependency | Version |
|-----------|---------|
| Node.js   | 18 or later |
| npm       | included with Node.js |
| nmap      | must be installed and on PATH |

### Install nmap

- **Windows:** Download from https://nmap.org/download.html (tick "Add to PATH" during install)
- **macOS:** `brew install nmap`
- **Linux/WSL:** `sudo apt install nmap`

Verify: `nmap --version`

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/scanning-ai-tool.git
cd scanning-ai-tool

# 2. Install Node.js dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

---

## Configuration

### Set the approved lab target

Open `.env` and set `APPROVED_TARGET` to your lab machine's IP address or hostname:

```env
APPROVED_TARGET=192.168.56.101
```

The app will **only** scan this target. All other targets are rejected.

### Add an API key

Get a free API key at https://console.anthropic.com/ then add it to `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

The key lives only on the server. The browser never sees it.

---

## Running the App

```bash
npm start
```

Open your browser at **http://localhost:3000**

---

## How to Use

1. Confirm the target shown matches your lab machine.
2. Click **Run Light Scan**.
3. Wait for results (~5–30 seconds depending on network).
4. Review the raw output and the parsed port table.
5. In the **AI Assistant** panel:
   - Click **Generate Report** for a full AI-written lab summary.
   - Type a question in the text box and click **Ask** for targeted explanations.

---

## Taking a Screenshot for Lab Submission

### Windows
- Press `Win + Shift + S` to open Snipping Tool and capture the browser window.
- Or press `PrtScn` and paste into Paint, then save.

### macOS
- `Cmd + Shift + 4` → drag to select the browser window.

### Chrome / Edge (any OS)
- Press `F12` → `Ctrl + Shift + P` → type `screenshot` → choose **Capture full size screenshot**.

Save the file and attach it to your lab submission.

---

## Project Structure

```
scanning-ai-tool/
├── .env.example       # Template for environment variables
├── .gitignore         # Excludes .env and node_modules
├── package.json       # Node.js project manifest
├── server.js          # Express backend — scan + AI endpoints
├── README.md          # This file
└── public/
    ├── index.html     # Dashboard UI
    ├── style.css      # Dark theme stylesheet
    └── app.js         # Frontend JavaScript
```

---

## Uploading to GitHub

```bash
# 1. Create a new repo on github.com (do NOT add a README — you already have one)

# 2. Initialize git locally
git init
git add .
git commit -m "Initial commit: scanning AI web interface"

# 3. Link to your GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/scanning-ai-tool.git
git branch -M main
git push -u origin main
```

Verify that `.env` does **not** appear in the file list on GitHub — if it does, remove it immediately with `git rm --cached .env`.

---

## Safety Notes

- The nmap command used (`-sT --top-ports 20 -T3`) performs a standard TCP connect scan — no raw sockets, no OS fingerprinting, no scripts, no banner grabbing.
- The server validates the target on every request. You cannot change the approved target from the browser.
- No exploitation, password attacks, stealth/evasion, or service enumeration flags are included.
