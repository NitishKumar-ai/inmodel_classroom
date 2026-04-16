/**
 * Judge0 CE API integration
 * Supports: Python (71), JavaScript (63), Java (62), C++ (54)
 */

export const LANGUAGE_MAP: Record<string, { id: number; name: string; monacoId: string }> = {
  python: { id: 71, name: "Python 3", monacoId: "python" },
  javascript: { id: 63, name: "JavaScript", monacoId: "javascript" },
  java: { id: 62, name: "Java", monacoId: "java" },
  cpp: { id: 54, name: "C++ (GCC)", monacoId: "cpp" },
};

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
  compile_output: string | null;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  status: string;
  statusId: number;
  time: string;
  memory: number;
}

const JUDGE0_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || "";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // RapidAPI uses X-RapidAPI-Key; self-hosted uses X-Auth-Token or nothing
  if (JUDGE0_URL.includes("rapidapi.com")) {
    headers["X-RapidAPI-Key"] = JUDGE0_KEY;
    headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
  } else if (JUDGE0_KEY) {
    headers["X-Auth-Token"] = JUDGE0_KEY;
  }
  return headers;
}

/**
 * Submit code to Judge0 and wait for result (polling).
 */
export async function submitCode(
  code: string,
  languageId: number,
  stdin: string = ""
): Promise<ExecutionResult> {
  try {
    // Submit
    const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin,
        cpu_time_limit: 5,    // 5 second timeout
        memory_limit: 128000, // 128MB
      }),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      console.error("[Judge0] Submit error:", err);
      return {
        stdout: "",
        stderr: `Judge0 API error: ${submitRes.status}`,
        status: "Internal Error",
        statusId: 13,
        time: "0",
        memory: 0,
      };
    }

    const { token } = await submitRes.json();

    // Poll for result (max 30 seconds)
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
        { headers: getHeaders() }
      );

      if (!pollRes.ok) continue;

      const result: Judge0Result = await pollRes.json();

      // Status 1 = In Queue, 2 = Processing
      if (result.status.id <= 2) continue;

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || result.compile_output || "",
        status: result.status.description,
        statusId: result.status.id,
        time: result.time || "0",
        memory: result.memory || 0,
      };
    }

    return {
      stdout: "",
      stderr: "Execution timed out while polling for result.",
      status: "Time Limit Exceeded",
      statusId: 5,
      time: "0",
      memory: 0,
    };
  } catch (error) {
    console.error("[Judge0] Unexpected error:", error);
    return {
      stdout: "",
      stderr: `Execution error: ${error instanceof Error ? error.message : "Unknown"}`,
      status: "Internal Error",
      statusId: 13,
      time: "0",
      memory: 0,
    };
  }
}

/**
 * Run code against a test case and compare output.
 */
export async function runTestCase(
  code: string,
  languageId: number,
  input: string,
  expectedOutput: string
): Promise<{
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  time: string;
  status: string;
}> {
  const result = await submitCode(code, languageId, input);
  const actual = result.stdout.trim();
  const expected = expectedOutput.trim();

  return {
    passed: result.statusId === 3 && actual === expected, // 3 = Accepted
    actualOutput: actual || result.stderr,
    expectedOutput: expected,
    time: result.time,
    status: result.status,
  };
}

/**
 * Map status ID to a user-friendly badge label.
 */
export function getStatusBadge(statusId: number): {
  label: string;
  color: "green" | "red" | "amber" | "slate";
} {
  switch (statusId) {
    case 3:
      return { label: "Accepted", color: "green" };
    case 4:
      return { label: "Wrong Answer", color: "red" };
    case 5:
      return { label: "Time Limit Exceeded", color: "amber" };
    case 6:
      return { label: "Compilation Error", color: "red" };
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
      return { label: "Runtime Error", color: "red" };
    default:
      return { label: "Unknown", color: "slate" };
  }
}
