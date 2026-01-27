/**
 * End Test Dialog - Archive current test and optionally start a new one
 * 
 * Allows users to:
 * 1. Document learnings from the current test
 * 2. Archive the test to history
 * 3. Optionally create a new test immediately
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Archive, 
  Lightbulb, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setTrafficSplit } from '@/lib/abTesting';
import type { Json } from '@/integrations/supabase/types';

interface TestSummary {
  testName: string;
  sessionsA: number;
  sessionsB: number;
  purchasesA: number;
  purchasesB: number;
  revenueA: number;
  revenueB: number;
  purchaseRateA: number;
  purchaseRateB: number;
  winner?: 'A' | 'B' | null;
  liftPercent?: number;
}

interface EndTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSummary: TestSummary;
  onTestEnded: () => void;
}

export default function EndTestDialog({ 
  open, 
  onOpenChange, 
  testSummary,
  onTestEnded,
}: EndTestDialogProps) {
  const [whatChanged, setWhatChanged] = useState('');
  const [whyWorked, setWhyWorked] = useState('');
  const [futureUse, setFutureUse] = useState('');
  const [declaredWinner, setDeclaredWinner] = useState<'A' | 'B' | 'inconclusive'>('inconclusive');
  const [createNewTest, setCreateNewTest] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSessions = testSummary.sessionsA + testSummary.sessionsB;
  const totalRevenue = testSummary.revenueA + testSummary.revenueB;
  const liftPercent = testSummary.purchaseRateA > 0 
    ? ((testSummary.purchaseRateB - testSummary.purchaseRateA) / testSummary.purchaseRateA) * 100 
    : 0;

  const handleEndTest = async () => {
    setSaving(true);
    
    try {
      // 1. Create archive record
      const archiveData = {
        test_id: crypto.randomUUID(), // Generate unique ID since we don't have ab_tests entry
        test_name: testSummary.testName,
        snapshot_json: {
          name: testSummary.testName,
          sessions_a: testSummary.sessionsA,
          sessions_b: testSummary.sessionsB,
          conversions_a: testSummary.purchasesA,
          conversions_b: testSummary.purchasesB,
          revenue_a: testSummary.revenueA,
          revenue_b: testSummary.revenueB,
          cvr_a: testSummary.purchaseRateA,
          cvr_b: testSummary.purchaseRateB,
          ended_at: new Date().toISOString(),
        } as Json,
        metrics_summary: {
          sessions_a: testSummary.sessionsA,
          sessions_b: testSummary.sessionsB,
          cvr_a: testSummary.purchaseRateA,
          cvr_b: testSummary.purchaseRateB,
          revenue_a: testSummary.revenueA,
          revenue_b: testSummary.revenueB,
        } as Json,
        winner: declaredWinner === 'inconclusive' ? null : declaredWinner,
        lift_percent: liftPercent,
        total_sessions: totalSessions,
        total_revenue: totalRevenue,
        learning_template: {
          what_changed: whatChanged,
          why_worked: whyWorked,
          future_use: futureUse,
        } as Json,
        is_restorable: true,
      };

      const { error: archiveError } = await supabase
        .from('ab_test_archive')
        .insert([archiveData]);

      if (archiveError) {
        console.error('Failed to archive test:', archiveError);
        throw archiveError;
      }

      // 2. Reset traffic split to 0 (disable variant B)
      await setTrafficSplit(0);

      // 3. If creating new test, we just reset - the user can configure it
      if (createNewTest && newTestName.trim()) {
        // Store the new test name for the next test
        // For now, we just reset the split to 50/50 for the new test
        await setTrafficSplit(50);
      }

      // 4. Notify parent
      onTestEnded();
      onOpenChange(false);
      
      // Reset form
      setWhatChanged('');
      setWhyWorked('');
      setFutureUse('');
      setDeclaredWinner('inconclusive');
      setCreateNewTest(false);
      setNewTestName('');
      
    } catch (error) {
      console.error('Error ending test:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            End Test & Archive
          </DialogTitle>
          <DialogDescription>
            Document your learnings and archive this test for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Test Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{testSummary.testName}</h4>
              <Badge variant={liftPercent > 0 ? 'default' : liftPercent < 0 ? 'destructive' : 'secondary'}>
                {liftPercent > 0 ? '+' : ''}{liftPercent.toFixed(1)}% lift
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Sessions</p>
                <p className="font-medium">{totalSessions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Purchases</p>
                <p className="font-medium">{(testSummary.purchasesA + testSummary.purchasesB).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-medium">€{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-muted">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">A:</span>
                <span className="text-sm font-medium">{(testSummary.purchaseRateA * 100).toFixed(2)}% CVR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">B:</span>
                <span className="text-sm font-medium">{(testSummary.purchaseRateB * 100).toFixed(2)}% CVR</span>
                {liftPercent > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                {liftPercent < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
            </div>
          </div>

          {/* Declare Winner */}
          <div className="space-y-2">
            <Label>Declare Winner</Label>
            <Select value={declaredWinner} onValueChange={(v) => setDeclaredWinner(v as 'A' | 'B' | 'inconclusive')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Variant A (Control)
                  </span>
                </SelectItem>
                <SelectItem value="B">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Variant B (Treatment)
                  </span>
                </SelectItem>
                <SelectItem value="inconclusive">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Inconclusive / No Winner
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Learning Template */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <Label className="text-sm font-medium">Document Learnings</Label>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">What changed between variants?</Label>
                <Textarea
                  placeholder="e.g., Variant B had a lower price point (€59.99 vs €79.99) without the free mask..."
                  value={whatChanged}
                  onChange={e => setWhatChanged(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Why did the winner perform better (or not)?</Label>
                <Textarea
                  placeholder="e.g., Lower price reduced friction but the mask bundle was a strong value driver..."
                  value={whyWorked}
                  onChange={e => setWhyWorked(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">How should we apply this learning?</Label>
                <Textarea
                  placeholder="e.g., Test bundle value messaging more prominently before price changes..."
                  value={futureUse}
                  onChange={e => setFutureUse(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Start New Test Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <Label className="text-sm font-medium">Start a new test immediately</Label>
              </div>
              <Switch
                checked={createNewTest}
                onCheckedChange={setCreateNewTest}
              />
            </div>
            
            {createNewTest && (
              <div className="pl-6 space-y-2">
                <Label className="text-sm text-muted-foreground">New test name</Label>
                <Input
                  placeholder="e.g., Urgency A/B Test v2 - Bundle Messaging"
                  value={newTestName}
                  onChange={e => setNewTestName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Traffic will be set to 50/50. You can adjust this after.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEndTest} 
            disabled={saving}
            variant="destructive"
          >
            {saving ? 'Archiving...' : createNewTest ? 'Archive & Start New' : 'Archive Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
