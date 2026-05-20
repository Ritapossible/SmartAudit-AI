import { useEffect, useState } from "react";
import { ExternalLink, CheckCircle2, Loader2, Wifi, Droplets, Clock, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
import type { WalletEntry } from "@/lib/wallet-detection";
import { GENLAYER_NETWORK } from "@/lib/config";

const LAST_WALLET_KEY = "smartaudit_last_wallet";

export function WalletModal() {
  const { wallets, modalOpen, closeModal, connectWallet, isConnecting } = useWallet();
  const [lastRdns, setLastRdns] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modalOpen) {
      setLastRdns(localStorage.getItem(LAST_WALLET_KEY));
      setError(null);
      setConnecting(null);
    }
  }, [modalOpen]);

  const handleClick = async (entry: WalletEntry) => {
    if (!entry.installed) {
      window.open(entry.installUrl, "_blank", "noopener");
      return;
    }
    setError(null);
    setConnecting(entry.rdns);
    try {
      await connectWallet(entry);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      if (msg.toLowerCase().includes("user rejected") || msg.includes("4001")) {
        setError("Connection cancelled. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setConnecting(null);
    }
  };

  // Partition wallets: last-used (if installed), other installed, uninstalled
  const lastUsedWallet = wallets.find((w) => w.rdns === lastRdns && w.installed) ?? null;
  const installedWallets = wallets.filter((w) => w.installed && w.rdns !== lastRdns);
  const uninstalledWallets = wallets.filter((w) => !w.installed);
  const hasAnyInstalled = !!lastUsedWallet || installedWallets.length > 0;

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-bold text-foreground">
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Connect to{" "}
            <span className="text-primary font-semibold">{GENLAYER_NETWORK.name}</span>{" "}
            to run on-chain AI audits
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* Network info strip */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-primary font-semibold truncate">
                {GENLAYER_NETWORK.name} · GEN testnet gas
              </span>
            </div>
            <a
              href={GENLAYER_NETWORK.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/70 shrink-0 transition-colors"
            >
              <Droplets className="w-3 h-3" />
              Get GEN
            </a>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/8 rounded-xl px-3 py-2.5 border border-destructive/20">
              {error}
            </p>
          )}

          {/* Recently used wallet */}
          {lastUsedWallet && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <Clock className="w-3 h-3" />
                Recently Used
              </p>
              <WalletButton
                wallet={lastUsedWallet}
                isConnecting={connecting === lastUsedWallet.rdns || isConnecting}
                isLastUsed
                onClick={() => handleClick(lastUsedWallet)}
              />
            </div>
          )}

          {/* Other installed wallets */}
          {installedWallets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <CheckCircle2 className="w-3 h-3 text-success" />
                Available
              </p>
              {installedWallets.map((wallet) => (
                <WalletButton
                  key={wallet.rdns}
                  wallet={wallet}
                  isConnecting={connecting === wallet.rdns || isConnecting}
                  onClick={() => handleClick(wallet)}
                />
              ))}
            </div>
          )}

          {/* No wallets detected */}
          {!hasAnyInstalled && (
            <div className="text-center py-3 px-4 rounded-xl bg-muted/40 border border-border">
              <p className="text-sm font-semibold text-foreground mb-1">No wallet detected</p>
              <p className="text-xs text-muted-foreground">
                Install one of the wallets below to get started.
              </p>
            </div>
          )}

          {/* Uninstalled wallets */}
          {uninstalledWallets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <Download className="w-3 h-3" />
                Get a Wallet
              </p>
              {uninstalledWallets.map((wallet) => (
                <WalletButton
                  key={wallet.rdns}
                  wallet={wallet}
                  isConnecting={false}
                  onClick={() => handleClick(wallet)}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Need GEN tokens for gas?
            </p>
            <a
              href={GENLAYER_NETWORK.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <Droplets className="w-3 h-3" />
              Open Faucet
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Wallet button ─────────────────────────────────────────────────────────

interface WalletButtonProps {
  wallet: WalletEntry;
  isConnecting: boolean;
  isLastUsed?: boolean;
  onClick: () => void;
}

function WalletButton({ wallet, isConnecting, isLastUsed = false, onClick }: WalletButtonProps) {
  if (wallet.installed) {
    return (
      <button
        onClick={onClick}
        disabled={isConnecting}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed text-left group ${
          isLastUsed
            ? "border-primary/25 bg-primary/5 hover:bg-primary/8 hover:border-primary/40"
            : "border-transparent bg-muted/40 hover:bg-muted hover:border-primary/20"
        }`}
      >
        <div className="relative shrink-0">
          <img
            src={wallet.icon}
            alt={wallet.name}
            className="w-10 h-10 rounded-xl object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.5";
            }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-card flex items-center justify-center">
            <CheckCircle2 className="w-2 h-2 text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{wallet.name}</span>
            {isLastUsed && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                Last used
              </span>
            )}
          </div>
          <p className="text-[11px] text-success font-medium">Installed</p>
        </div>
        {isConnecting ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
        ) : (
          <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Connect
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-muted/30 transition-all duration-150 text-left group"
    >
      <img
        src={wallet.icon}
        alt={wallet.name}
        className="w-9 h-9 rounded-xl object-cover shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground">{wallet.name}</span>
        <p className="text-[11px] text-muted-foreground">Not installed</p>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        Install
        <ExternalLink className="w-3 h-3" />
      </div>
    </button>
  );
}
