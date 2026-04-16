"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

interface ScoreTrend {
  assignment: string;
  score: number;
  date: string;
}

interface ConceptPerformance {
  concept: string;
  score: number;
}

interface WeakestConcept {
  concept: string;
  score: number;
  suggestion: string;
}

interface ProgressData {
  scoreTrend: ScoreTrend[];
  conceptPerformance: ConceptPerformance[];
  streak: number;
  weakestConcept: WeakestConcept | null;
}

export default function StudentProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/student/progress")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-400 font-medium">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing your progress...
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-slate-400">No progress data available yet.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Progress</h1>
          <p className="text-slate-500 font-medium">Keep track of your learning journey</p>
        </div>
        <div className="bg-orange-50 px-6 py-3 rounded-2xl border border-orange-100 flex items-center gap-3 shadow-sm">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Current Streak</p>
            <p className="text-2xl font-black text-slate-800">{data.streak} Assignments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold">📈</div>
            <h2 className="text-xl font-bold text-slate-800">Score History</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="assignment" hide />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concept Radar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold">🕸️</div>
            <h2 className="text-xl font-bold text-slate-800">Concept Mastery</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.conceptPerformance}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="concept" tick={{ fontSize: 12, fontWeight: 500, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar
                  name="Mastery"
                  dataKey="score"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weakest Concept & Study Suggestion */}
      {data.weakestConcept && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  AI Personal Suggestion
                </span>
              </div>
              <h3 className="text-3xl font-black">
                Mastering <span className="text-indigo-200 capitalize">{data.weakestConcept.concept}</span>
              </h3>
              <p className="text-indigo-50 text-lg leading-relaxed font-medium">
                {data.weakestConcept.suggestion}
              </p>
            </div>
            <div className="w-full md:w-48 aspect-square bg-white/10 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center border border-white/20 shadow-inner">
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Current Proficiency</p>
              <p className="text-6xl font-black">{data.weakestConcept.score}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
