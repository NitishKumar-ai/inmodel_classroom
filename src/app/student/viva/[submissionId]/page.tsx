"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VivaPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // Fetch generated viva questions
    // In a real app, you might wait for status to be ready
    const fetchQuestions = async () => {
      // Stub: fetch submissions which include viva questions
      // For this scaffold, we'll just mock the question retrieval or fetch from a hypothetical endpoint
      setQuestions([
        { id: "q1", question: "What is the time complexity of your solution?", type: "MCQ", options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"] },
        { id: "q2", question: "Describe how you handled edge cases.", type: "SHORT_ANSWER" },
      ]);
    };
    fetchQuestions();
  }, [submissionId]);

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setFinished(true);
    }
  };

  const handleSubmit = async () => {
    const formattedResponses = Object.entries(answers).map(([qId, answer]) => ({
      vivaQuestionId: qId,
      studentAnswer: answer,
    }));

    await fetch("/api/viva/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, responses: formattedResponses }),
    });

    router.push("/student/dashboard");
  };

  if (questions.length === 0) return <div>Loading viva questions...</div>;

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        {!finished ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm text-slate-400 font-medium">
              <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
              <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 leading-tight">{currentQ.question}</h2>

            <div className="space-y-3">
              {currentQ.type === "MCQ" ? (
                currentQ.options.map((opt: string) => (
                  <label key={opt} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${answers[currentQ.id] === opt ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
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
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                  placeholder="Type your answer here..."
                />
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              {currentIdx < questions.length - 1 ? "Next Question" : "Review Answers"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">All Done!</h2>
            <p className="text-slate-500">You&apos;ve answered all the viva questions. Submit your response to finalize the assignment.</p>
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              Submit Viva
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
