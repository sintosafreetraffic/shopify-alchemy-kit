import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { UrgencyBanner } from "./components/UrgencyBanner";
import { EmailPopup } from "./components/EmailPopup";
import { useEmailPopup } from "./hooks/useEmailPopup";
import { trackPageView } from "./lib/analyticsRegistry";

import { FullPageLoader } from "./components/FullPageLoader";

// =============================================================================
// PINTEREST DEBUG WRAPPER
// Purpose: Intercept ALL pintrk calls, log them, and BLOCK any "checkout" events
// This proves whether Lovable is firing "checkout" anywhere (it should NOT).
// 
// CRITICAL: This wrapper uses DYNAMIC lookup of window.pintrk on each call
// to avoid capturing a stale reference to the Pinterest stub before the real
// script loads. This prevents the "Cannot read properties of undefined" error.
// =============================================================================
const installPinterestDebugWrapper = () => {
  if (typeof window === "undefined") return;
  
  // Prevent double-installation
  if ((window as any).__pintrk_debug_installed) return;
  (window as any).__pintrk_debug_installed = true;
  
  // FIXED: Use a non-invasive approach that doesn't break Pinterest's upgrade mechanism
  // Instead of replacing window.pintrk, we use a Proxy-like pattern that intercepts
  // but allows Pinterest's core.js to function normally
  
  const logPinterestCall = (args: any[]) => {
    const [command, eventName, payload] = args;
    console.log('[Pinterest Debug]', {
      command,
      eventName,
      payload,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
    
    // Warn on checkout (should never happen from frontend)
    if (
      command === 'track' &&
      typeof eventName === 'string' &&
      eventName.toLowerCase() === 'checkout'
    ) {
      console.error('[Pinterest] WARNING: checkout event detected from frontend!');
      console.error('[Pinterest] This should only come from Shopify server-side.');
      console.error(new Error('Pinterest checkout detected - stack trace:').stack);
      // Note: We no longer BLOCK - just warn. Blocking was breaking tracking.
    }
  };
  
  // Intercept via property descriptor to allow Pinterest upgrades
  let realPintrk: any = (window as any).pintrk;
  
  Object.defineProperty(window, 'pintrk', {
    get() {
      return realPintrk;
    },
    set(newValue) {
      // Pinterest core.js is upgrading the function - allow it
      console.log('[Pinterest Debug] pintrk upgraded by Pinterest core.js');
      realPintrk = newValue;
    },
    configurable: true,
    enumerable: true,
  });
  
  // Wrap calls to log them (without blocking Pinterest's functionality)
  const originalCall = Function.prototype.call;
  const originalApply = Function.prototype.apply;
  
  // Create a logging wrapper that forwards all calls
  const createLoggingPintrk = () => {
    if (typeof realPintrk !== 'function') return;
    
    const wrappedPintrk = function(this: any, ...args: any[]) {
      logPinterestCall(args);
      return realPintrk.apply(this, args);
    };
    
    // Copy all properties from the real pintrk
    Object.keys(realPintrk).forEach(key => {
      (wrappedPintrk as any)[key] = (realPintrk as any)[key];
    });
    
    // Preserve queue reference
    if (realPintrk.queue) {
      (wrappedPintrk as any).queue = realPintrk.queue;
    }
    if (realPintrk.version) {
      (wrappedPintrk as any).version = realPintrk.version;
    }
    
    realPintrk = wrappedPintrk;
  };
  
  // Apply logging wrapper now and after Pinterest upgrades
  createLoggingPintrk();
  setTimeout(createLoggingPintrk, 500);
  setTimeout(createLoggingPintrk, 1000);
  setTimeout(createLoggingPintrk, 2000);
  
  console.log('[Pinterest Debug] Debug monitoring installed (non-blocking mode).');
  console.log('[Pinterest Debug] Checkout events will be WARNED but not blocked.');
};

// Install on module load (dev only)
// NOTE: This wrapper must never affect production tracking reliability.
// Enable via: localStorage.setItem('DEBUG_TRACKING', '1')
if (typeof window !== "undefined" && localStorage.getItem("DEBUG_TRACKING") === "1") {
  installPinterestDebugWrapper();
}
// Eagerly loaded pages (core shopping experience)
import Home from "./pages/Home";
import ErgonomicPillowProduct from "./pages/ErgonomicPillowProduct";
import KneePillowProduct from "./pages/KneePillowProduct";
import SleepMaskProduct from "./pages/SleepMaskProduct";
import SleepBundleProduct from "./pages/SleepBundleProduct";
import Auth from "./pages/Auth";
import Benefits from "./pages/Benefits";
import Reviews from "./pages/Reviews";
import FAQ from "./pages/FAQ";
import Guarantee from "./pages/Guarantee";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsConditions from "./pages/TermsConditions";
import ReturnPolicy from "./pages/ReturnPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AboutUs from "./pages/AboutUs";
import TrackOrder from "./pages/TrackOrder";
import Imprint from "./pages/Imprint";
import PartnerProgram from "./pages/PartnerProgram";
import NotFound from "./pages/NotFound";
import SleepGuides from "./pages/SleepGuides";

// Lazily loaded pages (heavy dashboards & features)
const SleepQuiz = React.lazy(() => import("./pages/SleepQuiz"));
const AffiliateDashboard = React.lazy(() => import("./pages/AffiliateDashboard"));
const SleepCoachDashboard = React.lazy(() => import("./pages/SleepCoachDashboard"));
const SleepCoachDebug = React.lazy(() => import("./pages/SleepCoachDebug"));
const SleepPersonaDebug = React.lazy(() => import("./pages/SleepPersonaDebug"));
const SleepPersonaExperimentsDebug = React.lazy(() => import("./pages/SleepPersonaExperimentsDebug"));
const PersonaLandingPage = React.lazy(() => import("./pages/PersonaLandingPage"));
const AdminAffiliateFraud = React.lazy(() => import("./pages/AdminAffiliateFraud"));
const AdminAffiliatePayouts = React.lazy(() => import("./pages/AdminAffiliatePayouts"));
const AdminAffiliateResources = React.lazy(() => import("./pages/AdminAffiliateResources"));
const AdminCollectiveApplications = React.lazy(() => import("./pages/AdminCollectiveApplications"));
const AdminUGCSubmissions = React.lazy(() => import("./pages/AdminUGCSubmissions"));
const SleepQuizDiagnostics = React.lazy(() => import("./pages/internal/SleepQuizDiagnostics"));
const QuizRevealTracking = React.lazy(() => import("./pages/internal/QuizRevealTracking"));
const AnalyticsDiagnostics = React.lazy(() => import("./pages/internal/AnalyticsDiagnostics"));
const ContextDiagnostics = React.lazy(() => import("./pages/internal/ContextDiagnostics"));

const queryClient = new QueryClient();

// Helper to read cookie by name
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
};

// Pinterest click ID capture utility - robust version
const capturePinterestClickId = () => {
  if (typeof window === "undefined") return;
  
  // Skip if localStorage already has epik (idempotent)
  if (localStorage.getItem("pinterest_epik")) return;
  
  // Try URL param first
  const urlParams = new URLSearchParams(window.location.search);
  let epik = urlParams.get("epik");
  
  // Fallback: read from _epik cookie (Pinterest tag may set this)
  if (!epik) {
    epik = getCookie("_epik");
  }
  
  if (epik) {
    // Save to localStorage
    localStorage.setItem("pinterest_epik", epik);
    
    // If epik came from URL, also write to cookie (90 days expiry, Secure on HTTPS)
    if (urlParams.get("epik")) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `_epik=${epik}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax${secure}`;
    }
  }
};

const AppContent = () => {
  const location = useLocation();
  const { isOpen, showTeaser, closePopup, openFromTeaser } = useEmailPopup({
    delay: 45000,
    showOnScroll: true,
    scrollThreshold: 50,
    exitIntent: true,
    storageKey: "risebynight_email_popup_v1",
  });

  // Capture Pinterest click ID on initial load AND when query string changes
  useEffect(() => {
    capturePinterestClickId();
  }, [location.search]);

  // Track SPA route changes for analytics providers
  useEffect(() => {
    // Small delay to ensure scripts have had time to load
    const timer = setTimeout(() => {
      trackPageView(location.pathname);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Fixed spacer height: 36px banner + ~56px header = 92px (mobile ~77px)
  // Using CSS classes instead of dynamic JS measurement to prevent CLS
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <UrgencyBanner />
      <Header />
      {/* Fixed spacer - prevents CLS from dynamic height changes */}
      <div className="h-[77px] md:h-[92px]" aria-hidden="true" />
      <main className="flex-1">
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            {/* Core shopping pages - eagerly loaded */}
            <Route path="/" element={<Home />} />
            <Route path="/product/ergonomic-pillow" element={<ErgonomicPillowProduct />} />
            <Route path="/product/knee-pillow" element={<KneePillowProduct />} />
            <Route path="/product/sleep-mask" element={<SleepMaskProduct />} />
            <Route path="/product/sleep-bundle" element={<SleepBundleProduct />} />
            <Route path="/product" element={<ErgonomicPillowProduct />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/benefits" element={<Benefits />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/guarantee" element={<Guarantee />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/return-policy" element={<ReturnPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/imprint" element={<Imprint />} />
            <Route path="/collective" element={<PartnerProgram />} />
            <Route path="/partner" element={<PartnerProgram />} />
            <Route path="/sleep-guides" element={<SleepGuides />} />
            
            {/* Heavy pages - lazily loaded */}
            <Route path="/sleep-quiz" element={<SleepQuiz />} />
            <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
            <Route path="/sleep-coach" element={<SleepCoachDashboard />} />
            <Route path="/sleep-coach-debug" element={<SleepCoachDebug />} />
            <Route path="/sleep-persona-debug" element={<SleepPersonaDebug />} />
            <Route path="/sleep-persona-experiments-debug" element={<SleepPersonaExperimentsDebug />} />
            <Route path="/persona/:cluster" element={<PersonaLandingPage />} />
            <Route path="/admin/affiliate-fraud" element={<AdminAffiliateFraud />} />
            <Route path="/admin/affiliate-payouts" element={<AdminAffiliatePayouts />} />
            <Route path="/admin/affiliate-resources" element={<AdminAffiliateResources />} />
            <Route path="/admin/collective-applications" element={<AdminCollectiveApplications />} />
            <Route path="/admin/ugc-submissions" element={<AdminUGCSubmissions />} />
            <Route path="/internal/sleep-quiz-diagnostics" element={<SleepQuizDiagnostics />} />
            <Route path="/risebynight/tracking" element={<QuizRevealTracking />} />
            <Route path="/debug/analytics" element={<AnalyticsDiagnostics />} />
            <Route path="/internal/context-diagnostics" element={<ContextDiagnostics />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <EmailPopup
        isOpen={isOpen}
        showTeaser={showTeaser}
        onClose={closePopup}
        onOpenFromTeaser={openFromTeaser}
        listId="UEJzEU"
        discountCode="MYSTERYDISCOUNT"
      />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
