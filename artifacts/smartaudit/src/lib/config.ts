// ── GenLayer Studio Network ────────────────────────────────────────────────
// Chain ID: 61999 (0xF22F)
// RPC:      https://studio.genlayer.com/api
export const GENLAYER_NETWORK = {
  chainId: 61999,
  chainIdHex: "0xF22F",
  name: "GenLayer Studio",
  rpcUrl: "https://studio.genlayer.com/api",
  currency: { name: "GEN", symbol: "GEN", decimals: 18 },
  explorer: "https://explorer-studio.genlayer.com",
  faucetUrl: "https://studio.genlayer.com/",
};

// ── Deployed Contract (GenLayer Studio) ───────────────────────────────────
export const CONTRACT_ADDRESS = "0xdcbA2A298A4E2C8e5E5CF4B37F14BC779C08991E";

export const CONTRACT_ABI = [
  {
    name: "run_audit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "contract_code", type: "string" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "get_audit_count",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
