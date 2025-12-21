import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { capturePinterestClickId } from "./lib/shopify";

// Capture Pinterest click ID from URL on initial page load
capturePinterestClickId();

createRoot(document.getElementById("root")!).render(<App />);
