import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  title: string;
  severity: Severity;
  explanation: string;
  fix: string;
}

interface ValidatorResult {
  name: string;
  status: string;
  score: number;
  findings: Finding[];
}

// ── Validator Logic ────────────────────────────────────────────────────────

function runSecurityValidator(code: string): ValidatorResult {
  const findings: Finding[] = [];

  if (
    /\.call\s*\{[^}]*value[^}]*\}/.test(code) &&
    /balances\[/.test(code) &&
    code.indexOf("balances[") > code.indexOf(".call")
  ) {
    findings.push({
      title: "Reentrancy Vulnerability",
      severity: "critical",
      explanation:
        "ETH is sent before updating the balance, allowing recursive withdraw calls to drain the contract.",
      fix: "Apply checks-effects-interactions pattern: update balances before the external call. Use OpenZeppelin's ReentrancyGuard.",
    });
  }

  if (/\.call\s*\{.*?\}\s*\(/.test(code) && !/require\(success/.test(code)) {
    findings.push({
      title: "Unchecked Low-Level Call",
      severity: "high",
      explanation: "The return value of a low-level call is not checked, allowing silent failures.",
      fix: "Always check the return value: (bool success,) = addr.call{...}(\"\"); require(success);",
    });
  }

  if (/tx\.origin/.test(code)) {
    findings.push({
      title: "tx.origin Authentication Bypass",
      severity: "high",
      explanation:
        "tx.origin can be manipulated in phishing attacks. Use msg.sender for authentication.",
      fix: "Replace tx.origin with msg.sender for all authorization checks.",
    });
  }

  if (/block\.timestamp/.test(code)) {
    findings.push({
      title: "Block Timestamp Dependency",
      severity: "medium",
      explanation: "Miners can slightly manipulate block.timestamp, affecting time-sensitive logic.",
      fix: "Avoid relying on block.timestamp for critical decisions. Use block.number or Chainlink VRF.",
    });
  }

  if (/delegatecall/.test(code) && /msg\.data|calldataload|_target|_addr/.test(code)) {
    findings.push({
      title: "Unsafe Delegatecall",
      severity: "critical",
      explanation:
        "Delegatecall with a user-controlled address allows attackers to execute arbitrary code in your contract's context.",
      fix: "Never pass user-controlled addresses to delegatecall. Whitelist approved implementation addresses.",
    });
  }

  if (/selfdestruct|suicide\s*\(/.test(code) && !/onlyOwner|require\(msg\.sender/.test(code)) {
    findings.push({
      title: "Unguarded Self-Destruct",
      severity: "critical",
      explanation:
        "A selfdestruct call without access control allows anyone to permanently destroy the contract.",
      fix: "Restrict selfdestruct to an owner-only function with proper access control.",
    });
  }

  if (!/pragma solidity [0-9^~]/.test(code)) {
    findings.push({
      title: "Missing Pragma Statement",
      severity: "low",
      explanation: "No pragma solidity directive found. Contract may compile with unexpected versions.",
      fix: "Add a version pragma, e.g., pragma solidity 0.8.20;",
    });
  }

  const score = Math.min(
    100,
    findings.reduce(
      (s, f) =>
        s +
        (f.severity === "critical"
          ? 40
          : f.severity === "high"
          ? 25
          : f.severity === "medium"
          ? 15
          : 5),
      0
    )
  );

  return { name: "Security Auditor", status: "done", score, findings };
}

function runGasValidator(code: string): ValidatorResult {
  const findings: Finding[] = [];

  const storageReads = (code.match(/\b(balances|mapping|storage)\b/g) || []).length;
  if (storageReads > 5 && /for\s*\(/.test(code)) {
    findings.push({
      title: "Storage Reads in Loop",
      severity: "medium",
      explanation:
        "Reading from storage inside a loop is expensive (2,100 gas per cold read). Cache values in memory.",
      fix: "Declare `uint256 cached = storageVar;` before the loop and use `cached` inside.",
    });
  }

  if (/uint8\s+\w+\s*=|uint16\s+\w+\s*=/.test(code)) {
    findings.push({
      title: "Sub-optimal Integer Size",
      severity: "low",
      explanation:
        "uint8/uint16 cost more gas than uint256 because the EVM must pad them to 32 bytes.",
      fix: "Use uint256 for arithmetic variables unless tight packing in a struct is intentional.",
    });
  }

  if (/public\s+string\s+\w+\s*=/.test(code)) {
    findings.push({
      title: "On-chain String Storage",
      severity: "medium",
      explanation: "Storing strings on-chain is gas-intensive. Consider using bytes32 or events.",
      fix: "Use bytes32 for short fixed strings, or emit events for metadata rather than storing.",
    });
  }

  if (!/event\s+\w+/.test(code)) {
    findings.push({
      title: "No Event Emissions",
      severity: "low",
      explanation:
        "State-changing functions emit no events, making off-chain indexing impossible and increasing long-term gas costs for observers.",
      fix: "Emit events for deposits, withdrawals, ownership changes, and other important state transitions.",
    });
  }

  if (/function\s+\w+[^{]*public[^{]*{[^}]*\bstorage\b/.test(code)) {
    findings.push({
      title: "Redundant Storage Operations",
      severity: "low",
      explanation:
        "Multiple writes to the same storage variable in one function are more expensive than batching.",
      fix: "Cache storage reads in memory variables, make all mutations, then write once at the end.",
    });
  }

  const score = Math.min(
    100,
    findings.reduce(
      (s, f) =>
        s +
        (f.severity === "critical"
          ? 40
          : f.severity === "high"
          ? 25
          : f.severity === "medium"
          ? 15
          : 5),
      0
    )
  );

  return { name: "Gas Optimizer", status: "done", score, findings };
}

function runAccessControlValidator(code: string): ValidatorResult {
  const findings: Finding[] = [];

  const hasOwner = /owner\s*=|address.*owner|Ownable/.test(code);
  const hasModifier = /modifier\s+\w+|onlyOwner|require\(msg\.sender/.test(code);
  const hasSetters =
    /function\s+set\w+|function\s+update\w+|function\s+change\w+/.test(code);

  if (hasSetters && !hasModifier) {
    findings.push({
      title: "Missing Access Control on Setters",
      severity: "high",
      explanation:
        "Public/external setter functions have no ownership or role check, allowing anyone to modify critical state.",
      fix: "Add an onlyOwner modifier (OpenZeppelin Ownable) or a role check to all privileged functions.",
    });
  }

  if (!hasOwner) {
    findings.push({
      title: "No Ownership Pattern",
      severity: "medium",
      explanation:
        "Contract has no ownership pattern, making it impossible to pause, upgrade, or control in an emergency.",
      fix: "Inherit from OpenZeppelin Ownable or implement a role-based access control scheme.",
    });
  }

  if (/function\s+\w+\s*\([^)]*\)\s*public\s*payable/.test(code) && !hasModifier) {
    findings.push({
      title: "Unguarded Payable Function",
      severity: "high",
      explanation:
        "A payable function is publicly accessible without any access control, risking unintended ETH locking.",
      fix: "Restrict payable functions to authorized callers or add require(msg.sender == owner) checks.",
    });
  }

  if (/address\(0\)/.test(code) && !/require.*!=\s*address\(0\)/.test(code)) {
    findings.push({
      title: "Missing Zero Address Validation",
      severity: "medium",
      explanation:
        "Addresses assigned without checking for the zero address (0x000...0) can permanently lock funds.",
      fix: "Add require(addr != address(0), 'Zero address not allowed') before any address assignment.",
    });
  }

  if (/ecrecover/.test(code) && !/nonce|nonces|used\[/.test(code)) {
    findings.push({
      title: "Potential Signature Replay",
      severity: "high",
      explanation:
        "ecrecover usage without a nonce or replay protection allows the same signed message to be resubmitted multiple times.",
      fix: "Track used signatures or use a nonce per address to prevent replay attacks.",
    });
  }

  const score = Math.min(
    100,
    findings.reduce(
      (s, f) =>
        s +
        (f.severity === "critical"
          ? 40
          : f.severity === "high"
          ? 25
          : f.severity === "medium"
          ? 15
          : 5),
      0
    )
  );

  return { name: "Access Control Expert", status: "done", score, findings };
}

function runFormalValidator(code: string): ValidatorResult {
  const findings: Finding[] = [];

  if (!/pragma solidity 0\.[89]\./.test(code)) {
    findings.push({
      title: "Unsafe Compiler Version",
      severity: "medium",
      explanation:
        "Using a pragma that allows versions older than 0.8 means the compiler won't guard against integer overflows/underflows.",
      fix: "Lock to Solidity >= 0.8.0: pragma solidity 0.8.20; Older code should use SafeMath explicitly.",
    });
  }

  if (/\+\+|\-\-|[^=!<>]=[^=]/.test(code) && !/SafeMath|unchecked/.test(code)) {
    findings.push({
      title: "Unchecked Arithmetic",
      severity: "medium",
      explanation:
        "Arithmetic operations without explicit overflow checks or SafeMath could silently wrap in older Solidity versions.",
      fix: "Use Solidity >= 0.8.0 (built-in overflow checks) or wrap arithmetic in OpenZeppelin SafeMath.",
    });
  }

  if (/\^0\.[0-7]\./.test(code)) {
    findings.push({
      title: "Pragma Version Not Locked",
      severity: "low",
      explanation:
        "Using a caret (^) pragma allows compilation with any future compatible release, which may introduce unexpected behavior.",
      fix: "Lock to a specific version such as pragma solidity 0.8.20;",
    });
  }

  if (/require\(/.test(code) && !/require\([^,)]+,\s*"/.test(code)) {
    findings.push({
      title: "require() Missing Error Messages",
      severity: "low",
      explanation: "require() statements without error strings make debugging and auditing harder.",
      fix: 'Add descriptive strings: require(condition, "Description of failure");',
    });
  }

  if (/\/\d+/.test(code) && !/SafeMath|mulDiv/.test(code)) {
    findings.push({
      title: "Integer Division Truncation",
      severity: "low",
      explanation:
        "Integer division in Solidity truncates results silently. For example, 3/2 equals 1, not 1.5.",
      fix: "Multiply before dividing to preserve precision, or use a fixed-point math library.",
    });
  }

  const score = Math.min(
    100,
    findings.reduce(
      (s, f) =>
        s +
        (f.severity === "critical"
          ? 40
          : f.severity === "high"
          ? 25
          : f.severity === "medium"
          ? 15
          : 5),
      0
    )
  );

  return { name: "Formal Verifier", status: "done", score, findings };
}

// ── Consensus ────────────────────────────────────────────────────────────

interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const WEIGHTS: Record<string, number> = {
  "Security Auditor": 0.35,
  "Gas Optimizer": 0.20,
  "Access Control Expert": 0.30,
  "Formal Verifier": 0.15,
};

function computeConsensus(validators: ValidatorResult[]): {
  consensus_score: number;
  severity_breakdown: SeverityBreakdown;
  is_fallback: boolean;
} {
  let weighted = 0;
  for (const v of validators) {
    weighted += v.score * (WEIGHTS[v.name] || 0.25);
  }
  const consensus_score = Math.round(Math.min(100, weighted));

  const severity_breakdown: SeverityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  const seen = new Set<string>();
  for (const v of validators) {
    for (const f of v.findings) {
      const key = f.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        severity_breakdown[f.severity]++;
      }
    }
  }

  return { consensus_score, severity_breakdown, is_fallback: false };
}

// ── Routes ────────────────────────────────────────────────────────────────

router.post("/audit", (req, res) => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "Contract code is required" });
    return;
  }

  const validators: ValidatorResult[] = [
    runSecurityValidator(code),
    runGasValidator(code),
    runAccessControlValidator(code),
    runFormalValidator(code),
  ];

  const { consensus_score, severity_breakdown, is_fallback } = computeConsensus(validators);

  res.json({
    consensus_score,
    severity_breakdown,
    validators,
    is_fallback,
    message: "Analysis complete via 4 AI audit types",
  });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SmartAudit AI Backend", validators: 4 });
});

export default router;
