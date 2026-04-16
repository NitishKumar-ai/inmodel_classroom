"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";

interface FlaggedSubmission {
  id: string;
  code: string;
  language: string;
  plagiarismFlags: { type: string; matchedSubmissionId?: string; similarity?: number }[];
  student: { name: string | null; email: string | null };
  status: string;
}

export default function PlagiarismPage() {
  const { assignmentId } = useParams();
  const [submissions, setSubmissions] = useState<FlaggedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FlaggedSubmission | null>(null);
  const [matchedCode, setMatchedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/plagiarism/${assignmentId}`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignmentId]);

  const viewDiff = async (sub: FlaggedSubmission) => {
    setSelected(sub);
    const nearMatch = sub.plagiarismFlags.find((f) => f.matchedSubmissionId);
    if (nearMatch?.matchedSubmissionId) {
      const res = await fetch(`/api/submissions/${nearMatch.matchedSubmissionId}`);
      const data = await res.json();
      setMatchedCode(data.code || null);
    } else {
      setMatchedCode(null);
    }
  };

  const handleAction = async (submissionId: string, action: "mark" | "clear") => {
    await fetch(`/api/submissions/${submissionId}/plagiarism`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: action === "clear" ? "Reviewed and cleared" : undefined }),
    });
    // Refresh
    const res = await fetch(`/api/plagiarism/${assignmentId}`);
    setSubmissions(await res.json());
    setSelected(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Plagiarism Review</h1>

      {submissions.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          No plagiarism flags detected for this assignment.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flagged list */}
          <div className="space-y-3">
            {submissions.map((sub) => (
              <button
                key={sub.id}
                onClick={() => viewDiff(sub)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selected?.id === sub.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="font-medium text-slate-800">{sub.student.name || sub.student.email}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sub.plagiarismFlags.map((f, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded">
                      {f.type}
                      {f.similarity ? ` (${Math.round(f.similarity * 100)}%)` : ""}
                    </span>
                  ))}
                </div>
                <span className={`text-xs mt-2 inline-block ${sub.status === "PLAGIARIZED" ? "text-red-500" : "text-slate-400"}`}>
                  Status: {sub.status}
                </span>
              </button>
            ))}
          </div>

          {/* Code comparison */}
          <div className="lg:col-span-2 space-y-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {selected.student.name || selected.student.email}&apos;s Code
                  </h2>
                  <div className="flex gap-2">
                    {selected.status !== "PLAGIARIZED" && (
                      <button
                        onClick={() => handleAction(selected.id, "mark")}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                      >
                        🚫 Mark Plagiarized
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(selected.id, "clear")}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
                    >
                      ✓ Clear Flag
                    </button>
                  </div>
                </div>

                <div className={matchedCode ? "grid grid-cols-2 gap-3" : ""}>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1 uppercase">Submission</p>
                    <CodeEditor
                      code={selected.code}
                      onChange={() => {}}
                      language={selected.language}
                      readOnly
                      height="350px"
                    />
                  </div>
                  {matchedCode && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1 uppercase">Matched Submission</p>
                      <CodeEditor
                        code={matchedCode}
                        onChange={() => {}}
                        language={selected.language}
                        readOnly
                        height="350px"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Select a flagged submission to review
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
