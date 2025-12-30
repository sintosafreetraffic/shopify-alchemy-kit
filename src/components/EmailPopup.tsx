// Performance: Using OptimizedImage for lazy loading
import { useState, useEffect } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { setEnhancedMatch, trackLead } from "@/lib/pinterest";
import { captureEmail } from "@/lib/contextTracking";
import { useKlaviyoPopupTracking } from "@/hooks/useKlaviyoPopupTracking";
import OptimizedImage from "@/components/OptimizedImage";
import logo from "@/assets/risebynight-logo-official.png";
import moonIcon from "@/assets/moon-icon-blue.png";

interface EmailPopupProps {
  isOpen: boolean;
  showTeaser: boolean;
  onClose: () => void;
  onOpenFromTeaser: () => void;
  listId?: string;
  discountCode?: string;
}

export const EmailPopup = ({
  isOpen,
  showTeaser,
  onClose,
  onOpenFromTeaser,
  listId,
  discountCode = "MYSTERYDISCOUNT",
}: EmailPopupProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { trackView, trackSubmit, trackDismiss } = useKlaviyoPopupTracking();

  // Track popup view when opened (with visibility check)
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure popup is actually visible
      const timer = setTimeout(() => {
        trackView({ formId: "email_popup" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, trackView]);

  const handleClose = () => {
    // Track dismiss before closing
    if (!isSuccess) {
      trackDismiss({ formId: "email_popup" });
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("klaviyo-subscribe", {
        body: { email, listId },
      });

      if (error) throw error;

      // Track popup submission (don't pass email to avoid PII).
      // Do this immediately after subscribe so tracking isn't blocked by ad pixels.
      try {
        await trackSubmit({ formId: "email_popup" });
      } catch (e) {
        console.warn("[email-popup] Failed to track submit", e);
      }

      // Set Pinterest enhanced match and track lead (best-effort)
      try {
        await setEnhancedMatch(email);
        trackLead("Newsletter", email);
        captureEmail(email); // Send to CAPI context for checkout enrichment
      } catch (e) {
        console.warn("[email-popup] Pinterest tracking failed", e);
      }

      setIsSuccess(true);
      toast({
        title: "Success!",
        description: "You've been subscribed successfully.",
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(discountCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Discount code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Teaser Tab */}
      {showTeaser && !isOpen && (
        <button
          onClick={onOpenFromTeaser}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-background p-3 shadow-lg border border-border hover:scale-110 transition-transform duration-200"
          aria-label="Open discount popup"
        >
          <OptimizedImage src={moonIcon} alt="" width={40} height={40} className="h-10 w-10" />
        </button>
      )}

      {/* Main Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative overflow-hidden rounded-3xl bg-background shadow-2xl border border-border">
              <div className="relative p-8">
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close popup"
                >
                  <X className="h-5 w-5" />
                </button>

                {isSuccess ? (
                  /* Success State */
                  <div className="flex flex-col items-center text-center pt-4">
                    <img src={logo} alt="Rise By Night" className="h-12 w-auto mb-6" />
                    <h3 className="mb-3 text-2xl font-black uppercase tracking-tight text-foreground">
                      Thanks For Signing Up!
                    </h3>
                    <p className="mb-6 text-sm text-muted-foreground">
                      Use your code to get a discount on your first order.
                    </p>
                    
                    {/* Discount Code Box */}
                    <div 
                      className="w-full border-2 border-dashed border-foreground rounded-lg p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={handleCopyCode}
                    >
                      <span className="text-lg font-black uppercase tracking-wide text-foreground">
                        {discountCode}
                      </span>
                      <button className="text-foreground hover:text-primary transition-colors">
                        {copied ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <Copy className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form State */
                  <div className="pt-4">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                      <img src={logo} alt="Rise By Night" className="h-12 w-auto" />
                    </div>

                    {/* Content */}
                    <div className="mb-6 text-center">
                      <h2 className="mb-3 text-2xl font-black uppercase tracking-tight text-foreground">
                        Mystery Discount On Your First Order!
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Sign up and receive a discount on your first order and access to exclusive sleep information and offers.
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full rounded-none border border-foreground/30 bg-background py-4 px-4 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-full bg-primary py-4 font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Signing up...
                          </span>
                        ) : (
                          "Sign Me Up!"
                        )}
                      </button>
                    </form>

                    {/* No thanks link */}
                    <button
                      onClick={handleClose}
                      className="mt-4 w-full text-center text-sm font-bold uppercase tracking-wider text-foreground hover:text-muted-foreground transition-colors"
                    >
                      No, Thanks
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
