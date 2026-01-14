/**
 * Test History Tab - Archive with learning memory
 * Shows last 12 restorable tests + learning templates
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Archive,
  Trophy,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  RefreshCw,
  Clock,
  DollarSign,
  Users,
  BookOpen,
  Lightbulb,
  Download,
} from 'lucide-react';
import {
  type ABTestArchive,
  type ABTest,
  fetchArchivedTests,
  restoreTest,
  archiveTest,
  fetchTests,
} from '@/lib/abExperimentation';
import { format } from 'date-fns';

interface LearningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ABTest | null;
  onArchive: (learning: { what_changed: string; why_worked: string; future_use: string }) => void;
}

function LearningDialog({ open, onOpenChange, test, onArchive }: LearningDialogProps) {
  const [whatChanged, setWhatChanged] = useState('');
  const [whyWorked, setWhyWorked] = useState('');
  const [futureUse, setFutureUse] = useState('');
  const [saving, setSaving] = useState(false);

  const handleArchive = async () => {
    setSaving(true);
    await onArchive({
      what_changed: whatChanged,
      why_worked: whyWorked,
      future_use: futureUse,
    });
    setSaving(false);
    onOpenChange(false);
    setWhatChanged('');
    setWhyWorked('');
    setFutureUse('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Document Learnings
          </DialogTitle>
          <DialogDescription>
            Capture insights from this test for future reference
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What Changed?</Label>
            <Textarea
              placeholder="Describe the key differences between variants..."
              value={whatChanged}
              onChange={e => setWhatChanged(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Why Did It Work (or Not)?</Label>
            <Textarea
              placeholder="Explain the psychological or UX factors..."
              value={whyWorked}
              onChange={e => setWhyWorked(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>How Should We Use This?</Label>
            <Textarea
              placeholder="Future applications and recommendations..."
              value={futureUse}
              onChange={e => setFutureUse(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={saving}>
            {saving ? 'Archiving...' : 'Archive Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ArchiveCardProps {
  archive: ABTestArchive;
  onRestore: (id: string) => void;
  restoring: boolean;
}

function ArchiveCard({ archive, onRestore, restoring }: ArchiveCardProps) {
  const isWinnerB = archive.winner === 'B';
  const isInconclusive = archive.winner === 'inconclusive';
  const metrics = archive.metrics_summary as Record<string, number>;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isInconclusive ? (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isWinnerB ? 'bg-green-500/10' : 'bg-blue-500/10'
              }`}>
                <Trophy className={`h-4 w-4 ${isWinnerB ? 'text-green-500' : 'text-blue-500'}`} />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{archive.test_name}</CardTitle>
              <CardDescription className="text-xs">
                {format(new Date(archive.archived_at), 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {archive.lift_percent && (
              <Badge variant={archive.lift_percent > 0 ? 'default' : 'secondary'}>
                {archive.lift_percent > 0 ? '+' : ''}{archive.lift_percent.toFixed(1)}%
              </Badge>
            )}
            <Badge variant={isInconclusive ? 'secondary' : 'outline'}>
              {isInconclusive ? 'Inconclusive' : `${archive.winner} Won`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metrics summary */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-muted/50 rounded">
            <Users className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">{archive.total_sessions.toLocaleString()}</p>
            <p className="text-muted-foreground">Sessions</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <DollarSign className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">€{archive.total_revenue.toLocaleString()}</p>
            <p className="text-muted-foreground">Revenue</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <TrendingUp className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">
              {metrics?.cvr_b ? ((metrics.cvr_b as number) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-muted-foreground">CVR (B)</p>
          </div>
        </div>

        {/* Learning template */}
        {(archive.learning_template?.what_changed || 
          archive.learning_template?.why_worked || 
          archive.learning_template?.future_use) && (
          <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">Key Learnings</span>
            </div>
            {archive.learning_template.what_changed && (
              <p className="text-xs text-muted-foreground">
                <strong>Changed:</strong> {archive.learning_template.what_changed}
              </p>
            )}
            {archive.learning_template.why_worked && (
              <p className="text-xs text-muted-foreground">
                <strong>Why:</strong> {archive.learning_template.why_worked}
              </p>
            )}
            {archive.learning_template.future_use && (
              <p className="text-xs text-muted-foreground">
                <strong>Apply:</strong> {archive.learning_template.future_use}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {archive.is_restorable && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => onRestore(archive.id)}
            disabled={restoring}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore as Draft
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function TestHistoryTab() {
  const [archives, setArchives] = useState<ABTestArchive[]>([]);
  const [completedTests, setCompletedTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [learningDialog, setLearningDialog] = useState<{ open: boolean; test: ABTest | null }>({
    open: false,
    test: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [archivedData, testsData] = await Promise.all([
      fetchArchivedTests(12),
      fetchTests(),
    ]);
    setArchives(archivedData);
    setCompletedTests(testsData.filter(t => t.status === 'completed' && t.winner_variant));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestore = async (archiveId: string) => {
    setRestoring(true);
    const restored = await restoreTest(archiveId);
    if (restored) {
      loadData();
    }
    setRestoring(false);
  };

  const handleArchiveTest = async (
    learning: { what_changed: string; why_worked: string; future_use: string }
  ) => {
    if (!learningDialog.test) return;
    await archiveTest(learningDialog.test, learning);
    loadData();
  };

  const openLearningDialog = (test: ABTest) => {
    setLearningDialog({ open: true, test });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Test History
          </h3>
          <p className="text-sm text-muted-foreground">
            Last 12 tests with learning templates • {archives.length} archived
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pending archive section */}
      {completedTests.length > 0 && (
        <>
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Ready to Archive
            </h4>
            <div className="space-y-2">
              {completedTests.map(test => (
                <Card key={test.id} className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Winner: Variant {test.winner_variant} • 
                          {test.sessions_a + test.sessions_b} sessions
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openLearningDialog(test)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Archive with Learnings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Archived tests */}
      {archives.length === 0 && !loading ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Archive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Archived Tests</h3>
            <p className="text-muted-foreground">
              Completed tests will appear here after archiving
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {archives.map(archive => (
            <ArchiveCard 
              key={archive.id} 
              archive={archive} 
              onRestore={handleRestore}
              restoring={restoring}
            />
          ))}
        </div>
      )}

      <LearningDialog
        open={learningDialog.open}
        onOpenChange={(open) => setLearningDialog({ ...learningDialog, open })}
        test={learningDialog.test}
        onArchive={handleArchiveTest}
      />
    </div>
  );
}
