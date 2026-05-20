import type { SeverityBreakdown } from "@/lib/types";

interface RiskScoreBarProps {
  score: number;
  confidence: string;
  breakdown: SeverityBreakdown;
}

const RiskScoreBar = ({ score, confidence, breakdown }: RiskScoreBarProps) => {
  const scoreColor =
    score >= 70 ? "text-destructive" : score >= 40 ? "text-warning" : "text-success";
  const ringColor =
    score >= 70 ? "border-destructive" : score >= 40 ? "border-warning" : "border-success";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-5 mb-4">
        <div className={`w-20 h-20 rounded-full border-4 ${ringColor} flex items-center justify-center shrink-0`}>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">Overall Risk Score</p>
          <p className="text-xs text-muted-foreground">{confidence}</p>
          <div className="w-full h-2 rounded-full risk-gradient opacity-70 mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {([
          { key: "critical", label: "Critical", color: "bg-destructive", textColor: "text-destructive" },
          { key: "high", label: "High", color: "bg-warning", textColor: "text-warning" },
          { key: "medium", label: "Medium", color: "bg-[hsl(48,90%,55%)]", textColor: "text-[hsl(48,90%,45%)]" },
          { key: "low", label: "Low", color: "bg-success", textColor: "text-success" },
        ] as const).map(({ key, label, color, textColor }) => (
          <div key={key} className="text-center">
            <div className={`w-8 h-8 rounded-lg ${color}/15 flex items-center justify-center mx-auto mb-1`}>
              <span className={`text-sm font-bold ${textColor}`}>{breakdown[key]}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskScoreBar;
