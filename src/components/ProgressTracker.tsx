import { Progress } from "./ui/progress";

interface ProgressTrackerProps {
  progress: number;
  label?: string;
}

export function ProgressTracker({ progress, label }: ProgressTrackerProps) {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-sm text-gray-600">{label}</div>}
      <Progress value={normalizedProgress} />
      <div className="text-xs text-gray-500 mt-1">{Math.round(normalizedProgress)}%</div>
    </div>
  );
} 