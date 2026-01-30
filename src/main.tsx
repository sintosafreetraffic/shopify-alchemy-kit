import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { capturePinterestClickId } from "./lib/shopify";
import { initializeBuyerContext } from "./lib/buyerContext";
import { initializeProviders } from "./lib/analyticsRegistry";

// Capture Pinterest click ID from URL on initial page load
capturePinterestClickId();

// Initialize analytics providers and context tracking for CAPI enrichment
// This captures fbclid, gclid, epik and syncs to DB for server-side attribution
initializeProviders();

// Initialize buyer context for multi-currency support (non-blocking)
initializeBuyerContext().catch(() => {
  // Silent fail - country detection failure shouldn't block app
});

createRoot(document.getElementById("root")!).render(<App />);
