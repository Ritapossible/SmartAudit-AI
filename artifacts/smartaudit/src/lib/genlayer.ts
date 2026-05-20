const API_BASE_URL = "/api";

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

export async function runBackendAudit(
  contractCode: string
): Promise<BackendAuditResult | null> {
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
