/// <reference types="vite/client" />

// Klaviyo global types
declare global {
  interface Window {
    _learnq?: Array<unknown[]>;
    _klOnsite?: Array<unknown[]>;
  }
}

export {};
