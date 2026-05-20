import { Wallet, LogOut, ExternalLink, AlertCircle, ChevronDown, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/hooks/use-wallet";
import { shortenAddress } from "@/lib/wallet-utils";
import { getAuditCount } from "@/lib/genlayer-contract";
import { GENLAYER_NETWORK } from "@/lib/config";
import { useState, useEffect } from "react";

interface WalletConnectProps {
  compact?: boolean;
}

const WalletConnect = ({ compact = false }: WalletConnectProps) => {
  const { wallet, isConnected, openModal, disconnect } = useWallet();
  const [auditCount, setAuditCount] = useState<number | null>(null);

  useEffect(() => {
    if (!wallet?.provider) return;
    getAuditCount(wallet.provider).then(setAuditCount).catch(() => {});
  }, [wallet?.address]);

  if (!isConnected || !wallet) {
    if (compact) {
      return (
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all duration-150"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect</span>
        </button>
      );
    }
    return (
      <button
        onClick={openModal}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white btn-gradient transition-all duration-200"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  // ── Compact connected state (header) ─────────────────────────────────────
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/15 border border-success/25 hover:bg-success/25 transition-all duration-150 outline-none">
            <span className="w-1.5 h-1.5 rounded-full bg-success dot-live shrink-0" />
            {wallet.walletIcon && (
              <img src={wallet.walletIcon} alt={wallet.walletName} className="w-4 h-4 rounded object-cover" />
            )}
            <span className="text-xs font-semibold text-success font-mono">
              {shortenAddress(wallet.address)}
            </span>
            <ChevronDown className="w-3 h-3 text-success/70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl border border-border shadow-lg p-1">
          <div className="px-3 py-2.5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {wallet.walletIcon && (
                <img src={wallet.walletIcon} alt="" className="w-5 h-5 rounded" />
              )}
              <p className="text-xs font-bold text-foreground">{wallet.walletName}</p>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-semibold border border-success/20">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono leading-tight break-all">
              {wallet.address}
            </p>
          </div>
          <DropdownMenuSeparator />
          {!wallet.isCorrectNetwork && (
            <DropdownMenuItem className="text-warning text-xs gap-2 rounded-lg" disabled>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Wrong network: switch to {GENLAYER_NETWORK.name}
            </DropdownMenuItem>
          )}
          {auditCount !== null && (
            <DropdownMenuItem disabled className="text-xs rounded-lg">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">On-chain audits</span>
              <span className="ml-auto font-bold text-primary">{auditCount.toLocaleString()}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className="rounded-lg">
            <a
              href={`${GENLAYER_NETWORK.explorer}/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs gap-2 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on Explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={disconnect}
            className="text-xs text-destructive gap-2 cursor-pointer rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Expanded connected card (in page) ────────────────────────────────────
  return (
    <div className="rounded-2xl border border-success/25 bg-gradient-to-br from-success/5 to-emerald-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {wallet.walletIcon ? (
            <img src={wallet.walletIcon} alt={wallet.walletName} className="w-9 h-9 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-success" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-foreground">{wallet.walletName} Connected</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success dot-live" />
              <p className="text-[10px] text-success font-medium">{GENLAYER_NETWORK.name}</p>
            </div>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Disconnect"
          title="Disconnect wallet"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 bg-background/50 rounded-xl p-3 border border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Address</span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-semibold text-foreground text-[11px]">
              {shortenAddress(wallet.address)}
            </span>
            <a
              href={`${GENLAYER_NETWORK.explorer}/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {!wallet.isCorrectNetwork && (
          <div className="flex items-center gap-1.5 text-[10px] text-warning bg-warning/10 rounded-lg px-2.5 py-1.5 border border-warning/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Wrong network: please switch to {GENLAYER_NETWORK.name}
          </div>
        )}

        {auditCount !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total audits on-chain</span>
            <span className="font-bold text-primary">{auditCount.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;
