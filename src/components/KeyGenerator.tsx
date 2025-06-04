"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";

interface KeyGeneratorProps {
  keyValue: string;
  className?: string;
  showCopyButton?: boolean;
  onCopy?: (success: boolean) => void;
}

export function KeyGenerator({
  keyValue,
  className,
  showCopyButton = true,
  onCopy,
}: KeyGeneratorProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      setError(null);
      onCopy?.(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy key:", error);
      setError("Failed to copy key");
      onCopy?.(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <code className="font-mono text-lg break-all">{keyValue}</code>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "bg-destructive/10 text-destructive hover:bg-destructive/20"
          )}
          disabled={copied}
          aria-label={copied ? "Key copied" : "Copy key to clipboard"}
          title={error || (copied ? "Key copied" : "Copy key to clipboard")}
        >
          {copied ? (
            <>
              <CheckIcon className="size-4" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="size-4" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
} 