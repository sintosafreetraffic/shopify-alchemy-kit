import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bed, Moon, Users, Shirt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EnvironmentProfile {
  mattress_thickness: string;
  mattress_firmness: string;
  bed_height: string;
  co_sleeping: string;
  bedding_material: string;
  pillow_type: string;
}

interface SleepSetupFormProps {
  email: string;
  initialValues?: Partial<EnvironmentProfile>;
  onSave?: () => void;
}

const MATTRESS_THICKNESS_OPTIONS = [
  { value: 'thin', label: 'Thin (< 8")' },
  { value: 'medium', label: 'Medium (8-12")' },
  { value: 'thick', label: 'Thick (> 12")' },
];

const MATTRESS_FIRMNESS_OPTIONS = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'firm', label: 'Firm' },
];

const BED_HEIGHT_OPTIONS = [
  { value: 'low', label: 'Low (floor/platform)' },
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High (raised)' },
];

const CO_SLEEPING_OPTIONS = [
  { value: 'alone', label: 'Alone' },
  { value: 'partner', label: 'With partner' },
  { value: 'pet', label: 'With pet' },
  { value: 'both', label: 'Partner + pet' },
];

const BEDDING_MATERIAL_OPTIONS = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'bamboo', label: 'Bamboo' },
  { value: 'silk', label: 'Silk' },
  { value: 'synthetic', label: 'Synthetic/Polyester' },
];

const PILLOW_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard pillow' },
  { value: 'memory_foam', label: 'Memory foam' },
  { value: 'contour', label: 'Contour/Ergonomic' },
  { value: 'down', label: 'Down/Feather' },
];

export function SleepSetupForm({ email, initialValues, onSave }: SleepSetupFormProps) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<EnvironmentProfile>({
    mattress_thickness: initialValues?.mattress_thickness || 'medium',
    mattress_firmness: initialValues?.mattress_firmness || 'medium',
    bed_height: initialValues?.bed_height || 'standard',
    co_sleeping: initialValues?.co_sleeping || 'alone',
    bedding_material: initialValues?.bedding_material || 'cotton',
    pillow_type: initialValues?.pillow_type || 'standard',
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setValues(prev => ({
        mattress_thickness: initialValues.mattress_thickness || prev.mattress_thickness,
        mattress_firmness: initialValues.mattress_firmness || prev.mattress_firmness,
        bed_height: initialValues.bed_height || prev.bed_height,
        co_sleeping: initialValues.co_sleeping || prev.co_sleeping,
        bedding_material: initialValues.bedding_material || prev.bedding_material,
        pillow_type: initialValues.pillow_type || prev.pillow_type,
      }));
    }
  }, [initialValues]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile with environment fields
      const { error: updateError } = await supabase
        .from('sleep_profiles')
        .update({
          ...values,
          environment_updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (updateError) throw updateError;

      // Trigger Sleep Sync with setup_update source (includes email)
      try {
        const { error: syncError } = await supabase.functions.invoke('sleep-attributes-sync', {
          body: { source: 'setup_update', email },
        });
        if (syncError) {
          console.error('Sleep Sync error:', syncError);
        }
      } catch (syncErr) {
        console.error('Sleep Sync invoke error:', syncErr);
      }

      toast.success('Sleep setup saved successfully');
      onSave?.();
    } catch (error: unknown) {
      console.error('Save error:', error);
      toast.error('Failed to save sleep setup');
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (field: keyof EnvironmentProfile, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="h-5 w-5" />
          Sleep Setup
        </CardTitle>
        <CardDescription>
          Tell us about your sleep environment. This helps personalize your sleep plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mattress Section */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Mattress
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mattress Thickness</Label>
              <Select
                value={values.mattress_thickness}
                onValueChange={(v) => updateValue('mattress_thickness', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATTRESS_THICKNESS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mattress Firmness</Label>
              <Select
                value={values.mattress_firmness}
                onValueChange={(v) => updateValue('mattress_firmness', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATTRESS_FIRMNESS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bed & Sleeping */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bed & Sleeping Arrangement
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bed Height</Label>
              <Select
                value={values.bed_height}
                onValueChange={(v) => updateValue('bed_height', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BED_HEIGHT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sleep With</Label>
              <Select
                value={values.co_sleeping}
                onValueChange={(v) => updateValue('co_sleeping', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CO_SLEEPING_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bedding */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Bedding & Pillow
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bedding Material</Label>
              <Select
                value={values.bedding_material}
                onValueChange={(v) => updateValue('bedding_material', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEDDING_MATERIAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Pillow Type</Label>
              <Select
                value={values.pillow_type}
                onValueChange={(v) => updateValue('pillow_type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PILLOW_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving & Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Save Sleep Setup
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
