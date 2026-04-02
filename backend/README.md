# SmartAudit AI — Backend

AI-powered smart contract auditing with multi-validator consensus.

## Architecture

```
Frontend → FastAPI (/audit) → GenLayer Contract → AI Validators → Consensus → Response
                ↓ (fallback)
         Local Rule-Based Validators
```

## Quick Start

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
python main.py
```

Server runs at `http://localhost:8000`

## Deploy GenLayer Contract

```bash
# Set PRIVATE_KEY in .env first
python deploy.py
# Copy the contract address to .env as CONTRACT_ADDRESS
```

## API

### POST /audit
```json
{
  "code": "pragma solidity ^0.8.0; ..."
}
```

Response:
```json
{
  "consensus_score": 65,
  "severity_breakdown": { "critical": 1, "high": 2, "medium": 1, "low": 2 },
  "validators": [...],
  "is_fallback": false,
  "message": ""
}
```

### GET /health
Returns server status and contract configuration.

## Validators

| Validator | Focus |
|-----------|-------|
| Security Auditor | Reentrancy, overflow, unchecked calls |
| Gas Optimizer | Storage patterns, immutable, gas waste |
| Access Control Expert | Permissions, ownership, zero-address |
| Formal Verifier | Logic correctness, shadowing, arithmetic |

## Frontend Integration

Set in frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_GENLAYER_CONTRACT_ADDRESS=0x...
```
