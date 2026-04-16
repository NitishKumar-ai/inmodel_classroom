"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function TeacherOnboarding() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update name
      await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      // 2. Create first course
      if (courseTitle) {
        await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: courseTitle }),
        });
      }

      // 3. Mark onboarding complete
      await fetch("/api/onboarding/complete", { method: "POST" });
      
      // Update session to reflect name change and onboarding status
      await update();
      
      router.push("/teacher/dashboard");
    } catch {
      alert("Setup failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8 space-y-8">
        <div className="text-center">
          <div className="inline-block p-3 bg-indigo-50 rounded-2xl mb-4">
            <span className="text-3xl">👨‍🏫</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Welcome, Professor!</h1>
          <p className="text-slate-500 font-medium">Let&apos;s set up your classroom</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Your Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              placeholder="Dr. Jordan Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">First Course Name</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              placeholder="e.g. Intro to Computer Science"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? "Starting..." : "Start Teaching →"}
          </button>
        </form>
      </div>
    </div>
  );
}
