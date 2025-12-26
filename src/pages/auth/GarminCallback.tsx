import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Watch } from "lucide-react";
import moonIcon from "@/assets/moon-icon-blue.png";

type CallbackStatus = 'processing' | 'success' | 'error';

export default function GarminCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const oauthToken = searchParams.get('oauth_token');
      const oauthVerifier = searchParams.get('oauth_verifier');
      const state = searchParams.get('state');

      if (!oauthToken || !oauthVerifier || !state) {
        setStatus('error');
        setErrorMessage('Missing OAuth callback parameters. Please try connecting again.');
        return;
      }

      try {
        // Call the edge function to complete the OAuth exchange
        const { data, error } = await supabase.functions.invoke('garmin-oauth-callback', {
          body: null,
          headers: {},
        });

        // The edge function expects GET params, so we need to call it differently
        // Build the URL with query params
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const callbackUrl = new URL(`${supabaseUrl}/functions/v1/garmin-oauth-callback`);
        callbackUrl.searchParams.set('oauth_token', oauthToken);
        callbackUrl.searchParams.set('oauth_verifier', oauthVerifier);
        callbackUrl.searchParams.set('state', state);

        const response = await fetch(callbackUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.details || 'Failed to complete Garmin connection');
        }

        setStatus('success');

        // Redirect to sleep sources settings after a short delay
        setTimeout(() => {
          navigate('/settings/sleep-sources?connected=garmin');
        }, 2000);

      } catch (error) {
        console.error('Garmin OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to connect Garmin');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img src={moonIcon} alt="Rise By Night" className="h-16 w-16" />
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                <Watch className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">
            {status === 'processing' && 'Connecting Garmin...'}
            {status === 'success' && 'Garmin Connected!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we complete the connection'}
            {status === 'success' && 'Your Garmin device is now linked to Sleep Coach'}
            {status === 'error' && 'We couldn\'t connect your Garmin account'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center gap-6">
          {status === 'processing' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Exchanging authorization tokens...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your sleep data will now sync automatically.
                </p>
                <p className="text-xs text-muted-foreground">
                  Redirecting to settings...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {errorMessage}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/settings/sleep-sources')}
                >
                  Go to Settings
                </Button>
                <Button 
                  onClick={() => navigate('/settings/sleep-sources?action=connect-garmin')}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
