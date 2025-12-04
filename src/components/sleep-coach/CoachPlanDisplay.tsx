import { CoachPlan } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, FileText, Clock, Heart, Target, Loader2 } from "lucide-react";

interface CoachPlanDisplayProps {
  plan: CoachPlan | null;
  onGeneratePlan: () => void;
  loading?: boolean;
}

export const CoachPlanDisplay = ({ plan, onGeneratePlan, loading }: CoachPlanDisplayProps) => {
  // Check if plan exists but has empty sleep_plan data
  const hasPlanData = plan?.sleep_plan && Object.keys(plan.sleep_plan).length > 0;
  
  if (!plan || !hasPlanData) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generating Your Sleep Plan...</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our AI is creating a personalized 7-day plan based on your profile.
              </p>
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Sleep Plan Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate a personalized AI sleep plan based on your profile and sleep logs.
              </p>
              <Button onClick={onGeneratePlan} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Sleep Plan
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const weeklyPlan = plan.sleep_plan || {};
  const days = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Personalized Sleep Plan
          </span>
          <div className="flex items-center gap-2">
            {plan.spine_health_score && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Spine Score: {plan.spine_health_score}/100
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onGeneratePlan} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
        </CardTitle>
        {plan.valid_until && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(plan.valid_until) < new Date() 
              ? "Plan expired - generating new plan automatically"
              : `Plan valid until ${new Date(plan.valid_until).toLocaleDateString()}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Encouragement Message */}
        {plan.encouragement_message && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{plan.encouragement_message}</p>
            </div>
          </div>
        )}

        {/* Focus Areas */}
        {plan.main_focus_this_week && plan.main_focus_this_week.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Target className="h-4 w-4 text-primary" />
              This Week's Focus
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.main_focus_this_week.map((focus, i) => (
                <Badge key={i} variant="secondary">
                  {focus}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="today">
              <Clock className="h-4 w-4 mr-2" />
              Today
            </TabsTrigger>
            <TabsTrigger value="resources">
              <FileText className="h-4 w-4 mr-2" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-3">
            {days.map((day, i) => {
              const dayPlan = weeklyPlan[day];
              if (!dayPlan) return null;
              
              return (
                <div key={day} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{dayNames[i]}</span>
                    {dayPlan.focus && (
                      <Badge variant="outline" className="text-xs">
                        {dayPlan.focus}
                      </Badge>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {dayPlan.morningTask && (
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-500">☀️</span>
                        <span className="text-muted-foreground">{dayPlan.morningTask}</span>
                      </div>
                    )}
                    {dayPlan.eveningTask && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500">🌙</span>
                        <span className="text-muted-foreground">{dayPlan.eveningTask}</span>
                      </div>
                    )}
                  </div>
                  {dayPlan.tip && (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      💡 {dayPlan.tip}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="today">
            {plan.recommended_actions_today && plan.recommended_actions_today.length > 0 ? (
              <div className="space-y-3">
                {plan.recommended_actions_today.map((action: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={action.time === 'morning' ? 'text-2xl' : 'text-2xl'}>
                        {action.time === 'morning' ? '☀️' : '🌙'}
                      </span>
                      <div>
                        <div className="font-medium">{action.action}</div>
                        {action.duration && (
                          <div className="text-xs text-muted-foreground">{action.duration}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No specific actions for today. Check the weekly schedule!
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources">
            {plan.recommended_pdfs && plan.recommended_pdfs.length > 0 ? (
              <div className="space-y-2">
                {plan.recommended_pdfs.map((pdf, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>{pdf}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No resources recommended yet.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          <span>Generated: {new Date(plan.generated_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};
