"""
Formal Verifier Validator
Analyzes logic correctness: state invariants, edge cases, arithmetic safety.
"""

import re
from typing import List, Dict


def analyze(contract_code: str) -> Dict:
    """
    Formal verification-style analysis of Solidity smart contract code.
    """
    findings: List[Dict] = []
    code_lower = contract_code.lower()

    # --- Unchecked Arithmetic (even in 0.8+, unchecked blocks) ---
    if 'unchecked' in contract_code:
        findings.append({
            "title": "Unchecked Arithmetic Block",
            "severity": "high",
            "explanation": "unchecked { } blocks disable overflow/underflow protection. If the math is not proven safe, this can lead to silent wrapping.",
            "fix": "Only use unchecked for operations that are mathematically guaranteed to be safe (e.g., loop counters). Add comments proving safety."
        })

    # --- Division by Zero ---
    divisions = re.findall(r'/\s*(\w+)', contract_code)
    for divisor in divisions:
        if divisor not in ('0', '1', '2') and f'require({divisor}' not in contract_code and f'{divisor} != 0' not in contract_code and f'{divisor} > 0' not in contract_code:
            findings.append({
                "title": "Potential Division by Zero",
                "severity": "medium",
                "explanation": f"Division by variable '{divisor}' without a zero-check. Solidity will revert, but the error message will be unclear.",
                "fix": f"Add require({divisor} > 0, 'Division by zero') before the division operation."
            })
            break

    # --- Incorrect Comparison (= vs ==) ---
    if re.search(r'if\s*\([^)]*[^!=<>]=[^=][^)]*\)', contract_code):
        findings.append({
            "title": "Assignment in Conditional Expression",
            "severity": "critical",
            "explanation": "An assignment operator (=) was used inside an if-condition instead of comparison (==). This will always evaluate to the assigned value.",
            "fix": "Replace = with == in conditional expressions."
        })

    # --- Missing Return Statement ---
    functions_with_returns = re.findall(r'function\s+\w+\s*\([^)]*\)[^{]*returns\s*\([^)]+\)\s*\{', contract_code)
    for fn in functions_with_returns:
        fn_name = re.search(r'function\s+(\w+)', fn)
        if fn_name and 'return' not in contract_code[contract_code.find(fn):contract_code.find(fn) + 500]:
            findings.append({
                "title": f"Possibly Missing Return in {fn_name.group(1)}()",
                "severity": "medium",
                "explanation": "A function declares a return type but may not have an explicit return statement in all code paths.",
                "fix": "Ensure all code paths return a value. Use named return variables or explicit return statements."
            })
            break

    # --- Fallback Function Logic ---
    if re.search(r'(fallback|receive)\s*\(\s*\)', contract_code):
        fallback_section = contract_code[contract_code.find('fallback') if 'fallback' in contract_code else contract_code.find('receive'):]
        if len(fallback_section) > 200:
            findings.append({
                "title": "Complex Fallback/Receive Function",
                "severity": "medium",
                "explanation": "The fallback or receive function contains significant logic. This is risky because it executes on plain ETH transfers with limited gas.",
                "fix": "Keep fallback/receive minimal — just emit an event. Move logic to named functions."
            })

    # --- Shadowed State Variables ---
    state_vars = set(re.findall(r'(?:uint\d*|int\d*|address|bool|bytes\d*|string|mapping)\s+(?:public\s+|private\s+|internal\s+)?(\w+)\s*[;=]', contract_code))
    local_vars = set(re.findall(r'(?:uint\d*|int\d*|address|bool|bytes\d*|string)\s+(\w+)\s*=', contract_code))
    shadowed = state_vars & local_vars
    if shadowed:
        findings.append({
            "title": f"Variable Shadowing: {', '.join(list(shadowed)[:3])}",
            "severity": "medium",
            "explanation": "Local variables shadow state variables with the same name. This can lead to unexpected behavior.",
            "fix": "Rename local variables to avoid shadowing (e.g., prefix with underscore: _balance)."
        })

    # --- Floating Pragma ---
    if re.search(r'pragma solidity\s*\^', contract_code):
        findings.append({
            "title": "Floating Pragma Version",
            "severity": "low",
            "explanation": "Using ^ in pragma allows compilation with untested future compiler versions that may introduce breaking changes.",
            "fix": "Lock to a specific version: pragma solidity 0.8.20; (or your tested version)."
        })

    severity_weights = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    raw_score = sum(severity_weights.get(f["severity"], 0) for f in findings)
    score = min(raw_score, 100)

    if not findings:
        score = 5
        findings.append({
            "title": "No Logical Issues Detected",
            "severity": "low",
            "explanation": "Static formal analysis did not find logic errors. Symbolic execution recommended for deeper verification.",
            "fix": "Use tools like Mythril or Certora Prover for comprehensive formal verification."
        })

    return {
        "name": "Formal Verifier",
        "status": "done",
        "score": score,
        "findings": findings
    }
