"""
SmartAudit AI — FastAPI Backend
POST /audit: Contract → Local → Mock fallback chain.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import traceback

from config import CORS_ORIGINS, CONTRACT_ADDRESS, HOST, PORT
from validators import security_analyze, gas_analyze, access_control_analyze, formal_analyze
from consensus import compute_consensus

app = FastAPI(
    title="SmartAudit AI",
    description="AI-powered smart contract auditing with multi-validator consensus",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuditRequest(BaseModel):
    code: str


class AuditResponse(BaseModel):
    consensus_score: int
    severity_breakdown: dict
    validators: list
    is_fallback: bool = False
    message: str = ""


# ── Mock fallback (final safety net) ──────────────────────────────
MOCK_RESPONSE: dict = {
    "consensus_score": 42,
    "severity_breakdown": {"critical": 1, "high": 2, "medium": 1, "low": 2},
    "validators": [
        {
            "name": "Security Auditor", "status": "done", "score": 35,
            "findings": [
                {"title": "Reentrancy Vulnerability", "severity": "critical",
                 "explanation": "withdraw() sends ETH before updating balance.",
                 "fix": "Use checks-effects-interactions pattern."}
            ],
        },
        {
            "name": "Gas Optimizer", "status": "done", "score": 60,
            "findings": [
                {"title": "Repeated Storage Reads", "severity": "medium",
                 "explanation": "Storage variable read multiple times in loop.",
                 "fix": "Cache in memory before loop."}
            ],
        },
        {
            "name": "Access Control Expert", "status": "done", "score": 30,
            "findings": [
                {"title": "Missing Access Control", "severity": "high",
                 "explanation": "No ownership or role modifiers found.",
                 "fix": "Add Ownable or AccessControl from OpenZeppelin."}
            ],
        },
        {
            "name": "Formal Verifier", "status": "done", "score": 50,
            "findings": [
                {"title": "Floating Pragma", "severity": "low",
                 "explanation": "Using ^0.8.0 allows untested compiler versions.",
                 "fix": "Lock to a specific version e.g. 0.8.20."}
            ],
        },
    ],
    "is_fallback": True,
    "message": "Using mock fallback analysis",
}


def run_local_audit(code: str) -> dict:
    """Run all 4 local validators (rule-based static analysis)."""
    results = [
        security_analyze(code),
        gas_analyze(code),
        access_control_analyze(code),
        formal_analyze(code),
    ]
    return compute_consensus(results)


def call_genlayer_contract(code: str) -> dict | None:
    """Try calling deployed GenLayer intelligent contract."""
    if not CONTRACT_ADDRESS:
        return None
    try:
        from genlayer import Client
        client = Client()
        result = client.call_contract(
            address=CONTRACT_ADDRESS,
            function="run_audit",
            args=[code],
        )
        parsed = json.loads(result) if isinstance(result, str) else result
        parsed["is_fallback"] = False
        parsed["message"] = "Audit powered by GenLayer intelligent contract consensus"
        return parsed
    except Exception as e:
        print(f"GenLayer contract call failed: {e}")
        traceback.print_exc()
        return None


@app.post("/audit", response_model=AuditResponse)
async def audit_contract(request: AuditRequest):
    """
    3-tier fallback: Contract → Local → Mock
    """
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="Contract code is required")

    # 1. Try GenLayer intelligent contract
    result = call_genlayer_contract(request.code)
    if result:
        return AuditResponse(**result)

    # 2. Fallback to local rule-based validators
    try:
        consensus = run_local_audit(request.code)
        return AuditResponse(
            consensus_score=consensus["consensus_score"],
            severity_breakdown=consensus["severity_breakdown"],
            validators=consensus["validators"],
            is_fallback=not bool(CONTRACT_ADDRESS),
            message="Local rule-based analysis complete",
        )
    except Exception as e:
        print(f"Local analysis failed: {e}")
        traceback.print_exc()

    # 3. Final fallback — mock response
    return AuditResponse(**MOCK_RESPONSE)


@app.get("/")
async def root():
    return {
        "app": "SmartAudit AI",
        "version": "1.0.0",
        "description": "AI-powered smart contract auditing with multi-validator consensus",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "contract_configured": bool(CONTRACT_ADDRESS),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=int(PORT))
