import type { Vulnerability } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface IssuesListProps {
  vulnerabilities: Vulnerability[];
}

const severityConfig = {
  critical: { label: "CRITICAL", bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", dot: "bg-destructive" },
  high: { label: "HIGH", bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", dot: "bg-warning" },
  medium: { label: "MEDIUM", bg: "bg-[hsl(48,90%,55%)]/10", text: "text-[hsl(48,90%,45%)]", border: "border-[hsl(48,90%,55%)]/30", dot: "bg-[hsl(48,90%,55%)]" },
  low: { label: "LOW", bg: "bg-success/10", text: "text-success", border: "border-success/30", dot: "bg-success" },
};

const IssuesList = ({ vulnerabilities }: IssuesListProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div>
      <h3 className="font-bold text-foreground mb-3">
        Vulnerabilities Found ({vulnerabilities.length})
      </h3>
      <div className="space-y-2">
        {vulnerabilities.map((vuln, i) => {
          const config = severityConfig[vuln.severity];
          const isExpanded = expandedIndex === i;

          return (
            <div
              key={i}
              className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden transition-all`}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="text-sm font-medium text-foreground">{vuln.title}</span>
                  <span className={`text-[10px] font-bold ${config.text} px-1.5 py-0.5 rounded`}>
                    {config.label}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Explanation</p>
                    <p className="text-xs text-foreground">{vuln.explanation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-success mb-0.5">Suggested Fix</p>
                    <p className="text-xs text-foreground">{vuln.suggestedFix}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssuesList;
