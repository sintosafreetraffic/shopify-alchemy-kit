/**
 * Create Test Dialog - For creating new A/B tests with zone validation
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Beaker } from 'lucide-react';
import {
  type ImpactZone,
  createTest,
  checkZoneConflicts,
  POWER_ZONES,
} from '@/lib/abExperimentation';

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateTestDialog({ open, onOpenChange, onCreated }: CreateTestDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [impactZone, setImpactZone] = useState<ImpactZone>('hero');
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [minSampleSize, setMinSampleSize] = useState(300);
  const [creating, setCreating] = useState(false);
  const [conflict, setConflict] = useState<{ hasConflict: boolean; conflictingTests: string[] }>({ 
    hasConflict: false, 
    conflictingTests: [] 
  });

  // Check for zone conflicts when impact zone changes
  useEffect(() => {
    const checkConflicts = async () => {
      const result = await checkZoneConflicts(impactZone);
      setConflict(result);
    };
    if (open) {
      checkConflicts();
    }
  }, [impactZone, open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setCreating(true);
    const test = await createTest({
      name: name.trim(),
      description: description.trim() || undefined,
      impact_zone: impactZone,
      power_zone_weight: POWER_ZONES[impactZone].weight,
      traffic_split: trafficSplit,
      min_sample_size: minSampleSize,
      variant_a_config: {},
      variant_b_config: {},
    });

    if (test) {
      onCreated();
      onOpenChange(false);
      resetForm();
    }
    setCreating(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setImpactZone('hero');
    setTrafficSplit(50);
    setMinSampleSize(300);
  };

  const zoneConfig = POWER_ZONES[impactZone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Track Experiment
          </DialogTitle>
          <DialogDescription>
            Register an experiment for measurement and decision-making.
            Page changes are implemented in code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Test Name</Label>
            <Input
              id="name"
              placeholder="e.g., Hero CTA Button Color"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What are you testing and why?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Impact Zone */}
          <div className="space-y-2">
            <Label>Impact Zone</Label>
            <Select value={impactZone} onValueChange={v => setImpactZone(v as ImpactZone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">
                  <span className="flex items-center gap-2">
                    Hero / First Fold
                    <Badge variant="secondary" className="text-xs">70%</Badge>
                  </span>
                </SelectItem>
                <SelectItem value="price_cta">
                  <span className="flex items-center gap-2">
                    Price / CTA / Benefits
                    <Badge variant="default" className="text-xs">100%</Badge>
                  </span>
                </SelectItem>
                <SelectItem value="urgency_social">
                  <span className="flex items-center gap-2">
                    Urgency / Social Proof
                    <Badge variant="default" className="text-xs">90%</Badge>
                  </span>
                </SelectItem>
                <SelectItem value="other">
                  <span className="flex items-center gap-2">
                    Other
                    <Badge variant="secondary" className="text-xs">50%</Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Power weight: {(zoneConfig.weight * 100).toFixed(0)}% • 
              Max concurrent: {zoneConfig.maxConcurrent} • 
              {zoneConfig.exclusive ? 'Exclusive zone' : 'Can overlap'}
            </p>
          </div>

          {/* Zone conflict warning */}
          {conflict.hasConflict && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Zone Conflict Detected
                </p>
                <p className="text-xs text-muted-foreground">
                  Conflicts with: {conflict.conflictingTests.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete or pause the conflicting test first.
                </p>
              </div>
            </div>
          )}

          {/* Traffic Split */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Traffic Split (A/B)</Label>
              <span className="text-sm font-medium">
                {100 - trafficSplit}% / {trafficSplit}%
              </span>
            </div>
            <Slider
              value={[trafficSplit]}
              onValueChange={v => setTrafficSplit(v[0])}
              min={10}
              max={90}
              step={10}
            />
            <div className="h-4 w-full rounded overflow-hidden flex">
              <div 
                className="bg-muted transition-all" 
                style={{ width: `${100 - trafficSplit}%` }} 
              />
              <div 
                className="bg-primary transition-all" 
                style={{ width: `${trafficSplit}%` }} 
              />
            </div>
          </div>

          {/* Min Sample Size */}
          <div className="space-y-2">
            <Label htmlFor="minSample">Minimum Sample Size (per variant)</Label>
            <Select 
              value={String(minSampleSize)} 
              onValueChange={v => setMinSampleSize(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300 (default)</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
                <SelectItem value="2000">2,000</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              No significance calculations until this threshold is reached
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || creating || conflict.hasConflict}
          >
            {creating ? 'Registering...' : 'Track Experiment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
