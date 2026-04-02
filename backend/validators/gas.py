"""
Gas Optimizer Validator
Detects gas inefficiencies: storage reads in loops, redundant SLOADs, missing immutable/constant.
"""

import re
from typing import List, Dict


def analyze(contract_code: str) -> Dict:
    """
    Gas optimization analysis of Solidity smart contract code.
    """
    findings: List[Dict] = []
    code_lower = contract_code.lower()

    # --- Storage reads inside loops ---
    if re.search(r'for\s*\(.*\)\s*\{[^}]*\b\w+\[', contract_code, re.DOTALL):
        findings.append({
            "title": "Storage Read Inside Loop",
            "severity": "medium",
            "explanation": "Reading from storage (SLOAD) inside a loop is expensive (~2100 gas each). This compounds with iteration count.",
            "fix": "Cache storage variables in memory before the loop: uint256 cached = storageVar; for (...) { use cached; }"
        })

    # --- Missing immutable/constant ---
    state_vars = re.findall(r'(uint\d*|int\d*|address|bool|bytes\d*)\s+(public\s+|private\s+|internal\s+)?\w+\s*[=;]', contract_code)
    if state_vars and 'immutable' not in code_lower and 'constant' not in code_lower:
        findings.append({
            "title": "Missing immutable/constant Declarations",
            "severity": "low",
            "explanation": "State variables that are set once (e.g., in constructor) should be declared immutable to save gas on every read.",
            "fix": "Add 'immutable' to variables set only in the constructor. Use 'constant' for compile-time known values."
        })

    # --- String storage vs bytes ---
    if re.search(r'string\s+(public\s+|private\s+)?(?!constant|immutable)\w+', contract_code):
        findings.append({
            "title": "Dynamic String Storage",
            "severity": "low",
            "explanation": "Storing dynamic strings costs more gas than fixed-size bytes. Use bytes32 if the string fits within 32 bytes.",
            "fix": "Replace string with bytes32 where possible. Use events for long text instead of storage."
        })

    # --- Multiple small storage writes ---
    storage_writes = len(re.findall(r'\b\w+\s*=\s*[^=]', contract_code))
    if storage_writes > 5:
        findings.append({
            "title": "Multiple Storage Writes in Single Transaction",
            "severity": "medium",
            "explanation": "Each SSTORE costs 5000-20000 gas. Batching or restructuring can reduce total gas cost.",
            "fix": "Use structs to pack related variables into single storage slots. Batch state updates where possible."
        })

    # --- Redundant require messages ---
    long_requires = re.findall(r'require\([^,]+,\s*"[^"]{30,}"', contract_code)
    if long_requires:
        findings.append({
            "title": "Long Error Strings in require()",
            "severity": "low",
            "explanation": "Long revert strings increase deployment gas cost. Each character costs extra gas.",
            "fix": "Use custom errors (Solidity 0.8.4+) instead of string messages: error InsufficientBalance();"
        })

    # --- Use of .transfer() ---
    if '.transfer(' in contract_code:
        findings.append({
            "title": "Use of .transfer() with 2300 Gas Stipend",
            "severity": "medium",
            "explanation": ".transfer() forwards only 2300 gas, which can cause failures when sending to contracts with receive() logic.",
            "fix": "Use .call{value: amount}('') with proper reentrancy protection instead of .transfer()."
        })

    severity_weights = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    raw_score = sum(severity_weights.get(f["severity"], 0) for f in findings)
    score = min(raw_score, 100)

    if not findings:
        score = 8
        findings.append({
            "title": "Gas Usage Appears Reasonable",
            "severity": "low",
            "explanation": "No major gas optimization issues detected through static analysis.",
            "fix": "Profile gas usage with Hardhat Gas Reporter for precise measurements."
        })

    return {
        "name": "Gas Optimizer",
        "status": "done",
        "score": score,
        "findings": findings
    }
