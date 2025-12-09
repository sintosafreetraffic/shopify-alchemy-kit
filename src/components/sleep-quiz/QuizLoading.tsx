import { memo } from "react";
import { Loader2, Moon } from "lucide-react";

export const QuizLoading = memo(function QuizLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <Moon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-lg font-semibold mt-6">Analyzing your sleep profile...</p>
      <p className="text-sm text-muted-foreground mt-2">
        Creating personalized recommendations based on your answers
      </p>
    </div>
  );
});
