// EIP-6963 Multi-wallet detection + legacy window.ethereum fallback

export interface WalletProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface DetectedWallet {
  rdns: string;
  name: string;
  icon: string;
  provider: WalletProvider;
  installed: true;
}

export interface KnownWallet {
  rdns: string;
  name: string;
  icon: string;
  provider: null;
  installed: false;
  installUrl: string;
}

export type WalletEntry = DetectedWallet | KnownWallet;

// ── Wallet brand logos (SVG data URIs) ────────────────────────────────────

function svg64(svgContent: string): string {
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
}

const WALLET_LOGOS: Record<string, string> = {
  "io.metamask": svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#1C1C1C"/>
      <polygon points="20,5 32,12 32,26 20,35 8,26 8,12" fill="#E88321" opacity="0.15"/>
      <path d="M29.5 9L21.5 15.2 23 11.5Z" fill="#E2761B"/>
      <path d="M10.5 9L18.5 11.6 16.9 15.2Z" fill="#E4761B"/>
      <path d="M26.7 24.7L24.4 28.3 28.9 29.6 30.2 24.8Z" fill="#E4761B"/>
      <path d="M9.8 24.8L11.1 29.6 15.6 28.3 13.3 24.7Z" fill="#E4761B"/>
      <path d="M15.3 18.6L13.9 20.8 18.3 21 18.2 16.2Z" fill="#E4761B"/>
      <path d="M24.7 18.6L21.8 16.1 21.7 21 26.1 20.8Z" fill="#E4761B"/>
      <path d="M15.6 28.3L18.1 27 15.9 24.8Z" fill="#E4761B"/>
      <path d="M21.9 27L24.4 28.3 24.1 24.8Z" fill="#E4761B"/>
      <text x="20" y="23" text-anchor="middle" font-size="9" font-family="system-ui,sans-serif" font-weight="800" fill="#F6851B">MM</text>
    </svg>`
  ),
  "io.rabby": svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#8697FF"/>
      <circle cx="15" cy="13" r="4" fill="white" opacity="0.9"/>
      <circle cx="25" cy="13" r="4" fill="white" opacity="0.9"/>
      <ellipse cx="20" cy="25" rx="10" ry="9" fill="white" opacity="0.9"/>
      <circle cx="16" cy="24" r="2" fill="#8697FF"/>
      <circle cx="24" cy="24" r="2" fill="#8697FF"/>
      <ellipse cx="20" cy="29" rx="3" ry="1.5" fill="#8697FF" opacity="0.5"/>
    </svg>`
  ),
  "com.okex.wallet": svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#000000"/>
      <rect x="8" y="14" width="7" height="7" rx="1.5" fill="white"/>
      <rect x="16.5" y="14" width="7" height="7" rx="1.5" fill="white"/>
      <rect x="25" y="14" width="7" height="7" rx="1.5" fill="white"/>
      <rect x="16.5" y="22.5" width="7" height="7" rx="1.5" fill="white"/>
    </svg>`
  ),
  "com.coinbase.wallet": svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#0052FF"/>
      <circle cx="20" cy="20" r="13" fill="white"/>
      <circle cx="20" cy="20" r="8" fill="#0052FF"/>
      <rect x="15" y="18" width="10" height="4" rx="2" fill="white"/>
    </svg>`
  ),
  "com.trustwallet.app": svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#3375BB"/>
      <path d="M20 8 L31 12 L31 22 C31 28 26 33 20 35 C14 33 9 28 9 22 L9 12 Z" fill="white" opacity="0.95"/>
      <path d="M20 13 L26 16 L26 22 C26 26 23.5 29 20 31 C16.5 29 14 26 14 22 L14 16 Z" fill="#3375BB"/>
    </svg>`
  ),
};

// ── Known wallets catalogue ────────────────────────────────────────────────

const WALLET_META: Record<
  string,
  { name: string; color: string; installUrl: string }
> = {
  "io.metamask": {
    name: "MetaMask",
    color: "#F6851B",
    installUrl: "https://metamask.io/download/",
  },
  "io.rabby": {
    name: "Rabby Wallet",
    color: "#8697FF",
    installUrl: "https://rabby.io/",
  },
  "com.okex.wallet": {
    name: "OKX Wallet",
    color: "#000000",
    installUrl: "https://web3.okx.com/",
  },
  "com.coinbase.wallet": {
    name: "Coinbase Wallet",
    color: "#0052FF",
    installUrl: "https://www.coinbase.com/wallet",
  },
  "com.trustwallet.app": {
    name: "Trust Wallet",
    color: "#3375BB",
    installUrl: "https://trustwallet.com/",
  },
};

const ORDERED_RDNS = [
  "io.metamask",
  "io.rabby",
  "com.okex.wallet",
  "com.coinbase.wallet",
  "com.trustwallet.app",
];

function makeFallbackBadge(color: string, initial: string): string {
  return svg64(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="10" fill="${color}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="18" font-family="system-ui,sans-serif" font-weight="700" fill="white">${initial}</text></svg>`
  );
}

export function getWalletLogo(rdns: string): string {
  return WALLET_LOGOS[rdns] ?? makeFallbackBadge("#64748b", "W");
}

// ── EIP-6963 detection ─────────────────────────────────────────────────────

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: WalletProvider;
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

export function detectWallets(timeoutMs = 200): Promise<DetectedWallet[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DetectedWallet>();

    const handler = (event: Event) => {
      const { info, provider } = (event as EIP6963AnnounceProviderEvent).detail;
      const meta = WALLET_META[info.rdns];
      found.set(info.rdns, {
        rdns: info.rdns,
        name: meta?.name ?? info.name,
        icon: info.icon, // real wallet icon from extension
        provider,
        installed: true,
      });
    };

    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handler);

      // Fallback: if EIP-6963 found nothing but window.ethereum exists
      if (found.size === 0 && typeof window !== "undefined" && window.ethereum) {
        const eth = window.ethereum as unknown as Record<string, unknown> & WalletProvider;
        let rdns = "unknown";
        let name = "Browser Wallet";
        if (eth.isMetaMask) { rdns = "io.metamask"; name = "MetaMask"; }
        else if (eth.isRabby) { rdns = "io.rabby"; name = "Rabby Wallet"; }
        else if (eth.isOKExWallet) { rdns = "com.okex.wallet"; name = "OKX Wallet"; }
        else if (eth.isCoinbaseWallet) { rdns = "com.coinbase.wallet"; name = "Coinbase Wallet"; }
        found.set(rdns, {
          rdns,
          name,
          icon: WALLET_LOGOS[rdns] ?? makeFallbackBadge("#64748b", name[0]),
          provider: eth,
          installed: true,
        });
      }

      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}

/** Merge detected wallets with the known catalogue, in preferred order. */
export function buildWalletList(detected: DetectedWallet[]): WalletEntry[] {
  const detectedByRdns = new Map(detected.map((d) => [d.rdns, d]));

  const list: WalletEntry[] = ORDERED_RDNS.map((rdns) => {
    const d = detectedByRdns.get(rdns);
    if (d) return d;
    const meta = WALLET_META[rdns]!;
    return {
      rdns,
      name: meta.name,
      icon: WALLET_LOGOS[rdns] ?? makeFallbackBadge(meta.color, meta.name[0]),
      provider: null,
      installed: false,
      installUrl: meta.installUrl,
    } satisfies KnownWallet;
  });

  // Add any detected wallets NOT in our catalogue
  for (const d of detected) {
    if (!WALLET_META[d.rdns]) {
      list.push(d);
    }
  }

  return list;
}

// ── Switch to GenLayer network ─────────────────────────────────────────────

import { GENLAYER_NETWORK } from "./config";

export async function switchToGenLayer(provider: WalletProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_NETWORK.chainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: GENLAYER_NETWORK.chainIdHex,
            chainName: GENLAYER_NETWORK.name,
            nativeCurrency: GENLAYER_NETWORK.currency,
            rpcUrls: [GENLAYER_NETWORK.rpcUrl],
            blockExplorerUrls: [GENLAYER_NETWORK.explorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}
