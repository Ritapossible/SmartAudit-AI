"""
Security Auditor Validator
Detects vulnerabilities: reentrancy, integer overflow, unchecked calls, tx.origin, selfdestruct.
"""

import re
from typing import List, Dict


def analyze(contract_code: str) -> Dict:
    """
    Security-focused analysis of Solidity smart contract code.
    Returns structured findings with severity levels.
    """
    findings: List[Dict] = []
    code_lower = contract_code.lower()

    # --- Reentrancy Detection ---
    if re.search(r'\.call\{value', contract_code) or re.search(r'\.call\.value', contract_code):
        # Check if state update happens AFTER external call
        call_pos = contract_code.find('.call')
        has_state_after = bool(re.search(r'\b\w+\[.*\]\s*=', contract_code[call_pos:]))
        if has_state_after or 'reentrancy' not in code_lower:
            findings.append({
                "title": "Reentrancy Vulnerability",
                "severity": "critical",
                "explanation": "External call is made before state variables are updated. An attacker can recursively call back into the function and drain funds.",
                "fix": "Apply the checks-effects-interactions pattern: update all state variables before making external calls. Use OpenZeppelin's ReentrancyGuard modifier."
            })

    # --- Unchecked External Call ---
    if '.call(' in contract_code or '.call{' in contract_code:
        if '(bool success' not in contract_code and '(bool sent' not in contract_code:
            findings.append({
                "title": "Unchecked External Call Return Value",
                "severity": "critical",
                "explanation": "The return value of a low-level call is not checked. Failed calls will silently continue execution.",
                "fix": "Always check the boolean return: (bool success, ) = addr.call{value: amt}(''); require(success, 'Transfer failed');"
            })

    # --- tx.origin Authentication ---
    if 'tx.origin' in contract_code:
        findings.append({
            "title": "tx.origin Used for Authentication",
            "severity": "high",
            "explanation": "Using tx.origin for authorization is vulnerable to phishing attacks. A malicious contract can trick a user into calling it, inheriting their tx.origin.",
            "fix": "Replace tx.origin with msg.sender for authentication checks."
        })

    # --- Selfdestruct ---
    if 'selfdestruct' in code_lower or 'suicide' in code_lower:
        findings.append({
            "title": "Selfdestruct Instruction Present",
            "severity": "high",
            "explanation": "The contract can be destroyed, sending remaining funds to a designated address. This can be exploited if access control is weak.",
            "fix": "Remove selfdestruct if not needed. If required, protect it with multi-sig or timelock."
        })

    # --- Integer Overflow (pre-0.8) ---
    if re.search(r'pragma solidity\s*\^?\s*0\.[0-7]', contract_code):
        findings.append({
            "title": "Potential Integer Overflow/Underflow",
            "severity": "high",
            "explanation": "Solidity versions before 0.8.0 do not have built-in overflow checks. Arithmetic operations can silently wrap around.",
            "fix": "Upgrade to Solidity 0.8+ or use OpenZeppelin SafeMath library."
        })

    # --- Unprotected Ether Transfer ---
    if 'transfer(' in contract_code or 'send(' in contract_code:
        if 'onlyowner' not in code_lower and 'require(msg.sender' not in code_lower:
            findings.append({
                "title": "Unprotected Ether Transfer",
                "severity": "medium",
                "explanation": "Ether transfer functions lack access control. Any address may trigger transfers.",
                "fix": "Add access control modifiers (onlyOwner, require(msg.sender == owner)) to functions that transfer Ether."
            })

    # --- Timestamp Dependence ---
    if 'block.timestamp' in contract_code or 'now' in code_lower:
        findings.append({
            "title": "Block Timestamp Dependence",
            "severity": "low",
            "explanation": "Miners can manipulate block.timestamp by a small amount (~15 seconds). Avoid using it for critical logic.",
            "fix": "Use block.number for ordering or commit-reveal schemes for randomness."
        })

    # Calculate risk score based on findings
    severity_weights = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    raw_score = sum(severity_weights.get(f["severity"], 0) for f in findings)
    score = min(raw_score, 100)

    # Baseline score even if no findings (code still needs review)
    if not findings:
        score = 10
        findings.append({
            "title": "No Major Security Issues Detected",
            "severity": "low",
            "explanation": "Static analysis did not detect common vulnerability patterns. Manual review is still recommended.",
            "fix": "Consider a professional audit for production deployment."
        })

    return {
        "name": "Security Auditor",
        "status": "done",
        "score": score,
        "findings": findings
    }
