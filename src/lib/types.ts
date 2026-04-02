export type Severity = "critical" | "high" | "medium" | "low";

export interface Vulnerability {
  title: string;
  severity: Severity;
  explanation: string;
  suggestedFix: string;
}

export interface ValidatorPersona {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: "idle" | "analyzing" | "done";
  riskScore: number;
  findings: Vulnerability[];
}

export interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AuditResult {
  id: string;
  timestamp: number;
  contractSnippet: string;
  validators: ValidatorPersona[];
  overallRiskScore: number;
  confidence: string;
  severityBreakdown: SeverityBreakdown;
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  equivalenceFlags: string[];
  isFallback: boolean;
}
