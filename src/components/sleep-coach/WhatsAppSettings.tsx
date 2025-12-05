import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell, Gift, Sparkles, TrendingUp } from "lucide-react";

interface WhatsAppSettingsProps {
  whatsappEnabled?: boolean;
  whatsappPhone?: string | null;
}

export const WhatsAppSettings = ({ whatsappEnabled, whatsappPhone }: WhatsAppSettingsProps) => {
  const messageTypes = [
    { icon: TrendingUp, label: "Sleep Tips", description: "Personalized advice based on your sleep data" },
    { icon: Sparkles, label: "New Products", description: "Be the first to know about new releases" },
    { icon: Gift, label: "Exclusive Offers", description: "Special discounts just for you" },
    { icon: Bell, label: "Plan Reminders", description: "Morning & evening sleep routine reminders" },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-green-500" />
          WhatsApp Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Status</span>
          <Badge 
            variant="outline" 
            className={whatsappEnabled 
              ? "bg-green-500/20 text-green-700 border-green-500/30" 
              : "bg-gray-500/20 text-gray-700 border-gray-500/30"
            }
          >
            {whatsappEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {whatsappEnabled && whatsappPhone && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium">Phone Number</span>
            <span className="text-sm text-muted-foreground">{whatsappPhone}</span>
          </div>
        )}

        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-3">
            {whatsappEnabled 
              ? "You'll receive the following types of messages:" 
              : "Enable WhatsApp in your profile to receive:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {messageTypes.map((type) => (
              <div 
                key={type.label} 
                className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
                  whatsappEnabled 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30' 
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
              >
                <type.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${whatsappEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs font-medium">{type.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!whatsappEnabled && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Update your profile on the right to enable WhatsApp updates →
          </p>
        )}
      </CardContent>
    </Card>
  );
};