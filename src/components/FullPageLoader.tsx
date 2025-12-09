import { Loader2 } from "lucide-react";

export const FullPageLoader = () => {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};
