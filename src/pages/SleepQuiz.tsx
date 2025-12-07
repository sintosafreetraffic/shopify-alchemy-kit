import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { trackQuizStarted } from "@/lib/klaviyo";

interface QuizAnswers {
  sleepPosition: string;
  painPoints: string[];
  pillowIssues: string[];
  sleepGoals: string[];
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
  const [answers, setAnswers] = useState<QuizAnswers>({
    sleepPosition: "",
    painPoints: [],
    pillowIssues: [],
    sleepGoals: [],
  });
  const [email, setEmail] = useState("");
  const [createSleepCoachProfile, setCreateSleepCoachProfile] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  useEffect(() => {
    // Track quiz started event
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

  const handleSleepPositionChange = (value: string) => {
    setAnswers({ ...answers, sleepPosition: value });
  };

  const handleCheckboxChange = (category: keyof Omit<QuizAnswers, "sleepPosition">, value: string) => {
    setAnswers(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return answers.sleepPosition !== "";
      case 2:
        return answers.painPoints.length > 0;
      case 3:
        return answers.pillowIssues.length > 0;
      case 4:
        return answers.sleepGoals.length > 0;
      case 5:
        return true; // Email is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      analyzeQuiz();
    }
  };

  const analyzeQuiz = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-sleep-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ 
            answers,
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
      setStep(6);

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
        return "text-green-600 dark:text-green-400";
      case "medium":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Sleep Assessment Quiz</h1>
          <p className="text-muted-foreground">
            Answer a few questions to get personalized product recommendations
          </p>
        </div>

        {step <= 5 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Step {step} of 5</span>
              <span className="text-sm text-muted-foreground">{Math.round((step / 5) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Card className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">What's your primary sleep position?</h2>
              <RadioGroup value={answers.sleepPosition} onValueChange={handleSleepPositionChange}>
                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="back" id="back" />
                  <Label htmlFor="back" className="flex-1 cursor-pointer">Back sleeper</Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="side" id="side" />
                  <Label htmlFor="side" className="flex-1 cursor-pointer">Side sleeper</Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="stomach" id="stomach" />
                  <Label htmlFor="stomach" className="flex-1 cursor-pointer">Stomach sleeper</Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="combination" id="combination" />
                  <Label htmlFor="combination" className="flex-1 cursor-pointer">Combination (I move around)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">What pain points do you experience?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="space-y-3">
                {["Neck pain", "Back pain", "Shoulder tension", "Hip discomfort", "Headaches", "No pain"].map(
                  (option) => (
                    <div key={option} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                      <Checkbox
                        id={option}
                        checked={answers.painPoints.includes(option)}
                        onCheckedChange={() => handleCheckboxChange("painPoints", option)}
                      />
                      <Label htmlFor={option} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">What issues do you have with your current pillow?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="space-y-3">
                {[
                  "Too flat / loses support",
                  "Too firm / uncomfortable",
                  "Gets too hot",
                  "Causes neck stiffness",
                  "Wrong height",
                  "No issues",
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <Checkbox
                      id={option}
                      checked={answers.pillowIssues.includes(option)}
                      onCheckedChange={() => handleCheckboxChange("pillowIssues", option)}
                    />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">What are your sleep goals?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="space-y-3">
                {[
                  "Reduce pain and discomfort",
                  "Improve spinal alignment",
                  "Better sleep quality",
                  "Reduce snoring",
                  "Wake up refreshed",
                  "Block out light",
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <Checkbox
                      id={option}
                      checked={answers.sleepGoals.includes(option)}
                      onCheckedChange={() => handleCheckboxChange("sleepGoals", option)}
                    />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Get Your Personalized Results</h2>
              <p className="text-muted-foreground">
                Enter your email to receive your sleep assessment and unlock exclusive recommendations.
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {email && isValidEmail(email) && (
                  <div className="flex items-start space-x-3 p-4 rounded-lg border bg-primary/5 border-primary/20">
                    <Checkbox
                      id="sleepCoach"
                      checked={createSleepCoachProfile}
                      onCheckedChange={(checked) => setCreateSleepCoachProfile(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="sleepCoach" className="cursor-pointer flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">Create AI Sleep Coach Profile</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get a personalized 7-day sleep improvement plan based on your quiz answers.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                By continuing, you agree to receive personalized sleep tips and product recommendations. You can unsubscribe anytime.
              </p>
            </div>
          )}

          {step === 6 && results && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Your Sleep Assessment</h2>
              </div>

              <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <p className="text-foreground leading-relaxed">{results.assessment}</p>
              </Card>

              <div>
                <h3 className="text-xl font-semibold mb-4">Recommended Products</h3>
                <div className="space-y-4">
                  {results.recommendations.map((rec, index) => {
                    const product = getProductByName(rec.product);
                    const productImage = product?.node.images?.edges?.[0]?.node.url;
                    
                    return (
                      <Card key={index} className="p-6">
                        <div className="flex items-start gap-4">
                          {productImage && (
                            <div className="w-24 h-24 flex-shrink-0 bg-secondary/20 rounded-md overflow-hidden">
                              <img
                                src={productImage}
                                alt={rec.product}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{rec.product}</h4>
                              <span className={`text-xs font-medium uppercase ${getPriorityColor(rec.priority)}`}>
                                {rec.priority} priority
                              </span>
                            </div>
                            <p className="text-muted-foreground mb-3">{rec.reason}</p>
                            <Button
                              onClick={() => handleAddToCart(rec.product)}
                              size="sm"
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
                        className="w-full"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add Complete Sleep Bundle
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Back to Home
                </Button>
                {results.profileCreated ? (
                  <Button 
                    onClick={() => navigate(`/auth?returnTo=/sleep-coach&email=${encodeURIComponent(email)}&context=sleep-coach`)} 
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Sleep Plan
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/product/ergonomic-pillow")} className="flex-1">
                    View Products
                  </Button>
                )}
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Analyzing your responses...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Creating personalized recommendations
              </p>
            </div>
          )}

          {step <= 5 && !isAnalyzing && (
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                {step === 5 ? (email ? "Get My Results" : "Skip & Get Results") : "Next"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SleepQuiz;
