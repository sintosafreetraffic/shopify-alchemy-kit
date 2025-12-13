import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { UrgencyBanner } from "./components/UrgencyBanner";
import { EmailPopup } from "./components/EmailPopup";
import { useEmailPopup } from "./hooks/useEmailPopup";
import { FullPageLoader } from "./components/FullPageLoader";

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

const queryClient = new QueryClient();

// Pinterest click ID capture utility
const capturePinterestClickId = () => {
  if (typeof window === "undefined") return;
  
  // Check if already captured this session
  const sessionKey = "pinterest_epik_captured";
  if (sessionStorage.getItem(sessionKey)) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const epik = urlParams.get("epik");
  
  if (epik) {
    // Save to localStorage
    localStorage.setItem("pinterest_epik", epik);
    
    // Save to cookie (90 days expiry, Secure on HTTPS)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `_epik=${epik}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax${secure}`;
    
    // Mark as captured for this session (only after successful capture)
    sessionStorage.setItem(sessionKey, "true");
  }
};

const AppContent = () => {
  const { isOpen, showTeaser, closePopup, openFromTeaser } = useEmailPopup({
    delay: 45000,
    showOnScroll: true,
    scrollThreshold: 50,
    exitIntent: true,
    storageKey: "risebynight_email_popup_v1",
  });

  // Capture Pinterest click ID on initial load (once per session)
  useEffect(() => {
    capturePinterestClickId();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <UrgencyBanner />
      <Header />
      <main className="flex-1 pt-2">
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
