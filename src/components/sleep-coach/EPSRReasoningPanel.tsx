import { useState } from "react";
import { Brain, AlertTriangle, Beaker, BookOpen, ChevronDown, ChevronUp, Lightbulb, HelpCircle, CheckCircle2, XCircle, History, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEPSR, EPSROutput, EPSRPatternCandidate, EPSRExperiment, EPSRFoundationItem } from "@/hooks/useEPSR";
import { format } from "date-fns";

// Mode badge colors
const MODE_STYLES: Record<EPSROutput["mode"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  cold_start: { label: "Cold Start", variant: "secondary" },
  foundation: { label: "Foundation", variant: "outline" },
  normal: { label: "Normal", variant: "default" },
  clinical_guardrail: { label: "Clinical Guardrail", variant: "destructive" },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-green-500/10 text-green-700 border-green-500/20",
  MODERATE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  LOW: "bg-muted text-muted-foreground border-muted",
  EMERGING: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

function PatternCard({ pattern, index }: { pattern: EPSRPatternCandidate; index: number }) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-l-4 border-l-primary/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Pattern {index + 1}</span>
                  <Badge variant="outline" className={CONFIDENCE_STYLES[pattern.confidence]}>
                    {pattern.confidence}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{pattern.hypothesis}</p>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Why it fits</p>
              <p className="text-sm">{pattern.why_it_fits}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Falsification</p>
              <p className="text-sm text-muted-foreground">{pattern.falsification}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ExperimentCard({ experiment }: { experiment: EPSRExperiment }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Proposed Experiment</CardTitle>
          <Badge variant="outline">{experiment.duration_days} days</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Protocol</p>
          <p className="text-sm">{experiment.protocol}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What to Log</p>
            <ul className="text-sm space-y-1">
              {experiment.what_to_log.map((item, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Success
              </p>
              <p className="text-xs">{experiment.success_criteria}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Failure
              </p>
              <p className="text-xs">{experiment.failure_criteria}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Decision Rule</p>
          <p className="text-sm font-medium">{experiment.decision_rule}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FoundationItems({ items }: { items: EPSRFoundationItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Foundation Baseline</CardTitle>
        </div>
        <CardDescription>High-confidence baseline actions while we collect more signal</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-fit">{item.evidence_id}</Badge>
              <div>
                <p className="text-sm font-medium">{item.action}</p>
                <p className="text-xs text-muted-foreground">{item.rationale}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EPSROutputDisplay({ output }: { output: EPSROutput }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showUncertainty, setShowUncertainty] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header with mode and safety */}
      <div className="flex items-center justify-between">
        <Badge variant={MODE_STYLES[output.mode].variant}>
          {MODE_STYLES[output.mode].label}
        </Badge>
        <p className="text-xs text-muted-foreground">{output.safety_scope}</p>
      </div>

      {/* Clinical Warning */}
      {output.clinical_flags && output.clinical_flags.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Clinical Consideration</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Some signals you've described may benefit from professional evaluation. 
                  This system provides educational reasoning, not medical advice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Signals */}
      {output.current_signals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Signals (Facts Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {output.current_signals.map((signal, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  {signal}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pattern Candidates */}
      {output.pattern_candidates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Pattern Candidates</h3>
          {output.pattern_candidates.map((pattern, i) => (
            <PatternCard key={i} pattern={pattern} index={i} />
          ))}
        </div>
      )}

      {/* Interpretation */}
      {output.interpretation && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm">{output.interpretation}</p>
          </CardContent>
        </Card>
      )}

      {/* Evidence Links (Collapsible) */}
      {output.evidence_links.length > 0 && (
        <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Evidence Links ({output.evidence_links.length})
              </span>
              {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {output.evidence_links.map((link, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Badge variant="outline" className={`shrink-0 ${CONFIDENCE_STYLES[link.confidence_level]}`}>
                    {link.evidence_id}
                  </Badge>
                  <p className="text-xs">{link.relevance}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Uncertainty & Missing (Collapsible) */}
      {output.uncertainty_missing.length > 0 && (
        <Collapsible open={showUncertainty} onOpenChange={setShowUncertainty}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Uncertainty & Missing Signals ({output.uncertainty_missing.length})
              </span>
              {showUncertainty ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              {output.uncertainty_missing.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Separator />

      {/* Experiment */}
      {output.experiment && <ExperimentCard experiment={output.experiment} />}

      {/* Foundation Items */}
      {output.foundation_items && output.foundation_items.length > 0 && (
        <FoundationItems items={output.foundation_items} />
      )}
    </div>
  );
}

export function EPSRReasoningPanel() {
  const { 
    output, 
    isLoading, 
    error, 
    runReasoning, 
    clearOutput, 
    history, 
    loadingHistory, 
    loadHistoricalRun,
    selectedHistoryId 
  } = useEPSR();
  const [question, setQuestion] = useState("");

  const handleRunReasoning = () => {
    runReasoning(question || undefined);
  };

  const handleHistorySelect = (value: string) => {
    if (value === "new") {
      clearOutput();
    } else {
      loadHistoricalRun(value);
    }
  };

  const formatHistoryLabel = (item: { id: string; created_at: string; user_question: string | null; mode: string }) => {
    const date = format(new Date(item.created_at), "MMM d, yyyy HH:mm");
    const question = item.user_question 
      ? item.user_question.length > 40 
        ? item.user_question.substring(0, 40) + "..." 
        : item.user_question
      : "No question";
    return `${date} — ${question}`;
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Evidence-Bound Sleep Reasoner</CardTitle>
          </div>
          <CardDescription>
            Structured reasoning based on your sleep data and curated scientific evidence.
            Not medical advice — educational exploration of your patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* History Dropdown */}
          {history.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" />
                Previous Sessions
              </label>
              <Select 
                value={selectedHistoryId || "new"} 
                onValueChange={handleHistorySelect}
                disabled={loadingHistory || isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a previous run or start new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      New Reasoning Session
                    </span>
                  </SelectItem>
                  {history.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatHistoryLabel(item)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Textarea
            placeholder="Optional: Ask a specific question about your sleep patterns..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[80px]"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button onClick={handleRunReasoning} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Reasoning...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run Reasoning
                </>
              )}
            </Button>
            {output && (
              <Button variant="outline" onClick={clearOutput}>
                Clear
              </Button>
            )}
          </div>
          {selectedHistoryId && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <History className="h-3 w-3" />
              Viewing historical run. Click "Run Reasoning" to create a new session.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Output Display */}
      {output && <EPSROutputDisplay output={output} />}
    </div>
  );
}
