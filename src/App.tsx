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

import { FullPageLoader } from "./components/FullPageLoader";

// =============================================================================
// TEMPORARY PINTEREST DEBUG WRAPPER
// Purpose: Intercept ALL pintrk calls, log them, and BLOCK any "checkout" events
// This proves whether Lovable is firing "checkout" anywhere (it should NOT).
// Remove this wrapper once debugging is complete.
// =============================================================================
const installPinterestDebugWrapper = () => {
  if (typeof window === "undefined") return;
  
  // Prevent double-installation
  if ((window as any).__pintrk_debug_installed) return;
  
  let attempts = 0;
  const maxAttempts = 100; // 5 seconds at 50ms intervals
  
  const tryInstall = () => {
    attempts++;
    
    if ((window as any).pintrk && !(window as any).__pintrk_original) {
      // Save original function
      (window as any).__pintrk_original = (window as any).pintrk;
      
      // Replace with wrapper
      (window as any).pintrk = function(...args: any[]) {
        const [command, eventName, payload] = args;
        
        // Log every call
        console.log('[Pinterest Debug]', {
          command,
          eventName,
          payload,
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
        
        // Block "checkout" event (case-insensitive)
        if (
          command === 'track' && 
          typeof eventName === 'string' && 
          eventName.toLowerCase() === 'checkout'
        ) {
          console.error('[Pinterest] BLOCKED checkout event from Lovable!');
          console.error('[Pinterest] This should NEVER happen - checkout events must only come from Shopify.');
          console.error(new Error('Pinterest checkout blocked - stack trace:').stack);
          console.error('[Pinterest] Blocked payload:', payload);
          return; // Do NOT forward to Pinterest
        }
        
        // Forward all other calls to original
        return (window as any).__pintrk_original.apply(this, args);
      };
      
      (window as any).__pintrk_debug_installed = true;
      console.log('[Pinterest Debug] Wrapper installed successfully. Monitoring all pintrk calls.');
      console.log('[Pinterest Debug] Any "checkout" events will be BLOCKED and logged with stack trace.');
    } else if (attempts < maxAttempts) {
      // Keep polling
      setTimeout(tryInstall, 50);
    } else {
      console.log('[Pinterest Debug] pintrk not found after 5s - Pinterest Tag may not be loaded.');
    }
  };
  
  tryInstall();
};

// Install on module load (earliest possible)
installPinterestDebugWrapper();

// Eagerly loaded pages (core shopping experience)
import Home from "./pages/Home";
import Index from "./pages/Index";
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
import SleepCollective from "./pages/SleepCollective";
import NotFound from "./pages/NotFound";

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
            <Route path="/product/ergonomic-pillow" element={<Index />} />
            <Route path="/product/knee-pillow" element={<KneePillowProduct />} />
            <Route path="/product/sleep-mask" element={<SleepMaskProduct />} />
            <Route path="/product/sleep-bundle" element={<SleepBundleProduct />} />
            <Route path="/product" element={<Index />} />
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
            <Route path="/collective" element={<SleepCollective />} />
            
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
