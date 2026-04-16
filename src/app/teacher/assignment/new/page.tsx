"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONCEPT_OPTIONS = [
  "arrays", "strings", "loops", "recursion", "sorting", "searching",
  "linked lists", "stacks", "queues", "trees", "graphs", "hash tables",
  "dynamic programming", "greedy algorithms", "time complexity",
  "space complexity", "OOP", "error handling", "file I/O", "regex",
];

export default function NewAssignmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [deadline, setDeadline] = useState("");
  const [courseId, setCourseId] = useState("");
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [peerReviewEnabled, setPeerReviewEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testCasesJson, setTestCasesJson] = useState("");
  const [hints, setHints] = useState("");

  const handleGenerate = async () => {
    if (!courseId) { alert("Enter a Course ID first"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/assignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, concepts: selectedConcepts, courseId, language }),
      });
      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      setStarterCode(data.starterCode || "");
      if (data.testCases) setTestCasesJson(JSON.stringify(data.testCases, null, 2));
      if (data.hints) setHints(data.hints.join("\n"));
    } catch {
      alert("AI generation failed. Try again.");
    }
    setGenerating(false);
  };

  const toggleConcept = (c: string) => {
    setSelectedConcepts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create assignment
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description, starterCode, deadline, courseId, language,
        difficulty, peerReviewEnabled,
        hints: hints ? hints.split("\n").filter(Boolean) : [],
      }),
    });

    if (!res.ok) { alert("Failed to create assignment"); return; }

    const assignment = await res.json();

    // Create test cases if provided
    if (testCasesJson) {
      try {
        const testCases = JSON.parse(testCasesJson);
        for (const tc of testCases) {
          await fetch(`/api/assignments/${assignment.id}/test-cases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tc),
          });
        }
      } catch {
        // Test cases JSON may be invalid
      }
    }

    router.push("/teacher/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Create New Assignment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Generation Panel */}
        <div className="bg-gradient-to-b from-indigo-50 to-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">AI Assistant</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Concepts to Test</label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {CONCEPT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleConcept(c)}
                  className={`text-xs px-2 py-1 rounded-full border transition ${
                    selectedConcepts.includes(c)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? "Generating with Claude..." : "✨ Generate with AI"}
          </button>
        </div>

        {/* Assignment Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course ID</label>
              <input type="text" value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required placeholder="e.g. course_123" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starter Code</label>
            <textarea value={starterCode} onChange={(e) => setStarterCode(e.target.value)} rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none font-mono text-xs focus:ring-2 focus:ring-indigo-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test Cases (JSON)</label>
            <textarea value={testCasesJson} onChange={(e) => setTestCasesJson(e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none font-mono text-xs focus:ring-2 focus:ring-indigo-500"
              placeholder='[{"input":"1 2","expectedOutput":"3","isHidden":false}]' />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hints (one per line)</label>
            <textarea value={hints} onChange={(e) => setHints(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={peerReviewEnabled} onChange={(e) => setPeerReviewEnabled(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4" />
                <span className="text-sm text-slate-700">Enable peer review after deadline</span>
              </label>
            </div>
          </div>

          <button type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
            Create Assignment
          </button>
        </form>
      </div>
    </div>
  );
}
