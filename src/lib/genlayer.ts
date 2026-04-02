/**
 * SmartAudit AI — API Client
 * Frontend communicates ONLY with FastAPI backend.
 * FastAPI handles GenLayer contract calls internally.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export interface BackendValidatorResult {
  name: string;
  status: string;
  score: number;
  findings: {
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    explanation: string;
    fix: string;
  }[];
}

export interface BackendAuditResult {
  consensus_score: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  validators: BackendValidatorResult[];
  is_fallback: boolean;
  message?: string;
}

/**
 * Call FastAPI backend to run audit.
 * Returns null if backend is unavailable.
 */
export async function runBackendAudit(
  contractCode: string
): Promise<BackendAuditResult | null> {
  if (!API_BASE_URL) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: contractCode }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend API call failed:", err);
  }

  return null;
}

export { API_BASE_URL };
