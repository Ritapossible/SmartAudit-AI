import { ethers } from "ethers";
import { GENLAYER_NETWORK } from "./config";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function getBrowserProvider(): ethers.BrowserProvider {
  if (!window.ethereum) throw new Error("No EVM wallet detected");
  return new ethers.BrowserProvider(window.ethereum);
}

async function switchToGenLayer(provider: ethers.BrowserProvider) {
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: GENLAYER_NETWORK.chainIdHex },
    ]);
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    // 4902 = chain not added yet, -32603 = wallet-specific equivalent
    if (code === 4902 || code === -32603) {
      await provider.send("wallet_addEthereumChain", [
        {
          chainId: GENLAYER_NETWORK.chainIdHex,
          chainName: GENLAYER_NETWORK.name,
          nativeCurrency: GENLAYER_NETWORK.currency,
          rpcUrls: [GENLAYER_NETWORK.rpcUrl],
          blockExplorerUrls: [GENLAYER_NETWORK.explorer],
        },
      ]);
    } else {
      throw err;
    }
  }
}

export interface WalletState {
  address: string;
  provider: ethers.BrowserProvider;
  chainId: number;
  isCorrectNetwork: boolean;
}

export async function connectWallet(): Promise<WalletState> {
  if (!hasWallet()) {
    throw new Error(
      "No EVM wallet found. Please install MetaMask, Rabby, or OKX Wallet.",
    );
  }
  const provider = getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  await switchToGenLayer(provider);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  return {
    address,
    provider,
    chainId,
    isCorrectNetwork: chainId === GENLAYER_NETWORK.chainId,
  };
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerTxUrl(hash: string): string {
  return `${GENLAYER_NETWORK.explorer}/tx/${hash}`;
}
