import { useState } from "react";
import { SleepLog } from "@/hooks/useSleepApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Flame, Brain, ChevronDown, FileText, Pencil, Trash2, Loader2 } from "lucide-react";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface SleepHistoryWeekTableProps {
  logs: SleepLog[];
  weekStart: Date;
  onUpdateLog?: (id: string, log: Partial<SleepLog>) => Promise<boolean>;
  onDeleteLog?: (id: string) => Promise<boolean>;
}

export const SleepHistoryWeekTable = ({ logs, weekStart, onUpdateLog, onDeleteLog }: SleepHistoryWeekTableProps) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editSleepQuality, setEditSleepQuality] = useState(5);
  const [editPainLevel, setEditPainLevel] = useState(3);
  const [editTimeToSleep, setEditTimeToSleep] = useState("");
  const [editWakeUps, setEditWakeUps] = useState("");
  const [editFeltHot, setEditFeltHot] = useState(false);
  const [editFeltStressed, setEditFeltStressed] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const toggleNote = (id: string) => {
    const newSet = new Set(expandedNotes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedNotes(newSet);
  };

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

  const getQualityColor = (quality: number) => {
    if (quality >= 7) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (quality >= 5) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getPainColor = (pain: number) => {
    if (pain <= 2) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (pain <= 5) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getLogForDay = (day: Date): SleepLog | undefined => {
    return logs.find((log) => {
      const logDate = parseISO(log.date);
      return isSameDay(logDate, day);
    });
  };

  const today = new Date();
  const qualityLabels = ["Terrible", "Very Poor", "Poor", "Below Average", "Average", "Above Average", "Good", "Very Good", "Excellent", "Perfect"];
  const painLabels = ["None", "", "Mild", "", "Moderate", "", "Severe", "", "Very Severe", "", "Extreme"];

  return (
    <>
      <div className="space-y-2">
        {daysInWeek.map((day) => {
          const log = getLogForDay(day);
          const isFuture = day > today;
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={`rounded-lg border p-3 transition-colors ${
                isToday
                  ? "border-primary/50 bg-primary/5"
                  : isFuture
                  ? "border-border/30 bg-muted/30 opacity-50"
                  : "border-border/50 bg-card/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm font-medium w-24 shrink-0">
                    {format(day, "EEE, MMM d")}
                    {isToday && (
                      <span className="ml-1 text-xs text-primary">(Today)</span>
                    )}
                  </div>

                  {log ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getQualityColor(log.sleep_quality)}>
                        Quality: {log.sleep_quality}/10
                      </Badge>
                      <Badge variant="outline" className={getPainColor(log.pain_level_morning)}>
                        Pain: {log.pain_level_morning}/10
                      </Badge>
                      {log.felt_hot && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-600">
                          <Flame className="h-3 w-3" />
                          Hot
                        </span>
                      )}
                      {log.felt_stressed && (
                        <span className="flex items-center gap-0.5 text-xs text-purple-600">
                          <Brain className="h-3 w-3" />
                          Stressed
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {isFuture ? "—" : "No log"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {log?.notes && (
                    <Collapsible open={expandedNotes.has(log.id)}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNote(log.id)}
                          className="h-7 gap-1 text-xs"
                        >
                          <FileText className="h-3 w-3" />
                          <span className="hidden sm:inline">Note</span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              expandedNotes.has(log.id) ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                  
                  {log && onUpdateLog && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(log)}
                      aria-label={`Edit sleep log for ${format(day, "EEE, MMM d")}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  {log && onDeleteLog && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isDeleting === log.id}
                          aria-label={`Delete sleep log for ${format(day, "EEE, MMM d")}`}
                        >
                          {isDeleting === log.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Sleep Log</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete your sleep log for {format(parseISO(log.date), "MMMM d, yyyy")}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(log.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              {log?.notes && expandedNotes.has(log.id) && (
                <Collapsible open={expandedNotes.has(log.id)}>
                  <CollapsibleContent>
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                      {log.notes}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Sleep Log - {editingLog && format(parseISO(editingLog.date), "MMMM d, yyyy")}
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
