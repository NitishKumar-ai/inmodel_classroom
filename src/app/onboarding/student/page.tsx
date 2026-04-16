"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function StudentOnboarding() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
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

      // 2. Mark onboarding complete
      await fetch("/api/onboarding/complete", { method: "POST" });
      
      // Update session
      await update();
      
      router.push("/student/dashboard");
    } catch {
      alert("Setup failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8 space-y-8">
        <div className="text-center">
          <div className="inline-block p-3 bg-purple-50 rounded-2xl mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Welcome to Class!</h1>
          <p className="text-slate-500 font-medium">Let&apos;s get you ready for your coding journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">What should we call you?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
              placeholder="e.g. Alex Rivera"
              required
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pro Tip</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your instructor will see this name on your submissions. Use your real name for grading purposes.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 transition shadow-lg shadow-purple-100 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? "Readying..." : "Go to Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
