import { Loader2, CheckCircle2 } from "lucide-react";

interface AuditProgressProps {
  steps: string[];
  currentStep: number;
}

const AuditProgress = ({ steps, currentStep }: AuditProgressProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h3 className="font-bold text-foreground text-sm">Audit in Progress</h3>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isActive ? "bg-primary/5" : ""
              } animate-fade-in`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isDone ? "text-muted-foreground" : isActive ? "text-foreground font-medium" : "text-muted-foreground/50"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditProgress;
