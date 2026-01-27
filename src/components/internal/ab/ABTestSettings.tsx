/**
 * A/B Test Settings Component
 * 
 * Manages excluded team emails that should not be counted in analytics.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { clearExcludedEmailsCache } from '@/lib/abTesting';
import { Settings, UserX, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ABTestSettingsProps {
  onSettingsChange?: () => void;
}

export default function ABTestSettings({ onSettingsChange }: ABTestSettingsProps) {
  const [excludedEmails, setExcludedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch excluded emails on mount
  useEffect(() => {
    fetchExcludedEmails();
  }, []);

  const fetchExcludedEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ab_excluded_emails')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching excluded emails:', error);
      }

      if (data?.value) {
        const rawEmails = Array.isArray(data.value) ? data.value : [];
        const emails = rawEmails.filter((e): e is string => typeof e === 'string');
        setExcludedEmails(emails);
      } else {
        // Initialize with default team emails
        const defaultEmails = [
          'info.optiseek@gmail.com',
          'info.sintosa@gmail.com',
          'sasvanwell@hotmail.com',
          'nautsmeets@gmail.com'
        ];
        setExcludedEmails(defaultEmails);
        // Save defaults to database
        await saveExcludedEmails(defaultEmails);
      }
    } catch (e) {
      console.error('Failed to fetch excluded emails:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveExcludedEmails = async (emails: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'ab_excluded_emails',
          value: emails,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      // Clear the cache so tracking picks up new settings
      clearExcludedEmailsCache();
      
      toast.success('Excluded emails saved');
      onSettingsChange?.();
    } catch (e) {
      console.error('Failed to save excluded emails:', e);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (excludedEmails.includes(email)) {
      toast.error('Email already in list');
      return;
    }

    const updatedEmails = [...excludedEmails, email];
    setExcludedEmails(updatedEmails);
    setNewEmail('');
    saveExcludedEmails(updatedEmails);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedEmails = excludedEmails.filter(e => e !== emailToRemove);
    setExcludedEmails(updatedEmails);
    saveExcludedEmails(updatedEmails);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            A/B Test Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          A/B Test Settings
        </CardTitle>
        <CardDescription>
          Configure team emails to exclude from analytics tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Excluded Emails Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserX className="h-4 w-4 text-muted-foreground" />
            Excluded Team Emails
          </div>
          
          <p className="text-xs text-muted-foreground">
            Sessions from these emails will be excluded from A/B test analytics (page views, ATCs, purchases, etc.)
          </p>

          {/* Email List */}
          <div className="flex flex-wrap gap-2">
            {excludedEmails.map((email) => (
              <Badge 
                key={email} 
                variant="secondary" 
                className="flex items-center gap-1 py-1"
              >
                {email}
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="ml-1 hover:text-destructive transition-colors"
                  title="Remove email"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {excludedEmails.length === 0 && (
              <span className="text-sm text-muted-foreground italic">
                No emails excluded
              </span>
            )}
          </div>

          <Separator />

          {/* Add Email Form */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Add team email..."
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleAddEmail} 
              size="sm"
              disabled={saving || !newEmail.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
