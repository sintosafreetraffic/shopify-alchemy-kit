import { SleepProfile, SleepAssessment, QuizData } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, Bed, Thermometer, Brain, Sun, Package, Check, MessageCircle,
  AlertTriangle, Lightbulb, Target, Moon, Volume2, Clock, Activity,
  ChevronDown, ChevronUp, Sparkles, Heart, Zap, TrendingUp
} from "lucide-react";
import { useState } from "react";

interface ProfileViewerProps {
  profile: SleepProfile | null;
}

export const ProfileViewer = ({ profile }: ProfileViewerProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assessment: true,
    quizDetails: true, // Default expanded
    feedback: true,
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

  const formatLabel = (value: string | undefined | null) => {
    if (!value) return "Not specified";
    return value.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Generate personalized AI feedback based on profile data
  const generatePersonalizedFeedback = () => {
    const feedbackParts: string[] = [];
    const positionName = profile.sleep_position === 'side' ? 'side sleeper' : 
                         profile.sleep_position === 'back' ? 'back sleeper' :
                         profile.sleep_position === 'stomach' ? 'stomach sleeper' : 'dynamic sleeper';
    
    // Opening based on sleep position
    if (profile.sleep_position === 'back') {
      feedbackParts.push(`As a ${positionName}, you're already in one of the best positions for spinal alignment.`);
    } else if (profile.sleep_position === 'side') {
      feedbackParts.push(`As a ${positionName}, you're among the majority of healthy sleepers. Side sleeping is excellent for reducing snoring and promoting digestion.`);
    } else if (profile.sleep_position === 'stomach') {
      feedbackParts.push(`As a ${positionName}, your spine faces unique challenges, but with the right support, you can still achieve quality rest.`);
    } else {
      feedbackParts.push(`As a ${positionName} who moves throughout the night, your body is naturally seeking the most comfortable position.`);
    }

    // Score-based feedback
    if (scores) {
      const avgScore = (scores.alignmentScore + scores.environmentScore + scores.consistencyScore) / 3;
      if (avgScore >= 80) {
        feedbackParts.push("Your sleep foundation is strong! Small optimizations can take your rest to the next level.");
      } else if (avgScore >= 60) {
        feedbackParts.push("You have good sleep habits with room for targeted improvements that can significantly boost your energy levels.");
      } else {
        feedbackParts.push("There's excellent potential to transform your sleep quality. Even modest changes can lead to noticeable improvements in how you feel each day.");
      }
    }

    // Pain-based encouragement
    if (profile.pain_points && profile.pain_points.length > 0) {
      const painAreas = profile.pain_points.slice(0, 2).map(p => formatLabel(p).toLowerCase()).join(' and ');
      feedbackParts.push(`We've identified your ${painAreas} discomfort as key areas to address. Research shows that proper sleep positioning can reduce morning pain by up to 60% within 2-3 weeks.`);
    }

    // Wake-up condition motivation
    if (profile.wake_up_condition === 'stiff' || profile.wake_up_condition === 'tired') {
      feedbackParts.push("Waking up feeling refreshed is absolutely achievable with the right approach. Your personalized plan targets the specific factors contributing to morning fatigue.");
    }

    // Positive closing
    feedbackParts.push("Remember: quality sleep is the foundation of your daily energy, focus, and long-term health. Every night is an opportunity to invest in yourself. 💪");

    return feedbackParts.join(" ");
  };

  // Quiz data field mappings with icons and labels
  const quizFieldMappings = [
    { key: 'sleepPosition', label: 'Sleep Position', icon: Bed },
    { key: 'movesOften', label: 'Movement Frequency', icon: Activity },
    { key: 'pillowCount', label: 'Number of Pillows', icon: Bed },
    { key: 'mattressFirmness', label: 'Mattress Firmness', icon: Bed },
    { key: 'sleepTemperature', label: 'Temperature Preference', icon: Thermometer },
    { key: 'roomBrightness', label: 'Room Brightness', icon: Moon },
    { key: 'roomNoise', label: 'Room Noise Level', icon: Volume2 },
    { key: 'sleepLatency', label: 'Time to Fall Asleep', icon: Clock },
    { key: 'sleepHours', label: 'Hours of Sleep', icon: Clock },
    { key: 'nightAwakenings', label: 'Night Awakenings', icon: Activity },
    { key: 'eveningScreenUse', label: 'Evening Screen Use', icon: Sun },
    { key: 'snoring', label: 'Snoring Frequency', icon: Volume2 },
    { key: 'sleepClothing', label: 'Sleep Clothing', icon: User },
    { key: 'ageGroup', label: 'Age Group', icon: User },
    { key: 'gender', label: 'Gender', icon: User },
    { key: 'pillowSatisfaction', label: 'Pillow Satisfaction', icon: Target, isScore: true, max: 10 },
    { key: 'painSeverity', label: 'Pain Severity', icon: AlertTriangle, isScore: true, max: 10 },
  ];

  return (
    <div className="space-y-4">
      {/* Personalized AI Feedback Card */}
      {(assessment || quizData) && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
          <CardHeader 
            className="pb-2 cursor-pointer" 
            onClick={() => toggleSection('feedback')}
          >
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Your Personalized Sleep Insights
              </div>
              {expandedSections.feedback ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          
          {expandedSections.feedback && (
            <CardContent className="space-y-4">
              {/* AI-generated personalized feedback */}
              <div className="p-4 bg-background/60 rounded-lg border border-primary/20">
                <p className="text-sm leading-relaxed text-foreground">
                  {generatePersonalizedFeedback()}
                </p>
              </div>

              {/* Quick impact stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Heart className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-green-700">+23%</div>
                  <div className="text-[10px] text-muted-foreground">Avg. Energy Increase</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Zap className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-blue-700">-45%</div>
                  <div className="text-[10px] text-muted-foreground">Less Morning Pain</div>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-purple-700">2-3</div>
                  <div className="text-[10px] text-muted-foreground">Weeks to Results</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
                    {formatLabel(point)}
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

      {/* Full Quiz Details Card */}
      {quizData && Object.keys(quizData).length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader 
            className="pb-2 cursor-pointer" 
            onClick={() => toggleSection('quizDetails')}
          >
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Full Assessment Answers
              </div>
              {expandedSections.quizDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          
          {expandedSections.quizDetails && (
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                These are your complete responses from the sleep assessment quiz.
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {quizFieldMappings.map(({ key, label, icon: Icon, isScore, max }) => {
                  const value = quizData[key as keyof QuizData];
                  if (value === undefined || value === null) return null;
                  
                  return (
                    <div key={key} className="p-2 bg-muted/30 rounded-lg">
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Icon className="h-3 w-3" /> {label}
                      </div>
                      {isScore ? (
                        <div className="flex items-center gap-2">
                          <Progress value={(Number(value) / (max || 10)) * 100} className="h-2 flex-1" />
                          <span className="font-medium text-xs">{value}/{max || 10}</span>
                        </div>
                      ) : (
                        <div className="font-medium">{formatLabel(String(value))}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Array fields */}
              {quizData.painAreas && quizData.painAreas.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Pain Areas
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.painAreas.map((area, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                        {formatLabel(area)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.sleepGoals && quizData.sleepGoals.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Sleep Goals
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.sleepGoals.map((goal, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                        {formatLabel(goal)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.sleepEquipment && quizData.sleepEquipment.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Current Sleep Equipment
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.sleepEquipment.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {formatLabel(item)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.coSleeping && quizData.coSleeping.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <User className="h-3 w-3" /> Sleeping Arrangement
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.coSleeping.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {formatLabel(item)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.triedMethods && quizData.triedMethods.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Previously Tried Methods
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.triedMethods.map((method, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {formatLabel(method)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quizData.pillowIssues && quizData.pillowIssues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Pillow Issues
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizData.pillowIssues.map((issue, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                        {formatLabel(issue)}
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
