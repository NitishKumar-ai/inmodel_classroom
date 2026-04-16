"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

export default function CodeEditor({ code, onChange, language = "python" }: CodeEditorProps) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-white h-[500px]">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={code}
        onChange={onChange}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
