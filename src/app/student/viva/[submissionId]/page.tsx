"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface VivaQuestion {
  id: string;
  question: string;
  type: "MCQ" | "SHORT_ANSWER";
  options: string[] | null;
}

export default function VivaPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      // Retry a few times since viva might still be generating
      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch(`/api/viva/questions?submissionId=${submissionId}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
            setLoading(false);
            return;
          }
        } catch {
          // Ignore
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      // If we still don't have questions, set fallback
      setQuestions([]);
      setLoading(false);
    };
    fetchQuestions();
  }, [submissionId]);

  // Auto-advance when timer hits 0
  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setTimer(60);
    } else {
      setFinished(true);
    }
  }, [currentIdx, questions.length]);

  // Timer countdown
  useEffect(() => {
    if (loading || finished || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleNext();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIdx, loading, finished, questions.length, handleNext]);

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const formattedResponses = questions.map((q) => ({
      vivaQuestionId: q.id,
      studentAnswer: answers[q.id] || "(no answer)",
    }));

    try {
      await fetch("/api/viva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, responses: formattedResponses }),
      });
    } catch (e) {
      console.error("Viva submit error:", e);
    }

    router.push("/student/dashboard");
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
          <svg className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-500 font-medium">Generating your viva questions...</p>
          <p className="text-sm text-slate-400 mt-1">This may take a few seconds while Claude analyzes your code.</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
          <p className="text-slate-500">No viva questions were generated. Please contact your instructor.</p>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        {!finished ? (
          <div className="space-y-6">
            {/* Progress & Timer */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400 font-medium">
                QUESTION {currentIdx + 1} OF {questions.length}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-bold tabular-nums ${timer <= 10 ? "text-red-500" : "text-slate-500"}`}>
                  {timer}s
                </span>
              </div>
            </div>

            {/* Timer bar */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${timer <= 10 ? "bg-red-500" : "bg-indigo-400"}`}
                style={{ width: `${(timer / 60) * 100}%` }}
              />
            </div>

            {/* Question */}
            <h2 className="text-lg font-bold text-slate-800 leading-snug">{currentQ.question}</h2>

            {/* Answer input */}
            <div className="space-y-3">
              {currentQ.type === "MCQ" && currentQ.options ? (
                currentQ.options.map((opt: string) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${
                      answers[currentQ.id] === opt
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQ.id}
                      value={opt}
                      checked={answers[currentQ.id] === opt}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">{opt}</span>
                  </label>
                ))
              ) : (
                <textarea
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-none"
                  placeholder="Type your answer here..."
                />
              )}
            </div>

            {/* Next button */}
            <button
              onClick={() => {
                handleNext();
                setTimer(60);
              }}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
            >
              {currentIdx < questions.length - 1 ? "Next Question →" : "Finish"}
            </button>
          </div>
        ) : (
          /* Completion screen */
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Viva Complete</h2>
            <p className="text-slate-500">
              Your answers have been recorded. Results will be reviewed by your teacher.
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? "Submitting..." : "Submit Viva"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
