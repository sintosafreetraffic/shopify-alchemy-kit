import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, Copy, Check } from "lucide-react";

interface WhatsAppSimulatorProps {
  onSimulate: () => Promise<{ message: string; messageType: string } | null>;
  loading?: boolean;
}

export const WhatsAppSimulator = ({ onSimulate, loading }: WhatsAppSimulatorProps) => {
  const [result, setResult] = useState<{ message: string; messageType: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSimulate = async () => {
    const data = await onSimulate();
    if (data) {
      setResult(data);
    }
  };

  const handleCopy = async () => {
    if (result?.message) {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const messageTypeLabels: Record<string, { label: string; color: string }> = {
    inactivity_reminder: { label: "Inactivity Reminder", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
    streak_celebration: { label: "Streak Celebration", color: "bg-green-500/20 text-green-700 border-green-500/30" },
    improvement_acknowledgment: { label: "Improvement", color: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
    decline_support: { label: "Support", color: "bg-purple-500/20 text-purple-700 border-purple-500/30" },
    pain_followup: { label: "Pain Follow-up", color: "bg-red-500/20 text-red-700 border-red-500/30" },
    morning_checkin: { label: "Morning Check-in", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
    general_tip: { label: "General Tip", color: "bg-gray-500/20 text-gray-700 border-gray-500/30" },
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-green-500" />
          WhatsApp Coach Simulator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Simulate what WhatsApp message the AI coach would send to this user based on their sleep data and engagement patterns.
        </p>

        <Button onClick={handleSimulate} disabled={loading} className="w-full mb-4">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Message...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Simulate WhatsApp Message
            </>
          )}
        </Button>

        {result && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge 
                variant="outline" 
                className={messageTypeLabels[result.messageType]?.color || ""}
              >
                {messageTypeLabels[result.messageType]?.label || result.messageType}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{result.message}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
