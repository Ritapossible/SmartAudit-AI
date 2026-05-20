import { Clock, Trash2 } from "lucide-react";
import { getAuditHistory, clearAuditHistory } from "@/lib/audit-service";
import type { AuditResult } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AuditHistoryProps {
  onSelect: (audit: AuditResult) => void;
}

const AuditHistory = ({ onSelect }: AuditHistoryProps) => {
  const [history, setHistory] = useState(getAuditHistory());

  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Audit History
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            clearAuditHistory();
            setHistory([]);
          }}
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((audit) => {
          const riskColor =
            audit.overallRiskScore >= 70 ? "text-destructive"
            : audit.overallRiskScore >= 40 ? "text-warning"
            : "text-success";

          return (
            <button
              key={audit.id}
              onClick={() => onSelect(audit)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-xs text-foreground font-medium truncate">
                  {audit.contractSnippet || "Contract Audit"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(audit.timestamp).toLocaleDateString()} · {audit.vulnerabilities.length} issues
                </p>
              </div>
              <span className={`text-sm font-bold ${riskColor} shrink-0 ml-2`}>
                {audit.overallRiskScore}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AuditHistory;
