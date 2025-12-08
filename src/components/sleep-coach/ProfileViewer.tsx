import { SleepProfile, SleepAssessment, QuizData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, Bed, Thermometer, Brain, Sun, Package, Check, MessageCircle,
  AlertTriangle, Lightbulb, Target, Moon, Volume2, Clock, Activity,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";

interface ProfileViewerProps {
  profile: SleepProfile | null;
}

export const ProfileViewer = ({ profile }: ProfileViewerProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assessment: true,
    quizDetails: false,
  });

  if (!profile) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          No profile found. Create one to get personalized recommendations.
        </CardContent>
      </Card>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const positionIcons: Record<string, string> = {
    side: "🛏️ Side",
    back: "🔙 Back",
    stomach: "⬇️ Stomach",
    mixed: "🔄 Mixed",
  };

  const temperatureColors: Record<string, string> = {
    cold: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    neutral: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    warm: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  };

  const stressColors: Record<string, string> = {
    low: "bg-green-500/20 text-green-700 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    high: "bg-red-500/20 text-red-700 border-red-500/30",
  };

  const wakeUpColors: Record<string, string> = {
    energized: "bg-green-500/20 text-green-700 border-green-500/30",
    neutral: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    tired: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    stiff: "bg-red-500/20 text-red-700 border-red-500/30",
  };

  const assessment = profile.sleep_assessment as SleepAssessment | undefined;
  const quizData = profile.quiz_data as QuizData | undefined;
  const scores = assessment?.scores;

  const formatLabel = (value: string | undefined) => {
    if (!value) return "Not specified";
    return value.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Your Sleep Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core Profile Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Bed className="h-3 w-3" /> Sleep Position
              </div>
              <div className="font-medium">{positionIcons[profile.sleep_position] || profile.sleep_position}</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> Temperature
              </div>
              <Badge variant="outline" className={temperatureColors[profile.temperature_preference]}>
                {profile.temperature_preference.charAt(0).toUpperCase() + profile.temperature_preference.slice(1)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" /> Stress Level
              </div>
              <Badge variant="outline" className={stressColors[profile.stress_level]}>
                {profile.stress_level.charAt(0).toUpperCase() + profile.stress_level.slice(1)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sun className="h-3 w-3" /> Wake Up Feeling
              </div>
              <Badge variant="outline" className={wakeUpColors[profile.wake_up_condition]}>
                {profile.wake_up_condition.charAt(0).toUpperCase() + profile.wake_up_condition.slice(1)}
              </Badge>
            </div>
          </div>

          {profile.pain_points && profile.pain_points.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-2">Pain Points</div>
              <div className="flex flex-wrap gap-2">
                {profile.pain_points.map((point, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Products Owned */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Package className="h-3 w-3" /> Products Owned
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ergonomic_pillow', name: 'Ergonomic Pillow', icon: '🛏️' },
                { id: 'knee_pillow', name: 'Knee Pillow', icon: '🦵' },
                { id: 'sleep_mask', name: 'Sleep Mask', icon: '😴' },
              ].map((product) => {
                const isOwned = profile.products_owned?.includes(product.id);
                return (
                  <div
                    key={product.id}
                    className={`relative flex flex-col items-center p-2 rounded-lg border text-center transition-all ${
                      isOwned
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'bg-muted/30 border-border/30 text-muted-foreground opacity-50'
                    }`}
                  >
                    {isOwned && (
                      <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-lg mb-1">{product.icon}</span>
                    <span className="text-[10px] leading-tight">{product.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Status */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> WhatsApp Updates
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={profile.whatsapp_enabled 
                  ? "bg-green-500/20 text-green-700 border-green-500/30" 
                  : "bg-gray-500/20 text-gray-700 border-gray-500/30"
                }
              >
                {profile.whatsapp_enabled ? "Enabled" : "Disabled"}
              </Badge>
              {profile.whatsapp_enabled && profile.whatsapp_phone && (
                <span className="text-xs text-muted-foreground">{profile.whatsapp_phone}</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <div>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Sleep Assessment Card */}
      {assessment && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader 
            className="pb-2 cursor-pointer" 
            onClick={() => toggleSection('assessment')}
          >
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Sleep Assessment
              </div>
              {expandedSections.assessment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          
          {expandedSections.assessment && (
            <CardContent className="space-y-4">
              {/* Expert Summary */}
              {assessment.expertSummary && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm leading-relaxed">{assessment.expertSummary}</p>
                </div>
              )}

              {/* Scores */}
              {scores && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Sleep Scores</div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Alignment
                        </span>
                        <span className="font-medium">{scores.alignmentScore}/100</span>
                      </div>
                      <Progress value={scores.alignmentScore} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Moon className="h-3 w-3" /> Environment
                        </span>
                        <span className="font-medium">{scores.environmentScore}/100</span>
                      </div>
                      <Progress value={scores.environmentScore} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Consistency
                        </span>
                        <span className="font-medium">{scores.consistencyScore}/100</span>
                      </div>
                      <Progress value={scores.consistencyScore} className="h-2" />
                    </div>
                  </div>
                </div>
              )}

              {/* Detected Issues */}
              {assessment.detectedIssues && assessment.detectedIssues.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Detected Issues
                  </div>
                  <div className="space-y-1">
                    {assessment.detectedIssues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                        <span className="text-yellow-600">•</span>
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alignment Insights */}
              {assessment.alignmentInsights && assessment.alignmentInsights.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Insights
                  </div>
                  <div className="space-y-1">
                    {assessment.alignmentInsights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                        <span className="text-blue-600">💡</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {assessment.recommendations && assessment.recommendations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recommended Products</div>
                  <div className="space-y-2">
                    {assessment.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{rec.product}</span>
                          <Badge 
                            variant="outline" 
                            className={rec.priority === 'high' 
                              ? 'bg-red-500/20 text-red-700 border-red-500/30 text-xs'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs'
                              : 'bg-gray-500/20 text-gray-700 border-gray-500/30 text-xs'
                            }
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Quiz Details Card */}
      {quizData && Object.keys(quizData).length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader 
            className="pb-2 cursor-pointer" 
            onClick={() => toggleSection('quizDetails')}
          >
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Full Assessment Details
              </div>
              {expandedSections.quizDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          
          {expandedSections.quizDetails && (
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {quizData.movesOften && (
                  <div>
                    <div className="text-xs text-muted-foreground">Movement Frequency</div>
                    <div className="font-medium">{formatLabel(quizData.movesOften)}</div>
                  </div>
                )}
                {quizData.pillowCount && (
                  <div>
                    <div className="text-xs text-muted-foreground">Pillow Count</div>
                    <div className="font-medium">{quizData.pillowCount}</div>
                  </div>
                )}
                {quizData.mattressFirmness && (
                  <div>
                    <div className="text-xs text-muted-foreground">Mattress Firmness</div>
                    <div className="font-medium">{formatLabel(quizData.mattressFirmness)}</div>
                  </div>
                )}
                {quizData.roomBrightness && (
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Moon className="h-3 w-3" /> Room Brightness
                    </div>
                    <div className="font-medium">{formatLabel(quizData.roomBrightness)}</div>
                  </div>
                )}
                {quizData.roomNoise && (
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Volume2 className="h-3 w-3" /> Room Noise
                    </div>
                    <div className="font-medium">{formatLabel(quizData.roomNoise)}</div>
                  </div>
                )}
                {quizData.sleepLatency && (
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time to Fall Asleep
                    </div>
                    <div className="font-medium">{formatLabel(quizData.sleepLatency)}</div>
                  </div>
                )}
                {quizData.nightAwakenings && (
                  <div>
                    <div className="text-xs text-muted-foreground">Night Awakenings</div>
                    <div className="font-medium">{formatLabel(quizData.nightAwakenings)}</div>
                  </div>
                )}
                {quizData.sleepHours && (
                  <div>
                    <div className="text-xs text-muted-foreground">Sleep Hours</div>
                    <div className="font-medium">{quizData.sleepHours} hours</div>
                  </div>
                )}
                {quizData.snoring && (
                  <div>
                    <div className="text-xs text-muted-foreground">Snoring</div>
                    <div className="font-medium">{formatLabel(quizData.snoring)}</div>
                  </div>
                )}
                {quizData.eveningScreenUse && (
                  <div>
                    <div className="text-xs text-muted-foreground">Evening Screen Use</div>
                    <div className="font-medium">{formatLabel(quizData.eveningScreenUse)}</div>
                  </div>
                )}
                {quizData.pillowSatisfaction !== undefined && (
                  <div>
                    <div className="text-xs text-muted-foreground">Pillow Satisfaction</div>
                    <div className="font-medium">{quizData.pillowSatisfaction}/10</div>
                  </div>
                )}
                {quizData.painSeverity !== undefined && (
                  <div>
                    <div className="text-xs text-muted-foreground">Pain Severity</div>
                    <div className="font-medium">{quizData.painSeverity}/10</div>
                  </div>
                )}
              </div>

              {/* Array fields */}
              {quizData.sleepGoals && quizData.sleepGoals.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">Sleep Goals</div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.sleepGoals.map((goal, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.sleepEquipment && quizData.sleepEquipment.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">Current Sleep Equipment</div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.sleepEquipment.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.triedMethods && quizData.triedMethods.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">Previously Tried Methods</div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.triedMethods.map((method, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};