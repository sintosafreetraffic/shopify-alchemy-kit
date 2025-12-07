import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart, Mail, Sparkles, Info, Moon, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { trackQuizStarted } from "@/lib/klaviyo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Question configuration with tooltips
const QUIZ_QUESTIONS = [
  {
    id: "sleepPosition",
    question: "What's your primary sleep position?",
    tooltip: "Your pillow height and contour depth depend entirely on your sleep position. This is one of the biggest predictors of neck pain.",
    type: "radio",
    options: [
      { value: "back", label: "Back sleeper" },
      { value: "side", label: "Side sleeper" },
      { value: "stomach", label: "Stomach sleeper" },
      { value: "combination", label: "Combination (I move around)" },
    ],
  },
  {
    id: "movesOften",
    question: "Do you change positions often during the night?",
    tooltip: "Frequent turning usually means your pillow or mattress isn't supporting your spine properly.",
    type: "radio",
    options: [
      { value: "rarely", label: "Rarely — I stay in one position" },
      { value: "sometimes", label: "Sometimes — A few times per night" },
      { value: "often", label: "Often — I toss and turn frequently" },
      { value: "always", label: "Almost always — I can't seem to get comfortable" },
    ],
  },
  {
    id: "pillowCount",
    question: "How many pillows do you currently sleep with?",
    tooltip: "Stacking pillows is a major sign your current pillow height is incorrect.",
    type: "radio",
    options: [
      { value: "1", label: "1 pillow" },
      { value: "2", label: "2 pillows" },
      { value: "3", label: "3 or more pillows" },
      { value: "0", label: "No pillow" },
    ],
  },
  {
    id: "mattressFirmness",
    question: "How would you describe your mattress firmness?",
    tooltip: "Mattress firmness affects how deep your shoulder sinks, which changes the ideal pillow height.",
    type: "radio",
    options: [
      { value: "soft", label: "Soft — I sink in quite a bit" },
      { value: "medium", label: "Medium — Balanced support" },
      { value: "firm", label: "Firm — Minimal sinking" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "sleepEquipment",
    question: "What sleep equipment do you currently use?",
    tooltip: "This helps us understand what has or hasn't worked for you before, so we recommend the correct upgrades.",
    type: "checkbox",
    options: [
      { value: "regular_pillow", label: "Regular pillow" },
      { value: "contour_pillow", label: "Contour/ergonomic pillow" },
      { value: "knee_pillow", label: "Knee pillow" },
      { value: "body_pillow", label: "Body pillow" },
      { value: "sleep_mask", label: "Sleep mask" },
      { value: "white_noise", label: "White noise machine" },
      { value: "weighted_blanket", label: "Weighted blanket" },
      { value: "none", label: "None of the above" },
    ],
  },
  {
    id: "painAreas",
    question: "Where do you experience pain or discomfort?",
    tooltip: "Different pain patterns reveal different alignment issues. This helps us tailor your recommendations.",
    type: "checkbox",
    options: [
      { value: "neck", label: "Neck" },
      { value: "upper_back", label: "Upper back" },
      { value: "lower_back", label: "Lower back" },
      { value: "shoulders", label: "Shoulders" },
      { value: "hips", label: "Hips" },
      { value: "headaches", label: "Headaches/migraines" },
      { value: "none", label: "No pain" },
    ],
  },
  {
    id: "painSeverity",
    question: "How severe is your morning pain on average?",
    tooltip: "Tracking severity helps us evaluate whether your sleep environment is contributing to tension.",
    type: "slider",
    min: 0,
    max: 10,
    labels: { 0: "No pain", 5: "Moderate", 10: "Severe" },
  },
  {
    id: "nightAwakenings",
    question: "How often do you wake up during the night?",
    tooltip: "Night awakenings indicate misalignment, overheating, or environmental disturbances.",
    type: "radio",
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "once", label: "Once per night" },
      { value: "twice", label: "2-3 times per night" },
      { value: "frequently", label: "4+ times per night" },
    ],
  },
  {
    id: "sleepTemperature",
    question: "Do you typically sleep hot, cold, or neutral?",
    tooltip: "Temperature is one of the biggest factors affecting deep sleep quality.",
    type: "radio",
    options: [
      { value: "hot", label: "Hot — I often wake up sweating" },
      { value: "cold", label: "Cold — I usually feel chilly" },
      { value: "neutral", label: "Neutral — Temperature is comfortable" },
    ],
  },
  {
    id: "roomBrightness",
    question: "How bright is your sleep environment?",
    tooltip: "Light exposure reduces melatonin and leads to shallow sleep. This helps us recommend masks if needed.",
    type: "radio",
    options: [
      { value: "dark", label: "Very dark — I can't see anything" },
      { value: "dim", label: "Dimly lit — Some ambient light" },
      { value: "bright", label: "Quite bright — Street lights or early sunrise" },
    ],
  },
  {
    id: "roomNoise",
    question: "What are the noise levels in your bedroom?",
    tooltip: "Noise disruption fragments your deep sleep and increases morning fatigue.",
    type: "radio",
    options: [
      { value: "quiet", label: "Very quiet" },
      { value: "some", label: "Some background noise" },
      { value: "noisy", label: "Often noisy (traffic, neighbors, etc.)" },
    ],
  },
  {
    id: "sleepLatency",
    question: "How long does it typically take you to fall asleep?",
    tooltip: "Sleep latency reveals stress levels, environment mismatch, or poor pillow alignment.",
    type: "radio",
    options: [
      { value: "quick", label: "Less than 15 minutes" },
      { value: "normal", label: "15-30 minutes" },
      { value: "slow", label: "30-60 minutes" },
      { value: "very_slow", label: "Over an hour" },
    ],
  },
  {
    id: "sleepHours",
    question: "How many hours of sleep do you average per night?",
    tooltip: "This allows your AI Sleep Coach to adjust recovery recommendations.",
    type: "radio",
    options: [
      { value: "under5", label: "Under 5 hours" },
      { value: "5to6", label: "5-6 hours" },
      { value: "6to7", label: "6-7 hours" },
      { value: "7to8", label: "7-8 hours" },
      { value: "over8", label: "Over 8 hours" },
    ],
  },
  {
    id: "eveningScreenUse",
    question: "Do you use screens (phone, TV, laptop) before bed?",
    tooltip: "Screens suppress melatonin and shift your circadian rhythm.",
    type: "radio",
    options: [
      { value: "never", label: "Rarely or never" },
      { value: "sometimes", label: "Sometimes — A few times a week" },
      { value: "often", label: "Often — Most nights" },
      { value: "always", label: "Always — Right up until I sleep" },
    ],
  },
  {
    id: "ageGroup",
    question: "What is your age group?",
    tooltip: "Certain sleep issues increase with age. This improves personalization but is optional.",
    type: "radio",
    optional: true,
    options: [
      { value: "18-24", label: "18-24" },
      { value: "25-34", label: "25-34" },
      { value: "35-44", label: "35-44" },
      { value: "45-54", label: "45-54" },
      { value: "55-64", label: "55-64" },
      { value: "65+", label: "65+" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "gender",
    question: "What is your gender?",
    tooltip: "Gender influences shoulder width and optimal pillow height. You may skip this.",
    type: "radio",
    optional: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "sleepClothing",
    question: "What do you typically wear to bed?",
    tooltip: "This helps us understand temperature regulation and overheating patterns.",
    type: "radio",
    options: [
      { value: "minimal", label: "Minimal — Underwear or nothing" },
      { value: "light", label: "Light — T-shirt and shorts" },
      { value: "moderate", label: "Moderate — Pajamas" },
      { value: "heavy", label: "Heavy — Warm layers" },
    ],
  },
  {
    id: "coSleeping",
    question: "Do you share your bed with anyone?",
    tooltip: "Co-sleeping can increase disruptions. This helps improve your AI recommendations.",
    type: "checkbox",
    options: [
      { value: "alone", label: "I sleep alone" },
      { value: "partner", label: "Partner/spouse" },
      { value: "child", label: "Child/children" },
      { value: "pet", label: "Pet(s)" },
    ],
  },
  {
    id: "sleepGoals",
    question: "What are your top sleep improvement goals?",
    tooltip: "These goals shape your personalized AI sleep plan and product recommendations.",
    type: "checkbox",
    maxSelections: 3,
    subtitle: "Select up to 3",
    options: [
      { value: "reduce_pain", label: "Reduce pain and discomfort" },
      { value: "better_quality", label: "Improve overall sleep quality" },
      { value: "fall_asleep_faster", label: "Fall asleep faster" },
      { value: "stay_asleep", label: "Stay asleep through the night" },
      { value: "wake_refreshed", label: "Wake up feeling refreshed" },
      { value: "reduce_snoring", label: "Reduce snoring" },
      { value: "better_posture", label: "Improve spinal alignment" },
    ],
  },
  {
    id: "snoring",
    question: "How often do you snore?",
    tooltip: "Snoring often comes from airway angle, which can be improved with the right pillow height.",
    type: "radio",
    options: [
      { value: "never", label: "Never or rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often — Several nights a week" },
      { value: "always", label: "Always — Every night" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "triedMethods",
    question: "Have you tried any sleep improvement methods?",
    tooltip: "This helps us tailor a plan that avoids repeating what hasn't worked.",
    type: "checkbox",
    options: [
      { value: "new_mattress", label: "New mattress" },
      { value: "new_pillow", label: "New pillow(s)" },
      { value: "sleep_apps", label: "Sleep tracking apps" },
      { value: "supplements", label: "Sleep supplements (melatonin, etc.)" },
      { value: "medication", label: "Sleep medication" },
      { value: "therapy", label: "Sleep therapy/counseling" },
      { value: "nothing", label: "None of the above" },
    ],
  },
  {
    id: "pillowSatisfaction",
    question: "How satisfied are you with your current pillow?",
    tooltip: "This gives a measurable baseline for improvement.",
    type: "slider",
    min: 0,
    max: 10,
    labels: { 0: "Very unsatisfied", 5: "Neutral", 10: "Very satisfied" },
  },
];

const TOTAL_STEPS = QUIZ_QUESTIONS.length + 1; // +1 for email step

interface QuizPayload {
  sleepPosition: string;
  movesOften: string;
  pillowCount: string;
  mattressFirmness: string;
  sleepEquipment: string[];
  painAreas: string[];
  painSeverity: number;
  nightAwakenings: string;
  sleepTemperature: string;
  roomBrightness: string;
  roomNoise: string;
  sleepLatency: string;
  sleepHours: string;
  eveningScreenUse: string;
  ageGroup?: string;
  gender?: string;
  sleepClothing: string;
  coSleeping: string[];
  sleepGoals: string[];
  snoring: string;
  triedMethods: string[];
  pillowSatisfaction: number;
  email?: string;
}

interface ProductRecommendation {
  product: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface AnalysisResult {
  assessment: string;
  recommendations: ProductRecommendation[];
  bundleRecommended: boolean;
  bundleReason?: string;
  profileCreated?: boolean;
}

const SleepQuiz = () => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({
    sleepEquipment: [],
    painAreas: [],
    coSleeping: [],
    sleepGoals: [],
    triedMethods: [],
    painSeverity: 5,
    pillowSatisfaction: 5,
  });
  const [email, setEmail] = useState("");
  const [createSleepCoachProfile, setCreateSleepCoachProfile] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  useEffect(() => {
    trackQuizStarted();
    const loadProducts = async () => {
      try {
        const fetchedProducts = await fetchProducts(50);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };
    loadProducts();
  }, []);

  const handleRadioChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleCheckboxChange = useCallback((questionId: string, value: string, maxSelections?: number) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      
      // Handle "none" type options that should clear others
      if (value === "none" || value === "nothing" || value === "alone") {
        if (current.includes(value)) {
          return { ...prev, [questionId]: [] };
        }
        return { ...prev, [questionId]: [value] };
      }
      
      // Remove "none" type values when selecting other options
      const filteredCurrent = current.filter(v => v !== "none" && v !== "nothing" && v !== "alone");
      
      if (filteredCurrent.includes(value)) {
        return { ...prev, [questionId]: filteredCurrent.filter(item => item !== value) };
      }
      
      // Check max selections
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

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canProceed = useCallback(() => {
    if (step > QUIZ_QUESTIONS.length) {
      return isValidEmail(email);
    }
    
    const question = QUIZ_QUESTIONS[step - 1];
    if (question.optional) return true;
    
    const answer = answers[question.id];
    
    if (question.type === "checkbox") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (question.type === "slider") {
      return typeof answer === "number";
    }
    return !!answer;
  }, [step, answers, email]);

  const handleNext = () => {
    if (step <= QUIZ_QUESTIONS.length) {
      setStep(step + 1);
    } else {
      analyzeQuiz();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const buildQuizPayload = (): QuizPayload => {
    return {
      sleepPosition: answers.sleepPosition as string || "",
      movesOften: answers.movesOften as string || "",
      pillowCount: answers.pillowCount as string || "",
      mattressFirmness: answers.mattressFirmness as string || "",
      sleepEquipment: answers.sleepEquipment as string[] || [],
      painAreas: answers.painAreas as string[] || [],
      painSeverity: answers.painSeverity as number || 0,
      nightAwakenings: answers.nightAwakenings as string || "",
      sleepTemperature: answers.sleepTemperature as string || "",
      roomBrightness: answers.roomBrightness as string || "",
      roomNoise: answers.roomNoise as string || "",
      sleepLatency: answers.sleepLatency as string || "",
      sleepHours: answers.sleepHours as string || "",
      eveningScreenUse: answers.eveningScreenUse as string || "",
      ageGroup: answers.ageGroup as string || undefined,
      gender: answers.gender as string || undefined,
      sleepClothing: answers.sleepClothing as string || "",
      coSleeping: answers.coSleeping as string[] || [],
      sleepGoals: answers.sleepGoals as string[] || [],
      snoring: answers.snoring as string || "",
      triedMethods: answers.triedMethods as string[] || [],
      pillowSatisfaction: answers.pillowSatisfaction as number || 0,
      email: email.trim() || undefined,
    };
  };

  const analyzeQuiz = async () => {
    setIsAnalyzing(true);
    const quizPayload = buildQuizPayload();
    
    try {
      // Send to analyze-sleep-quiz
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-sleep-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ 
            answers: quizPayload,
            email: email.trim() || undefined,
            createProfile: createSleepCoachProfile && isValidEmail(email),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setResults(data);
      setStep(TOTAL_STEPS + 1);

      // Enrich Klaviyo profile if email provided
      if (isValidEmail(email)) {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klaviyo-profile`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ 
                email: email.trim(),
                properties: quizPayload,
              }),
            }
          );
        } catch (e) {
          console.warn("Klaviyo profile enrichment failed:", e);
        }
      }

      if (data.profileCreated) {
        toast.success("Sleep Coach profile created!", {
          description: "Access your personalized AI sleep plan anytime.",
        });
      }
    } catch (error) {
      console.error("Quiz analysis error:", error);
      toast.error("Failed to analyze quiz", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProductByName = (productName: string) => {
    return products.find(p => 
      p.node.title.toLowerCase().includes(productName.toLowerCase().replace('rise by night™ ', ''))
    );
  };

  const handleAddToCart = async (productName: string) => {
    try {
      const product = getProductByName(productName);

      if (!product) {
        toast.error("Product not found");
        return;
      }

      const variant = product.node.variants.edges[0]?.node;
      if (!variant) {
        toast.error("Product variant not available");
        return;
      }

      addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || [],
      });

      toast.success("Added to cart!", {
        description: `${product.node.title} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-success";
      case "medium":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  const currentQuestion = step <= QUIZ_QUESTIONS.length ? QUIZ_QUESTIONS[step - 1] : null;
  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);
  const isEmailStep = step === QUIZ_QUESTIONS.length + 1;
  const isResultsStep = step > TOTAL_STEPS;

  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    
    const { id, type, options, optional, subtitle, maxSelections, min, max, labels } = currentQuestion;
    
    if (type === "radio") {
      return (
        <RadioGroup 
          value={answers[id] as string || ""} 
          onValueChange={(value) => handleRadioChange(id, value)}
          className="space-y-3"
        >
          {options?.map((option) => (
            <div 
              key={option.value} 
              className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer group"
            >
              <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
              <Label 
                htmlFor={`${id}-${option.value}`} 
                className="flex-1 cursor-pointer text-base group-hover:text-foreground transition-colors"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }
    
    if (type === "checkbox") {
      return (
        <div className="space-y-3">
          {options?.map((option) => {
            const currentAnswers = (answers[id] as string[]) || [];
            const isChecked = currentAnswers.includes(option.value);
            
            return (
              <div 
                key={option.value} 
                className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  isChecked 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
                onClick={() => handleCheckboxChange(id, option.value, maxSelections)}
              >
                <Checkbox
                  id={`${id}-${option.value}`}
                  checked={isChecked}
                  onCheckedChange={() => handleCheckboxChange(id, option.value, maxSelections)}
                />
                <Label 
                  htmlFor={`${id}-${option.value}`} 
                  className="flex-1 cursor-pointer text-base"
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (type === "slider") {
      const value = (answers[id] as number) ?? 5;
      return (
        <div className="py-8 px-4">
          <div className="mb-8">
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-primary">{value}</span>
              <span className="text-2xl text-muted-foreground ml-1">/ {max}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={(val) => handleSliderChange(id, val)}
              min={min}
              max={max}
              step={1}
              className="w-full"
            />
          </div>
          {labels && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{labels[min!]}</span>
              <span>{labels[Math.floor((max! - min!) / 2)]}</span>
              <span>{labels[max!]}</span>
            </div>
          )}
        </div>
      );
    }
    
    return null;
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
              Answer these questions to receive personalized product recommendations and unlock your AI Sleep Coach.
            </p>
          </div>

          {/* Progress Bar */}
          {!isResultsStep && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">
                  Step {step} of {TOTAL_STEPS}
                </span>
                <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Card */}
          <Card className="p-6 md:p-8 shadow-lg border-border/50 backdrop-blur-sm">
            {/* Question Steps */}
            {currentQuestion && !isAnalyzing && (
              <div className="space-y-6">
                {/* Question Header with Tooltip */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                      {currentQuestion.question}
                      {currentQuestion.optional && (
                        <span className="text-muted-foreground text-sm font-normal ml-2">(optional)</span>
                      )}
                    </h2>
                    {currentQuestion.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{currentQuestion.subtitle}</p>
                    )}
                  </div>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                        <Info className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      className="max-w-xs p-4 text-sm bg-popover border border-border shadow-lg"
                      sideOffset={8}
                    >
                      <p className="text-popover-foreground leading-relaxed">
                        {currentQuestion.tooltip}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Question Content */}
                <div className="min-h-[200px]">
                  {renderQuestionContent()}
                </div>
              </div>
            )}

            {/* Email Step */}
            {isEmailStep && !isAnalyzing && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                      Get Your Personalized Results
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      Enter your email to receive your sleep assessment and unlock exclusive recommendations.
                    </p>
                  </div>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                        <Info className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      className="max-w-xs p-4 text-sm bg-popover border border-border shadow-lg"
                      sideOffset={8}
                    >
                      <p className="text-popover-foreground leading-relaxed">
                        Your email helps us save your assessment and send personalized sleep tips. We never spam.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 text-base rounded-xl border-border focus:border-primary"
                    />
                  </div>
                  
                  {email && isValidEmail(email) && (
                    <div 
                      className="flex items-start space-x-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 cursor-pointer"
                      onClick={() => setCreateSleepCoachProfile(!createSleepCoachProfile)}
                    >
                      <Checkbox
                        id="sleepCoach"
                        checked={createSleepCoachProfile}
                        onCheckedChange={(checked) => setCreateSleepCoachProfile(checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor="sleepCoach" className="cursor-pointer flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">Create AI Sleep Coach Profile</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Get a personalized 7-day sleep improvement plan based on your quiz answers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  By continuing, you agree to receive personalized sleep tips and product recommendations. Unsubscribe anytime.
                </p>
              </div>
            )}

            {/* Results Step */}
            {isResultsStep && results && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Your Sleep Assessment</h2>
                </div>

                <Card className="p-6 bg-primary/5 border-primary/20">
                  <p className="text-foreground leading-relaxed">{results.assessment}</p>
                </Card>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Recommended Products</h3>
                  <div className="space-y-4">
                    {results.recommendations.map((rec, index) => {
                      const product = getProductByName(rec.product);
                      const productImage = product?.node.images?.edges?.[0]?.node.url;
                      
                      return (
                        <Card key={index} className="p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            {productImage && (
                              <div className="w-20 h-20 flex-shrink-0 bg-secondary/30 rounded-lg overflow-hidden">
                                <img
                                  src={productImage}
                                  alt={rec.product}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-lg">{rec.product}</h4>
                                <span className={`text-xs font-semibold uppercase ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{rec.reason}</p>
                              <Button
                                onClick={() => handleAddToCart(rec.product)}
                                size="sm"
                                className="rounded-lg"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Add to Cart
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {results.bundleRecommended && results.bundleReason && (
                  <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Bundle Recommendation</h4>
                        <p className="text-muted-foreground mb-4">{results.bundleReason}</p>
                        <Button
                          onClick={() => handleAddToCart("Complete Sleep Bundle")}
                          className="w-full rounded-lg"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add Complete Sleep Bundle
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1 rounded-lg">
                    Back to Home
                  </Button>
                  {results.profileCreated ? (
                    <Button 
                      onClick={() => navigate(`/auth?returnTo=/sleep-coach&email=${encodeURIComponent(email)}&context=sleep-coach`)} 
                      className="flex-1 rounded-lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      View Sleep Plan
                    </Button>
                  ) : (
                    <Button onClick={() => navigate("/product/ergonomic-pillow")} className="flex-1 rounded-lg">
                      View Products
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <Moon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-lg font-semibold mt-6">Analyzing your sleep profile...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Creating personalized recommendations based on 22 data points
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            {!isResultsStep && !isAnalyzing && (
              <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  disabled={step === 1}
                  className="flex-1 h-12 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() && !currentQuestion?.optional}
                  className="flex-1 h-12 rounded-xl"
                >
                  {isEmailStep ? "Get My Results" : "Next"}
                  {!isEmailStep && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            )}
          </Card>

          {/* Trust Indicators */}
          {!isResultsStep && (
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Science-backed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Private & secure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>2-minute completion</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SleepQuiz;
