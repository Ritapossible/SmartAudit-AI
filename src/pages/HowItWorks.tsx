import { useNavigate } from "react-router-dom";
import { Shield, Fuel, KeyRound, FileCheck, Globe, CheckCircle, ArrowRight, ArrowLeft, Server, Monitor, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

const validators = [
  { icon: Shield, label: "Security Auditor", desc: "Detects reentrancy, overflow & exploit vectors" },
  { icon: Fuel, label: "Gas Optimizer", desc: "Identifies gas inefficiencies & costly patterns" },
  { icon: KeyRound, label: "Access Control", desc: "Checks permissions & authorization flaws" },
  { icon: FileCheck, label: "Formal Verifier", desc: "Analyzes logic correctness & edge cases" },
];

const flow = [
  { icon: Monitor, label: "Frontend", desc: "Submit your Solidity contract" },
  { icon: Server, label: "FastAPI Backend", desc: "Routes to GenLayer or local fallback" },
  { icon: Globe, label: "GenLayer Contract", desc: "AI consensus via Optimistic Democracy" },
  { icon: CheckCircle, label: "Audit Result", desc: "Risk score, issues & recommendations" },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            How SmartAudit AI Works
          </h1>
        </div>

        {/* Execution Flow - horizontal on desktop */}
        <h2 className="font-bold text-foreground text-lg mb-4">Execution Flow</h2>

        {/* Desktop horizontal */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-4 mb-10">
          {flow.map((step, i) => (
            <div key={step.label} className="relative text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{step.label}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
              {i < flow.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground absolute top-5 -right-2 hidden lg:block" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile vertical */}
        <div className="sm:hidden space-y-0 mb-10">
          {flow.map((step, i) => (
            <div key={step.label} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                {i < flow.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
              </div>
              <div className="pt-1 pb-4">
                <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 4 AI Validators */}
        <h2 className="font-bold text-foreground text-lg mb-4">🧠 4 AI Validators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {validators.map((v) => (
            <div key={v.label} className="rounded-xl border border-border bg-card p-3 sm:p-4 hover:border-primary/30 transition-colors">
              <v.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2" />
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">{v.label}</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Principles - side by side on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-bold text-foreground text-lg mb-2">Optimistic Democracy</h2>
            <p className="text-sm text-muted-foreground">
              AI validators independently analyze your contract, then vote on findings. Majority consensus decides the final audit outcome, ensuring robust and reliable results.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-bold text-foreground text-lg mb-2">3-Tier Fallback</h2>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p>
                Primary: GenLayer intelligent contract → Fallback: local AI validators → Final: mock analysis. Your audit always completes.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Experience AI-powered smart contract auditing now!
          </p>
          <Button onClick={() => navigate("/")} size="lg">
            Run Audit
          </Button>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;
