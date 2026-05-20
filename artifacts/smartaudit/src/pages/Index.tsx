import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Globe, CheckCircle, ArrowRight, Shield, Zap, Lock, FileCheck,
  Wallet, ExternalLink, Droplets, ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import CodeEditor, { SAMPLE_CONTRACTS } from "@/components/CodeEditor";
import AuditOptions from "@/components/AuditOptions";
import AuditProgress from "@/components/AuditProgress";
import AuditHistory from "@/components/AuditHistory";
import WalletConnect from "@/components/WalletConnect";
import { GasConfirmDialog } from "@/components/GasConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  performAudit,
  saveAuditToHistory,
  VALIDATOR_PERSONAS,
} from "@/lib/audit-service";
import { useWallet } from "@/hooks/use-wallet";
import { explorerTxUrl } from "@/lib/wallet-utils";
import type { AuditResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { GENLAYER_NETWORK, CONTRACT_ADDRESS } from "@/lib/config";

const CURRENT_RESULT_KEY = "smartaudit_current_result";

// ── Validator icon map ────────────────────────────────────────────────────
const VALIDATOR_ICONS = {
  security: { icon: Shield,      cls: "validator-security" },
  gas:      { icon: Zap,         cls: "validator-gas" },
  access:   { icon: Lock,        cls: "validator-access" },
  formal:   { icon: FileCheck,   cls: "validator-formal" },
} as const;

const howItWorksSteps = [
  { icon: Wallet,      title: "Connect Wallet",   description: "Connect MetaMask, Rabby, OKX, or any EVM wallet to your browser." },
  { icon: Globe,       title: "Submit Contract",  description: "Paste your Solidity smart contract and click Run Audit." },
  { icon: Shield,      title: "4 AI Audit Types",  description: "Security, Gas, Access Control & Formal checks run on-chain via GenLayer AI consensus." },
  { icon: CheckCircle, title: "Audit Report",     description: "Receive a consensus risk score, vulnerabilities, and actionable recommendations." },
];

const features = [
  { icon: Shield,      cls: "validator-security", title: "Security Auditor",   description: "Detects reentrancy, overflow & exploit vectors." },
  { icon: Zap,         cls: "validator-gas",      title: "Gas Optimizer",      description: "Identifies costly patterns & inefficiencies." },
  { icon: Lock,        cls: "validator-access",   title: "Access Control",     description: "Checks permissions & authorization flaws." },
  { icon: FileCheck,   cls: "validator-formal",   title: "Formal Verifier",    description: "Analyzes logic correctness & edge cases." },
];

const Index = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { wallet, isConnected, openModal } = useWallet();

  const [code, setCode] = useState("");
  const [securityCheck, setSecurityCheck] = useState(true);
  const [equivalenceCheck, setEquivalenceCheck] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [auditPhase, setAuditPhase] = useState<"preparing" | "sending" | "consensus" | "done">("preparing");
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [showGasConfirm, setShowGasConfirm] = useState(false);

  const initiateAudit = () => {
    if (!code.trim()) {
      toast({ title: "No contract code", description: "Paste your Solidity contract first.", variant: "destructive" });
      return;
    }
    if (!isConnected || !wallet) {
      openModal();
      return;
    }
    // Show gas confirmation dialog before proceeding
    setShowGasConfirm(true);
  };

  const handleRunAudit = async () => {
    setShowGasConfirm(false);
    setIsLoading(true);
    setCurrentMessage("Preparing audit…");
    setProgressPercent(5);
    setAuditPhase("preparing");
    setPendingTxHash(null);

    try {
      const result = await performAudit(code, {
        wallet,
        securityCheck,
        equivalenceCheck,
        onProgress: (step, _idx) => {
          const s = step.toLowerCase();
          setCurrentMessage(step.replace(/^[^\w\s]+\s*/, ""));
          if (s.includes("connecting") || s.includes("wallet") || s.includes("switching")) {
            setAuditPhase("preparing");
            setProgressPercent(15);
          } else if (s.includes("check your wallet") || s.includes("approve")) {
            setAuditPhase("sending");
            setProgressPercent(30);
          } else if (s.includes("transaction confirmed") || s.includes("waiting for ai")) {
            setAuditPhase("consensus");
            setProgressPercent(40);
          } else if (s.includes("validators reaching consensus")) {
            setAuditPhase("consensus");
            // Extract N/30 to compute percent
            const m = step.match(/\((\d+)\/(\d+)\)/);
            if (m) {
              const n = parseInt(m[1], 10), total = parseInt(m[2], 10);
              setProgressPercent(40 + Math.round((n / total) * 50));
            }
          } else if (s.includes("consensus reached") || s.includes("✅")) {
            setAuditPhase("done");
            setProgressPercent(100);
          }
        },
        onTxSent: (txHash) => {
          setPendingTxHash(txHash);
          setAuditPhase("consensus");
          setProgressPercent(40);
        },
      });

      saveAuditToHistory(result);
      try { sessionStorage.setItem(CURRENT_RESULT_KEY, JSON.stringify(result)); } catch {}

      toast({
        title: result.isFallback ? "Local analysis used" : "Audit complete!",
        description: result.isFallback
          ? "Could not reach GenLayer Studio — local analysis shown."
          : "AI consensus reached on GenLayer Studio.",
      });

      navigate("/results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audit failed";
      toast({ title: "Audit failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySelect = (audit: AuditResult) => {
    try { sessionStorage.setItem(CURRENT_RESULT_KEY, JSON.stringify(audit)); } catch {}
    navigate("/results");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Gas confirmation dialog */}
      <GasConfirmDialog
        open={showGasConfirm}
        onConfirm={handleRunAudit}
        onCancel={() => setShowGasConfirm(false)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-primary mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live on GenLayer Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            SmartAudit{" "}
            <span className="bg-gradient-to-r from-primary via-blue-400 to-blue-300 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            AI-powered Solidity audits with on-chain consensus, powered by GenLayer intelligent contracts
          </p>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Left column: Input + Options + Wallet + CTA ─────────────── */}
          <div className="lg:col-span-5 space-y-4">

            {/* Contract input */}
            <div className="rounded-2xl border border-border bg-card shadow-sm card-hover p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <FileCheck className="w-3 h-3" />
                </span>
                Contract Input
              </h2>
              <CodeEditor code={code} onChange={setCode} />
            </div>

            <AuditOptions
              securityCheck={securityCheck}
              equivalenceCheck={equivalenceCheck}
              onSecurityChange={setSecurityCheck}
              onEquivalenceChange={setEquivalenceCheck}
            />

            {/* Sample contracts */}
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CONTRACTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setCode(s.code)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Connected wallet info */}
            {isConnected && <WalletConnect />}

            {/* Single CTA button */}
            <button
              onClick={isConnected ? initiateAudit : openModal}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white btn-gradient transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Auditing on GenLayer…
                </>
              ) : !isConnected ? (
                <>
                  <Wallet className="w-4 h-4" />
                  Connect Wallet to Run Audit
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Run Audit
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Faucet link when not connected */}
            {!isConnected && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-muted-foreground">MetaMask · Rabby · OKX · Coinbase</p>
                <a
                  href={GENLAYER_NETWORK.faucetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Droplets className="w-3 h-3" />
                  Get GEN →
                </a>
              </div>
            )}

            {!isLoading && pendingTxHash && (
              <a
                href={explorerTxUrl(pendingTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                View transaction on Explorer
              </a>
            )}
          </div>

          {/* ── Center: Progress or Validators + Contract Info ───────────── */}
          <div className="lg:col-span-4 space-y-4">
            {isLoading ? (
              <AuditProgress
                currentMessage={currentMessage}
                progressPercent={progressPercent}
                txHash={pendingTxHash}
                phase={auditPhase}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm card-hover p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Shield className="w-3 h-3" />
                  </span>
                  AI Validators
                </h2>

                <div className="grid grid-cols-2 gap-2">
                  {VALIDATOR_PERSONAS.map((v) => {
                    const meta = VALIDATOR_ICONS[v.id as keyof typeof VALIDATOR_ICONS];
                    const IconComp = meta?.icon ?? Shield;
                    const cls = meta?.cls ?? "validator-security";
                    return (
                      <div
                        key={v.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-tight truncate">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight truncate">{v.role}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contract info */}
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Contract Info
                  </p>
                  <InfoRow label="Network">
                    <span className="font-semibold text-primary text-[11px]">{GENLAYER_NETWORK.name}</span>
                  </InfoRow>
                  <InfoRow label="Contract">
                    <a
                      href={`${GENLAYER_NETWORK.explorer}/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                    >
                      {`${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </InfoRow>
                  <InfoRow label="Chain ID">
                    <span className="font-mono text-[11px] text-foreground font-medium">{GENLAYER_NETWORK.chainId}</span>
                  </InfoRow>
                  <InfoRow label="Gas token">
                    <span className="text-[11px] text-foreground font-medium">GEN (testnet)</span>
                  </InfoRow>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Audit History ─────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <AuditHistory onSelect={handleHistorySelect} />
          </div>
        </div>

        {/* ── Powered by ────────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Powered by</span>
          <span className="text-sm font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            GenLayer
          </span>
          <span className="text-xs text-muted-foreground">Intelligent Smart Contracts</span>
        </div>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section className="mt-14 pt-10 border-t border-border">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-1">On-chain AI consensus in 4 steps</p>
          </div>

          <div className="hidden sm:grid sm:grid-cols-4 gap-6 mb-12">
            {howItWorksSteps.map((step, i) => (
              <div key={step.title} className="relative text-center group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                {i < howItWorksSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 absolute top-5 -right-3 hidden lg:block" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-4 text-center card-hover"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5 ${f.cls}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/how-it-works">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/25 text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-150">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-5 border-t border-border">
        <p className="text-center text-xs text-muted-foreground">
          Built by{" "}
          <a
            href="https://x.com/RitaCryptoTips"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold"
          >
            RitaCryptoTips
          </a>
          {" · "}
          <a
            href={GENLAYER_NETWORK.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GenLayer Explorer
          </a>
        </p>
      </footer>
    </div>
  );
};

// ── Small helper ───────────────────────────────────────────────────────────
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default Index;
