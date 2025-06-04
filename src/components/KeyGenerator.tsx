"use client";

import { useState } from "react";

export function KeyGenerator({ keyValue }: { keyValue: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg">{keyValue}</span>
      <button
        onClick={handleCopy}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
} 