import { CheckSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AuditOptionsProps {
  securityCheck: boolean;
  equivalenceCheck: boolean;
  onSecurityChange: (val: boolean) => void;
  onEquivalenceChange: (val: boolean) => void;
}

const AuditOptions = ({
  securityCheck,
  equivalenceCheck,
  onSecurityChange,
  onEquivalenceChange,
}: AuditOptionsProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Security Check</span>
        </div>
        <Switch checked={securityCheck} onCheckedChange={onSecurityChange} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Equivalence Check</span>
        </div>
        <Switch checked={equivalenceCheck} onCheckedChange={onEquivalenceChange} />
      </div>
    </div>
  );
};

export default AuditOptions;
