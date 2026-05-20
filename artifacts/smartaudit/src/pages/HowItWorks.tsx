import { useLocation } from "wouter";
import {
  Shield, Fuel, KeyRound, FileCheck,
  ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle,
  Wallet, Globe, BarChart3, Layers, Zap, Clock,
  GitBranch, Network, Lock,
} from "lucide-react";
import Header from "@/components/Header";

// ── Data ───────────────────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    icon: Wallet,
    title: "Connect Your Wallet",
    desc: "Connect MetaMask, Rabby, OKX, or any EVM-compatible wallet. The app automatically switches to GenLayer Studio (Chain 61999) and prompts you to get free GEN testnet tokens if needed.",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    num: "02",
    icon: Globe,
    title: "Submit Your Contract",
    desc: "Paste your Solidity smart contract code. Use our sample contracts to test the system, or paste your own code directly. The audit engine accepts any valid Solidity from 0.6.x onwards.",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    num: "03",
    icon: Layers,
    title: "On-Chain AI Consensus",
    desc: "Your contract is sent to GenLayer's intelligent contract via a signed wallet transaction. Multiple GenLayer network validators independently run AI analysis and vote on the results using Optimistic Democracy.",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    num: "04",
    icon: BarChart3,
    title: "Receive Your Report",
    desc: "Get a consensus risk score (0–100), severity breakdown, detailed vulnerability list with explanations and fixes, AI security summary, and actionable recommendations. Export as JSON anytime.",
    color: "bg-primary/10 text-primary border-primary/20",
  },
];

const auditTypes = [
  {
    icon: Shield,
    cls: "validator-security",
    title: "Security Auditor",
    badge: "Critical path",
    weight: "35% weight",
    checks: [
      "Reentrancy vulnerabilities (external calls before state updates)",
      "tx.origin authentication bypass",
      "Unchecked low-level call return values",
      "Block timestamp manipulation risks",
      "Delegatecall to user-controlled addresses",
      "Self-destruct and selfdestruct risks",
    ],
  },
  {
    icon: Fuel,
    cls: "validator-gas",
    title: "Gas Optimizer",
    badge: "Efficiency",
    weight: "20% weight",
    checks: [
      "Storage reads inside loops (2,100 gas per cold read)",
      "Sub-optimal integer types (uint8/uint16 vs uint256)",
      "On-chain string storage vs bytes32",
      "Missing event emissions for state changes",
      "Redundant storage variable patterns",
      "Memory vs storage variable usage",
    ],
  },
  {
    icon: KeyRound,
    cls: "validator-access",
    title: "Access Control",
    badge: "Authorization",
    weight: "30% weight",
    checks: [
      "Missing onlyOwner on setter functions",
      "Unguarded payable functions",
      "Missing zero address validation",
      "No ownership pattern (Ownable/RBAC)",
      "Signature replay attack vectors",
      "Publicly accessible admin functions",
    ],
  },
  {
    icon: FileCheck,
    cls: "validator-formal",
    title: "Formal Verifier",
    badge: "Correctness",
    weight: "15% weight",
    checks: [
      "Compiler version safety (requires 0.8.x+)",
      "Floating pragma version risks",
      "Unchecked arithmetic operations",
      "Missing require() error messages",
      "Integer overflow/underflow patterns",
      "Logic correctness edge cases",
    ],
  },
];

const scoringRanges = [
  { label: "LOW RISK", range: "0–35", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-200 dark:border-green-900/50", desc: "Contract appears safe. Minor improvements may still apply." },
  { label: "MODERATE RISK", range: "36–65", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/50", desc: "Significant issues found. Review and fix before deploying." },
  { label: "HIGH RISK", range: "66–100", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-200 dark:border-red-900/50", desc: "Critical vulnerabilities detected. Do not deploy without fixes." },
];

// ── Component ──────────────────────────────────────────────────────────────

const HowItWorks = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              How SmartAudit AI Works
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              On-chain AI consensus auditing powered by GenLayer intelligent contracts
            </p>
          </div>
        </div>

        {/* ── 4-Step Flow ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">Audit Process</h2>
            <span className="ml-auto text-xs text-muted-foreground font-medium">4 steps</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-extrabold text-primary/50 tracking-widest">{step.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm mb-1.5">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:flex justify-end mt-3">
                    <ArrowRight className="w-3.5 h-3.5 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── GenLayer Consensus Explained ────────────────────────────── */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 animate-fade-in">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">GenLayer Optimistic Democracy</h2>
              <p className="text-sm text-muted-foreground mt-1">
                How AI validators reach consensus on your audit result
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground mb-1">4 Audit Types</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Our Python intelligent contract performs <span className="font-semibold text-foreground">4 specialized AI checks</span> on your contract: Security, Gas, Access Control, and Formal Verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Network className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground mb-1">Network Validators</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The GenLayer Studio network runs your contract on <span className="font-semibold text-foreground">multiple consensus nodes</span> simultaneously. Each node independently executes the AI analysis and votes on the result.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground mb-1">Equivalence Principle</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Validators use a comparative prompt to verify their AI outputs agree within an acceptable range. This catches model hallucinations and ensures result reliability.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground mb-1">Consensus Timeline</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Consensus typically takes <span className="font-semibold text-foreground">30–120 seconds</span> while validators run AI inference and reach agreement. The app polls until results are finalized.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-400/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              <span className="font-bold text-foreground">Why might results vary slightly between runs?</span> GenLayer uses AI language models which are inherently non-deterministic. Each network validator independently runs an LLM-powered audit, so minor score differences between runs are expected and are a feature of the system, not a bug. The detected vulnerability types should remain consistent.
            </p>
          </div>
        </section>

        {/* ── 4 Audit Types Detail ────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">4 AI Audit Types</h2>
            <span className="ml-auto text-xs text-muted-foreground font-medium">What gets analyzed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {auditTypes.map((type, i) => (
              <div
                key={type.title}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${type.cls}`}>
                    <type.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm">{type.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold border border-border">
                        {type.badge}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary font-semibold border border-primary/15">
                        {type.weight}
                      </span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {type.checks.map((check) => (
                    <li key={check} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-tight">{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scoring Methodology ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">Risk Score Methodology</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            The overall risk score (0–100) is a weighted average of all 4 audit types, with higher weights on the most security-critical checks. Severity multipliers: Critical +40, High +25, Medium +15, Low +5.
          </p>

          {/* Weight bars */}
          <div className="space-y-3 mb-6">
            {[
              { label: "Security Auditor", pct: 35, color: "bg-primary" },
              { label: "Access Control", pct: 30, color: "bg-cyan-500" },
              { label: "Gas Optimizer", pct: 20, color: "bg-amber-500" },
              { label: "Formal Verifier", pct: 15, color: "bg-green-500" },
            ].map((w) => (
              <div key={w.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 shrink-0">{w.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${w.color}`} style={{ width: `${w.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground w-8 text-right">{w.pct}%</span>
              </div>
            ))}
          </div>

          {/* Score ranges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scoringRanges.map((r) => (
              <div key={r.label} className={`rounded-xl border p-4 ${r.bg}`}>
                <div className={`text-xs font-extrabold tracking-wider mb-1 ${r.color}`}>{r.label}</div>
                <div className={`text-xl font-extrabold mb-1.5 ${r.color}`}>{r.range}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3-Tier Reliability ──────────────────────────────────────── */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">3-Tier Reliability</h2>
            <span className="ml-auto text-xs text-muted-foreground font-medium">Always delivers results</span>
          </div>

          <div className="space-y-3">
            {[
              {
                tier: "Primary",
                title: "GenLayer Intelligent Contract",
                desc: "Full on-chain AI consensus via Optimistic Democracy. Most accurate results — requires wallet connection and GEN testnet gas.",
                icon: Globe,
                color: "bg-green-500/10 border-green-200 dark:border-green-900/50",
                iconColor: "text-green-500",
                badge: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50",
              },
              {
                tier: "Fallback",
                title: "Local Static Analysis",
                desc: "Pattern-based Solidity analysis running on the backend server. No wallet needed. Detects common vulnerability patterns using regex and AST analysis.",
                icon: Shield,
                color: "bg-amber-500/10 border-amber-200 dark:border-amber-900/50",
                iconColor: "text-amber-500",
                badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
              },
              {
                tier: "Safety Net",
                title: "Mock Result",
                desc: "If both primary and fallback are unavailable, a mock result is returned so the UI always displays something. Results are clearly marked as mock.",
                icon: AlertTriangle,
                color: "bg-muted/50 border-border",
                iconColor: "text-muted-foreground",
                badge: "bg-muted text-muted-foreground border-border",
              },
            ].map((tier, i) => (
              <div key={tier.tier} className={`flex items-start gap-4 p-4 rounded-2xl border ${tier.color} animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className={`w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border mt-0.5`}>
                  <tier.icon className={`w-4.5 h-4.5 ${tier.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider ${tier.badge}`}>
                      {tier.tier.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">{tier.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <div className="text-center py-4 animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">
            Ready to audit your smart contract with on-chain AI?
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl btn-gradient text-white text-sm font-bold transition-all duration-200"
          >
            <Shield className="w-4 h-4" />
            Run an Audit
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>
    </div>
  );
};

export default HowItWorks;
