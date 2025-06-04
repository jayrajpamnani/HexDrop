import { Progress } from "./ui/progress";

export function ProgressTracker({ progress, label }: { progress: number; label?: string }) {
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-sm text-gray-600">{label}</div>}
      <Progress value={progress} />
      <div className="text-xs text-gray-500 mt-1">{progress}%</div>
    </div>
  );
} 