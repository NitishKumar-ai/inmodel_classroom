/**
 * Plagiarism detection — structural analysis, no external API.
 */
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Normalization Helpers
// ---------------------------------------------------------------------------

/** Strip whitespace and lowercase for exact-match comparison */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, " ").trim().toLowerCase();
}

/** SHA-256 hash of normalized code */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(normalizeCode(code)).digest("hex");
}

/** Tokenize code by splitting on whitespace and punctuation */
export function tokenize(code: string): Set<string> {
  const tokens = code
    .replace(/[{}()\[\];,.:=<>+\-*/&|!?^~%#@"'`\\]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase());
  return new Set(tokens);
}

/** Jaccard similarity between two token sets */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/** Normalize variable names to VAR_1, VAR_2 etc. */
export function normalizeVarNames(code: string): string {
  // Simple heuristic: find identifiers that look like variable names
  // (sequences of word chars not starting with uppercase and not keywords)
  const keywords = new Set([
    "if", "else", "for", "while", "return", "def", "class", "import", "from",
    "in", "not", "and", "or", "true", "false", "none", "null", "var", "let",
    "const", "function", "int", "float", "string", "bool", "void", "public",
    "private", "static", "new", "this", "self", "print", "input", "range",
    "len", "str", "list", "dict", "set", "type", "try", "except", "catch",
    "throw", "finally", "break", "continue", "switch", "case", "default",
    "do", "elif", "with", "as", "yield", "async", "await", "include",
    "using", "namespace", "cout", "cin", "endl", "main", "stdio",
    "printf", "scanf", "malloc", "free", "sizeof", "struct",
  ]);

  const varMap = new Map<string, string>();
  let counter = 0;

  return code.replace(/\b([a-z_][a-z0-9_]*)\b/gi, (match) => {
    const lower = match.toLowerCase();
    if (keywords.has(lower)) return match;
    if (/^\d/.test(match)) return match;
    if (!varMap.has(lower)) {
      varMap.set(lower, `VAR_${++counter}`);
    }
    return varMap.get(lower)!;
  });
}

// ---------------------------------------------------------------------------
// Main Plagiarism Check
// ---------------------------------------------------------------------------

export interface PlagiarismFlag {
  type: "EXACT_MATCH" | "NEAR_MATCH" | "STARTER_CODE" | "VAR_RENAME";
  matchedSubmissionId?: string;
  similarity?: number;
}

export function checkPlagiarism(
  submissionCode: string,
  submissionId: string,
  otherSubmissions: { id: string; code: string }[],
  starterCode: string
): PlagiarismFlag[] {
  const flags: PlagiarismFlag[] = [];
  const myHash = hashCode(submissionCode);
  const myTokens = tokenize(submissionCode);
  const myNormalized = normalizeVarNames(normalizeCode(submissionCode));

  // 1. Starter code similarity
  const starterTokens = tokenize(starterCode);
  const starterSim = jaccardSimilarity(myTokens, starterTokens);
  if (starterSim > 0.90) {
    flags.push({ type: "STARTER_CODE", similarity: Math.round(starterSim * 100) / 100 });
  }

  // 2. Check against other submissions
  for (const other of otherSubmissions) {
    if (other.id === submissionId) continue;

    // Exact match
    if (hashCode(other.code) === myHash) {
      flags.push({ type: "EXACT_MATCH", matchedSubmissionId: other.id });
      continue; // Skip further checks for this pair
    }

    // Near match (Jaccard > 0.85)
    const otherTokens = tokenize(other.code);
    const similarity = jaccardSimilarity(myTokens, otherTokens);
    if (similarity > 0.85) {
      flags.push({
        type: "NEAR_MATCH",
        matchedSubmissionId: other.id,
        similarity: Math.round(similarity * 100) / 100,
      });
      continue;
    }

    // Variable rename detection
    const otherNormalized = normalizeVarNames(normalizeCode(other.code));
    if (myNormalized === otherNormalized) {
      flags.push({ type: "VAR_RENAME", matchedSubmissionId: other.id });
    }
  }

  return flags;
}
