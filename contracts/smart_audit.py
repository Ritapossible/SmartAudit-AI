# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import re


class SmartAudit(gl.Contract):
    """
    Self-contained GenLayer intelligent contract for smart contract auditing.
    Runs 4 lightweight rule-based validators internally — no external deps.
    Deployable to Bradbury testnet.
    """

    audit_count: u256

    def __init__(self):
        self.audit_count = u256(0)

    # ── Inline Validators ─────────────────────────────────────────

    def _security_check(self, code: str) -> dict:
        findings = []
        score = 90
        c = code.lower()
        if ".call{value" in c or ".call.value" in c:
            if "balances[" in c and (c.find(".call") < c.find("= 0") if "= 0" in c else True):
                findings.append({"title": "Reentrancy Vulnerability", "severity": "critical",
                    "explanation": "External call before state update allows re-entrancy.",
                    "fix": "Use checks-effects-interactions pattern."})
                score -= 30
        if "tx.origin" in c:
            findings.append({"title": "tx.origin Usage", "severity": "high",
                "explanation": "tx.origin can be spoofed via phishing contracts.",
                "fix": "Use msg.sender instead of tx.origin."})
            score -= 15
        if "selfdestruct" in c or "suicide" in c:
            findings.append({"title": "Selfdestruct Present", "severity": "high",
                "explanation": "selfdestruct can permanently destroy the contract.",
                "fix": "Remove selfdestruct or protect with strict access control."})
            score -= 15
        if "delegatecall" in c:
            findings.append({"title": "Delegatecall Risk", "severity": "high",
                "explanation": "delegatecall executes external code in current context.",
                "fix": "Validate target address and restrict usage."})
            score -= 15
        return {"name": "Security Auditor", "status": "done", "score": max(score, 0), "findings": findings}

    def _gas_check(self, code: str) -> dict:
        findings = []
        score = 90
        if re.search(r'for\s*\(.*storage|while\s*\(.*storage', code, re.IGNORECASE):
            findings.append({"title": "Storage Read in Loop", "severity": "medium",
                "explanation": "Reading storage inside loops is gas-expensive.",
                "fix": "Cache storage variables in memory before the loop."})
            score -= 15
        if "string" in code.lower() and "public" in code.lower():
            findings.append({"title": "Public String Storage", "severity": "low",
                "explanation": "Storing strings on-chain is expensive.",
                "fix": "Use bytes32 or store off-chain with hash reference."})
            score -= 5
        if code.lower().count("sload") > 3 or code.count("storage") > 5:
            findings.append({"title": "Excessive Storage Access", "severity": "medium",
                "explanation": "Multiple storage reads increase gas costs.",
                "fix": "Batch reads and cache in memory."})
            score -= 10
        return {"name": "Gas Optimizer", "status": "done", "score": max(score, 0), "findings": findings}

    def _access_check(self, code: str) -> dict:
        findings = []
        score = 90
        c = code.lower()
        has_modifier = "onlyowner" in c or "modifier" in c or "require(msg.sender" in c
        if not has_modifier:
            findings.append({"title": "Missing Access Control", "severity": "high",
                "explanation": "No ownership or role-based access control detected.",
                "fix": "Add Ownable or AccessControl from OpenZeppelin."})
            score -= 25
        if "address(0)" not in c and ("transfer" in c or "owner" in c):
            findings.append({"title": "No Zero-Address Check", "severity": "medium",
                "explanation": "Functions accepting addresses don't check for address(0).",
                "fix": "Add require(addr != address(0))."})
            score -= 10
        if "event " not in c and ("function" in c):
            findings.append({"title": "No Event Emissions", "severity": "low",
                "explanation": "State changes don't emit events for off-chain tracking.",
                "fix": "Add events for all state-changing functions."})
            score -= 5
        return {"name": "Access Control Expert", "status": "done", "score": max(score, 0), "findings": findings}

    def _formal_check(self, code: str) -> dict:
        findings = []
        score = 90
        if "^" in code and "pragma solidity" in code.lower():
            findings.append({"title": "Floating Pragma", "severity": "low",
                "explanation": "Using ^ allows untested compiler versions.",
                "fix": "Lock to specific version, e.g. pragma solidity 0.8.20;"})
            score -= 5
        if re.search(r'/\s*0|/\s*\b0\b', code):
            findings.append({"title": "Potential Division by Zero", "severity": "medium",
                "explanation": "Division without zero-check may revert unexpectedly.",
                "fix": "Add require(divisor != 0) before division."})
            score -= 15
        if "unchecked" in code.lower():
            findings.append({"title": "Unchecked Arithmetic", "severity": "medium",
                "explanation": "Unchecked blocks skip overflow/underflow protection.",
                "fix": "Only use unchecked where overflow is mathematically impossible."})
            score -= 10
        return {"name": "Formal Verifier", "status": "done", "score": max(score, 0), "findings": findings}

    # ── Main Audit Function ───────────────────────────────────────

    @gl.public.write
    def run_audit(self, contract_code: str) -> str:
        """Run all 4 validators and return consensus result."""
        v1 = self._security_check(contract_code)
        v2 = self._gas_check(contract_code)
        v3 = self._access_check(contract_code)
        v4 = self._formal_check(contract_code)

        validators = [v1, v2, v3, v4]

        # Weighted consensus (Security 35%, Access 30%, Formal 20%, Gas 15%)
        weights = [0.35, 0.15, 0.30, 0.20]
        consensus_score = round(sum(v["score"] * w for v, w in zip(validators, weights)))

        severity_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for v in validators:
            for f in v.get("findings", []):
                sev = f.get("severity", "low")
                if sev in severity_breakdown:
                    severity_breakdown[sev] += 1

        self.audit_count += u256(1)

        return json.dumps({
            "consensus_score": min(consensus_score, 100),
            "severity_breakdown": severity_breakdown,
            "validators": validators,
            "is_fallback": False,
            "audit_number": int(self.audit_count),
        })

    @gl.public.view
    def get_audit_count(self) -> int:
        return int(self.audit_count)
