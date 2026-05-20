import type { ValidatorPersona } from "@/lib/types";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ValidatorCardProps {
  validator: ValidatorPersona;
  index: number;
}

const ValidatorCard = ({ validator, index }: ValidatorCardProps) => {
  const isAnalyzing = validator.status === "analyzing";
  const isDone = validator.status === "done";

  const riskColor =
    validator.riskScore >= 70 ? "text-destructive"
    : validator.riskScore >= 40 ? "text-warning"
    : "text-success";

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 animate-fade-in"
      style={{ animationDelay: `${index * 150}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{validator.icon}</span>
          <div>
            <p className="font-semibold text-sm text-foreground">{validator.name}</p>
            <p className="text-xs text-muted-foreground">{validator.role}</p>
          </div>
        </div>
        {isAnalyzing && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        {isDone && <CheckCircle2 className="w-4 h-4 text-success" />}
      </div>

      {isDone && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Risk Score</span>
            <span className={`text-lg font-bold ${riskColor}`}>{validator.riskScore}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                validator.riskScore >= 70 ? "bg-destructive"
                : validator.riskScore >= 40 ? "bg-warning"
                : "bg-success"
              }`}
              style={{ width: `${validator.riskScore}%` }}
            />
          </div>
          {validator.findings.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Findings ({validator.findings.length})</p>
              {validator.findings.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    f.severity === "critical" ? "bg-destructive"
                    : f.severity === "high" ? "bg-warning"
                    : f.severity === "medium" ? "bg-[hsl(48,90%,55%)]"
                    : "bg-success"
                  }`} />
                  <span className="text-xs text-foreground truncate">{f.title}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isAnalyzing && (
        <div className="space-y-2 mt-2">
          <div className="h-2 rounded bg-muted animate-pulse" />
          <div className="h-2 rounded bg-muted animate-pulse w-3/4" />
        </div>
      )}
    </div>
  );
};

export default ValidatorCard;
