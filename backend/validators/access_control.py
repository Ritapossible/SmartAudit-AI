"""
Access Control Expert Validator
Checks permissions: missing ownership, unprotected functions, centralization risks.
"""

import re
from typing import List, Dict


def analyze(contract_code: str) -> Dict:
    """
    Access control analysis of Solidity smart contract code.
    """
    findings: List[Dict] = []
    code_lower = contract_code.lower()

    # --- No Access Control ---
    has_ownable = 'ownable' in code_lower or 'onlyowner' in code_lower
    has_access_control = 'accesscontrol' in code_lower or 'hasrole' in code_lower
    has_require_sender = 'require(msg.sender' in code_lower

    if not has_ownable and not has_access_control and not has_require_sender:
        findings.append({
            "title": "No Access Control Mechanism",
            "severity": "critical",
            "explanation": "The contract has no ownership or role-based access control. All functions are callable by any address, including sensitive operations.",
            "fix": "Import and use OpenZeppelin's Ownable or AccessControl contract. Apply onlyOwner modifier to admin functions."
        })

    # --- Unprotected State-Changing Functions ---
    public_fns = re.findall(r'function\s+(\w+)\s*\([^)]*\)\s*(public|external)', contract_code)
    for fn_name, _ in public_fns:
        fn_block_match = re.search(rf'function\s+{fn_name}\s*\([^)]*\)[^{{]*\{{', contract_code)
        if fn_block_match:
            fn_start = fn_block_match.start()
            fn_snippet = contract_code[fn_start:fn_start + 500]
            if 'onlyowner' not in fn_snippet.lower() and 'require(msg.sender' not in fn_snippet.lower() and 'hasrole' not in fn_snippet.lower():
                if any(kw in fn_snippet.lower() for kw in ['transfer', 'send', 'call{value', 'selfdestruct', 'delegatecall', 'sstore']):
                    findings.append({
                        "title": f"Unprotected Sensitive Function: {fn_name}()",
                        "severity": "high",
                        "explanation": f"The function {fn_name}() performs sensitive operations but has no access control modifier.",
                        "fix": f"Add an onlyOwner or role-based modifier to {fn_name}()."
                    })
                    break  # Avoid duplicate reports

    # --- Centralization Risk ---
    if has_ownable and 'renounceownership' not in code_lower:
        owner_powers = sum(1 for _ in re.finditer(r'onlyOwner', contract_code, re.IGNORECASE))
        if owner_powers >= 3:
            findings.append({
                "title": "Centralization Risk — Single Owner",
                "severity": "medium",
                "explanation": f"The owner has control over {owner_powers} functions. A compromised owner key would grant full control.",
                "fix": "Consider multi-sig ownership (e.g., Gnosis Safe) or implement a timelock for sensitive operations."
            })

    # --- Missing Zero-Address Check ---
    if re.search(r'function\s+\w+\s*\([^)]*address\s+\w+', contract_code):
        if 'address(0)' not in contract_code and 'address(0x0)' not in contract_code:
            findings.append({
                "title": "Missing Zero-Address Validation",
                "severity": "medium",
                "explanation": "Functions accepting address parameters do not validate against the zero address (0x0). Sending to address(0) burns tokens/ETH permanently.",
                "fix": "Add require(addr != address(0), 'Zero address') for all address parameters."
            })

    # --- Missing Event Emissions ---
    state_changes = len(re.findall(r'\b\w+\s*=\s*(?!.*==)', contract_code))
    events = len(re.findall(r'emit\s+\w+', contract_code))
    if state_changes > 3 and events == 0:
        findings.append({
            "title": "No Events Emitted on State Changes",
            "severity": "low",
            "explanation": "State-changing functions do not emit events. This makes off-chain monitoring and indexing impossible.",
            "fix": "Define and emit events for all critical state changes (transfers, ownership changes, parameter updates)."
        })

    severity_weights = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    raw_score = sum(severity_weights.get(f["severity"], 0) for f in findings)
    score = min(raw_score, 100)

    if not findings:
        score = 5
        findings.append({
            "title": "Access Control Appears Adequate",
            "severity": "low",
            "explanation": "Basic access control patterns are present. Deeper role-based analysis recommended for production.",
            "fix": "Consider implementing granular role-based access control with OpenZeppelin AccessControl."
        })

    return {
        "name": "Access Control Expert",
        "status": "done",
        "score": score,
        "findings": findings
    }
