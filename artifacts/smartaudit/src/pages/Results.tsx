import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Download, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Zap, Shield, GitBranch, Activity,
  CheckSquare, ExternalLink, Hash, Network,
} from "lucide-react";
import Header from "@/components/Header";
import { exportAuditAsJSON } from "@/lib/audit-service";
import { GENLAYER_NETWORK, CONTRACT_ADDRESS } from "@/lib/config";
import type { AuditResult, Severity, Vulnerability } from "@/lib/types";

const CURRENT_RESULT_KEY = "smartaudit_current_result";

// ── Severity helpers ──────────────────────────────────────────────────────

const SEV = {
  critical: {
    label: "Critical",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900/50",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500",
    icon: XCircle,
    iconClass: "text-red-500",
  },
  high: {
    label: "High",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-900/50",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    dot: "bg-orange-500",
    icon: AlertTriangle,
    iconClass: "text-orange-500",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/50",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dot: "bg-amber-400",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
  low: {
    label: "Low",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900/50",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    dot: "bg-green-500",
    icon: CheckCircle2,
    iconClass: "text-green-500",
  },
} satisfies Record<Severity, {
  label: string; bg: string; border: string; badge: string;
  dot: string; icon: React.ComponentType<{ className?: string }>; iconClass: string;
}>;

const VERDICT_META = {
  HIGH_RISK: {
    label: "HIGH RISK",
    ringColor: "stroke-red-500",
    scoreColor: "text-red-500",
    badgeBg: "bg-red-100 dark:bg-red-900/30",
    badgeText: "text-red-700 dark:text-red-400",
    badgeBorder: "border-red-200 dark:border-red-800",
  },
  MODERATE_RISK: {
    label: "MODERATE RISK",
    ringColor: "stroke-amber-500",
    scoreColor: "text-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-400",
    badgeBorder: "border-amber-200 dark:border-amber-800",
  },
  LOW_RISK: {
    label: "LOW RISK",
    ringColor: "stroke-green-500",
    scoreColor: "text-green-500",
    badgeBg: "bg-green-100 dark:bg-green-900/30",
    badgeText: "text-green-700 dark:text-green-400",
    badgeBorder: "border-green-200 dark:border-green-800",
  },
};

// ── Risk Score Circle (SVG) ───────────────────────────────────────────────

function RiskCircle({ score, verdict }: { score: number; verdict: string }) {
  const meta = VERDICT_META[verdict as keyof typeof VERDICT_META] ?? VERDICT_META.LOW_RISK;
  const R = 42;
  const C = 2 * Math.PI * R;
  const fill = C * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor"
          className="text-border" strokeWidth="8" />
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8"
          className={`${meta.ringColor} transition-all duration-1000`}
          strokeDasharray={C}
          strokeDashoffset={fill}
          strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold leading-none ${meta.scoreColor}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── Vulnerability Accordion Card ──────────────────────────────────────────

function VulnCard({ vuln, index }: { vuln: Vulnerability; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const s = SEV[vuln.severity] ?? SEV.low;
  const Icon = s.icon;

  return (
    <div
      className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden transition-all duration-200 animate-fade-in`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={`w-4 h-4 shrink-0 ${s.iconClass}`} />
        <span className="flex-1 text-sm font-semibold text-foreground leading-tight">{vuln.title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${s.badge} ${s.border}`}>
          {s.label.toUpperCase()}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-inherit">
          <div className="pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Explanation</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{vuln.explanation}</p>
          </div>
          {vuln.suggestedFix && (
            <div className="bg-background/60 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" /> Suggested Fix
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{vuln.suggestedFix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Results Page ─────────────────────────────────────────────────────

const Results = () => {
  const [, navigate] = useLocation();

  const audit: AuditResult | null = (() => {
    try {
      const stored = sessionStorage.getItem(CURRENT_RESULT_KEY);
      return stored ? (JSON.parse(stored) as AuditResult) : null;
    } catch { return null; }
  })();

  if (!audit) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Audit Found</h2>
          <p className="text-muted-foreground text-sm mb-6">Run an audit to see results here.</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Audit
          </button>
        </main>
      </div>
    );
  }

  const verdict = audit.verdict ??
    (audit.overallRiskScore > 65 ? "HIGH_RISK" : audit.overallRiskScore > 35 ? "MODERATE_RISK" : "LOW_RISK");
  const meta = VERDICT_META[verdict as keyof typeof VERDICT_META] ?? VERDICT_META.LOW_RISK;

  const handleExport = () => {
    const json = exportAuditAsJSON(audit);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartaudit-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const breakdown = audit.severityBreakdown;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Audit</span>
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground">Audit Results</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all duration-150"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>

        {/* ── Fallback banner ───────────────────────────────────────── */}
        {audit.isFallback && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-warning/30 bg-warning/5 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-warning font-medium">
              Using local fallback analysis. GenLayer Studio was not reachable at audit time.
            </p>
          </div>
        )}

        {/* ── HERO CARD ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          {/* Top accent strip */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">

              {/* Risk circle */}
              <div className="shrink-0 text-center">
                <RiskCircle score={audit.overallRiskScore} verdict={verdict} />
                <p className="text-xs text-muted-foreground mt-2 font-medium">Overall Risk Score</p>
              </div>

              {/* Right side */}
              <div className="flex-1 w-full space-y-4">
                {/* Verdict badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border tracking-wider ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${verdict === "HIGH_RISK" ? "bg-red-500" : verdict === "MODERATE_RISK" ? "bg-amber-500" : "bg-green-500"} animate-pulse`} />
                    {meta.label}
                  </span>
                  {!audit.isFallback && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-primary/8 text-primary border-primary/20">
                      <Zap className="w-3 h-3" />
                      GenLayer On-Chain
                    </span>
                  )}
                </div>

                {/* Status indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: "Critical", count: breakdown.critical, color: "text-red-500", dot: "bg-red-500" },
                    { label: "High",     count: breakdown.high,     color: "text-orange-500", dot: "bg-orange-500" },
                    { label: "Medium",   count: breakdown.medium,   color: "text-amber-500", dot: "bg-amber-400" },
                    { label: "Low",      count: breakdown.low,      color: "text-green-500", dot: "bg-green-500" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-background/50 p-3 text-center">
                      <div className={`text-xl font-extrabold ${s.color}`}>{s.count}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <span className="text-[10px] font-semibold text-muted-foreground">{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk progress bar */}
                <div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${audit.overallRiskScore}%`,
                        background: verdict === "HIGH_RISK"
                          ? "linear-gradient(90deg, #f97316, #ef4444)"
                          : verdict === "MODERATE_RISK"
                          ? "linear-gradient(90deg, #22c55e, #f59e0b)"
                          : "linear-gradient(90deg, #22c55e, #10b981)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-medium">
                    <span>0 — Safe</span>
                    <span>100 — Critical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── GENLAYER CONSENSUS SECTION ────────────────────────────── */}
        {!audit.isFallback && (
          <section className="animate-fade-in" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="font-extrabold text-foreground text-sm tracking-wide">GenLayer Consensus</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  icon: GitBranch,
                  label: "Consensus Model",
                  value: "Optimistic Democracy",
                  sub: "Multi-validator agreement",
                  accent: "text-primary",
                  bg: "bg-primary/8",
                },
                {
                  icon: CheckCircle2,
                  label: "Equivalence Principle",
                  value: audit.equivalenceVerified ? "Verified ✓" : "Not checked",
                  sub: "gl.eq_principle.prompt_comparative()",
                  accent: "text-green-500",
                  bg: "bg-green-500/8",
                },
                {
                  icon: Zap,
                  label: "AI Execution",
                  value: "Successful",
                  sub: "gl.nondet.exec_prompt()",
                  accent: "text-amber-500",
                  bg: "bg-amber-500/8",
                },
                {
                  icon: Activity,
                  label: "Consensus Status",
                  value: audit.consensusAchieved ? "Reached ✓" : "Pending",
                  sub: "All validators agreed",
                  accent: "text-green-500",
                  bg: "bg-green-500/8",
                },
                {
                  icon: Network,
                  label: "Network",
                  value: GENLAYER_NETWORK.name,
                  sub: `Chain ID ${GENLAYER_NETWORK.chainId}`,
                  accent: "text-primary",
                  bg: "bg-primary/8",
                },
                ...(audit.auditNumber != null ? [{
                  icon: Hash,
                  label: "Audit Number",
                  value: `#${audit.auditNumber}`,
                  sub: "On-chain audit index",
                  accent: "text-primary",
                  bg: "bg-primary/8",
                }] : []),
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className={`w-4 h-4 ${item.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${item.accent}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contract link */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Contract:</span>
              <a
                href={`${GENLAYER_NETWORK.explorer}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                {`${CONTRACT_ADDRESS.slice(0, 8)}…${CONTRACT_ADDRESS.slice(-6)}`}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </section>
        )}

        {/* ── AI SUMMARY ────────────────────────────────────────────── */}
        {audit.summary && (
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 animate-fade-in"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="font-extrabold text-foreground text-sm tracking-wide">AI Security Summary</h2>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20 font-semibold">
                GenLayer AI
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{audit.summary}</p>
          </section>
        )}

        {/* ── VULNERABILITIES ───────────────────────────────────────── */}
        {audit.vulnerabilities.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: "160ms" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h2 className="font-extrabold text-foreground text-sm tracking-wide">
                  Vulnerabilities
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {audit.vulnerabilities.length} found
              </span>
            </div>
            <div className="space-y-2">
              {audit.vulnerabilities.map((v, i) => (
                <VulnCard key={i} vuln={v} index={i} />
              ))}
            </div>
          </section>
        )}

        {audit.vulnerabilities.length === 0 && !audit.isFallback && (
          <section
            className="rounded-2xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-6 text-center animate-fade-in"
            style={{ animationDelay: "160ms" }}
          >
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-green-700 dark:text-green-400">No vulnerabilities detected</p>
            <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">
              GenLayer AI consensus found no issues in this contract.
            </p>
          </section>
        )}

        {/* ── AI RECOMMENDATIONS ────────────────────────────────────── */}
        {audit.recommendations.length > 0 && (
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 animate-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="font-extrabold text-foreground text-sm tracking-wide">AI Recommendations</h2>
            </div>
            <div className="space-y-2">
              {audit.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/25 transition-all duration-150 group animate-fade-in"
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                    <span className="text-[9px] font-extrabold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-6 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-gradient text-white text-sm font-bold w-full sm:w-auto transition-all duration-200"
          >
            <Shield className="w-4 h-4" />
            Run Another Audit
          </button>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground w-full sm:w-auto transition-all duration-150"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-4 border-t border-border">
        <p className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a href={GENLAYER_NETWORK.explorer} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold">
            GenLayer Intelligent Contracts
          </a>
          {" · "}Optimistic Democracy Consensus
        </p>
      </footer>
    </div>
  );
};

export default Results;
