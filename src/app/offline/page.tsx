"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="text-6xl">📡</div>
      <h1 className="text-3xl font-bold text-slate-800">You&apos;re currently offline</h1>
      <p className="text-slate-500 max-w-md">
        Don&apos;t worry! You can still work on your code. We&apos;ll try to reconnect and save your progress as soon as you&apos;re back online.
      </p>
      <button
        onClick={() => typeof window !== "undefined" && window.location.reload()}
        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
      >
        Try Reloading
      </button>
    </div>
  );
}
