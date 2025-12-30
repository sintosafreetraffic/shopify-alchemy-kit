import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Moon, Users, Sparkles, Heart, Star, Gift, Mail, MessageSquare, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { UGCTestimonialGrid } from "@/components/home/UGCTestimonialGrid";
import { trackLead } from "@/lib/pinterest";

// Partnership tier data
const partnershipTiers = [
  {
    title: "Everyday Sleepers",
    description: "You prioritize rest and want to share what works for you—without being an influencer.",
    icon: Moon,
    color: "from-blue-500/10 to-indigo-500/10",
  },
  {
    title: "Creators & Wellness Advocates",
    description: "You create content around health, wellness, or lifestyle and value science-backed approaches.",
    icon: Sparkles,
    color: "from-amber-500/10 to-orange-500/10",
  },
  {
    title: "Professionals",
    description: "Trainers, coaches, therapists, and educators who understand the role of sleep in performance.",
    icon: Users,
    color: "from-emerald-500/10 to-teal-500/10",
  },
];

// Benefits data
const benefits = [
  { icon: Gift, text: "Early access to new products and tools" },
  { icon: Sparkles, text: "Co-creation opportunities on upcoming releases" },
  { icon: Star, text: "Tiered commission structure based on engagement" },
  { icon: Mail, text: "Private Collective updates and insights" },
  { icon: Heart, text: "Invitations to test new sleep tools first" },
  { icon: Users, text: "Appear in RiseByNight content and campaigns" },
];

// FAQ data
const faqs = [
  {
    question: "How do partnerships work?",
    answer: "Once accepted, you'll receive a unique referral link and access to the Partner Dashboard where you can track referrals, submit content, and monitor your tier progress. Share your experience authentically—there are no scripts or quotas. You earn commission on qualifying purchases made through your link.",
  },
  {
    question: "Who can join?",
    answer: "Anyone who values quality rest and wants to share their experience. We welcome everyday sleepers, content creators, wellness advocates, and professionals in health-adjacent fields. We look for authenticity over follower count.",
  },
  {
    question: "How does compensation work?",
    answer: "We offer a tiered commission structure (Bronze through Diamond) that grows with your sales performance. Partners and Ambassadors start at the Bronze tier with 10% commission, with opportunities to progress based on your 30-day sales.",
  },
  {
    question: "What are the content guidelines?",
    answer: "Keep it honest and personal. Share your genuine experience with our products—what changed for you, how your mornings feel now. We ask that you avoid medical claims or promises, and focus on comfort and well-being language instead.",
  },
  {
    question: "What's the difference between Partner and Affiliate?",
    answer: "Partners apply through this page and focus on content and relationships. Affiliates can sign up instantly via the Affiliate Dashboard for a sales-focused approach. Both tracks use the same tier system and commission rates.",
  },
  {
    question: "How long does the application process take?",
    answer: "We review applications weekly and aim to respond within 5–7 business days. We read every application personally, so please share a bit about yourself and why rest matters to you.",
  },
];

const SleepCollective = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    socialHandle: "",
    whyJoin: "",
    preferredTier: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation schema
  const applicationSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
    socialHandle: z.string().max(200, "Social handle must be less than 200 characters").optional(),
    whyJoin: z.string().trim().min(1, "Please tell us why you want to join").max(2000, "Response must be less than 2000 characters"),
    preferredTier: z.string().min(1, "Please select a tier"),
    message: z.string().max(2000, "Message must be less than 2000 characters").optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const result = applicationSchema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("collective_applications")
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          social_handles: formData.socialHandle?.trim() || null,
          reason: formData.whyJoin.trim(),
          preferred_tier: formData.preferredTier,
          message: formData.message?.trim() || null,
        });

      if (error) throw error;

      // Track Pinterest Lead event for partner application
      trackLead("PartnerApplication").catch(() => {});

      toast.success("Application submitted! We'll be in touch soon.");
      setFormData({
        name: "",
        email: "",
        socialHandle: "",
        whyJoin: "",
        preferredTier: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Moon className="h-4 w-4" />
              <span>Community</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Join the Sleep Collective
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              We're building a calm community of creators, wellness advocates, and everyday sleepers 
              who believe better rest changes everything.
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full"
              onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Apply to Join
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why the Collective Exists */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Why the Collective Exists
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                This isn't an influencer program designed around metrics and quotas. 
                The Sleep Collective is a science-backed community built on a shared belief: 
                that quality rest is foundational to how we feel, perform, and live.
              </p>
              <p>
                We're looking for people who care about genuine well-being over viral moments. 
                People who understand that recommending something means standing behind it. 
                Whether you're a wellness professional, a content creator, or simply someone 
                who found something that helped—you belong here.
              </p>
              <p>
                Premium products. Calm community. No hype.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Partnership Tiers
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find where you fit in the Collective
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {partnershipTiers.map((tier, index) => (
              <div
                key={tier.title}
                className={`relative p-8 rounded-2xl border border-border/50 bg-gradient-to-br ${tier.color} backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg group`}
              >
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <tier.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {tier.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                    {tier.description}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 w-full rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UGC / Loved By Real Sleepers */}
      <UGCTestimonialGrid />

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              What You Get
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Thoughtful perks for Collective members
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.text}
                className="flex items-start gap-4 p-5 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-foreground/90 text-sm leading-relaxed pt-2">
                  {benefit.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Section */}
      <section id="apply" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Apply to Join
              </h2>
              <p className="text-muted-foreground">
                Tell us a bit about yourself and why rest matters to you
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 bg-background p-8 rounded-2xl border border-border/50 shadow-sm">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-muted/50 border-border/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-muted/50 border-border/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialHandle" className="text-foreground">
                  Social Handle(s)
                </Label>
                <Input
                  id="socialHandle"
                  placeholder="@yourhandle (Instagram, TikTok, etc.)"
                  value={formData.socialHandle}
                  onChange={(e) => handleInputChange("socialHandle", e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredTier" className="text-foreground">
                  Preferred Tier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.preferredTier}
                  onValueChange={(value) => handleInputChange("preferredTier", value)}
                >
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue placeholder="Select your tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyday">Everyday Sleeper</SelectItem>
                    <SelectItem value="creator">Creator & Wellness Advocate</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whyJoin" className="text-foreground">
                  Why do you want to join? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="whyJoin"
                  placeholder="Share what drew you to the Collective..."
                  value={formData.whyJoin}
                  onChange={(e) => handleInputChange("whyJoin", e.target.value)}
                  className="bg-muted/50 border-border/50 min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground">
                  Anything else? (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Links, notes, or anything you'd like us to know..."
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Questions & Answers
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about joining
              </p>
            </div>
            
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="border border-border/50 rounded-xl px-6 bg-muted/10 data-[state=open]:bg-muted/30 transition-colors"
                >
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <Moon className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to join us?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Become part of a community that believes quality rest is worth sharing.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full"
            onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Apply Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SleepCollective;
