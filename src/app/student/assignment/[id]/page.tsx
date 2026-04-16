"use client";

import { useEffect, useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { useParams, useRouter } from "next/navigation";

interface Assignment {
  id: string;
  title: string;
  description: string;
  starterCode: string;
}

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setAssignment(data);
        setCode(data.starterCode);
      });
  }, [id]);

  const handleRun = async () => {
    setIsRunning(true);
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: "python", input: "" }),
    });
    const data = await res.json();
    setOutput(data.output);
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: id, code }),
    });
    const data = await res.json();
    
    // Generate Viva after submission
    await fetch("/api/viva/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: data.id }),
    });

    router.push(`/student/viva/${data.id}`);
  };

  if (!assignment) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">{assignment.title}</h1>
        <p className="text-slate-600 mt-2">{assignment.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <CodeEditor code={code} onChange={(val) => setCode(val || "")} />
          
          <div className="flex gap-4">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition flex items-center gap-2"
            >
              {isRunning ? "Running..." : "Run Code"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Assignment"}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-300 p-6 rounded-xl font-mono text-sm overflow-y-auto max-h-[500px] shadow-lg border border-slate-800">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Terminal Output</span>
            <button onClick={() => setOutput("")} className="text-xs hover:text-white">Clear</button>
          </div>
          <pre className="whitespace-pre-wrap">{output || "> Compiling...\n> Waiting for run command..."}</pre>
        </div>
      </div>
    </div>
  );
}
