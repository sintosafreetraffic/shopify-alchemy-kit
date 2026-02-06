/**
 * SleepLogsTab - Complete redesign of Sleep Logs with Scandinavian premium aesthetic
 * 
 * Matches the Overview tab aesthetic: warm neutrals, soft shadows, monoline icons
 */

import { useState, useMemo } from "react";
import { SleepLog, TrendData } from "@/hooks/useSleepApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { DiscoverPersonaCTA } from "./overview/DiscoverPersonaCTA";

type TimeRange = "7d" | "30d" | "90d" | "12m" | "custom";

interface SleepLogsTabProps {
  email: string;
  logs: SleepLog[];
  trends: TrendData;
  hasPersona: boolean;
  onAddLog: (log: any) => Promise<boolean>;
  onUpdateLog?: (id: string, log: Partial<SleepLog>) => Promise<boolean>;
  onDeleteLog?: (id: string) => Promise<boolean>;
  apiLoading?: boolean;
  initialRange?: TimeRange;
  onShareClick?: (range: TimeRange) => void;
}

export function SleepLogsTab({ 
  email, 
  logs, 
  trends, 
  hasPersona,
  onAddLog, 
  onUpdateLog, 
  onDeleteLog,
  apiLoading,
  initialRange = "30d",
  onShareClick
}: SleepLogsTabProps) {
  return (
    <div className="space-y-12" style={{ backgroundColor: '#F7F7F6' }}>
      {/* Section 1: Log Your Sleep */}
      <SleepLogFormMinimal email={email} onSubmit={onAddLog} loading={apiLoading} />
      
      {/* Section 2: Sleep Progress Insights */}
      <SleepProgressInsights trends={trends} />
      
      {/* Section 3 & 4: Chart with Range Selector */}
      <SleepQualityChartSoft 
        logs={logs} 
        initialRange={initialRange}
        onShareClick={onShareClick}
      />
      
      {/* Section 5: Sleep History Timeline */}
      <SleepHistoryListMinimal 
        logs={logs}
        trends={trends}
        onUpdateLog={onUpdateLog}
        onDeleteLog={onDeleteLog}
      />
      
      {/* Section 6: Discover Persona CTA (if no persona) */}
      {!hasPersona && <DiscoverPersonaCTA />}
    </div>
  );
}

// ============================================================================
// SECTION 1: Sleep Log Form
// ============================================================================

interface SleepLogFormMinimalProps {
  email: string;
  onSubmit: (log: any) => Promise<boolean>;
  loading?: boolean;
}

function SleepLogFormMinimal({ email, onSubmit, loading }: SleepLogFormMinimalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [comfortLevel, setComfortLevel] = useState(5);
  const [timeToSleep, setTimeToSleep] = useState<string>("");
  const [wakeUps, setWakeUps] = useState<string>("");
  const [feltHot, setFeltHot] = useState(false);
  const [feltStressed, setFeltStressed] = useState(false);
  const [notes, setNotes] = useState("");

  const handleDateChange = (newDate: string) => {
    if (newDate > today) {
      toast.error("Cannot log sleep for future dates");
      return;
    }
    setDate(newDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (date > today) {
      toast.error("Cannot log sleep for future dates");
      return;
    }
    
    const log = {
      email,
      date,
      sleep_quality: sleepQuality,
      pain_level_morning: 10 - comfortLevel,
      time_to_sleep_minutes: timeToSleep ? parseInt(timeToSleep) : null,
      wake_ups_per_night: wakeUps ? parseInt(wakeUps) : null,
      felt_hot: feltHot,
      felt_stressed: feltStressed,
      notes: notes || null,
      source: 'manual' as const,
    };

    const success = await onSubmit(log);
    if (success) {
      setSleepQuality(5);
      setComfortLevel(5);
      setTimeToSleep("");
      setWakeUps("");
      setFeltHot(false);
      setFeltStressed(false);
      setNotes("");
    }
  };

  return (
    <section 
      className="rounded-2xl p-7 md:p-10"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <div className="relative mb-8">
        <svg className="absolute -top-2 right-0 opacity-[0.05]" width="120" height="80" viewBox="0 0 120 80">
          <path d="M10 70 Q30 20, 60 40 T110 20" stroke="#2D2B29" strokeWidth="2" fill="none"/>
        </svg>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F7F7F6' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="6" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" fill="none"/>
              <path d="M10 6V10L12.5 12.5" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-medium" style={{ color: '#2D2B29' }}>Log Your Sleep</h2>
        </div>
        <p className="text-sm ml-[52px]" style={{ color: '#A7A29C' }}>A moment of reflection on last night's rest</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#A7A29C' }}>Date</label>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => handleDateChange(e.target.value)}
            className="max-w-[200px] border-0 bg-white/80"
            style={{ color: '#2D2B29', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          />
        </div>

        {/* Sleep Quality */}
        <div>
          <div className="flex justify-between items-baseline mb-4">
            <label className="text-sm font-medium text-foreground">How restorative did last night feel?</label>
            <span className="text-lg font-semibold text-primary">{sleepQuality}/10</span>
          </div>
          <Slider
            value={[sleepQuality]}
            onValueChange={(v) => setSleepQuality(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_.relative]:bg-muted [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-primary/80"
          />
          <div className="flex justify-between text-xs mt-2 text-muted-foreground">
            <span>Less restorative</span>
            <span>Deeply restorative</span>
          </div>
        </div>

        {/* Morning Comfort */}
        <div>
          <div className="flex justify-between items-baseline mb-4">
            <label className="text-sm font-medium text-foreground">Morning comfort level</label>
            <span className="text-lg font-semibold text-primary">{comfortLevel}/10</span>
          </div>
          <Slider
            value={[comfortLevel]}
            onValueChange={(v) => setComfortLevel(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_.relative]:bg-muted [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-primary/80"
          />
          <div className="flex justify-between text-xs mt-2 text-muted-foreground">
            <span>Higher tension</span>
            <span>Fully comfortable</span>
          </div>
        </div>

        {/* Time & Wake-ups */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#A7A29C' }}>Minutes to fall asleep</label>
            <Input
              type="number"
              placeholder="e.g., 15"
              value={timeToSleep}
              onChange={(e) => setTimeToSleep(e.target.value)}
              className="border-0 bg-white/80"
              style={{ color: '#2D2B29', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#A7A29C' }}>Wake-ups during night</label>
            <Input
              type="number"
              placeholder="e.g., 2"
              value={wakeUps}
              onChange={(e) => setWakeUps(e.target.value)}
              className="border-0 bg-white/80"
              style={{ color: '#2D2B29', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
          </div>
        </div>

        {/* Toggle Pills */}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setFeltHot(!feltHot)}
            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: feltHot ? 'rgba(60, 131, 246, 0.15)' : '#F7F7F6',
              color: feltHot ? 'rgba(60, 131, 246, 0.90)' : '#6F6A66',
              boxShadow: feltHot ? '0 2px 8px rgba(60, 131, 246, 0.15)' : 'none',
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V14M8 2C6 4 6 6 8 8C10 10 10 12 8 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
              Felt warm
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFeltStressed(!feltStressed)}
            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: feltStressed ? 'rgba(60, 131, 246, 0.15)' : '#F7F7F6',
              color: feltStressed ? 'rgba(60, 131, 246, 0.90)' : '#6F6A66',
              boxShadow: feltStressed ? '0 2px 8px rgba(60, 131, 246, 0.15)' : 'none',
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <path d="M5.5 9.5C6 10.5 7 11 8 11C9 11 10 10.5 10.5 9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                <circle cx="6" cy="6.5" r="0.75" fill="currentColor"/>
                <circle cx="10" cy="6.5" r="0.75" fill="currentColor"/>
              </svg>
              Felt stressed
            </span>
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#A7A29C' }}>Reflections (optional)</label>
          <Textarea
            placeholder="Any thoughts about your sleep experience..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] border-0 bg-white/80 resize-none"
            style={{ color: '#2D2B29', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          />
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full h-12 rounded-xl text-base font-medium"
          style={{ backgroundColor: 'rgba(60, 131, 246, 0.85)', color: '#FFFFFF' }}
          disabled={loading}
        >
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Sleep Log"}
        </Button>
      </form>
    </section>
  );
}

// ============================================================================
// SECTION 2: Progress Insights
// ============================================================================

function SleepProgressInsights({ trends }: { trends: TrendData }) {
  const avgQuality = trends.avgSleepQuality || 0;
  const avgComfort = 10 - (trends.avgPain || 0);
  const hotNights = trends.hotNights || 0;
  const stressedNights = trends.stressedNights || 0;

  return (
    <section className="rounded-2xl p-7 md:p-8" style={{ backgroundColor: '#FAFAF8', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F7F7F6' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 15L7 11L10 14L17 5" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3 className="text-base font-medium" style={{ color: '#2D2B29' }}>Sleep Insights</h3>
          <p className="text-xs" style={{ color: '#A7A29C' }}>Based on your recent logs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Avg Sleep Quality */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#F7F7F6' }}>
          <div className="flex items-end justify-between mb-3">
            <span className="text-2xl font-semibold" style={{ color: '#2D2B29' }}>{avgQuality > 0 ? avgQuality.toFixed(1) : '—'}</span>
            <span className="text-xs" style={{ color: '#A7A29C' }}>/10</span>
          </div>
          <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: '#E6E6E4' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(avgQuality / 10) * 100}%`, backgroundColor: 'rgba(167, 180, 194, 0.7)' }}/>
          </div>
          <p className="text-xs" style={{ color: '#6F6A66' }}>Avg Sleep Quality</p>
          <p className="text-[11px] mt-1" style={{ color: '#A7A29C' }}>Higher quality supports more restorative nights</p>
        </div>

        {/* Avg Morning Comfort */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#F7F7F6' }}>
          <div className="flex items-end justify-between mb-3">
            <span className="text-2xl font-semibold" style={{ color: '#2D2B29' }}>{avgComfort > 0 ? avgComfort.toFixed(1) : '—'}</span>
            <span className="text-xs" style={{ color: '#A7A29C' }}>/10</span>
          </div>
          <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: '#E6E6E4' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(avgComfort / 10) * 100}%`, backgroundColor: 'rgba(212, 165, 165, 0.7)' }}/>
          </div>
          <p className="text-xs" style={{ color: '#6F6A66' }}>Avg Morning Comfort</p>
          <p className="text-[11px] mt-1" style={{ color: '#A7A29C' }}>Reflects tension + recovery patterns</p>
        </div>

        {/* Warm Nights */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#F7F7F6' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
              <path d="M8 2V14M8 2C6 4 6 6 8 8C10 10 10 12 8 14" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-semibold" style={{ color: '#2D2B29' }}>{hotNights}</span>
          </div>
          <p className="text-xs" style={{ color: '#6F6A66' }}>Warm nights</p>
          <p className="text-[11px] mt-1" style={{ color: '#A7A29C' }}>Nights where temperature affected rest</p>
        </div>

        {/* Stressed Nights */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#F7F7F6' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
              <circle cx="8" cy="8" r="6" stroke="#A7B4C2" strokeWidth="1.25" fill="none"/>
              <path d="M5 6L6.5 7.5M11 6L9.5 7.5M5.5 10.5C6.5 9.5 9.5 9.5 10.5 10.5" stroke="#A7B4C2" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-semibold" style={{ color: '#2D2B29' }}>{stressedNights}</span>
          </div>
          <p className="text-xs" style={{ color: '#6F6A66' }}>Restless nights</p>
          <p className="text-[11px] mt-1" style={{ color: '#A7A29C' }}>Nights where stress influenced sleep</p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 3 & 4: Chart with Range Selector
// ============================================================================

interface SleepQualityChartSoftProps {
  logs: SleepLog[];
  initialRange?: TimeRange;
  onShareClick?: (range: TimeRange) => void;
}

function SleepQualityChartSoft({ logs, initialRange = "30d", onShareClick }: SleepQualityChartSoftProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let startDate: Date;
    let endDate = today;

    if (timeRange === "custom" && customRange?.from) {
      startDate = new Date(customRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = customRange.to ? new Date(customRange.to) : new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (timeRange) {
        case "7d": startDate = subDays(today, 6); break;
        case "30d": startDate = subDays(today, 29); break;
        case "90d": startDate = subDays(today, 89); break;
        case "12m": startDate = subMonths(today, 12); break;
        default: startDate = subDays(today, 29);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    const logsByDate = new Map<string, SleepLog>();
    logs.forEach((log) => logsByDate.set(log.date, log));

    const allDates: { date: string; fullDate: string; quality: number | null; comfort: number | null }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const log = logsByDate.get(dateStr);
      
      let displayFormat = "MMM d";
      if (timeRange === "12m") displayFormat = currentDate.getDate() === 1 ? "MMM" : "";
      else if (timeRange === "90d") displayFormat = "M/d";
      
      allDates.push({
        date: displayFormat ? format(currentDate, displayFormat) : "",
        fullDate: dateStr,
        quality: log ? log.sleep_quality : null,
        comfort: log ? (10 - log.pain_level_morning) : null,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
  }, [logs, timeRange, customRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FAFAF8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #E6E6E4' }}>
          <p className="font-medium text-sm mb-2" style={{ color: '#2D2B29' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <p key={index} className="text-xs" style={{ color: entry.color }}>{entry.name}: {entry.value}/10</p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const rangeOptions: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "12m", label: "12M" },
  ];

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) setIsCalendarOpen(false);
  };

  return (
    <section className="rounded-2xl p-7 md:p-8" style={{ backgroundColor: '#FAFAF8', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F7F7F6' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 16C4 12 6 8 10 10C14 12 16 6 18 4" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-medium" style={{ color: '#2D2B29' }}>Sleep Patterns</h3>
            <p className="text-xs" style={{ color: '#A7A29C' }}>Quality and comfort over time</p>
          </div>
        </div>

        {/* Range Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: timeRange === option.value ? 'rgba(60, 131, 246, 0.80)' : '#F7F7F6',
                color: timeRange === option.value ? '#FFFFFF' : '#6F6A66',
                boxShadow: timeRange === option.value ? '0 2px 8px rgba(60, 131, 246, 0.2)' : 'none',
              }}
            >
              {option.label}
            </button>
          ))}
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={() => setTimeRange("custom")}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: timeRange === "custom" ? 'rgba(60, 131, 246, 0.80)' : '#F7F7F6',
                  color: timeRange === "custom" ? '#FFFFFF' : '#6F6A66',
                }}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {timeRange === "custom" && customRange?.from
                  ? `${format(customRange.from, "M/d")}${customRange.to ? `-${format(customRange.to, "M/d")}` : ""}`
                  : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={handleCustomRangeSelect}
                numberOfMonths={1}
                disabled={(date) => date > new Date()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          
          {onShareClick && (
            <button onClick={() => onShareClick(timeRange)} className="p-2 rounded-full transition-all" style={{ backgroundColor: '#F7F7F6' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 10L8 6L12 10M8 6V14" stroke="#6F6A66" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 4H14" stroke="#6F6A66" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center rounded-xl" style={{ backgroundColor: '#F7F7F6' }}>
          <div className="text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3" style={{ opacity: 0.5 }}>
              <path d="M5 30C10 22 15 18 20 20C25 22 30 14 35 10" stroke="#A7A29C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ color: '#6F6A66' }} className="text-sm">No logs in this period yet</p>
            <p style={{ color: '#A7A29C' }} className="text-xs mt-1">Start logging to see your patterns</p>
          </div>
        </div>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(167, 180, 194, 0.3)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgba(167, 180, 194, 0)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="comfortGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(212, 165, 165, 0.3)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgba(212, 165, 165, 0)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#A7A29C' }}
                axisLine={false}
                tickLine={false}
                interval={timeRange === "12m" ? 30 : timeRange === "90d" ? 7 : timeRange === "30d" ? 3 : 0}
                tickFormatter={(value) => value || ""}
              />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#A7A29C' }} axisLine={false} tickLine={false} width={30} ticks={[0, 5, 10]}/>
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="quality" name="Sleep Quality" stroke="rgba(167, 180, 194, 0.7)" strokeWidth={2} fill="url(#qualityGradient)" dot={false} activeDot={{ r: 4, fill: '#A7B4C2' }} connectNulls/>
              <Area type="monotone" dataKey="comfort" name="Morning Comfort" stroke="rgba(212, 165, 165, 0.7)" strokeWidth={2} fill="url(#comfortGradient)" dot={false} activeDot={{ r: 4, fill: '#D4A5A5' }} connectNulls/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-center mt-4" style={{ color: '#A7A29C' }}>Higher sleep quality is better — lower morning tension supports alignment</p>
    </section>
  );
}

// ============================================================================
// SECTION 5: Sleep History Timeline
// ============================================================================

interface SleepHistoryListMinimalProps {
  logs: SleepLog[];
  trends: TrendData;
  onUpdateLog?: (id: string, log: Partial<SleepLog>) => Promise<boolean>;
  onDeleteLog?: (id: string) => Promise<boolean>;
}

function SleepHistoryListMinimal({ logs, trends, onUpdateLog, onDeleteLog }: SleepHistoryListMinimalProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editSleepQuality, setEditSleepQuality] = useState(5);
  const [editComfortLevel, setEditComfortLevel] = useState(5);
  const [editTimeToSleep, setEditTimeToSleep] = useState("");
  const [editWakeUps, setEditWakeUps] = useState("");
  const [editFeltHot, setEditFeltHot] = useState(false);
  const [editFeltStressed, setEditFeltStressed] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const weekLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: currentWeekStart, end: addDays(weekEnd, 1) });
    });
  }, [logs, currentWeekStart, weekEnd]);

  const weekStats = useMemo(() => {
    if (weekLogs.length === 0) return { avgQuality: 0, avgComfort: 0, hotNights: 0, stressedNights: 0, logCount: 0 };
    return {
      avgQuality: weekLogs.reduce((sum, l) => sum + l.sleep_quality, 0) / weekLogs.length,
      avgComfort: weekLogs.reduce((sum, l) => sum + (10 - l.pain_level_morning), 0) / weekLogs.length,
      hotNights: weekLogs.filter((l) => l.felt_hot).length,
      stressedNights: weekLogs.filter((l) => l.felt_stressed).length,
      logCount: weekLogs.length,
    };
  }, [weekLogs]);

  const navigateWeek = (direction: 'prev' | 'next') => setCurrentWeekStart(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
  const canNavigateNext = currentWeekStart < startOfWeek(new Date(), { weekStartsOn: 1 });
  const getLogForDate = (date: Date) => logs.find(log => log.date === format(date, "yyyy-MM-dd"));

  const openEditDialog = (log: SleepLog) => {
    setEditingLog(log);
    setEditSleepQuality(log.sleep_quality);
    setEditComfortLevel(10 - log.pain_level_morning);
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
      pain_level_morning: 10 - editComfortLevel,
      time_to_sleep_minutes: editTimeToSleep ? parseInt(editTimeToSleep) : null,
      wake_ups_per_night: editWakeUps ? parseInt(editWakeUps) : null,
      felt_hot: editFeltHot,
      felt_stressed: editFeltStressed,
      notes: editNotes || null,
    });
    setIsSaving(false);
    if (success) { setIsEditDialogOpen(false); setEditingLog(null); }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteLog) return;
    setIsDeleting(id);
    await onDeleteLog(id);
    setIsDeleting(null);
  };

  return (
    <>
      <section className="rounded-2xl p-7 md:p-8" style={{ backgroundColor: '#FAFAF8', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div className="relative mb-6">
          <svg className="absolute -top-1 right-0 opacity-[0.05]" width="100" height="60" viewBox="0 0 100 60">
            <path d="M5 50 Q25 10, 50 30 T95 15" stroke="#2D2B29" strokeWidth="2" fill="none"/>
          </svg>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F7F7F6' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="12" rx="2" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" fill="none"/>
                <path d="M3 8H17" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75"/>
                <path d="M7 2V4M13 2V4" stroke="#8E98A3" strokeWidth="1.25" strokeOpacity="0.75" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-medium" style={{ color: '#2D2B29' }}>Sleep History</h3>
              <p className="text-xs" style={{ color: '#A7A29C' }}>Weekly reflection timeline</p>
            </div>
          </div>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center justify-between mb-6 p-3 rounded-xl" style={{ backgroundColor: '#F7F7F6' }}>
          <button onClick={() => navigateWeek('prev')} className="p-2 rounded-lg transition-all hover:bg-white/50">
            <ChevronLeft className="h-4 w-4" style={{ color: '#6F6A66' }} />
          </button>
          <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>{format(currentWeekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</p>
          <button onClick={() => navigateWeek('next')} disabled={!canNavigateNext} className="p-2 rounded-lg transition-all hover:bg-white/50 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" style={{ color: '#6F6A66' }} />
          </button>
        </div>

        {/* Week Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: '#2D2B29' }}>{weekStats.avgQuality > 0 ? weekStats.avgQuality.toFixed(1) : '—'}</p>
            <p className="text-[11px]" style={{ color: '#A7A29C' }}>Avg Quality</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: '#2D2B29' }}>{weekStats.avgComfort > 0 ? weekStats.avgComfort.toFixed(1) : '—'}</p>
            <p className="text-[11px]" style={{ color: '#A7A29C' }}>Avg Comfort</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: '#2D2B29' }}>{weekStats.logCount}</p>
            <p className="text-[11px]" style={{ color: '#A7A29C' }}>Days Logged</p>
          </div>
          <div className="text-center flex flex-col items-center">
            <div className="flex gap-1.5">
              {weekStats.hotNights > 0 && <span className="flex items-center gap-0.5 text-xs" style={{ color: '#D4A5A5' }}>{weekStats.hotNights}</span>}
              {weekStats.stressedNights > 0 && <span className="flex items-center gap-0.5 text-xs" style={{ color: '#A7B4C2' }}>{weekStats.stressedNights}</span>}
              {weekStats.hotNights === 0 && weekStats.stressedNights === 0 && <span style={{ color: '#A7A29C' }}>—</span>}
            </div>
            <p className="text-[11px]" style={{ color: '#A7A29C' }}>Indicators</p>
          </div>
        </div>

        {/* Daily Timeline */}
        <div className="space-y-2">
          {weekDays.map((day) => {
            const log = getLogForDate(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const isFuture = day > new Date();
            
            return (
              <div key={format(day, "yyyy-MM-dd")} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ backgroundColor: isToday ? '#F0F4F8' : 'transparent', opacity: isFuture ? 0.5 : 1 }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 text-center" style={{ color: isToday ? 'rgba(60, 131, 246, 0.85)' : '#6F6A66' }}>
                    <p className="text-xs font-medium">{format(day, "EEE")}</p>
                    <p className="text-sm font-semibold">{format(day, "d")}</p>
                  </div>
                  {log ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm" style={{ color: '#2D2B29' }}>Quality {log.sleep_quality}/10</span>
                      <span className="text-sm" style={{ color: '#6F6A66' }}>Comfort {10 - log.pain_level_morning}/10</span>
                      {(log.felt_hot || log.felt_stressed) && (
                        <div className="flex gap-1.5">
                          {log.felt_hot && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#D4A5A5' }}><path d="M7 1.75V12.25M7 1.75C5.25 3.5 5.25 5.25 7 7C8.75 8.75 8.75 10.5 7 12.25" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>}
                          {log.felt_stressed && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#A7B4C2' }}><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1" fill="none"/></svg>}
                        </div>
                      )}
                    </div>
                  ) : isFuture ? (
                    <span className="text-sm" style={{ color: '#A7A29C' }}>Upcoming</span>
                  ) : (
                    <span className="text-sm" style={{ color: '#A7A29C' }}>No log yet</span>
                  )}
                </div>
                {log && (onUpdateLog || onDeleteLog) && (
                  <div className="flex items-center gap-1">
                    {onUpdateLog && (
                      <button onClick={() => openEditDialog(log)} className="p-2 rounded-lg transition-all hover:bg-white/70">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 2L12 4L5 11H3V9L10 2Z" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    {onDeleteLog && (
                      <button onClick={() => handleDelete(log.id)} disabled={isDeleting === log.id} className="p-2 rounded-lg transition-all hover:bg-white/70">
                        {isDeleting === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#D4A5A5' }} /> : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4H11M5 4V3C5 2.5 5.5 2 6 2H8C8.5 2 9 2.5 9 3V4M6 6.5V10.5M8 6.5V10.5M4 4L4.5 11C4.5 11.5 5 12 5.5 12H8.5C9 12 9.5 11.5 9.5 11L10 4" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {logs.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: '#6F6A66' }} className="text-sm">No sleep logs yet</p>
            <p style={{ color: '#A7A29C' }} className="text-xs mt-1">Start tracking your sleep above</p>
          </div>
        )}
      </section>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md border-0" style={{ backgroundColor: '#FAFAF8', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#2D2B29' }}>Edit Sleep Log — {editingLog && format(parseISO(editingLog.date), "MMM d, yyyy")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm font-medium" style={{ color: '#2D2B29' }}>Sleep Quality</label>
                <span className="text-sm font-semibold" style={{ color: 'rgba(60, 131, 246, 0.85)' }}>{editSleepQuality}/10</span>
              </div>
              <Slider value={[editSleepQuality]} onValueChange={(v) => setEditSleepQuality(v[0])} min={1} max={10} step={1} className="[&_[role=slider]]:bg-[rgba(60,131,246,0.85)] [&_[role=slider]]:border-0"/>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm font-medium" style={{ color: '#2D2B29' }}>Morning Comfort</label>
                <span className="text-sm font-semibold" style={{ color: 'rgba(60, 131, 246, 0.85)' }}>{editComfortLevel}/10</span>
              </div>
              <Slider value={[editComfortLevel]} onValueChange={(v) => setEditComfortLevel(v[0])} min={1} max={10} step={1} className="[&_[role=slider]]:bg-[rgba(60,131,246,0.85)] [&_[role=slider]]:border-0"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A7A29C' }}>Minutes to Sleep</label>
                <Input type="number" value={editTimeToSleep} onChange={(e) => setEditTimeToSleep(e.target.value)} className="mt-1.5 border-0 bg-white/80"/>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A7A29C' }}>Wake-ups</label>
                <Input type="number" value={editWakeUps} onChange={(e) => setEditWakeUps(e.target.value)} className="mt-1.5 border-0 bg-white/80"/>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setEditFeltHot(!editFeltHot)} className="px-4 py-2 rounded-full text-sm font-medium transition-all" style={{ backgroundColor: editFeltHot ? 'rgba(60, 131, 246, 0.15)' : '#F7F7F6', color: editFeltHot ? 'rgba(60, 131, 246, 0.90)' : '#6F6A66' }}>Felt warm</button>
              <button type="button" onClick={() => setEditFeltStressed(!editFeltStressed)} className="px-4 py-2 rounded-full text-sm font-medium transition-all" style={{ backgroundColor: editFeltStressed ? 'rgba(60, 131, 246, 0.15)' : '#F7F7F6', color: editFeltStressed ? 'rgba(60, 131, 246, 0.90)' : '#6F6A66' }}>Felt stressed</button>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A7A29C' }}>Notes</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="mt-1.5 border-0 bg-white/80 min-h-[80px]"/>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} style={{ color: '#6F6A66' }}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} style={{ backgroundColor: 'rgba(60, 131, 246, 0.85)', color: '#FFFFFF' }}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}