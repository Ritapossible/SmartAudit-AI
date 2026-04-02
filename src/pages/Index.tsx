import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Server, Globe, CheckCircle, ArrowRight, Shield, Fuel, KeyRound, FileCheck } from "lucide-react";
import Header from "@/components/Header";
import CodeEditor, { SAMPLE_CONTRACT, SAMPLE_CONTRACTS } from "@/components/CodeEditor";
import AuditOptions from "@/components/AuditOptions";
import AuditProgress from "@/components/AuditProgress";
import AuditHistory from "@/components/AuditHistory";
import { Button } from "@/components/ui/button";
import { performAudit, saveAuditToHistory, VALIDATOR_PERSONAS } from "@/lib/audit-service";
import type { AuditResult } from "@/lib/types";
import { toast } from "sonner";

const steps = [
  { icon: Monitor, title: "Submit Contract", description: "Paste your Solidity smart contract into the editor." },
  { icon: Server, title: "FastAPI → GenLayer", description: "Backend routes your code to the GenLayer intelligent contract for AI consensus analysis." },
  { icon: Globe, title: "4 AI Validators", description: "Security, Gas, Access Control & Formal validators independently analyze and vote on findings." },
  { icon: CheckCircle, title: "Audit Report", description: "Receive a consensus risk score, vulnerability list, and actionable recommendations." },
];

const features = [
  { icon: Shield, title: "Security Auditor", description: "Detects reentrancy, overflow & exploit vectors." },
  { icon: Fuel, title: "Gas Optimizer", description: "Identifies costly patterns & inefficiencies." },
  { icon: KeyRound, title: "Access Control", description: "Checks permissions & authorization." },
  { icon: FileCheck, title: "Formal Verifier", description: "Analyzes logic correctness & edge cases." },
];

const Index = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [securityCheck, setSecurityCheck] = useState(true);
  const [equivalenceCheck, setEquivalenceCheck] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const handleRunAudit = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setProgressSteps([]);
    setCurrentStep(0);

    const allSteps: string[] = [];

    try {
      const result = await performAudit(code, securityCheck, equivalenceCheck, (step, idx) => {
        if (!allSteps.includes(step)) allSteps.push(step);
        setProgressSteps([...allSteps]);
        setCurrentStep(idx);
      });

      saveAuditToHistory(result);

      if (result.isFallback) {
        toast.info("Using fallback analysis — GenLayer backend not connected");
      }

      navigate("/results", { state: { auditResult: result } });
    } catch (err) {
      console.error("Audit failed:", err);
      toast.error("Audit failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySelect = (audit: AuditResult) => {
    navigate("/results", { state: { auditResult: audit } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            SmartAudit <span className="bg-gradient-to-r from-primary to-[hsl(180,70%,50%)] bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">AI-Powered Smart Contract Auditor</p>
        </div>

        {/* Main Content: 3-column on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Contract Input + Options */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">📝 Contract Input</h2>
              <CodeEditor code={code} onChange={setCode} />
            </div>

            <AuditOptions
              securityCheck={securityCheck}
              equivalenceCheck={equivalenceCheck}
              onSecurityChange={setSecurityCheck}
              onEquivalenceChange={setEquivalenceCheck}
            />

            <div className="flex flex-wrap gap-2">
              {SAMPLE_CONTRACTS.map((sample) => (
                <Button
                  key={sample.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setCode(sample.code)}
                >
                  {sample.label}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleRunAudit} disabled={!code.trim() || isLoading}>
              {isLoading ? "Analyzing..." : "Run Audit"}
            </Button>
          </div>

          {/* Center: Progress or Validators */}
          <div className="lg:col-span-4 space-y-4">
            {isLoading && progressSteps.length > 0 ? (
              <AuditProgress steps={progressSteps} currentStep={currentStep} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">🧠 AI Validators</h2>
                <div className="grid grid-cols-2 gap-2">
                  {VALIDATOR_PERSONAS.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="text-lg">{v.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{v.name}</p>
                        <p className="text-[10px] text-muted-foreground">{v.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Audit History */}
          <div className="lg:col-span-3">
            <AuditHistory onSelect={handleHistorySelect} />
          </div>
        </div>

        {/* Powered by GenLayer */}
        <div className="mt-10 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground tracking-wide uppercase">Powered by</span>
          <span className="text-sm font-semibold bg-gradient-to-r from-primary to-[hsl(180,70%,50%)] bg-clip-text text-transparent">
            GenLayer
          </span>
          <span className="text-xs text-muted-foreground">Intelligent Smart Contracts</span>
        </div>

        {/* How It Works Section */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-foreground text-center mb-2">How It Works</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">AI consensus-driven auditing in 3 steps</p>

          {/* Desktop: horizontal flow, mobile: vertical */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-4 mb-10">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground absolute top-5 -right-2 hidden lg:block" />
                )}
              </div>
            ))}
          </div>

          {/* Mobile vertical flow */}
          <div className="sm:hidden space-y-6 mb-10 max-w-md mx-auto">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  {i < steps.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                </div>
                <div className="pt-1">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/30 transition-colors">
                <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => navigate("/how-it-works")}>
              Learn More <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-4 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          Built with ❤️ by{" "}
          <a href="https://x.com/RitaCryptoTips" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            RitaCryptoTips
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
