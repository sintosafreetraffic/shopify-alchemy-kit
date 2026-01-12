/**
 * StorefrontEditor
 * 
 * Allows affiliates (Gold+) to customize their public storefront page.
 * Scandinavian minimal design with calm, premium feel.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Save, 
  Eye, 
  ExternalLink,
  Palette,
  User,
  MessageSquare,
  Link as LinkIcon,
  Image,
  Check
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StorefrontData {
  id?: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  theme_color: string;
  accent_color: string;
  social_links: { platform: string; url: string }[];
  testimonial: string;
  is_published: boolean;
  custom_slug: string;
}

interface StorefrontEditorProps {
  affiliateId: string;
  affiliateTier: string;
  referralCode: string;
}

const THEME_PRESETS = [
  { name: 'Midnight', theme: '#1a1a2e', accent: '#0ea5e9' },
  { name: 'Forest', theme: '#1a2e1a', accent: '#22c55e' },
  { name: 'Ocean', theme: '#1a2e2e', accent: '#06b6d4' },
  { name: 'Dusk', theme: '#2e1a2e', accent: '#a855f7' },
  { name: 'Warm', theme: '#2e2a1a', accent: '#f59e0b' },
];

export function StorefrontEditor({ affiliateId, affiliateTier, referralCode }: StorefrontEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storefront, setStorefront] = useState<StorefrontData>({
    display_name: '',
    bio: '',
    avatar_url: '',
    banner_url: '',
    theme_color: '#1a1a2e',
    accent_color: '#0ea5e9',
    social_links: [],
    testimonial: '',
    is_published: false,
    custom_slug: '',
  });

  const eligibleTiers = ['gold', 'platinum', 'diamond'];
  const isEligible = eligibleTiers.includes(affiliateTier);

  useEffect(() => {
    async function fetchStorefront() {
      if (!isEligible) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliate_storefronts')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setStorefront({
            id: data.id,
            display_name: data.display_name || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            banner_url: data.banner_url || '',
            theme_color: data.theme_color || '#1a1a2e',
            accent_color: data.accent_color || '#0ea5e9',
            social_links: (data.social_links as any[]) || [],
            testimonial: data.testimonial || '',
            is_published: data.is_published || false,
            custom_slug: data.custom_slug || '',
          });
        }
      } catch (err) {
        console.error('[StorefrontEditor] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStorefront();
  }, [affiliateId, isEligible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        affiliate_id: affiliateId,
        display_name: storefront.display_name || null,
        bio: storefront.bio || null,
        avatar_url: storefront.avatar_url || null,
        banner_url: storefront.banner_url || null,
        theme_color: storefront.theme_color,
        accent_color: storefront.accent_color,
        social_links: storefront.social_links,
        testimonial: storefront.testimonial || null,
        is_published: storefront.is_published,
        custom_slug: storefront.custom_slug || null,
      };

      if (storefront.id) {
        const { error } = await supabase
          .from('affiliate_storefronts')
          .update(payload)
          .eq('id', storefront.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('affiliate_storefronts')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setStorefront(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Storefront saved",
        description: storefront.is_published 
          ? "Your public page is now live." 
          : "Draft saved. Publish when ready.",
      });
    } catch (err: any) {
      console.error('[StorefrontEditor] Save error:', err);
      toast({
        title: "Save failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPublicUrl = () => {
    const slug = storefront.custom_slug || referralCode;
    return `/creator/${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isEligible) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Palette className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Storefront Unlocked at Gold</h3>
          <p className="text-sm text-muted-foreground">
            Reach Gold tier to customize your public ambassador page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Storefront</h2>
          <p className="text-sm text-muted-foreground">
            Customize your public ambassador page
          </p>
        </div>
        <div className="flex items-center gap-3">
          {storefront.is_published && (
            <Button variant="outline" size="sm" asChild>
              <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1.5" />
                Preview
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="Your name or brand"
                value={storefront.display_name}
                onChange={(e) => setStorefront(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell visitors about yourself..."
                value={storefront.bio}
                onChange={(e) => setStorefront(prev => ({ ...prev, bio: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_slug">Custom URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/creator/</span>
                <Input
                  id="custom_slug"
                  placeholder={referralCode}
                  value={storefront.custom_slug}
                  onChange={(e) => setStorefront(prev => ({ ...prev, custom_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme Preset</Label>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setStorefront(prev => ({ 
                      ...prev, 
                      theme_color: preset.theme,
                      accent_color: preset.accent 
                    }))}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border transition-colors hover:border-primary"
                    style={{ 
                      borderColor: storefront.theme_color === preset.theme ? preset.accent : undefined 
                    }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ background: `linear-gradient(135deg, ${preset.theme}, ${preset.accent})` }}
                    />
                    <span className="text-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  placeholder="https://..."
                  value={storefront.avatar_url}
                  onChange={(e) => setStorefront(prev => ({ ...prev, avatar_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner URL</Label>
                <Input
                  id="banner_url"
                  placeholder="https://..."
                  value={storefront.banner_url}
                  onChange={(e) => setStorefront(prev => ({ ...prev, banner_url: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testimonial Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Featured Testimonial
            </CardTitle>
            <CardDescription>
              Share your personal experience with Rise By Night
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="My sleep transformed after using Rise By Night..."
              value={storefront.testimonial}
              onChange={(e) => setStorefront(prev => ({ ...prev, testimonial: e.target.value }))}
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Publish Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Publishing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Make Public</p>
                <p className="text-sm text-muted-foreground">
                  {storefront.is_published 
                    ? "Your storefront is visible to everyone" 
                    : "Only you can see your storefront"}
                </p>
              </div>
              <Switch
                checked={storefront.is_published}
                onCheckedChange={(checked) => setStorefront(prev => ({ ...prev, is_published: checked }))}
              />
            </div>
            {storefront.is_published && (
              <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <Check className="h-4 w-4" />
                  <span>Live at:</span>
                  <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">
                    {getPublicUrl()}
                  </code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
