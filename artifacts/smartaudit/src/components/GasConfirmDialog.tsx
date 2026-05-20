import { Zap, Shield, ArrowRight, Droplets, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GENLAYER_NETWORK, CONTRACT_ADDRESS } from "@/lib/config";

interface GasConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GasConfirmDialog({ open, onConfirm, onCancel }: GasConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header band */}
        <div className="header-gradient px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-bold text-base leading-tight">
                Gas Fee Required
              </DialogTitle>
              <DialogDescription className="text-white/70 text-xs mt-0.5">
                On-chain AI audit via GenLayer Studio
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Info callout */}
          <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              Your wallet will ask you to <span className="font-semibold text-foreground">sign a transaction</span> and
              pay a small gas fee in <span className="font-semibold text-foreground">GEN testnet tokens</span>.
              Unused gas is refunded automatically.
            </p>
          </div>

          {/* Transaction details */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Transaction Details
            </p>
            <Row label="Network" value={GENLAYER_NETWORK.name} highlight />
            <Row label="Chain ID" value={`${GENLAYER_NETWORK.chainId}`} />
            <Row label="Gas Token" value="GEN (testnet)" />
            <Row
              label="Contract"
              value={`${CONTRACT_ADDRESS.slice(0, 8)}…${CONTRACT_ADDRESS.slice(-6)}`}
              mono
            />
            <Row label="Action" value="run_audit(contract_code)" mono />
          </div>

          {/* What happens next */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
              <div className="w-px h-4 bg-border" />
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
              <div className="w-px h-4 bg-border" />
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-white text-[10px] font-bold shrink-0">3</div>
            </div>
            <div className="flex-1 space-y-3 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Approve in wallet:</span> confirm the GEN gas fee</p>
              <p><span className="font-semibold text-foreground">Validators process:</span> 4 AI engines analyze your contract on-chain</p>
              <p><span className="font-semibold text-foreground">Results delivered:</span> consensus risk score and full report</p>
            </div>
          </div>

          {/* Need GEN tokens? */}
          <a
            href={GENLAYER_NETWORK.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Droplets className="w-3.5 h-3.5" />
            Need GEN testnet tokens? Get them free →
          </a>

          {/* CTA buttons */}
          <div className="flex gap-2.5 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white btn-gradient transition-all duration-200"
            >
              <Shield className="w-4 h-4" />
              Proceed to Wallet
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`text-[11px] font-medium text-right truncate max-w-[180px] ${
          mono ? "font-mono" : ""
        } ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
