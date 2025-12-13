// Performance: SleepQuiz split into smaller components for better code splitting
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Moon, ArrowLeft, ArrowRight, RotateCcw, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { trackQuizStarted } from "@/lib/klaviyo";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QuizProgress,
  QuizQuestion,
  QuizEmailStep,
  QuizLoading,
  QuizResults,
  QUIZ_QUESTIONS,
  type QuizAnswers,
  type AnalysisResult,
  type QuizPayload,
  type SleepAssessment,
  getVisibleQuestions,
  getCurrentSectionInfo,
  getContextualInsight,
  isValidEmail,
  cacheQuizResults,
  getCachedQuizResults,
  clearQuizCache,
  CURRENT_QUIZ_VERSION,
} from "@/components/sleep-quiz";

const SleepQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    sleepEquipment: [],
    painAreas: [],
    coSleeping: [],
    sleepGoals: [],
    triedMethods: [],
    painSeverity: 5,
    pillowSatisfaction: 5,
  });
  const [email, setEmail] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const isRetake = searchParams.get('mode') === 'retake';
  const shouldNotifyQuizUpdated = searchParams.get('quizUpdated') === 'true';
  const { addItem, setCartOpen } = useCartStore();

  // Account creation state
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cache restoration state
  const [hasCachedData, setHasCachedData] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [showCachedPrompt, setShowCachedPrompt] = useState(false);

  const visibleQuestions = getVisibleQuestions(answers);
  const TOTAL_STEPS = visibleQuestions.length + 1;
  const currentQuestion = step < visibleQuestions.length ? visibleQuestions[step] : null;
  const isEmailStep = step === visibleQuestions.length;
  const isResultsStep = step > visibleQuestions.length;
  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const sectionInfo = currentQuestion ? getCurrentSectionInfo(currentQuestion.id, answers) : null;

  // On mount: check for cached results or DB assessment
  useEffect(() => {
    // If explicit retake mode, clear cache and start fresh
    if (isRetake) {
      clearQuizCache();
      return;
    }

    // Check sessionStorage first (fast path)
    const cached = getCachedQuizResults();
    if (cached && cached.results) {
      setHasCachedData(true);
      setShowCachedPrompt(true);
      // Pre-hydrate state for when user clicks "View Results"
      setAnswers(cached.answers);
      setResults(cached.results);
      setEmail(cached.email || "");
      return;
    }

    // Check for authenticated user with DB assessment (fallback)
    const checkDbAssessment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        setIsLoadingFromDb(true);
        const { data: profile } = await supabase
          .from('sleep_profiles')
          .select('sleep_assessment, quiz_data, email')
          .eq('email', session.user.email.toLowerCase())
          .maybeSingle();

        if (profile?.sleep_assessment && typeof profile.sleep_assessment === 'object') {
          const assessment = profile.sleep_assessment as unknown as SleepAssessment;
          const quizData = profile.quiz_data as unknown as QuizAnswers | null;
          
          // Reconstruct results from DB
          const reconstructedResults: AnalysisResult = {
            assessment: assessment,
            recommendations: [],
            bundleRecommended: !!assessment.productRecommendations?.recommended_bundle,
            profileCreated: true,
          };

          setResults(reconstructedResults);
          setEmail(profile.email);
          if (quizData) setAnswers(quizData);
          setHasCachedData(true);
          setShowCachedPrompt(true);

          // Also cache to sessionStorage for future navigation
          cacheQuizResults(reconstructedResults, quizData || answers, profile.email);
        }
      } catch (e) {
        console.warn("[sleep-quiz] Failed to load DB assessment", e);
      } finally {
        setIsLoadingFromDb(false);
      }
    };

    checkDbAssessment();
  }, [isRetake]);

  useEffect(() => {
    if (!showCachedPrompt) {
      trackQuizStarted();
    }
    fetchProducts(50).then(setProducts).catch(console.error);
  }, [showCachedPrompt]);

  useEffect(() => {
    if (sectionInfo && sectionInfo.isLastInSection && !completedSections.includes(sectionInfo.sectionIndex)) {
      setCompletedSections(prev => [...prev, sectionInfo.sectionIndex]);
    }
  }, [sectionInfo, completedSections]);

  const handleRadioChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (question?.autoAdvance) {
      setTimeout(() => setStep(prev => prev + 1), 300);
    }
  }, []);

  const handleCheckboxChange = useCallback((questionId: string, value: string, maxSelections?: number) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (value === "none" || value === "nothing" || value === "alone") {
        return current.includes(value) ? { ...prev, [questionId]: [] } : { ...prev, [questionId]: [value] };
      }
      const filteredCurrent = current.filter(v => v !== "none" && v !== "nothing" && v !== "alone");
      if (filteredCurrent.includes(value)) {
        return { ...prev, [questionId]: filteredCurrent.filter(item => item !== value) };
      }
      if (maxSelections && filteredCurrent.length >= maxSelections) {
        toast.error(`Maximum ${maxSelections} selections allowed`);
        return prev;
      }
      return { ...prev, [questionId]: [...filteredCurrent, value] };
    });
  }, []);

  const handleSliderChange = useCallback((questionId: string, value: number[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value[0] }));
  }, []);

  const canProceed = useCallback(() => {
    if (isEmailStep) return isValidEmail(email);
    if (!currentQuestion) return false;
    if (currentQuestion.optional) return true;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === "checkbox") return Array.isArray(answer) && answer.length > 0;
    if (currentQuestion.type === "slider") return typeof answer === "number";
    return !!answer;
  }, [isEmailStep, email, currentQuestion, answers]);

  const handleBack = () => step > 0 && setStep(prev => prev - 1);
  const handleNext = async () => {
    if (!canProceed()) return;
    if (isEmailStep) {
      await analyzeQuiz();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const analyzeQuiz = async () => {
    setIsAnalyzing(true);
    setStep(prev => prev + 1);
    
    const quizPayload: QuizPayload = {
      sleepPosition: answers.sleepPosition as string || "",
      movesOften: answers.movesOften as string || "",
      pillowCount: answers.pillowCount as string || "",
      mattressFirmness: answers.mattressFirmness as string || "",
      sleepEquipment: answers.sleepEquipment as string[] || [],
      painAreas: answers.painAreas as string[] || [],
      painSeverity: answers.painSeverity as number ?? 0,
      nightAwakenings: answers.nightAwakenings as string || "",
      sleepTemperature: answers.sleepTemperature as string || "",
      roomBrightness: answers.roomBrightness as string || "",
      roomNoise: answers.roomNoise as string || "",
      sleepLatency: answers.sleepLatency as string || "",
      sleepHours: answers.sleepHours as string || "",
      eveningScreenUse: answers.eveningScreenUse as string || "",
      ageGroup: answers.ageGroup as string,
      gender: answers.gender as string,
      sleepClothing: answers.sleepClothing as string || "",
      coSleeping: answers.coSleeping as string[] || [],
      sleepGoals: answers.sleepGoals as string[] || [],
      snoring: answers.snoring as string || "",
      triedMethods: answers.triedMethods as string[] || [],
      pillowSatisfaction: answers.pillowSatisfaction as number ?? 5,
      email: email.trim(),
    };

    try {
      const { data, error } = await supabase.functions.invoke("analyze-sleep-quiz", {
        body: { answers: quizPayload, email: email.trim() },
      });

      if (error) throw error;
      const analysisResult = data as AnalysisResult;
      setResults(analysisResult);

      // Cache results to sessionStorage for navigation persistence
      cacheQuizResults(analysisResult, answers, email.trim());

      if (isValidEmail(email)) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klaviyo-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ email: email.trim(), properties: quizPayload }),
          });
        } catch (e) { console.warn("Klaviyo enrichment failed:", e); }
      }

      if (analysisResult.profileCreated) {
        toast.success("Sleep Coach profile created!");
      }
    } catch (error) {
      console.error("Quiz analysis error:", error);
      toast.error("Failed to analyze quiz");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProductByName = (productName: string) => {
    return products.find(p => p.node.title.toLowerCase().includes(productName.toLowerCase().replace('rise by night™ ', '')));
  };

  const handleAddToCart = async (productName: string) => {
    const product = getProductByName(productName);
    if (!product) { toast.error("Product not found"); return; }
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) { toast.error("Product variant not available"); return; }
    addItem({ product, variantId: variant.id, variantTitle: variant.title, price: variant.price, compareAtPrice: variant.compareAtPrice, quantity: 1, selectedOptions: variant.selectedOptions || [] });
    toast.success("Added to cart!");
    setCartOpen(true);
  };

  const handleUnlockSleepCoach = async () => {
    setShowAccountForm(true);
    setIsCheckingAccount(true);
    try {
      const { data } = await supabase.from('sleep_profiles').select('email').eq('email', email.toLowerCase().trim()).maybeSingle();
      setAccountExists(!!data);
    } catch { setAccountExists(false); }
    finally { setIsCheckingAccount(false); }
  };

  const handleAccountSubmit = async () => {
    if (!password.trim()) { toast.error("Please enter a password"); return; }
    setIsSubmitting(true);
    try {
      if (accountExists) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) { toast.error("Login failed", { description: error.message }); return; }
        toast.success("Logged in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
        if (error) { toast.error("Signup failed", { description: error.message }); return; }
        toast.success("Account created!");
      }
      navigate(isRetake || shouldNotifyQuizUpdated ? '/sleep-coach?quizUpdated=true' : '/sleep-coach');
    } catch { toast.error("Something went wrong."); }
    finally { setIsSubmitting(false); }
  };

  const handleForgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth?reset=true` });
    if (error) { toast.error("Failed to send reset email"); return; }
    toast.success("Password reset email sent!");
  };

  const contextualInsight = currentQuestion ? getContextualInsight(currentQuestion.id, answers) : null;

  // Handle viewing cached results
  const handleViewCachedResults = () => {
    setShowCachedPrompt(false);
    // Jump to results step
    setStep(visibleQuestions.length + 1);
  };

  // Handle retaking the quiz
  const handleRetakeQuiz = () => {
    clearQuizCache();
    setShowCachedPrompt(false);
    setHasCachedData(false);
    setResults(null);
    setAnswers({
      sleepEquipment: [],
      painAreas: [],
      coSleeping: [],
      sleepGoals: [],
      triedMethods: [],
      painSeverity: 5,
      pillowSatisfaction: 5,
    });
    setEmail("");
    setStep(0);
    trackQuizStarted();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Moon className="w-4 h-4" />
              Research-Based Assessment
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Sleep Assessment Quiz</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              {showCachedPrompt 
                ? "You've already completed your Sleep Assessment. View your results or take a fresh assessment."
                : "Answer these questions to receive personalized product recommendations and unlock your AI Sleep Coach."}
            </p>
          </div>

          {/* Loading from DB state */}
          {isLoadingFromDb && (
            <Card className="p-6 md:p-8 shadow-lg border-border/50 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">Loading your assessment...</p>
              </div>
            </Card>
          )}

          {/* Cached Results Prompt */}
          {showCachedPrompt && !isLoadingFromDb && (
            <Card className="p-6 md:p-8 shadow-lg border-border/50 backdrop-blur-sm">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Assessment Complete</h2>
                  <p className="text-muted-foreground">
                    Your personalized sleep assessment is ready. View your results to see product recommendations and unlock your AI Sleep Coach.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleViewCachedResults} className="h-12 px-8 rounded-xl">
                    <FileText className="w-4 h-4 mr-2" />
                    View My Results
                  </Button>
                  <Button variant="outline" onClick={handleRetakeQuiz} className="h-12 px-8 rounded-xl">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake Assessment
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Retaking will replace your current assessment with new answers.
                </p>
              </div>
            </Card>
          )}

          {/* Progress - only show when actively taking quiz */}
          {!isResultsStep && !showCachedPrompt && !isLoadingFromDb && (
            <QuizProgress sectionInfo={sectionInfo} progressPercent={progressPercent} completedSections={completedSections} isEmailStep={isEmailStep} />
          )}

          {/* Main Card - Quiz Questions */}
          {!showCachedPrompt && !isLoadingFromDb && (
            <Card className="p-6 md:p-8 shadow-lg border-border/50 backdrop-blur-sm">
              {currentQuestion && !isAnalyzing && (
                <QuizQuestion question={currentQuestion} answers={answers} contextualInsight={contextualInsight} onRadioChange={handleRadioChange} onCheckboxChange={handleCheckboxChange} onSliderChange={handleSliderChange} onContinue={handleNext} />
              )}

              {isEmailStep && !isAnalyzing && (
                <QuizEmailStep email={email} onEmailChange={setEmail} />
              )}

              {isAnalyzing && <QuizLoading />}

              {/* Results - extracted to QuizResults component */}
              {isResultsStep && results && !isAnalyzing && (
                <QuizResults
                  results={results}
                  answers={answers}
                  visibleQuestionCount={visibleQuestions.length}
                  isRetake={isRetake}
                  shouldNotifyQuizUpdated={shouldNotifyQuizUpdated}
                  email={email}
                  showAccountForm={showAccountForm}
                  setShowAccountForm={setShowAccountForm}
                  accountExists={accountExists}
                  isCheckingAccount={isCheckingAccount}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  isSubmitting={isSubmitting}
                  onUnlockSleepCoach={handleUnlockSleepCoach}
                  onAccountSubmit={handleAccountSubmit}
                  onForgotPassword={handleForgotPassword}
                  onGoToSleepCoach={() => navigate(isRetake || shouldNotifyQuizUpdated ? '/sleep-coach?quizUpdated=true' : '/sleep-coach')}
                  onBackToHome={() => navigate("/")}
                  onViewProducts={() => navigate("/product/ergonomic-pillow")}
                  onCancelAccountForm={() => { setShowAccountForm(false); setPassword(""); setAccountExists(null); }}
                />
              )}

              {/* Navigation Buttons */}
              {!isResultsStep && !isAnalyzing && (
                <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                  <Button variant="outline" onClick={handleBack} disabled={step === 0} className="flex-1 h-12 rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  {currentQuestion?.optional && currentQuestion.type === "radio" && (
                    <Button onClick={handleNext} variant="ghost" className="flex-1 h-12 rounded-xl">
                      Skip
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {isEmailStep && (
                    <Button onClick={handleNext} disabled={!canProceed()} className="flex-1 h-12 rounded-xl">
                      See My Results
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Trust Indicators */}
          {!isResultsStep && !showCachedPrompt && !isLoadingFromDb && (
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /><span>Science-backed</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /><span>Private & secure</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /><span>2-minute completion</span></div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SleepQuiz;
