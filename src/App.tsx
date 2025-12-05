import { Suspense, lazy } from "react";
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
import Home from "./pages/Home";
import Index from "./pages/Index";
import KneePillowProduct from "./pages/KneePillowProduct";
import SleepMaskProduct from "./pages/SleepMaskProduct";
import SleepBundleProduct from "./pages/SleepBundleProduct";
import SleepQuiz from "./pages/SleepQuiz";
import Auth from "./pages/Auth";
import AffiliateDashboard from "./pages/AffiliateDashboard";
const SleepCoachDashboard = lazy(() => import("./pages/SleepCoachDashboard"));
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

const queryClient = new QueryClient();

const AppContent = () => {
  const { isOpen, showTeaser, closePopup, openFromTeaser } = useEmailPopup({
    delay: 45000,
    showOnScroll: true,
    scrollThreshold: 50,
    exitIntent: true,
    storageKey: "risebynight_email_popup_v1",
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <UrgencyBanner />
      <Header />
      <main className="flex-1 pt-2">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/ergonomic-pillow" element={<Index />} />
          <Route path="/product/knee-pillow" element={<KneePillowProduct />} />
          <Route path="/product/sleep-mask" element={<SleepMaskProduct />} />
          <Route path="/product/sleep-bundle" element={<SleepBundleProduct />} />
          <Route path="/product" element={<Index />} />
          <Route path="/sleep-quiz" element={<SleepQuiz />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
          <Route path="/sleep-coach" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}><SleepCoachDashboard /></Suspense>} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
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
