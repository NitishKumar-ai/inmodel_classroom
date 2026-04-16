"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

export default function CodeEditor({
  code,
  onChange,
  language = "python",
  readOnly = false,
  height = "500px",
}: CodeEditorProps) {
  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-white`} style={{ height }}>
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={onChange}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          readOnly,
        }}
      />
    </div>
  );
}
