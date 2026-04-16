"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function ExportPage() {
  const { courseId } = useParams();
  const [downloading, setDownloading] = useState(false);

  const handleCSV = async () => {
    setDownloading(true);
    const res = await fetch(`/api/export/${courseId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `course_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Export Course Report</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto text-2xl">
            📊
          </div>
          <h2 className="text-lg font-semibold text-slate-800">CSV Export</h2>
          <p className="text-sm text-slate-500">Download student scores, viva results, and plagiarism flags as a spreadsheet.</p>
          <button
            onClick={handleCSV}
            disabled={downloading}
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "Download CSV"}
          </button>
        </div>

        {/* PDF Export info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto text-2xl">
            📄
          </div>
          <h2 className="text-lg font-semibold text-slate-800">PDF Report</h2>
          <p className="text-sm text-slate-500">Generate a formatted course report card with per-student breakdowns.</p>
          <button
            onClick={handleCSV}
            disabled={downloading}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
