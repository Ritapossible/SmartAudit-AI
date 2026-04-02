"""
Consensus Engine
Aggregates results from all 4 validators and computes final audit score.
"""

from typing import List, Dict


def compute_consensus(validator_results: List[Dict]) -> Dict:
    """
    Aggregates validator findings into a unified consensus result.

    - consensus_score: weighted average of all validator scores
    - severity_breakdown: total count of findings by severity
    - validators: full validator results array
    """

    # Weighted average: Security Auditor has highest weight
    weights = {
        "Security Auditor": 0.35,
        "Gas Optimizer": 0.15,
        "Access Control Expert": 0.30,
        "Formal Verifier": 0.20,
    }

    total_weight = 0
    weighted_score = 0
    severity_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for v in validator_results:
        w = weights.get(v["name"], 0.25)
        weighted_score += v["score"] * w
        total_weight += w

        for finding in v.get("findings", []):
            sev = finding.get("severity", "low")
            if sev in severity_breakdown:
                severity_breakdown[sev] += 1

    consensus_score = round(weighted_score / total_weight) if total_weight > 0 else 0

    return {
        "consensus_score": min(consensus_score, 100),
        "severity_breakdown": severity_breakdown,
        "validators": validator_results,
    }
