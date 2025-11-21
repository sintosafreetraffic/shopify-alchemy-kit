import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { SocialProofNotification } from "./components/SocialProofNotification";
import { PaymentMethodsBar } from "./components/PaymentMethodsBar";
import Home from "./pages/Home";
import Index from "./pages/Index";
import KneePillowProduct from "./pages/KneePillowProduct";
import SleepMaskProduct from "./pages/SleepMaskProduct";
import Benefits from "./pages/Benefits";
import Reviews from "./pages/Reviews";
import FAQ from "./pages/FAQ";
import Guarantee from "./pages/Guarantee";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsConditions from "./pages/TermsConditions";
import ReturnPolicy from "./pages/ReturnPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AboutUs from "./pages/AboutUs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <PaymentMethodsBar />
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/ergonomic-pillow" element={<Index />} />
              <Route path="/product/knee-pillow" element={<KneePillowProduct />} />
              <Route path="/product/sleep-mask" element={<SleepMaskProduct />} />
              <Route path="/product" element={<Index />} />
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/guarantee" element={<Guarantee />} />
              <Route path="/shipping" element={<ShippingPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/return-policy" element={<ReturnPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/about" element={<AboutUs />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
