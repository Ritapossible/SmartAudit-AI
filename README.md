# 🔬 SmartAudit AI

**AI-powered smart contract auditing platform built on [GenLayer](https://genlayer.com/) intelligent contracts.**

SmartAudit AI runs your Solidity code through 4 specialized AI validator personas and produces a weighted consensus risk score, vulnerability report, and actionable fix recommendations — all powered by on-chain GenLayer consensus.

🌐 **Live Demo:** [smartaudit-ai.vercel.app](https://smartaudit-ai.vercel.app)

---

## ✨ Features

- **Multi-AI Validator Consensus** — 4 independent validator personas analyze your contract in parallel:
  | Validator | Focus | Weight |
  |---|---|---|
  | 🔬 Security Auditor | Reentrancy, overflow, delegatecall, selfdestruct | 35% |
  | 🔑 Access Control Expert | Permissions, ownership, zero-address checks | 30% |
  | 🧮 Formal Verifier | Logic correctness, pragma, arithmetic safety | 20% |
  | ⚡ Gas Optimizer | Storage patterns, loop efficiency, gas waste | 15% |

- **Risk Scoring (0–100)** — Weighted consensus score with severity breakdown (critical / high / medium / low)
- **Actionable Recommendations** — Every finding includes an explanation and suggested fix
- **Audit History** — Past audits stored in localStorage for quick reference
- **3-Tier Fallback** — GenLayer contract → Local validators → Mock response (always works)
- **Mobile Responsive** — Modern card-based UI that works on all screen sizes

---

## 🏗️ Architecture

```
┌──────────┐     ┌──────────────┐     ┌─────────────────────────┐
│ Frontend │────▶│ FastAPI      │────▶│ GenLayer Contract       │
│ (React)  │     │ POST /audit  │     │ (Bradbury Testnet)      │
└──────────┘     └──────┬───────┘     │ 4 inline validators     │
                        │             │ Weighted consensus      │
                        │ fallback    └─────────────────────────┘
                        ▼
                 ┌──────────────┐
                 │ Local Python │
                 │ Validators   │
                 └──────┬───────┘
                        │ fallback
                        ▼
                 ┌──────────────┐
                 │ Mock Response│
                 └──────────────┘
```

**Key principle:** The frontend only communicates with FastAPI. All GenLayer contract calls happen server-side.

---

## 🚀 Quick Start

### Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs at `http://localhost:5173`

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your PRIVATE_KEY and CONTRACT_ADDRESS
python main.py
```

The API runs at `http://localhost:8000`

### Connect Frontend to Backend

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📜 GenLayer Contract

The intelligent contract (`contracts/smart_audit.py`) is fully self-contained — all 4 validators run inline with no external dependencies, making it compatible with the Bradbury testnet.

**Deployed contract:** `0x4bD43000F265e1CFE6DDdaE5F0683158C89e6581`

### Deploy your own

```bash
cd backend
# Set PRIVATE_KEY in .env
python deploy.py
# Copy the output contract address to .env as CONTRACT_ADDRESS
```

---

## 📡 API Reference

### `POST /audit`

```json
// Request
{ "code": "pragma solidity ^0.8.0; ..." }

// Response
{
  "consensus_score": 65,
  "severity_breakdown": { "critical": 1, "high": 2, "medium": 1, "low": 2 },
  "validators": [
    {
      "name": "Security Auditor",
      "status": "done",
      "score": 35,
      "findings": [
        {
          "title": "Reentrancy Vulnerability",
          "severity": "critical",
          "explanation": "External call before state update.",
          "fix": "Use checks-effects-interactions pattern."
        }
      ]
    }
  ],
  "is_fallback": false,
  "message": "Audit powered by GenLayer intelligent contract consensus"
}
```

### `GET /health`

Returns server status and contract configuration.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, Uvicorn |
| Smart Contract | GenLayer SDK, Bradbury Testnet |
| State | React Query, localStorage (audit history) |

---

## 📁 Project Structure

```
├── src/                    # Frontend (React)
│   ├── components/         # UI components (Header, CodeEditor, IssuesList, etc.)
│   ├── pages/              # Routes (Index, Results, HowItWorks)
│   ├── lib/                # Services (audit-service, genlayer client, types)
│   └── hooks/              # Custom hooks (theme, mobile, toast)
├── backend/                # FastAPI server
│   ├── main.py             # API endpoints with 3-tier fallback
│   ├── validators/         # Local rule-based validator modules
│   ├── consensus.py        # Weighted scoring logic
│   ├── deploy.py           # GenLayer contract deployment script
│   └── config.py           # Environment configuration
├── contracts/              # GenLayer intelligent contract
│   └── smart_audit.py      # Self-contained auditing contract (v0.2.16)
```

---

## Built By RitaCryptoTips ([X](https://x.com/RitaCryptoTips))
