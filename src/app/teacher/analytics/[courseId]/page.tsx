"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AssignmentMetric {
  assignmentId: string;
  title: string;
  avgScore: number;
  passRate: number;
  distribution: number[];
  avgTimeMinutes: number;
  vivaDropOffRate: number;
  totalSubmissions: number;
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  avgScore: number;
  trend: "up" | "down" | "stable";
  atRisk: boolean;
  suspicious: boolean;
}

interface ConceptCell {
  concept: string;
  correctRate: number;
  totalQuestions: number;
}

export default function TeacherAnalyticsPage() {
  const { courseId } = useParams();
  const [metrics, setMetrics] = useState<AssignmentMetric[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [concepts, setConcepts] = useState<ConceptCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analytics/course/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setMetrics(data.assignmentMetrics || []);
        setStudents(data.studentMetrics || []);
        setConcepts(data.conceptHeatmap || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading analytics...
        </div>
      </div>
    );
  }

  const selected = metrics.find((m) => m.assignmentId === selectedAssignment) || metrics[0];
  const distData = selected
    ? [
        { range: "0-20", count: selected.distribution[0] },
        { range: "20-40", count: selected.distribution[1] },
        { range: "40-60", count: selected.distribution[2] },
        { range: "60-80", count: selected.distribution[3] },
        { range: "80-100", count: selected.distribution[4] },
      ]
    : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Course Analytics</h1>

      {/* Assignment Selector */}
      {metrics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {metrics.map((m) => (
            <button
              key={m.assignmentId}
              onClick={() => setSelectedAssignment(m.assignmentId)}
              className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap border transition ${
                (selectedAssignment || metrics[0]?.assignmentId) === m.assignmentId
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
              }`}
            >
              {m.title}
            </button>
          ))}
        </div>
      )}

      {/* Assignment Metrics Cards */}
      {selected && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Avg Score", value: `${selected.avgScore}%`, color: selected.avgScore >= 60 ? "text-emerald-600" : "text-red-600" },
            { label: "Pass Rate", value: `${selected.passRate}%`, color: selected.passRate >= 60 ? "text-emerald-600" : "text-red-600" },
            { label: "Submissions", value: String(selected.totalSubmissions), color: "text-slate-700" },
            { label: "Avg Time", value: `${selected.avgTimeMinutes}m`, color: "text-slate-700" },
            { label: "Viva Drop-off", value: `${selected.vivaDropOffRate}%`, color: selected.vivaDropOffRate > 20 ? "text-amber-600" : "text-slate-700" },
          ].map((card) => (
            <div key={card.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Score Distribution */}
      {distData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Concept Heatmap */}
      {concepts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Concept Weakness Heatmap</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {concepts.map((c) => {
              let bgColor = "bg-emerald-100 text-emerald-800";
              if (c.correctRate < 40) bgColor = "bg-red-100 text-red-800";
              else if (c.correctRate < 70) bgColor = "bg-amber-100 text-amber-800";
              return (
                <div key={c.concept} className={`p-3 rounded-lg text-center ${bgColor}`}>
                  <p className="text-sm font-semibold capitalize">{c.concept}</p>
                  <p className="text-xl font-bold">{c.correctRate}%</p>
                  <p className="text-xs opacity-70">{c.totalQuestions} Q&apos;s</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Student Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Avg Score</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Trend</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${s.avgScore >= 60 ? "text-emerald-600" : s.avgScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                      {s.avgScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-lg">
                    {s.trend === "up" ? "📈" : s.trend === "down" ? "📉" : "➡️"}
                  </td>
                  <td className="px-4 py-3 text-center space-x-1">
                    {s.atRisk && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-semibold">
                        At Risk
                      </span>
                    )}
                    {s.suspicious && (
                      <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded font-semibold" title="High code score, low viva score">
                        ⚠ Suspicious
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {metrics.length === 0 && (
        <div className="py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          No analytics data yet. Assignments need submissions to generate analytics.
        </div>
      )}
    </div>
  );
}
