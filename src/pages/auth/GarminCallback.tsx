import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackStatus = 'processing' | 'success' | 'error';

const errorMessages: Record<string, string> = {
  access_denied: "You declined to connect your Garmin account. No data was shared.",
  missing_params: "Missing OAuth parameters. Please try connecting again.",
  invalid_state: "The authorization session expired or is invalid. Please try again.",
  session_not_found: "Could not find your connection session. Please try again.",
  session_invalid: "Your connection session is invalid. Please try again.",
  nonce_mismatch: "Security validation failed. Please try again.",
  token_exchange_failed: "Failed to complete authorization with Garmin. Please try again.",
  invalid_token_response: "Received an invalid response from Garmin. Please try again.",
  missing_access_token: "Garmin did not provide access credentials. Please try again.",
  storage_failed: "Failed to save your connection. Please try again.",
  server_config: "Server configuration error. Please contact support.",
  garmin_error: "Garmin returned an error. Please try again.",
  internal_error: "An unexpected error occurred. Please try again.",
};

export default function GarminCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Check for OAuth 2.0 parameters
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorReason = searchParams.get('reason');

      // If we have a 'garmin' param, this is a redirect back from the callback function
      const garminStatus = searchParams.get('garmin');
      if (garminStatus === 'success') {
        setStatus('success');
        setTimeout(() => {
          navigate('/settings/sleep-sources?connected=garmin');
        }, 1500);
        return;
      }
      
      if (garminStatus === 'error' || errorReason) {
        setStatus('error');
        const reason = errorReason || 'unknown';
        setErrorMessage(errorMessages[reason] || `Connection failed: ${reason}`);
        return;
      }

      // Handle Garmin error response
      if (error) {
        setStatus('error');
        if (error === 'access_denied') {
          setErrorMessage(errorMessages.access_denied);
        } else {
          setErrorMessage(`Garmin returned an error: ${error}`);
        }
        return;
      }

      // If we have code and state, the edge function should handle the redirect
      // This page serves as the initial landing that Garmin redirects to
      if (code && state) {
        // Redirect to the edge function to complete the exchange
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const callbackUrl = new URL(`${supabaseUrl}/functions/v1/garmin-oauth-callback`);
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('state', state);

        // Redirect to edge function - it will redirect back with success/error.
        // Use top-level navigation to avoid iframe restrictions in preview.
        const targetUrl = callbackUrl.toString();
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = targetUrl;
          } else {
            window.location.href = targetUrl;
          }
        } catch {
          window.location.href = targetUrl;
        }
        return;
      }

      // No valid parameters found
      setStatus('error');
      setErrorMessage(errorMessages.missing_params);
    };

    processCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/settings/sleep-sources');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'processing' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Connecting to Garmin</h1>
              <p className="text-muted-foreground">
                Please wait while we complete the connection...
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Garmin Connected!</h1>
              <p className="text-muted-foreground">
                Your Garmin account is now linked. Sleep data will sync automatically.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to settings...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Connection Failed</h1>
              <p className="text-muted-foreground">
                {errorMessage || "We couldn't connect your Garmin account."}
              </p>
            </div>
            <Button onClick={handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
