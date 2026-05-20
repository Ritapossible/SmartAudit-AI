import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { ethers } from "ethers";
import {
  detectWallets,
  buildWalletList,
  switchToGenLayer,
  type DetectedWallet,
  type WalletEntry,
} from "@/lib/wallet-detection";
import { GENLAYER_NETWORK } from "@/lib/config";

const LAST_WALLET_KEY = "smartaudit_last_wallet";

export interface WalletState {
  address: string;
  provider: ethers.BrowserProvider;
  rawProvider: DetectedWallet["provider"];
  chainId: number;
  walletName: string;
  walletIcon: string;
  isCorrectNetwork: boolean;
}

interface WalletContextValue {
  wallet: WalletState | null;
  wallets: WalletEntry[];
  isConnected: boolean;
  isConnecting: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connectWallet: (detected: DetectedWallet) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const listenerCleanup = useRef<(() => void) | null>(null);

  // ── Detect wallets on mount ──────────────────────────────────────────────
  useEffect(() => {
    detectWallets().then((detected) => {
      setWallets(buildWalletList(detected));

      // Auto-reconnect last wallet
      const lastRdns = localStorage.getItem(LAST_WALLET_KEY);
      if (lastRdns) {
        const last = detected.find((d) => d.rdns === lastRdns);
        if (last) silentReconnect(last);
      }
    });
  }, []);

  const silentReconnect = async (detected: DetectedWallet) => {
    try {
      const accounts = (await detected.provider.request({
        method: "eth_accounts",
      })) as string[];
      if (accounts.length === 0) return;
      const ethersProvider = new ethers.BrowserProvider(detected.provider as ethers.Eip1193Provider);
      const network = await ethersProvider.getNetwork();
      const chainId = Number(network.chainId);
      setWallet({
        address: accounts[0],
        provider: ethersProvider,
        rawProvider: detected.provider,
        chainId,
        walletName: detected.name,
        walletIcon: detected.icon,
        isCorrectNetwork: chainId === GENLAYER_NETWORK.chainId,
      });
      attachListeners(detected);
    } catch {
      // silent — user hasn't approved yet
    }
  };

  const attachListeners = useCallback((detected: DetectedWallet) => {
    // Remove previous listeners if any
    listenerCleanup.current?.();

    const handleAccountsChanged = (accounts: unknown) => {
      if (!Array.isArray(accounts) || accounts.length === 0) {
        setWallet(null);
      }
    };
    const handleChainChanged = () => {
      // Re-read chain on change
      const ethersProvider = new ethers.BrowserProvider(detected.provider as ethers.Eip1193Provider);
      ethersProvider.getNetwork().then((n) => {
        setWallet((prev) =>
          prev
            ? { ...prev, chainId: Number(n.chainId), isCorrectNetwork: Number(n.chainId) === GENLAYER_NETWORK.chainId }
            : null,
        );
      });
    };

    detected.provider.on?.("accountsChanged", handleAccountsChanged);
    detected.provider.on?.("chainChanged", handleChainChanged);

    listenerCleanup.current = () => {
      detected.provider.removeListener?.("accountsChanged", handleAccountsChanged);
      detected.provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connectWallet = useCallback(
    async (detected: DetectedWallet) => {
      setIsConnecting(true);
      try {
        await detected.provider.request({ method: "eth_requestAccounts" });
        await switchToGenLayer(detected.provider);

        const ethersProvider = new ethers.BrowserProvider(detected.provider as ethers.Eip1193Provider);
        const signer = await ethersProvider.getSigner();
        const address = await signer.getAddress();
        const network = await ethersProvider.getNetwork();
        const chainId = Number(network.chainId);

        setWallet({
          address,
          provider: ethersProvider,
          rawProvider: detected.provider,
          chainId,
          walletName: detected.name,
          walletIcon: detected.icon,
          isCorrectNetwork: chainId === GENLAYER_NETWORK.chainId,
        });

        localStorage.setItem(LAST_WALLET_KEY, detected.rdns);
        attachListeners(detected);
        setModalOpen(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [attachListeners],
  );

  const disconnect = useCallback(() => {
    listenerCleanup.current?.();
    listenerCleanup.current = null;
    setWallet(null);
    localStorage.removeItem(LAST_WALLET_KEY);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        wallets,
        isConnected: !!wallet,
        isConnecting,
        modalOpen,
        openModal: () => setModalOpen(true),
        closeModal: () => setModalOpen(false),
        connectWallet,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

