import type { AuditResult, ValidatorPersona, Vulnerability, Severity, SeverityBreakdown } from "./types";
import { runBackendAudit, API_BASE_URL } from "./genlayer";
import type { BackendAuditResult } from "./genlayer";

const VALIDATOR_PERSONAS: Omit<ValidatorPersona, "status" | "riskScore" | "findings">[] = [
  { id: "security", name: "SecurityBot", role: "Security Auditor", icon: "🔬" },
  { id: "gas", name: "GasOptimizer", role: "Gas Optimizer", icon: "⚡" },
  { id: "access", name: "AccessGuard", role: "Access Control Expert", icon: "🔑" },
  { id: "formal", name: "FormalProver", role: "Formal Verifier", icon: "🧮" },
];

// Map backend validator name to our persona
const PERSONA_MAP: Record<string, typeof VALIDATOR_PERSONAS[number]> = {
  "Security Auditor": VALIDATOR_PERSONAS[0],
  "Gas Optimizer": VALIDATOR_PERSONAS[1],
  "Access Control Expert": VALIDATOR_PERSONAS[2],
  "Formal Verifier": VALIDATOR_PERSONAS[3],
};

const MOCK_VULNERABILITIES: Vulnerability[] = [
  { title: "Reentrancy Vulnerability", severity: "critical", explanation: "The withdraw function sends ETH before updating the balance, allowing an attacker to recursively call withdraw and drain the contract.", suggestedFix: "Use the checks-effects-interactions pattern: update balances before the external call." },
  { title: "Unchecked Return Value", severity: "high", explanation: "The low-level call return value is checked, but the pattern is fragile.", suggestedFix: "Replace with a ReentrancyGuard modifier from OpenZeppelin." },
  { title: "Missing Access Control", severity: "high", explanation: "No ownership or role-based modifiers are applied.", suggestedFix: "Add an Ownable modifier or implement role-based access control." },
  { title: "Gas-Inefficient Storage Pattern", severity: "medium", explanation: "Repeated reads from storage in loops increase gas costs.", suggestedFix: "Cache storage variables in memory before loops." },
  { title: "No Event Emissions", severity: "low", explanation: "State-changing functions do not emit events.", suggestedFix: "Emit events for deposit, withdrawal, and ownership changes." },
  { title: "Pragma Version Not Locked", severity: "low", explanation: "Using ^0.8.0 allows compilation with future untested compiler versions.", suggestedFix: "Lock to a specific release, e.g., pragma solidity 0.8.20;" },
];

/**
 * Maps backend response to the frontend AuditResult format.
 */
function mapBackendResult(backend: BackendAuditResult, contractCode: string): AuditResult {
  const validators: ValidatorPersona[] = backend.validators.map((bv) => {
    const persona = PERSONA_MAP[bv.name] || VALIDATOR_PERSONAS[0];
    const findings: Vulnerability[] = (bv.findings || []).map((f) => ({
      title: f.title,
      severity: f.severity as Severity,
      explanation: f.explanation,
      suggestedFix: f.fix,
    }));
    return {
      ...persona,
      status: "done" as const,
      riskScore: bv.score,
      findings,
    };
  });

  // Collect all vulnerabilities from all validators
  const allVulns: Vulnerability[] = [];
  const seen = new Set<string>();
  for (const v of validators) {
    for (const f of v.findings) {
      if (!seen.has(f.title.toLowerCase())) {
        seen.add(f.title.toLowerCase());
        allVulns.push(f);
      }
    }
  }

  // Generate recommendations from findings
  const recommendations: string[] = [];
  const issueText = allVulns.map(v => v.title + " " + v.explanation).join(" ").toLowerCase();
  if (issueText.includes("reentrancy")) recommendations.push("Implement OpenZeppelin's ReentrancyGuard on all external-calling functions");
  if (issueText.includes("access") || issueText.includes("ownership")) recommendations.push("Add Ownable or AccessControl for role-based permissions");
  if (issueText.includes("event")) recommendations.push("Emit events for all state-changing operations");
  if (issueText.includes("pragma") || issueText.includes("version")) recommendations.push("Lock Solidity compiler version to a specific release");
  if (issueText.includes("gas") || issueText.includes("storage")) recommendations.push("Cache storage variables and optimize gas-heavy patterns");
  if (recommendations.length === 0) recommendations.push("Follow Solidity best practices and consider a professional audit");

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contractSnippet: contractCode.slice(0, 120),
    validators,
    overallRiskScore: backend.consensus_score,
    confidence: backend.consensus_score > 60 ? "High Risk — Consensus Achieved" : backend.consensus_score > 35 ? "Medium Risk — Consensus Achieved" : "Low Risk — Consensus Achieved",
    severityBreakdown: backend.severity_breakdown,
    vulnerabilities: allVulns,
    recommendations,
    equivalenceFlags: [],
    isFallback: backend.is_fallback,
  };
}

function generateMockResult(contractCode: string): AuditResult {
  const relevantVulns = MOCK_VULNERABILITIES.slice(0, 4 + Math.floor(Math.random() * 3));
  const severityBreakdown: SeverityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  relevantVulns.forEach((v) => severityBreakdown[v.severity]++);

  const validators: ValidatorPersona[] = VALIDATOR_PERSONAS.map((p) => {
    const findings = relevantVulns.filter(() => Math.random() > 0.3);
    const riskScore = Math.round(20 + Math.random() * 60);
    return { ...p, status: "done" as const, riskScore, findings };
  });

  const overallRiskScore = Math.round(validators.reduce((s, v) => s + v.riskScore, 0) / validators.length);

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contractSnippet: contractCode.slice(0, 120),
    validators,
    overallRiskScore,
    confidence: overallRiskScore > 60 ? "High Risk — Consensus Achieved" : overallRiskScore > 35 ? "Medium Risk — Consensus Achieved" : "Low Risk — Consensus Achieved",
    severityBreakdown,
    vulnerabilities: relevantVulns,
    recommendations: [
      "Implement OpenZeppelin's ReentrancyGuard on all external-calling functions",
      "Add Ownable or AccessControl for role-based permissions",
      "Emit events for all state-changing operations",
      "Lock Solidity compiler version to a specific release",
      "Consider using pull-over-push withdrawal pattern",
    ],
    equivalenceFlags: overallRiskScore > 50
      ? ["Validators diverged on severity (scores: " + validators.map(v => v.riskScore).join(", ") + ")"]
      : [],
    isFallback: true,
  };
}

export type ProgressCallback = (step: string, validatorIndex: number) => void;

export async function performAudit(
  contractCode: string,
  securityCheck: boolean,
  equivalenceCheck: boolean,
  onProgress: ProgressCallback
): Promise<AuditResult> {
  // Step-by-step progress animation
  for (let i = 0; i < VALIDATOR_PERSONAS.length; i++) {
    onProgress(`${VALIDATOR_PERSONAS[i].icon} ${VALIDATOR_PERSONAS[i].name} analyzing...`, i);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
  }
  onProgress("🔗 Forming consensus...", VALIDATOR_PERSONAS.length);
  await new Promise((r) => setTimeout(r, 1000));

  // Try real backend (FastAPI or GenLayer contract)
  try {
    const backendResult = await runBackendAudit(contractCode);
    if (backendResult) {
      return mapBackendResult(backendResult, contractCode);
    }
  } catch (err) {
    console.warn("Backend call failed, using fallback:", err);
  }

  // Fallback to mock
  return generateMockResult(contractCode);
}

// Audit History (localStorage)
const HISTORY_KEY = "smartaudit_history";

export function saveAuditToHistory(audit: AuditResult) {
  const history = getAuditHistory();
  history.unshift(audit);
  if (history.length > 20) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getAuditHistory(): AuditResult[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearAuditHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function exportAuditAsJSON(audit: AuditResult): string {
  return JSON.stringify(audit, null, 2);
}

export { VALIDATOR_PERSONAS };
