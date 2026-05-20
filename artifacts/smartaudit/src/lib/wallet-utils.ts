import { GENLAYER_NETWORK } from "./config";

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerTxUrl(hash: string): string {
  return `${GENLAYER_NETWORK.explorer}/tx/${hash}`;
}
