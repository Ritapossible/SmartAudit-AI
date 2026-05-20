import type { AuditResult, ValidatorPersona, Vulnerability, Severity, SeverityBreakdown } from "./types";
import type { GenLayerAuditResult } from "./genlayer-contract";
import { runAuditOnChain, UserRejectedError, WrongNetworkError, GenLayerDownError } from "./genlayer-contract";
import { switchToGenLayer } from "./wallet-detection";
import { GENLAYER_NETWORK } from "./config";
import type { WalletState } from "@/hooks/use-wallet";

export const VALIDATOR_PERSONAS: Omit<ValidatorPersona, "status" | "riskScore" | "findings">[] = [
  { id: "security", name: "SecurityBot",   role: "Security Auditor",      icon: "🔬" },
  { id: "gas",      name: "GasOptimizer",  role: "Gas Optimizer",          icon: "⚡" },
  { id: "access",   name: "AccessGuard",   role: "Access Control Expert",  icon: "🔑" },
  { id: "formal",   name: "FormalProver",  role: "Formal Verifier",         icon: "🧮" },
];

const PERSONA_BY_ROLE: Record<string, typeof VALIDATOR_PERSONAS[number]> = {
  "Security Auditor":      VALIDATOR_PERSONAS[0],
  "Gas Optimizer":         VALIDATOR_PERSONAS[1],
  "Access Control Expert": VALIDATOR_PERSONAS[2],
  "Formal Verifier":       VALIDATOR_PERSONAS[3],
};

// ── Map GenLayer on-chain result → app AuditResult ────────────────────────
// Handles THREE contract shapes:
//  1. Nested: { audit: { issues: string[], risk_score, summary, verdict },
//               audit_number, consensus: { enabled, model },
//               equivalence_principle: { enabled, status } }
//  2. Flat:   { risk_score, verdict, summary, vulnerabilities: [...], … }
//  3. Old:    { consensus_score, validators: [...], severity_breakdown, … }

/** Infer severity from an issue description string */
function inferSeverity(issue: string): Severity {
  const s = issue.toLowerCase();
  if (
    s.includes("reentrancy") || s.includes("re-entrancy") ||
    s.includes("arbitrary") || s.includes("selfdestruct") ||
    s.includes("phishing") || s.includes("flash loan")
  ) return "critical";
  if (
    s.includes("overflow") || s.includes("underflow") ||
    s.includes("unchecked") || s.includes("access control") ||
    s.includes("unprotected") || s.includes("unauthorized") ||
    s.includes("low-level call") || s.includes("delegatecall") ||
    s.includes("frontrun") || s.includes("front-run") ||
    s.includes("recursive")
  ) return "high";
  if (
    s.includes("gas") || s.includes("visibility") ||
    s.includes("event") || s.includes("pattern") ||
    s.includes("state update") || s.includes("checks-effects") ||
    s.includes("missing") || s.includes("incorrect")
  ) return "medium";
  return "low";
}

/** Convert a plain-text issue string to a Vulnerability object */
function issueStringToVuln(issue: string): Vulnerability {
  // Try colon separator first ("Title: explanation")
  const colonSep = issue.indexOf(":");
  if (colonSep > 0 && colonSep < 65) {
    return {
      title: issue.slice(0, colonSep).trim(),
      severity: inferSeverity(issue),
      explanation: issue.slice(colonSep + 1).trim(),
      suggestedFix: "",
    };
  }
  // Natural break points for full-sentence style issues
  for (const kw of [" due to ", " — ", " because ", " which "]) {
    const idx = issue.indexOf(kw);
    if (idx > 8 && idx < 72) {
      return {
        title: issue.slice(0, idx).trim(),
        severity: inferSeverity(issue),
        explanation: issue,
        suggestedFix: "",
      };
    }
  }
  // Fallback: break at a word boundary ≤55 chars
  let title = issue.slice(0, 55);
  const lastSpace = title.lastIndexOf(" ");
  if (lastSpace > 20) title = title.slice(0, lastSpace);
  return { title, severity: inferSeverity(issue), explanation: issue, suggestedFix: "" };
}

/** Normalize any verdict string ("HIGH RISK", "HIGH_RISK", etc.) to the internal enum */
function normalizeVerdict(raw: string | undefined, score: number): "HIGH_RISK" | "MODERATE_RISK" | "LOW_RISK" {
  if (raw) {
    const u = raw.toUpperCase().replace(/[\s\-]+/g, "_");
    if (u.includes("HIGH")) return "HIGH_RISK";
    if (u.includes("MODERATE") || u.includes("MEDIUM")) return "MODERATE_RISK";
    if (u.includes("LOW")) return "LOW_RISK";
  }
  // Match new contract thresholds: ≥75 high, ≥45 moderate, else low
  return score >= 75 ? "HIGH_RISK" : score >= 45 ? "MODERATE_RISK" : "LOW_RISK";
}

function mapGenLayerResult(gl: GenLayerAuditResult, contractCode: string): AuditResult {
  // ── Unwrap nested audit object (new contract shape) ───────────────────
  const auditObj = gl.audit;          // may be undefined for flat/old shapes
  const consensusObj = gl.consensus;
  const eqObj = gl.equivalence_principle;

  // ── Resolve risk score ────────────────────────────────────────────────
  const riskScore: number =
    typeof auditObj?.risk_score === "number" ? auditObj.risk_score
    : typeof gl.risk_score === "number" ? gl.risk_score
    : typeof gl.consensus_score === "number" ? gl.consensus_score
    : 0;

  // ── Resolve verdict — handles "HIGH RISK", "HIGH_RISK", score fallback ─
  const verdict = normalizeVerdict(auditObj?.verdict ?? gl.verdict, riskScore);

  // ── Resolve summary ───────────────────────────────────────────────────
  const summary = auditObj?.summary ?? gl.summary;

  // ── Resolve vulnerabilities ───────────────────────────────────────────
  const vulns: Vulnerability[] = [];
  const seen = new Set<string>();

  const addVuln = (v: Vulnerability) => {
    const key = v.title.toLowerCase().slice(0, 40);
    if (!seen.has(key)) { seen.add(key); vulns.push(v); }
  };

  // New shape: audit.issues is an array of plain strings
  for (const issue of auditObj?.issues ?? []) {
    if (typeof issue === "string" && issue.trim()) {
      addVuln(issueStringToVuln(issue));
    }
  }

  // Flat shape: vulnerabilities array of objects
  for (const v of gl.vulnerabilities ?? []) {
    addVuln({
      title: v.title,
      severity: v.severity as Severity,
      explanation: v.explanation,
      suggestedFix: v.fix ?? v.suggested_fix ?? "",
    });
  }

  // Old shape: validators[].findings
  for (const validator of gl.validators ?? []) {
    for (const f of validator.findings ?? []) {
      addVuln({
        title: f.title,
        severity: f.severity as Severity,
        explanation: f.explanation,
        suggestedFix: f.fix,
      });
    }
  }

  // ── Severity breakdown ────────────────────────────────────────────────
  const severityBreakdown: SeverityBreakdown = gl.severity_breakdown ?? {
    critical: vulns.filter((v) => v.severity === "critical").length,
    high:     vulns.filter((v) => v.severity === "high").length,
    medium:   vulns.filter((v) => v.severity === "medium").length,
    low:      vulns.filter((v) => v.severity === "low").length,
  };

  // ── Validators (old shape only; new shape has no validator breakdown) ─
  const validators: ValidatorPersona[] = (gl.validators ?? []).map((v) => {
    const persona = PERSONA_BY_ROLE[v.name] ?? VALIDATOR_PERSONAS[0];
    const findings: Vulnerability[] = (v.findings ?? []).map((f) => ({
      title: f.title,
      severity: f.severity as Severity,
      explanation: f.explanation,
      suggestedFix: f.fix,
    }));
    return { ...persona, status: "done" as const, riskScore: v.score, findings };
  });

  // ── Recommendations ───────────────────────────────────────────────────
  const recommendations: string[] =
    Array.isArray(gl.recommendations) && gl.recommendations.length > 0
      ? gl.recommendations
      : buildRecommendations(vulns);

  // ── Consensus & equivalence ───────────────────────────────────────────
  const consensusAchieved = consensusObj?.enabled ?? gl.consensus_achieved ?? true;
  const equivalenceVerified = eqObj?.enabled ?? gl.equivalence_verified ?? true;

  // ── Confidence label ──────────────────────────────────────────────────
  const consensusModel = consensusObj?.model ?? "GenLayer AI Consensus";
  const confidence =
    verdict === "HIGH_RISK" ? `High Risk — ${consensusModel}`
    : verdict === "MODERATE_RISK" ? `Moderate Risk — ${consensusModel}`
    : `Low Risk — ${consensusModel}`;

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contractSnippet: contractCode.slice(0, 120),
    validators,
    overallRiskScore: riskScore,
    confidence,
    severityBreakdown,
    vulnerabilities: vulns,
    recommendations,
    equivalenceFlags: [],
    isFallback: false,
    summary,
    verdict,
    consensusAchieved,
    equivalenceVerified,
    auditNumber: gl.audit_number,
  };
}

// ── Fallback: call local Express backend ─────────────────────────────────

async function runBackendAudit(contractCode: string): Promise<AuditResult | null> {
  try {
    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: contractCode }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as BackendAuditResponse;
    return mapBackendFallback(data, contractCode);
  } catch {
    return null;
  }
}

interface BackendAuditResponse {
  consensus_score: number;
  severity_breakdown: SeverityBreakdown;
  validators: Array<{
    name: string;
    score: number;
    findings: Array<{ title: string; severity: string; explanation: string; fix: string }>;
  }>;
  is_fallback: boolean;
}

function mapBackendFallback(data: BackendAuditResponse, contractCode: string): AuditResult {
  const validators: ValidatorPersona[] = data.validators.map((v) => {
    const persona = PERSONA_BY_ROLE[v.name] ?? VALIDATOR_PERSONAS[0];
    const findings: Vulnerability[] = (v.findings ?? []).map((f) => ({
      title: f.title,
      severity: f.severity as Severity,
      explanation: f.explanation,
      suggestedFix: f.fix,
    }));
    return { ...persona, status: "done" as const, riskScore: v.score, findings };
  });

  const allVulns: Vulnerability[] = [];
  const seen = new Set<string>();
  for (const v of validators) {
    for (const f of v.findings) {
      const key = f.title.toLowerCase();
      if (!seen.has(key)) { seen.add(key); allVulns.push(f); }
    }
  }

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contractSnippet: contractCode.slice(0, 120),
    validators,
    overallRiskScore: data.consensus_score,
    confidence:
      data.consensus_score > 60 ? "High Risk — Local Analysis (GenLayer Offline)"
      : data.consensus_score > 35 ? "Medium Risk — Local Analysis (GenLayer Offline)"
      : "Low Risk — Local Analysis (GenLayer Offline)",
    severityBreakdown: data.severity_breakdown,
    vulnerabilities: allVulns,
    recommendations: buildRecommendations(allVulns),
    equivalenceFlags: [],
    isFallback: true,
  };
}

// ── Static mock fallback (no network at all) ─────────────────────────────

const MOCK_VULNS: Vulnerability[] = [
  { title: "Reentrancy Vulnerability", severity: "critical", explanation: "ETH is sent before balances are updated — allows recursive withdraw attacks.", suggestedFix: "Apply checks-effects-interactions pattern and use ReentrancyGuard." },
  { title: "Unchecked Return Value", severity: "high", explanation: "Low-level call return value is not validated.", suggestedFix: "Always check `(bool success,) = addr.call{...}(); require(success);`" },
  { title: "Missing Access Control", severity: "high", explanation: "No ownership or role-based modifiers on sensitive functions.", suggestedFix: "Add OpenZeppelin Ownable or AccessControl." },
  { title: "Gas-Inefficient Storage Pattern", severity: "medium", explanation: "Repeated storage reads in loops increase gas costs.", suggestedFix: "Cache storage variables in memory before loops." },
  { title: "No Event Emissions", severity: "low", explanation: "State-changing functions do not emit events.", suggestedFix: "Emit events for all significant state transitions." },
];

function mockResult(contractCode: string): AuditResult {
  const vulns = MOCK_VULNS.slice(0, 4);
  const breakdown: SeverityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  vulns.forEach((v) => breakdown[v.severity]++);

  const validators: ValidatorPersona[] = VALIDATOR_PERSONAS.map((p) => ({
    ...p,
    status: "done" as const,
    riskScore: Math.round(25 + Math.random() * 50),
    findings: vulns.filter(() => Math.random() > 0.4),
  }));

  const score = Math.round(validators.reduce((s, v) => s + v.riskScore, 0) / validators.length);

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contractSnippet: contractCode.slice(0, 120),
    validators,
    overallRiskScore: score,
    confidence: score > 60 ? "High Risk — Offline Analysis" : score > 35 ? "Medium Risk — Offline Analysis" : "Low Risk — Offline Analysis",
    severityBreakdown: breakdown,
    vulnerabilities: vulns,
    recommendations: buildRecommendations(vulns),
    equivalenceFlags: [],
    isFallback: true,
  };
}

// ── Recommendations builder ───────────────────────────────────────────────

function buildRecommendations(vulns: Vulnerability[]): string[] {
  const text = vulns.map((v) => `${v.title} ${v.explanation}`).join(" ").toLowerCase();
  const recs: string[] = [];
  if (text.includes("reentrancy")) recs.push("Implement OpenZeppelin's ReentrancyGuard on all external-calling functions");
  if (text.includes("access") || text.includes("ownership")) recs.push("Add Ownable or AccessControl for role-based permissions");
  if (text.includes("event")) recs.push("Emit events for all state-changing operations");
  if (text.includes("pragma") || text.includes("version")) recs.push("Lock Solidity compiler version to a specific release");
  if (text.includes("gas") || text.includes("storage")) recs.push("Cache storage variables and optimize gas-heavy patterns");
  if (text.includes("tx.origin")) recs.push("Replace tx.origin with msg.sender for all authentication checks");
  if (recs.length === 0) recs.push("Follow Solidity best practices and consider a professional audit before mainnet deployment");
  return recs;
}

// ── Main audit entry point ────────────────────────────────────────────────

export type ProgressCallback = (step: string, validatorIndex: number) => void;

export interface AuditOptions {
  wallet: WalletState | null;
  securityCheck: boolean;
  equivalenceCheck: boolean;
  onProgress: ProgressCallback;
  onWalletPrompt?: () => void;
  onTxSent?: (txHash: string) => void;
}

export async function performAudit(
  contractCode: string,
  options: AuditOptions,
): Promise<AuditResult> {
  const { wallet, onProgress, onWalletPrompt, onTxSent } = options;

  // Animate validator personas briefly while preparing
  for (let i = 0; i < VALIDATOR_PERSONAS.length; i++) {
    onProgress(`${VALIDATOR_PERSONAS[i].icon} ${VALIDATOR_PERSONAS[i].name} ready…`, i);
    await new Promise((r) => setTimeout(r, 400));
  }

  // ── Tier 1: GenLayer on-chain (requires connected wallet on correct network) ──
  if (wallet?.provider) {
    // Ensure correct network before sending — silently switch if needed
    if (!wallet.isCorrectNetwork) {
      onProgress("🔄 Switching to GenLayer Studio…", VALIDATOR_PERSONAS.length);
      try {
        await switchToGenLayer(wallet.rawProvider);
        // Short pause so the wallet can finish the network switch
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: unknown) {
        // User rejected the network switch — tell them clearly, don't fall back
        const msg = String((err as Error).message ?? "").toLowerCase();
        const rejected =
          (err as { code?: number }).code === 4001 ||
          msg.includes("user rejected") ||
          msg.includes("user denied");
        if (rejected) {
          throw new Error(
            `Please switch your wallet to GenLayer Studio (Chain ${GENLAYER_NETWORK.chainId}) and try again.`,
          );
        }
        // Otherwise (e.g. wallet doesn't support the method), fall through to fallback
      }
    }

    onProgress("🌐 Connecting to GenLayer Studio validators…", VALIDATOR_PERSONAS.length);

    // Track whether a transaction was sent so we know not to silently fall back
    let txWasSent = false;

    try {
      const glResult = await runAuditOnChain(
        wallet.provider,
        contractCode,
        () => {
          onWalletPrompt?.();
          onProgress("💳 Check your wallet — approve the GEN gas fee to proceed…", VALIDATOR_PERSONAS.length);
        },
        (txHash) => {
          txWasSent = true;
          onTxSent?.(txHash);
          onProgress("⏳ Transaction submitted — waiting for AI validators to reach consensus…", VALIDATOR_PERSONAS.length);
        },
        (attempt, total) => {
          onProgress(
            `🔗 Validators reaching consensus… (${attempt}/${total})`,
            VALIDATOR_PERSONAS.length,
          );
        },
      );
      onProgress("✅ GenLayer consensus reached!", VALIDATOR_PERSONAS.length);
      return mapGenLayerResult(glResult, contractCode);
    } catch (err) {
      // Hard stops — do NOT fall back, surface the error to the user
      if (err instanceof UserRejectedError || err instanceof WrongNetworkError) {
        throw err;
      }

      // If a transaction was already sent (gas paid, on-chain) and GenLayer
      // failed to return the result, surface the error clearly — do NOT fall
      // back to local analysis silently. The user's transaction is on-chain.
      if (txWasSent) {
        throw err;
      }

      // GenLayer was unreachable BEFORE a transaction was sent —
      // safe to fall through to local fallback
      if (err instanceof GenLayerDownError) {
        onProgress("⚠️ GenLayer unreachable — using local analysis…", VALIDATOR_PERSONAS.length);
        await new Promise((r) => setTimeout(r, 600));
      } else {
        // Unknown error before tx was sent — surface it
        throw err;
      }
    }
  } else {
    onProgress("🔒 No wallet — using local analysis…", VALIDATOR_PERSONAS.length);
    await new Promise((r) => setTimeout(r, 500));
  }

  // ── Tier 2: Local Express backend (GenLayer down) ─────────────────────────
  const backendResult = await runBackendAudit(contractCode);
  if (backendResult) return backendResult;

  // ── Tier 3: Static mock (no network at all) ──────────────────────────────
  return mockResult(contractCode);
}

// ── History helpers ───────────────────────────────────────────────────────

const HISTORY_KEY = "smartaudit_history";

export function saveAuditToHistory(audit: AuditResult) {
  const history = getAuditHistory();
  history.unshift(audit);
  if (history.length > 20) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getAuditHistory(): AuditResult[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as AuditResult[];
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
