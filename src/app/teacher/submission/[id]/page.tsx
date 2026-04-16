"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";

interface TestResult {
  testCaseId: string;
  isHidden: boolean;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  time: string;
  status: string;
}

interface VivaResponse {
  id: string;
  studentAnswer: string;
  isCorrect: boolean;
  aiScore: number | null;
  aiFeedback: string | null;
}

interface VivaQuestion {
  id: string;
  question: string;
  type: "MCQ" | "SHORT_ANSWER";
  correctAnswer: string;
  conceptTested: string | null;
  responses: VivaResponse[];
}

interface SubmissionDetail {
  id: string;
  code: string;
  language: string;
  score: number | null;
  vivaScore: number | null;
  finalScore: number | null;
  manualScore: number | null;
  manualNote: string | null;
  status: string;
  flags: string[] | null;
  testResults: TestResult[] | null;
  submittedAt: string;
  student: { id: string; name: string | null; email: string | null };
  assignment: { title: string; description: string; language: string };
  vivaQuestions: VivaQuestion[];
}

export default function TeacherSubmissionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSub(data);
        if (data.manualScore !== null) setOverrideScore(String(data.manualScore));
        if (data.manualNote) setOverrideNote(data.manualNote);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleOverride = async () => {
    setSaving(true);
    await fetch(`/api/submissions/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualScore: overrideScore, note: overrideNote }),
    });
    // Refresh
    const res = await fetch(`/api/submissions/${id}`);
    setSub(await res.json());
    setSaving(false);
  };

  const handleEvaluateViva = async () => {
    setEvaluating(true);
    await fetch("/api/viva/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: id }),
    });
    // Refresh
    const res = await fetch(`/api/submissions/${id}`);
    setSub(await res.json());
    setEvaluating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading submission...
        </div>
      </div>
    );
  }

  if (!sub) {
    return <div className="text-center py-20 text-slate-400">Submission not found.</div>;
  }

  const flags = sub.flags || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-2 inline-block">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{sub.assignment.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            by <strong>{sub.student.name || sub.student.email}</strong> · {new Date(sub.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {flags.map((f) => (
            <span key={f} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded font-semibold">
              🚩 {f === "SUSPICIOUSLY_FAST" ? "Fast Submit" : f === "UNCHANGED_CODE" ? "Unchanged Code" : f}
            </span>
          ))}
        </div>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Code Score", value: sub.score, color: "indigo" },
          { label: "Viva Score", value: sub.vivaScore, color: "purple" },
          { label: "Final Score", value: sub.finalScore, color: "emerald" },
          { label: "Manual Override", value: sub.manualScore, color: "amber" },
        ].map((item) => (
          <div key={item.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{item.label}</p>
            <p className={`text-3xl font-bold mt-1 ${
              item.value !== null && item.value !== undefined
                ? item.value >= 80 ? "text-emerald-600" : item.value >= 50 ? "text-amber-600" : "text-red-600"
                : "text-slate-300"
            }`}>
              {item.value !== null && item.value !== undefined ? Math.round(item.value) : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Student Code */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Student Code</h2>
        <CodeEditor
          code={sub.code}
          onChange={() => {}}
          language={sub.language || "python"}
          readOnly={true}
          height="400px"
        />
      </div>

      {/* Test Case Results */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Test Case Results</h2>
        {sub.testResults && sub.testResults.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Result</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Expected</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actual</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Time</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sub.testResults.map((t, i) => (
                  <tr key={t.testCaseId} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 font-medium">
                      {i + 1} {t.isHidden && <span className="text-xs text-slate-400">(hidden)</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.passed ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">✓ PASS</span>
                      ) : (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">✗ FAIL</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 max-w-[200px] truncate">{t.expectedOutput}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 max-w-[200px] truncate">{t.actualOutput}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.time}s</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
            No test results available.
          </div>
        )}
      </div>

      {/* Viva Q&A */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Viva Q&A</h2>
          {sub.vivaQuestions.length > 0 && sub.vivaScore === null && (
            <button
              onClick={handleEvaluateViva}
              disabled={evaluating}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {evaluating && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {evaluating ? "Evaluating with Claude..." : "Evaluate Viva"}
            </button>
          )}
        </div>
        {sub.vivaQuestions.length > 0 ? (
          <div className="space-y-4">
            {sub.vivaQuestions.map((q, i) => {
              const response = q.responses[0];
              return (
                <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Q{i + 1}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{q.type}</span>
                      {q.conceptTested && (
                        <span className="text-xs text-indigo-500">{q.conceptTested}</span>
                      )}
                    </div>
                    {response?.aiScore !== null && response?.aiScore !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        response.aiScore >= 2 ? "bg-emerald-50 text-emerald-600" :
                        response.aiScore >= 1 ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        Score: {response.aiScore}/{q.type === "MCQ" ? 1 : 2}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-800 mb-3">{q.question}</p>

                  {response ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400 font-semibold mb-1">Student Answer</p>
                        <p className="text-sm text-slate-700">{response.studentAnswer}</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg">
                        <p className="text-xs text-indigo-400 font-semibold mb-1">Expected</p>
                        <p className="text-sm text-indigo-700">{q.correctAnswer}</p>
                      </div>
                      {response.aiFeedback && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-400 font-semibold mb-1">AI Feedback</p>
                          <p className="text-sm text-purple-700">{response.aiFeedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No response submitted yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
            Viva not generated yet.
          </div>
        )}
      </div>

      {/* Manual Override */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Manual Score Override</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Final Score (0–100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={overrideScore}
              onChange={(e) => setOverrideScore(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter score"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Reason for override..."
            />
          </div>
        </div>
        <button
          onClick={handleOverride}
          disabled={saving || !overrideScore}
          className="mt-4 px-6 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Override"}
        </button>
        {sub.manualNote && (
          <p className="mt-2 text-sm text-slate-500">Previous note: {sub.manualNote}</p>
        )}
      </div>
    </div>
  );
}
