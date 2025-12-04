import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Moon, TrendingUp, TrendingDown, Minus, Heart, Thermometer, Brain } from "lucide-react";
import { format, subDays } from "date-fns";

interface SleepLog {
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot?: boolean;
  felt_stressed?: boolean;
  notes?: string;
}

interface CoachPlan {
  encouragement_message?: string;
  main_focus_this_week?: string[];
  spine_health_score?: number;
  sleep_plan?: Record<string, { focus?: string; tip?: string }>;
}

interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  trend: 'improving' | 'stable' | 'worsening';
  hotNights: number;
  stressedNights: number;
  goodNights: number;
  poorNights: number;
}

interface SleepReportSummaryProps {
  logs: SleepLog[];
  trends: TrendData;
  plan: CoachPlan | null;
  email: string;
}

export const SleepReportSummary = ({ logs, trends, plan }: SleepReportSummaryProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const weekStart = format(subDays(new Date(), 7), 'MMM d');
  const weekEnd = format(new Date(), 'MMM d, yyyy');

  const getTrendIcon = () => {
    switch (trends.trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'worsening': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trends.trend) {
      case 'improving': return 'text-green-600';
      case 'worsening': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getQualityLabel = (score: number) => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Poor';
  };

  const handleShare = async () => {
    const shareText = `My Weekly Sleep Report (${weekStart} - ${weekEnd})
    
📊 Sleep Quality: ${trends.avgSleepQuality.toFixed(1)}/5 (${getQualityLabel(trends.avgSleepQuality)})
📈 Trend: ${trends.trend.charAt(0).toUpperCase() + trends.trend.slice(1)}
🌙 Good Nights: ${trends.goodNights}/${logs.length}
💪 Pain Level: ${trends.avgPain.toFixed(1)}/10
🦴 Spine Health Score: ${plan?.spine_health_score || 'N/A'}

Powered by Rise By Night AI Sleep Coach`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Weekly Sleep Report', text: shareText });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('Report copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="w-4 h-4" />
          Share Report
        </Button>
      </div>

      <div ref={reportRef} className="bg-white p-6 rounded-xl space-y-6">
        <div className="text-center border-b pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Moon className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Weekly Sleep Report</h2>
          </div>
          <p className="text-muted-foreground">{weekStart} - {weekEnd}</p>
          <p className="text-sm text-muted-foreground mt-1">Rise By Night AI Sleep Coach</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{trends.avgSleepQuality.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Quality /5</p>
              <p className="text-xs font-medium text-primary mt-1">{getQualityLabel(trends.avgSleepQuality)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary/50 border-secondary">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon()}
                <p className={`text-xl font-bold capitalize ${getTrendColor()}`}>{trends.trend}</p>
              </div>
              <p className="text-sm text-muted-foreground">Weekly Trend</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{trends.goodNights}</p>
              <p className="text-sm text-muted-foreground">Good Nights</p>
              <p className="text-xs text-green-600 mt-1">Quality 4-5</p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{trends.avgPain.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Pain /10</p>
              <p className="text-xs text-orange-600 mt-1">{trends.avgPain <= 3 ? 'Low' : trends.avgPain <= 6 ? 'Moderate' : 'High'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-red-500" />
                Sleep Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hot Nights</span>
                <span className="font-semibold">{trends.hotNights} of {logs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stressed Nights</span>
                <span className="font-semibold">{trends.stressedNights} of {logs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Poor Quality Nights</span>
                <span className="font-semibold">{trends.poorNights} of {logs.length}</span>
              </div>
            </CardContent>
          </Card>

          {plan?.spine_health_score && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Spine Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/20" />
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${(plan.spine_health_score / 100) * 226} 226`} className="text-primary" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{plan.spine_health_score}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {plan.spine_health_score >= 80 ? 'Excellent alignment! Keep up the great work.' :
                       plan.spine_health_score >= 60 ? 'Good progress! Continue following your plan.' :
                       'Room for improvement. Focus on your daily tasks.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {plan && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Coach Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.encouragement_message && (
                <p className="text-foreground italic">"{plan.encouragement_message}"</p>
              )}
              {plan.main_focus_this_week && plan.main_focus_this_week.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Focus Areas This Week:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {plan.main_focus_this_week.map((focus, i) => (
                      <li key={i}>{focus}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Daily Sleep Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1">Date</th>
                      <th className="text-center py-2 px-1">Quality</th>
                      <th className="text-center py-2 px-1">Pain</th>
                      <th className="text-center py-2 px-1">Hot</th>
                      <th className="text-center py-2 px-1">Stressed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 7).map((log, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-1">{format(new Date(log.date), 'EEE, MMM d')}</td>
                        <td className="text-center py-2 px-1">
                          <span className={`font-medium ${log.sleep_quality >= 4 ? 'text-green-600' : log.sleep_quality >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {log.sleep_quality}/5
                          </span>
                        </td>
                        <td className="text-center py-2 px-1">{log.pain_level_morning}/10</td>
                        <td className="text-center py-2 px-1">{log.felt_hot ? '🔥' : '—'}</td>
                        <td className="text-center py-2 px-1">{log.felt_stressed ? '😰' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4 border-t text-xs text-muted-foreground">
          <p>Generated by Rise By Night AI Sleep Coach</p>
          <p className="mt-1">www.risebynight.com</p>
        </div>
      </div>
    </div>
  );
};

export default SleepReportSummary;