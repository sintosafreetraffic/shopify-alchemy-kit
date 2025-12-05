import { useState } from "react";
import { SleepProfile } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileFormProps {
  email: string;
  existingProfile?: SleepProfile | null;
  onSubmit: (profile: Partial<SleepProfile> & { email: string }) => Promise<SleepProfile | null>;
  loading?: boolean;
}

const PAIN_POINTS = [
  "Neck pain",
  "Shoulder pain",
  "Lower back pain",
  "Hip pain",
  "Headaches",
  "Stiffness",
  "Numbness/tingling",
];

const PRODUCTS = [
  { id: 'ergonomic_pillow', name: 'Ergonomic Pillow', icon: '🛏️' },
  { id: 'knee_pillow', name: 'Knee Pillow', icon: '🦵' },
  { id: 'sleep_mask', name: 'Sleep Mask', icon: '😴' },
];

export const ProfileForm = ({ email, existingProfile, onSubmit, loading }: ProfileFormProps) => {
  const [sleepPosition, setSleepPosition] = useState<string>(existingProfile?.sleep_position || "side");
  const [painPoints, setPainPoints] = useState<string[]>(existingProfile?.pain_points || []);
  const [temperaturePreference, setTemperaturePreference] = useState<string>(existingProfile?.temperature_preference || "neutral");
  const [stressLevel, setStressLevel] = useState<string>(existingProfile?.stress_level || "medium");
  const [wakeUpCondition, setWakeUpCondition] = useState<string>(existingProfile?.wake_up_condition || "neutral");
  const [productsOwned, setProductsOwned] = useState<string[]>(existingProfile?.products_owned || []);
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(existingProfile?.whatsapp_enabled || false);
  const [whatsappPhone, setWhatsappPhone] = useState<string>(existingProfile?.whatsapp_phone || "");

  const handlePainPointToggle = (point: string) => {
    setPainPoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point]
    );
  };

  const handleProductToggle = (productId: string) => {
    setProductsOwned(prev => 
      prev.includes(productId) 
        ? prev.filter(p => p !== productId)
        : [...prev, productId]
    );
  };

  const syncToKlaviyo = async (profileData: Partial<SleepProfile>) => {
    try {
      await supabase.functions.invoke('klaviyo-profile', {
        body: {
          email,
          phone_number: profileData.whatsapp_enabled ? profileData.whatsapp_phone : null,
          whatsapp_enabled: profileData.whatsapp_enabled,
          properties: {
            sleep_position: profileData.sleep_position,
            pain_points: profileData.pain_points,
            temperature_preference: profileData.temperature_preference,
            stress_level: profileData.stress_level,
            wake_up_condition: profileData.wake_up_condition,
            products_owned: profileData.products_owned,
          },
        },
      });
      console.log('Profile synced to Klaviyo');
    } catch (error) {
      console.warn('Failed to sync to Klaviyo:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const profileData = {
      email,
      sleep_position: sleepPosition as any,
      pain_points: painPoints,
      temperature_preference: temperaturePreference as any,
      stress_level: stressLevel as any,
      wake_up_condition: wakeUpCondition as any,
      products_owned: productsOwned,
      whatsapp_enabled: whatsappEnabled,
      whatsapp_phone: whatsappEnabled ? whatsappPhone : null,
    };

    const result = await onSubmit(profileData);
    
    // Sync to Klaviyo after successful save
    if (result) {
      await syncToKlaviyo(profileData);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5 text-primary" />
          {existingProfile ? "Update Profile" : "Create Sleep Profile"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Sleep Position</Label>
            <Select value={sleepPosition} onValueChange={setSleepPosition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="side">🛏️ Side Sleeper</SelectItem>
                <SelectItem value="back">🔙 Back Sleeper</SelectItem>
                <SelectItem value="stomach">⬇️ Stomach Sleeper</SelectItem>
                <SelectItem value="mixed">🔄 Mixed/Changes Position</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Temperature Preference</Label>
            <Select value={temperaturePreference} onValueChange={setTemperaturePreference}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">❄️ Cold (like it cool)</SelectItem>
                <SelectItem value="neutral">😐 Neutral</SelectItem>
                <SelectItem value="warm">🔥 Warm (like it cozy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Stress Level</Label>
            <Select value={stressLevel} onValueChange={setStressLevel}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">😌 Low</SelectItem>
                <SelectItem value="medium">😐 Medium</SelectItem>
                <SelectItem value="high">😰 High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>How do you typically wake up?</Label>
            <Select value={wakeUpCondition} onValueChange={setWakeUpCondition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energized">⚡ Energized</SelectItem>
                <SelectItem value="neutral">😐 Neutral</SelectItem>
                <SelectItem value="tired">😴 Tired</SelectItem>
                <SelectItem value="stiff">🦴 Stiff/Sore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Pain Points (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAIN_POINTS.map(point => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={point}
                    checked={painPoints.includes(point)}
                    onCheckedChange={() => handlePainPointToggle(point)}
                  />
                  <Label htmlFor={point} className="text-sm cursor-pointer">
                    {point}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Products Owned (select all that apply)</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCTS.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => handleProductToggle(product.id)}
                  className={`cursor-pointer flex flex-col items-center p-3 rounded-lg border transition-all ${
                    productsOwned.includes(product.id)
                      ? 'bg-primary/10 border-primary/50 text-foreground'
                      : 'bg-muted/30 border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-1">{product.icon}</span>
                  <span className="text-xs text-center">{product.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <Label htmlFor="whatsapp-toggle" className="font-medium">WhatsApp Updates</Label>
              </div>
              <Switch
                id="whatsapp-toggle"
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Get personalized sleep tips, new product announcements, and exclusive offers via WhatsApp.
            </p>
            {whatsappEnabled && (
              <div>
                <Label htmlFor="whatsapp-phone">WhatsApp Phone Number</Label>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {existingProfile ? "Update Profile" : "Create Profile"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
