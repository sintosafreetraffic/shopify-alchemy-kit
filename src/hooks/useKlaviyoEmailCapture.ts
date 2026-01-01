/**
 * Klaviyo Native Form Email Capture
 * 
 * Listens to Klaviyo's native form submission events and captures
 * the email to pinterest_context for CAPI enrichment.
 * 
 * This bridges the gap between Klaviyo native forms and our Pinterest
 * attribution tracking, ensuring email hash coverage for better match rates.
 */

import { useEffect, useRef } from 'react';
import { captureEmail } from '@/lib/contextTracking';

// Klaviyo form event types
interface KlaviyoFormEvent {
  type: 'open' | 'close' | 'submit' | 'stepSubmit' | 'redirectedToUrl';
  metaData?: {
    $email?: string;
    $phone_number?: string;
    [key: string]: unknown;
  };
  formId?: string;
}

interface KlaviyoFormsEventDetail {
  detail: KlaviyoFormEvent;
}

/**
 * Hook to capture emails from Klaviyo native form submissions
 * and send them to pinterest_context for CAPI enrichment.
 * 
 * Should be used once at app root level (App.tsx).
 */
export function useKlaviyoEmailCapture(): void {
  const hasSetup = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasSetup.current) return;
    hasSetup.current = true;

    const handleKlaviyoForm = (event: Event) => {
      try {
        const klaviyoEvent = event as unknown as KlaviyoFormsEventDetail;
        const { type, metaData, formId } = klaviyoEvent.detail || {};

        // Only capture on form submissions that include email
        if (type === 'submit' || type === 'stepSubmit') {
          const email = metaData?.$email;
          
          if (email && typeof email === 'string') {
            console.log('[KlaviyoEmailCapture] Form submitted with email:', {
              formId,
              type,
              hasEmail: true,
            });
            
            // Send to pinterest_context for CAPI enrichment
            captureEmail(email);
          } else {
            console.log('[KlaviyoEmailCapture] Form submitted without email:', {
              formId,
              type,
              hasEmail: false,
            });
          }
        }
      } catch (error) {
        console.warn('[KlaviyoEmailCapture] Error handling form event:', error);
      }
    };

    // Listen for Klaviyo form events
    // Klaviyo fires 'klaviyoForms' custom event on form interactions
    window.addEventListener('klaviyoForms', handleKlaviyoForm);

    console.log('[KlaviyoEmailCapture] ✅ Listening for Klaviyo form submissions');

    return () => {
      window.removeEventListener('klaviyoForms', handleKlaviyoForm);
    };
  }, []);
}
