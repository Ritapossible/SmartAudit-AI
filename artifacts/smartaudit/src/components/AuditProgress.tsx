import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { explorerTxUrl } from "@/lib/wallet-utils";

interface AuditProgressProps {
  currentMessage: string;
  progressPercent: number;
  txHash?: string | null;
  phase: "preparing" | "sending" | "consensus" | "done";
}

const AuditProgress = ({ currentMessage, progressPercent, txHash, phase }: AuditProgressProps) => {
  const phaseSteps = [
    { label: "Preparing", key: "preparing" },
    { label: "Sending TX", key: "sending" },
    { label: "AI Consensus", key: "consensus" },
    { label: "Complete", key: "done" },
  ];

  const currentPhaseIdx = phaseSteps.findIndex((s) => s.key === phase);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-sm">Audit in Progress</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 animate-pulse">
          Live
        </span>
      </div>

      {/* Phase stepper */}
      <div className="flex items-center gap-0">
        {phaseSteps.map((step, i) => {
          const isDone = i < currentPhaseIdx;
          const isActive = i === currentPhaseIdx;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isDone
                      ? "bg-green-500"
                      : isActive
                      ? "bg-primary border-2 border-primary/30"
                      : "bg-muted border border-border"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  )}
                </div>
                <span
                  className={`text-[9px] font-semibold truncate max-w-full px-0.5 ${
                    isDone ? "text-green-600 dark:text-green-400" : isActive ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < phaseSteps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all duration-500 ${
                    i < currentPhaseIdx ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current message */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/15 bg-primary/5">
        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mt-0.5" />
        <p className="text-xs font-medium text-foreground leading-snug">{currentMessage}</p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {phase === "consensus" ? "Waiting for GenLayer consensus…" : "Processing…"}
          </span>
          <span className="text-[10px] font-semibold text-primary">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Transaction hash link */}
      {txHash && (
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate font-mono text-[10px]">
            Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </span>
        </a>
      )}
    </div>
  );
};

export default AuditProgress;
