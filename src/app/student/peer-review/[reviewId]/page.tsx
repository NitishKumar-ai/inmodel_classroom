"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";

interface RubricItem {
  criterion: string;
  maxScore: number;
}

interface ReviewDetail {
  id: string;
  code: string;
  language: string;
  assignmentTitle: string;
  assignmentDescription: string;
  rubric: RubricItem[];
  scores: { criterion: string; score: number }[] | null;
  comments: string | null;
  completed: boolean;
}

export default function PeerReviewPage() {
  const { reviewId } = useParams();
  const router = useRouter();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/peer-review/${reviewId}`)
      .then((r) => r.json())
      .then((d) => {
        setReview(d);
        if (d.scores) {
          const sMap: Record<string, number> = {};
          d.scores.forEach((s: any) => (sMap[s.criterion] = s.score));
          setScores(sMap);
        }
        if (d.comments) setComments(d.comments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reviewId]);

  const handleSubmit = async () => {
    if (!review) return;
    setSubmitting(true);
    
    // Prepare scores array
    const scoresArray = review.rubric.map((r) => ({
      criterion: r.criterion,
      score: scores[r.criterion] || 0,
      maxScore: r.maxScore,
    }));

    try {
      await fetch("/api/peer-review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, scores: scoresArray, comments }),
      });
      router.push("/student/dashboard");
    } catch {
      alert("Submission failed");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading peer review...</div>;
  if (!review) return <div className="text-center py-20 text-slate-400">Review not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Peer Review: {review.assignmentTitle}</h1>
          <p className="text-sm text-slate-500">Provide constructive feedback to your classmate (Identity Hidden)</p>
        </div>
        {!review.completed && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code View */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Code</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{review.language}</span>
            </div>
            <CodeEditor
              code={review.code}
              onChange={() => {}}
              language={review.language}
              readOnly
              height="500px"
            />
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Assignment Prompt</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{review.assignmentDescription}</p>
          </div>
        </div>

        {/* Rubric Fill */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-4">Evaluation Rubric</h2>
            
            <div className="space-y-8">
              {review.rubric.map((item) => (
                <div key={item.criterion} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="font-semibold text-slate-700">{item.criterion}</label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {scores[item.criterion] || 0} / {item.maxScore}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={item.maxScore}
                    step="1"
                    value={scores[item.criterion] || 0}
                    onChange={(e) => setScores({ ...scores, [item.criterion]: parseInt(e.target.value) })}
                    disabled={review.completed}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="font-semibold text-slate-700 block">Constructive Comments</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="What did they do well? What could be improved? (Be respectful)"
                rows={6}
                disabled={review.completed}
                className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-300"
              />
            </div>
          </div>

          {review.completed && (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
              <div className="text-3xl">✅</div>
              <div>
                <p className="font-bold text-emerald-800">Review Completed</p>
                <p className="text-sm text-emerald-600">Your feedback has been submitted anonymously.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
