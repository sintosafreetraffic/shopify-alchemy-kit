import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { capturePinterestClickId } from "./lib/shopify";
import { initializeBuyerContext } from "./lib/buyerContext";

// Capture Pinterest click ID from URL on initial page load
capturePinterestClickId();

// Initialize buyer context for multi-currency support (non-blocking)
initializeBuyerContext().catch(() => {
  // Silent fail - country detection failure shouldn't block app
});

createRoot(document.getElementById("root")!).render(<App />);
