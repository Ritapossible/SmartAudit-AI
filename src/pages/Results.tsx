import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import ValidatorCard from "@/components/ValidatorCard";
import RiskScoreBar from "@/components/RiskScoreBar";
import IssuesList from "@/components/IssuesList";
import Recommendations from "@/components/Recommendations";
import { Button } from "@/components/ui/button";
import { exportAuditAsJSON } from "@/lib/audit-service";
import type { AuditResult } from "@/lib/types";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (!location.state?.auditResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">No audit data found.</p>
          <button onClick={() => navigate("/")} className="text-primary underline text-sm">
            Go back to audit
          </button>
        </main>
      </div>
    );
  }

  const audit: AuditResult = location.state.auditResult;

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Results</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export JSON
          </Button>
        </div>

        {/* Fallback Warning */}
        {audit.isFallback && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 mb-6 flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-warning">Using fallback analysis — GenLayer backend not connected</p>
          </div>
        )}

        {/* Desktop: 2-column layout for score + validators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Risk Score - takes 1 column */}
          <section className="lg:col-span-1 animate-fade-in">
            <RiskScoreBar
              score={audit.overallRiskScore}
              confidence={audit.confidence}
              breakdown={audit.severityBreakdown}
            />
          </section>

          {/* Validators Grid - takes 2 columns */}
          <section className="lg:col-span-2">
            <h2 className="font-bold text-foreground mb-3">AI Validator Consensus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {audit.validators.map((v, i) => (
                <ValidatorCard key={v.id} validator={v} index={i} />
              ))}
            </div>
          </section>
        </div>

        {/* Equivalence Flags */}
        {audit.equivalenceFlags.length > 0 && (
          <section className="mb-6 animate-fade-in">
            <h2 className="font-bold text-foreground mb-3">⚡ Equivalence Principle</h2>
            <div className="space-y-2">
              {audit.equivalenceFlags.map((flag, i) => (
                <div key={i} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="text-sm text-warning">{flag}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Desktop: 2-column layout for vulnerabilities + recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <section className="animate-fade-in">
            <IssuesList vulnerabilities={audit.vulnerabilities} />
          </section>
          <section className="animate-fade-in">
            <Recommendations items={audit.recommendations} />
          </section>
        </div>

        {/* Run Another */}
        <div className="text-center">
          <Button onClick={() => navigate("/")} variant="outline">
            Run Another Audit
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
