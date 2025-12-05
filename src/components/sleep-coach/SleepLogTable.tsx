import { useState } from "react";
import { SleepLog, TrendData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Minus, Flame, Brain, Calendar, Pencil, Trash2, Loader2 } from "lucide-react";

interface SleepLogTableProps {
  logs: SleepLog[];
  trends: TrendData;
  onUpdateLog?: (id: string, log: Partial<SleepLog>) => Promise<boolean>;
  onDeleteLog?: (id: string) => Promise<boolean>;
}

export const SleepLogTable = ({ logs, trends, onUpdateLog, onDeleteLog }: SleepLogTableProps) => {
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editSleepQuality, setEditSleepQuality] = useState(3);
  const [editPainLevel, setEditPainLevel] = useState(3);
  const [editTimeToSleep, setEditTimeToSleep] = useState("");
  const [editWakeUps, setEditWakeUps] = useState("");
  const [editFeltHot, setEditFeltHot] = useState(false);
  const [editFeltStressed, setEditFeltStressed] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const openEditDialog = (log: SleepLog) => {
    setEditingLog(log);
    setEditSleepQuality(log.sleep_quality);
    setEditPainLevel(log.pain_level_morning);
    setEditTimeToSleep(log.time_to_sleep_minutes?.toString() || "");
    setEditWakeUps(log.wake_ups_per_night?.toString() || "");
    setEditFeltHot(log.felt_hot);
    setEditFeltStressed(log.felt_stressed);
    setEditNotes(log.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog || !onUpdateLog) return;
    
    setIsSaving(true);
    const success = await onUpdateLog(editingLog.id, {
      sleep_quality: editSleepQuality,
      pain_level_morning: editPainLevel,
      time_to_sleep_minutes: editTimeToSleep ? parseInt(editTimeToSleep) : null,
      wake_ups_per_night: editWakeUps ? parseInt(editWakeUps) : null,
      felt_hot: editFeltHot,
      felt_stressed: editFeltStressed,
      notes: editNotes || null,
    });
    setIsSaving(false);

    if (success) {
      setIsEditDialogOpen(false);
      setEditingLog(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteLog) return;
    setIsDeleting(id);
    await onDeleteLog(id);
    setIsDeleting(null);
  };

  const getTrendIcon = () => {
    switch (trends.trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'worsening':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 7) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (quality >= 5) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getPainColor = (pain: number) => {
    if (pain <= 2) return "text-green-600";
    if (pain <= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const qualityLabels = ["Terrible", "Very Poor", "Poor", "Below Average", "Average", "Above Average", "Good", "Very Good", "Excellent", "Perfect"];
  const painLabels = ["None", "", "Mild", "", "Moderate", "", "Severe", "", "Very Severe", "", "Extreme"];

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Sleep History
            </span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <span className="text-muted-foreground">Trend:</span>
              {getTrendIcon()}
              <span className={
                trends.trend === 'improving' ? 'text-green-600' :
                trends.trend === 'worsening' ? 'text-red-600' : 'text-muted-foreground'
              }>
                {trends.trend.charAt(0).toUpperCase() + trends.trend.slice(1)}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{trends.avgSleepQuality.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Quality /10</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{trends.avgPain.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Pain /10</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{trends.goodNights}</div>
              <div className="text-xs text-muted-foreground">Good Nights</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{trends.poorNights}</div>
              <div className="text-xs text-muted-foreground">Poor Nights</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 mb-4 text-sm">
            {trends.hotNights > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Flame className="h-4 w-4" />
                <span>{trends.hotNights} hot nights</span>
              </div>
            )}
            {trends.stressedNights > 0 && (
              <div className="flex items-center gap-1 text-purple-600">
                <Brain className="h-4 w-4" />
                <span>{trends.stressedNights} stressed nights</span>
              </div>
            )}
          </div>

          {/* Table */}
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sleep logs yet. Start tracking your sleep above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Pain</TableHead>
                    <TableHead className="hidden md:table-cell">Time to Sleep</TableHead>
                    <TableHead className="hidden md:table-cell">Wake-ups</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                    {(onUpdateLog || onDeleteLog) && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {new Date(log.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getQualityColor(log.sleep_quality)}>
                          {log.sleep_quality}/10
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getPainColor(log.pain_level_morning)}>
                          {log.pain_level_morning}/10
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.time_to_sleep_minutes ? `${log.time_to_sleep_minutes}m` : '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.wake_ups_per_night ?? '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        <span className="flex items-center gap-1">
                          {log.felt_hot && <Flame className="h-3 w-3 text-orange-500" />}
                          {log.felt_stressed && <Brain className="h-3 w-3 text-purple-500" />}
                          {log.notes || '-'}
                        </span>
                      </TableCell>
                      {(onUpdateLog || onDeleteLog) && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {onUpdateLog && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(log)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {onDeleteLog && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(log.id)}
                                disabled={isDeleting === log.id}
                              >
                                {isDeleting === log.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Sleep Log - {editingLog && new Date(editingLog.date).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Sleep Quality: {editSleepQuality}/10 - {qualityLabels[editSleepQuality - 1]}</Label>
              <Slider
                value={[editSleepQuality]}
                onValueChange={(v) => setEditSleepQuality(v[0])}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Morning Pain Level: {editPainLevel}/10 - {painLabels[editPainLevel]}</Label>
              <Slider
                value={[editPainLevel]}
                onValueChange={(v) => setEditPainLevel(v[0])}
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minutes to Fall Asleep</Label>
                <Input
                  type="number"
                  value={editTimeToSleep}
                  onChange={(e) => setEditTimeToSleep(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Wake-ups</Label>
                <Input
                  type="number"
                  value={editWakeUps}
                  onChange={(e) => setEditWakeUps(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editFeltHot"
                  checked={editFeltHot}
                  onCheckedChange={(checked) => setEditFeltHot(checked === true)}
                />
                <Label htmlFor="editFeltHot" className="text-sm">🌡️ Felt too hot</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editFeltStressed"
                  checked={editFeltStressed}
                  onCheckedChange={(checked) => setEditFeltStressed(checked === true)}
                />
                <Label htmlFor="editFeltStressed" className="text-sm">😰 Felt stressed</Label>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
