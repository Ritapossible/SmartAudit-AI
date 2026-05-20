/**
 * GenLayer intelligent contract integration.
 *
 * KEY FIX: GenLayer Python contracts use a custom calldata encoding (RLP/GenVM),
 * NOT standard EVM ABI. Sending via ethers `eth_sendTransaction` with ABI-encoded
 * data is treated as a plain "Send" by the GenLayer node — the contract method is
 * never invoked. We use the official `genlayer-js` SDK (`writeContract`) which
 * applies the correct GenLayer calldata encoding and triggers real consensus.
 */
import { ethers } from "ethers";
import { createClient, abi as glAbi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CONTRACT_ADDRESS, GENLAYER_NETWORK } from "./config";

const STUDIO_RPC = "https://studio.genlayer.com/api";

// ── Error types ───────────────────────────────────────────────────────────

/** User explicitly rejected the wallet popup. */
export class UserRejectedError extends Error {
  constructor() {
    super(
      "Transaction rejected. Please approve the GEN gas fee in your wallet to run the audit.",
    );
    this.name = "UserRejectedError";
  }
}

/** GenLayer RPC is unreachable or validators timed out. */
export class GenLayerDownError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "GenLayerDownError";
  }
}

/** Wallet is on the wrong chain. */
export class WrongNetworkError extends Error {
  constructor() {
    super(
      `Please switch your wallet to ${GENLAYER_NETWORK.name} (Chain ${GENLAYER_NETWORK.chainId}) and try again.`,
    );
    this.name = "WrongNetworkError";
  }
}

// ── Direct RPC helper ─────────────────────────────────────────────────────

async function studioRpc<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(STUDIO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const data = await res.json() as { result?: T; error?: unknown };
    return data.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Try both GenLayer-specific and Ethereum-compatible tx lookup methods.
 * GenLayer nodes accept both gen_getTransactionByHash and eth_getTransactionByHash.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTxByHash(txHash: string): Promise<any | null> {
  for (const method of ["gen_getTransactionByHash", "eth_getTransactionByHash"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await studioRpc<any>(method, [txHash]);
    if (tx && typeof tx === "object") return tx;
  }
  return null;
}

// ── GenLayer on-chain result shape ────────────────────────────────────────

export interface GenLayerAuditResult {
  // ── New nested contract shape ──────────────────────────────────────────
  audit?: {
    issues?: string[];
    risk_score?: number;
    summary?: string;
    verdict?: string;
  };
  consensus?: {
    enabled?: boolean;
    model?: string;
  };
  equivalence_principle?: {
    enabled?: boolean;
    status?: string;
  };
  project?: string;
  audit_number?: number;

  // ── Flat contract shape ────────────────────────────────────────────────
  summary?: string;
  risk_score?: number;
  verdict?: string;
  consensus_achieved?: boolean;
  equivalence_verified?: boolean;

  // ── Shared across shapes ───────────────────────────────────────────────
  vulnerabilities?: Array<{
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    explanation: string;
    fix?: string;
    suggested_fix?: string;
  }>;
  recommendations?: string[];

  // ── Old contract shape (backward compat) ──────────────────────────────
  consensus_score?: number;
  severity_breakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  validators?: Array<{
    name: string;
    score: number;
    findings: Array<{
      title: string;
      severity: "critical" | "high" | "medium" | "low";
      explanation: string;
      fix: string;
    }>;
  }>;
  is_fallback?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isUserRejection(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  const msg = String(e.message ?? "").toLowerCase();
  return (
    e.code === 4001 ||
    e.code === "ACTION_REJECTED" ||
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("rejected by user")
  );
}

/**
 * Try to parse a GenLayerAuditResult from a raw string.
 * Handles JSON strings wrapped in Python-style single quotes or extra encoding.
 */
function parseAuditJson(raw: unknown): GenLayerAuditResult | null {
  if (!raw) return null;
  try {
    let str = typeof raw === "string" ? raw : JSON.stringify(raw);
    // Strip surrounding single or double quotes (Python repr)
    str = str.trim().replace(/^["']|["']$/g, "").trim();

    // If it already looks like an object, use it directly
    const parsed = typeof raw === "object" && raw !== null
      ? (raw as GenLayerAuditResult)
      : JSON.parse(str) as GenLayerAuditResult;

    // Sanity check — must have at least one meaningful field
    if (
      typeof (parsed as { risk_score?: unknown }).risk_score === "number" ||
      typeof (parsed as { consensus_score?: unknown }).consensus_score === "number" ||
      Array.isArray((parsed as { vulnerabilities?: unknown }).vulnerabilities) ||
      typeof (parsed as { summary?: unknown }).summary === "string" ||
      typeof (parsed as { audit?: unknown }).audit === "object"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode raw calldata bytes from a GenLayer result to a string.
 * Uses genlayer-js abi.calldata.decode (handles the custom type tags).
 * Scans a wide window to handle varying type tag / length prefix sizes.
 */
function decodeCalldataToString(bytes: Uint8Array): string | null {
  // Strategy 1: Use genlayer-js abi.calldata.decode
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = (glAbi.calldata as any).decode(bytes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const str = (glAbi.calldata as any).toString(decoded);
    if (typeof str === "string" && str.length > 2) return str;
  } catch {
    // fall through
  }

  // Strategy 2: Scan for JSON start — scan 64 bytes to handle any tag/prefix size
  for (let offset = 0; offset < Math.min(bytes.length, 64); offset++) {
    if (bytes[offset] === 0x7B || bytes[offset] === 0x22) { // '{' or '"'
      try {
        const str = new TextDecoder("utf-8").decode(bytes.slice(offset));
        if (str.startsWith("{") || str.startsWith('"')) return str;
      } catch { /* continue */ }
    }
  }

  // Strategy 3: Raw UTF-8 decode of entire bytes
  try {
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Decode a base64 result string from a GenLayer leader receipt.
 * byte[0] = result code (0 = return), bytes[1:] = calldata-encoded return value.
 */
function decodeBase64Result(b64: string): GenLayerAuditResult | null {
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (bytes.length < 2) return null;

    // Try with result-type prefix stripped
    if (bytes[0] === 0) {
      const str = decodeCalldataToString(bytes.slice(1));
      if (str) {
        const p = parseAuditJson(str);
        if (p) return p;
      }
    }

    // Also try full bytes (some nodes omit the prefix byte)
    const str2 = decodeCalldataToString(bytes);
    if (str2) return parseAuditJson(str2);
  } catch { /* ignore */ }
  return null;
}

/**
 * Decode a hex string result from a GenLayer leader receipt.
 */
function decodeHexResult(hex: string): GenLayerAuditResult | null {
  try {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length < 4) return null;
    const bytes = new Uint8Array(clean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    if (bytes[0] === 0) {
      const str = decodeCalldataToString(bytes.slice(1));
      if (str) {
        const p = parseAuditJson(str);
        if (p) return p;
      }
    }
    const str2 = decodeCalldataToString(bytes);
    if (str2) return parseAuditJson(str2);
  } catch { /* ignore */ }
  return null;
}

/**
 * Extract the audit result from an array of leader receipt objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromLeaderReceipt(leaderReceipts: any[]): GenLayerAuditResult | null {
  for (const lr of leaderReceipts) {
    const result = lr?.result ?? lr?.execution_result ?? lr?.return_value;
    if (!result) continue;

    // A) Raw base64 string
    if (typeof result === "string") {
      // Could be base64 or JSON directly
      const direct = parseAuditJson(result);
      if (direct) return direct;

      // Try as base64
      const fromB64 = decodeBase64Result(result);
      if (fromB64) return fromB64;

      // Try as hex
      if (result.startsWith("0x") || /^[0-9a-fA-F]{8,}$/.test(result)) {
        const fromHex = decodeHexResult(result);
        if (fromHex) return fromHex;
      }
    }

    // B) Decoded object { status: 'return'|0, payload: { raw, readable } }
    if (result.status === "return" || result.status === 0 || result.execution_result === "FINISHED_WITH_RETURN") {
      const payload = result.payload ?? result.return_value ?? result.output;
      if (payload !== undefined) {
        const p = parseAuditJson(payload);
        if (p) return p;

        if (payload?.readable !== undefined) {
          const p2 = parseAuditJson(String(payload.readable));
          if (p2) return p2;
        }

        const rawBytes = payload?.raw;
        if (Array.isArray(rawBytes) && rawBytes.length > 0) {
          const bytes = new Uint8Array(rawBytes as number[]);
          const str = decodeCalldataToString(bytes);
          if (str) {
            const p3 = parseAuditJson(str);
            if (p3) return p3;
          }
        }
      }
    }

    // C) result is a plain object that looks like audit data
    if (typeof result === "object") {
      const p = parseAuditJson(result);
      if (p) return p;
    }
  }
  return null;
}

/**
 * Extract the audit JSON from a raw GenLayer transaction object.
 * Tries every known field path in priority order.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractResultFromTx(tx: any): GenLayerAuditResult | null {
  if (!tx) return null;

  // ── Path 1: consensus_data.leader_receipt ─────────────────────────────
  const lrPaths = [
    tx?.consensus_data?.leader_receipt,
    tx?.data?.consensus_data?.leader_receipt,
    tx?.consensusData?.leaderReceipt,
    tx?.consensus_data?.final_used_leader_receipt
      ? [tx.consensus_data.final_used_leader_receipt]
      : undefined,
  ].filter(Boolean);

  for (const lrField of lrPaths) {
    const receipts = Array.isArray(lrField) ? lrField : [lrField];
    const parsed = extractFromLeaderReceipt(receipts);
    if (parsed) return parsed;
  }

  // ── Path 2: top-level return fields ──────────────────────────────────
  for (const field of ["returnData", "output", "return_data", "result", "txReceipt"]) {
    const v = tx[field];
    if (!v) continue;

    if (typeof v === "string" && v.length > 4) {
      const direct = parseAuditJson(v);
      if (direct) return direct;

      if (v.startsWith("0x") || /^[0-9a-fA-F]{8,}$/.test(v)) {
        const fromHex = decodeHexResult(v);
        if (fromHex) return fromHex;
      }

      const fromB64 = decodeBase64Result(v);
      if (fromB64) return fromB64;
    }

    if (typeof v === "object") {
      const p = parseAuditJson(v);
      if (p) return p;
    }
  }

  return null;
}

/**
 * Fetch a raw transaction from the Studio node and extract the audit result.
 * Tries both GenLayer and Ethereum RPC methods.
 */
async function fetchResultFromStudioRpc(txHash: string): Promise<GenLayerAuditResult | null> {
  const tx = await getTxByHash(txHash);
  if (!tx) return null;
  return extractResultFromTx(tx);
}

/**
 * Poll the Studio RPC directly until the transaction is finalized and the
 * audit result can be extracted.  This is the primary fallback when the SDK's
 * waitForTransactionReceipt fails or times out.
 *
 * GenLayer consensus (Optimistic Democracy) typically takes 30–120 s.
 * We poll every 5 s for up to 6 minutes (72 attempts).
 */
async function pollStudioRpcForResult(
  txHash: string,
  onRetry?: (attempt: number, total: number) => void,
  maxRetries = 72,
): Promise<GenLayerAuditResult | null> {
  const POLL_MS = 5_000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    onRetry?.(attempt, maxRetries);
    await new Promise((r) => setTimeout(r, POLL_MS));

    const tx = await getTxByHash(txHash);
    if (!tx) continue;

    // Check if finalized — many possible field names
    const execResult: string = String(
      tx?.execution_result ??
      tx?.txExecutionResultName ??
      tx?.consensus_data?.final_used_leader_receipt?.execution_result ??
      "",
    ).toUpperCase();

    const hasLeaderReceipt = !!(
      tx?.consensus_data?.leader_receipt?.length ||
      tx?.data?.consensus_data?.leader_receipt?.length ||
      tx?.consensusData?.leaderReceipt?.length
    );

    // Only try extraction if there's evidence the tx has a result
    const isLikelyFinalized =
      execResult.includes("RETURN") ||
      execResult.includes("FINISHED") ||
      execResult.includes("SUCCESS") ||
      hasLeaderReceipt;

    if (!isLikelyFinalized) continue;

    const parsed = extractResultFromTx(tx);
    if (parsed) return parsed;
  }

  return null;
}

// ── Read client (no wallet needed) ────────────────────────────────────────

function createReadClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient({ chain: studionet } as any);
}

// ── Audit count helper ────────────────────────────────────────────────────

export async function getAuditCount(_provider: ethers.BrowserProvider): Promise<number> {
  try {
    const client = createReadClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_audit_count",
      args: [],
    });
    return typeof result === "number" ? result : typeof result === "bigint" ? Number(result) : 0;
  } catch {
    return 0;
  }
}

// ── Main on-chain audit call ──────────────────────────────────────────────

export async function runAuditOnChain(
  provider: ethers.BrowserProvider,
  contractCode: string,
  onWalletPrompt?: () => void,
  onTxSent?: (txHash: string) => void,
  onResultRetry?: (attempt: number, total: number) => void,
): Promise<GenLayerAuditResult> {
  // 1. Verify the wallet is on GenLayer Studio
  let network: ethers.Network | null = null;
  try {
    network = await provider.getNetwork();
  } catch {
    // ignore — may not be connected yet
  }
  if (network && Number(network.chainId) !== GENLAYER_NETWORK.chainId) {
    throw new WrongNetworkError();
  }

  // 2. Get wallet address (triggers MetaMask account access if needed)
  let walletAddress: string;
  try {
    const signer = await provider.getSigner();
    walletAddress = await signer.getAddress();
  } catch (err) {
    if (isUserRejection(err)) throw new UserRejectedError();
    throw new GenLayerDownError(`Could not access wallet: ${(err as Error).message}`);
  }

  // 3. Signal UI: wallet popup incoming
  onWalletPrompt?.();

  // 4. Create the write client (MetaMask signs, GenLayer RPC broadcasts)
  const writeClient = createClient({
    chain: studionet,
    account: walletAddress as `0x${string}`,
    provider: window.ethereum,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // 5. Call run_audit(contract_code) on the intelligent contract.
  let txHash: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txHash = await (writeClient as any).writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "run_audit",
      args: [contractCode],
    }) as string;
  } catch (err) {
    if (isUserRejection(err)) throw new UserRejectedError();
    const msg = String((err as Error).message ?? "");
    throw new GenLayerDownError(`Failed to send transaction: ${msg}`);
  }

  // 6. Emit tx hash so UI can show it / link to explorer
  onTxSent?.(txHash);

  // 7. Try the SDK's waitForTransactionReceipt first (faster when it works).
  //    GenLayer Optimistic Democracy typically takes 30–120 s.
  //    We allow 75 retries × 4 s = 5 minutes.
  const SDK_RETRIES = 75;
  const SDK_POLL_MS = 4_000;

  let progressCount = 0;
  const progressTicker = setInterval(() => {
    progressCount = Math.min(progressCount + 1, SDK_RETRIES);
    onResultRetry?.(progressCount, SDK_RETRIES);
  }, SDK_POLL_MS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let receipt: any = null;
  let sdkError: Error | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    receipt = await (writeClient as any).waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      status: "FINALIZED",
      retries: SDK_RETRIES,
      interval: SDK_POLL_MS,
      fullTransaction: true,
    });
  } catch (err) {
    sdkError = err as Error;
    // Don't throw yet — we still try the direct RPC paths below.
  } finally {
    clearInterval(progressTicker);
  }

  // 8. Extract result from the SDK receipt (fast path when SDK works)
  if (receipt) {
    const fromReceipt = extractResultFromTx(receipt);
    if (fromReceipt) return fromReceipt;
  }

  // 9. Fetch the raw tx directly from the Studio node.
  //    The transaction may already be finalized on-chain even if the SDK
  //    receipt poll timed out or returned a partial object.
  const immediateRpc = await fetchResultFromStudioRpc(txHash);
  if (immediateRpc) return immediateRpc;

  // 10. If the SDK timed out, the validators may still be running.
  //     Poll the Studio RPC directly for up to 6 more minutes.
  //     This is the critical fix: previously this path was unreachable
  //     because the catch block immediately re-threw as GenLayerDownError.
  onResultRetry?.(0, 72);
  const polled = await pollStudioRpcForResult(txHash, onResultRetry, 72);
  if (polled) return polled;

  // 11. We have exhausted all extraction strategies.
  //     If the SDK itself threw (not just a decoding failure), classify
  //     GenLayer as down so the caller can decide whether to fall back.
  if (sdkError) {
    const msg = sdkError.message ?? "";
    if (
      msg.toLowerCase().includes("timed out") ||
      msg.toLowerCase().includes("timeout")
    ) {
      throw new GenLayerDownError(
        "GenLayer validators did not respond within 10 minutes. " +
        "The transaction is on-chain — please check the GenLayer Explorer and retry.",
      );
    }
    throw new GenLayerDownError(`Consensus failed: ${msg}`);
  }

  // Receipt was obtained but could not be decoded — surface it clearly
  // (throw a plain Error, not GenLayerDownError, so the caller does NOT
  //  silently fall back to local analysis)
  const execResult = receipt?.txExecutionResultName ?? receipt?.execution_result;
  if (execResult && !String(execResult).toUpperCase().includes("RETURN")) {
    throw new Error(
      `Contract execution ended with status: ${String(execResult)}. ` +
      "Please check the GenLayer Explorer for details.",
    );
  }

  throw new Error(
    "Transaction finalized on GenLayer but the AI result could not be decoded. " +
    "Your audit ran successfully on-chain — please check the GenLayer Explorer or retry.",
  );
}
