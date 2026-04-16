"use client";

import { useEffect, useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { useParams, useRouter } from "next/navigation";
import OfflineBanner from "@/components/OfflineBanner";

interface Assignment {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  language: string;
}

interface RunResult {
  stdout: string;
  stderr: string;
  status: string;
  statusId: number;
  time: string;
  memory: number;
}

const LANGUAGES = [
  { value: "python", label: "Python 3", monacoId: "python" },
  { value: "javascript", label: "JavaScript", monacoId: "javascript" },
  { value: "java", label: "Java", monacoId: "java" },
  { value: "cpp", label: "C++ (GCC)", monacoId: "cpp" },
];

function StatusBadge({ statusId }: { statusId: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    3: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    4: { label: "Wrong Answer", cls: "bg-red-50 text-red-700 border-red-200" },
    5: { label: "Time Limit Exceeded", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    6: { label: "Compilation Error", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const info = map[statusId] || { label: "Runtime Error", cls: "bg-red-50 text-red-700 border-red-200" };
  if (statusId < 3) return null;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${info.cls}`}>
      {info.label}
    </span>
  );
}

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [stdin, setStdin] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setAssignment(data);
        setCode(data.starterCode);
        setLanguage(data.language || "python");
      });
  }, [id]);

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const data: RunResult = await res.json();
      setRunResult(data);
    } catch {
      setRunResult({
        stdout: "",
        stderr: "Network error — could not reach execution server.",
        status: "Internal Error",
        statusId: 13,
        time: "0",
        memory: 0,
      });
    }
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!confirm("Submit your code? This will run it against all test cases and start your viva.")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: id, code, language }),
      });
      const data = await res.json();
      router.push(`/student/viva/${data.id}`);
    } catch {
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.value === language);

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading assignment...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineBanner />
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{assignment.title}</h1>
        <p className="text-slate-600 mt-2 text-sm leading-relaxed">{assignment.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Language selector + actions */}
          <div className="flex items-center justify-between">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isRunning && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isRunning ? "Running..." : "▶ Run"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          <CodeEditor
            code={code}
            onChange={(val) => setCode(val || "")}
            language={currentLang?.monacoId || "python"}
          />

          {/* Stdin input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Standard Input (stdin)
            </label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
              placeholder="Enter input for your program..."
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-sm overflow-y-auto max-h-[680px] shadow-lg border border-slate-800 flex flex-col">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Output</span>
            <div className="flex items-center gap-2">
              {runResult && <StatusBadge statusId={runResult.statusId} />}
              <button
                onClick={() => setRunResult(null)}
                className="text-xs text-slate-500 hover:text-white transition"
              >
                Clear
              </button>
            </div>
          </div>

          {runResult ? (
            <div className="space-y-3 flex-1">
              {runResult.stdout && (
                <div>
                  <span className="text-xs text-emerald-500 font-semibold">stdout</span>
                  <pre className="whitespace-pre-wrap mt-1 text-slate-200">{runResult.stdout}</pre>
                </div>
              )}
              {runResult.stderr && (
                <div>
                  <span className="text-xs text-red-400 font-semibold">stderr</span>
                  <pre className="whitespace-pre-wrap mt-1 text-red-300">{runResult.stderr}</pre>
                </div>
              )}
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-700 flex gap-4">
                <span>Time: {runResult.time}s</span>
                <span>Memory: {Math.round(runResult.memory / 1024)} KB</span>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-slate-500 flex-1 flex items-center justify-center">
              {isRunning ? "⏳ Executing..." : "Click ▶ Run to see output"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
