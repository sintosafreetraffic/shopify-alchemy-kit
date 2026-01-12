/**
 * QuickActions Component
 * 
 * Primary action buttons for affiliates - prominent, accessible, premium.
 * The most important actions an affiliate takes should be one click away.
 */

import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, UserPlus, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface QuickActionsProps {
  referralCode: string;
  siteUrl: string;
  onCreateDiscount?: () => void;
}

export function QuickActions({ 
  referralCode, 
  siteUrl,
  onCreateDiscount 
}: QuickActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const referralLink = `${siteUrl}?ref=${referralCode}`;
  const inviteLink = `${siteUrl}/affiliate-dashboard?invite=${referralCode}`;

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rise By Night",
          text: "Check out Rise By Night - premium sleep products for better rest",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or error - fallback to copy
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Primary: Share Link */}
      <Button onClick={shareLink} className="gap-2">
        {copiedLink ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Share Link
          </>
        )}
      </Button>

      {/* Secondary: Copy Invite Link */}
      <Button onClick={copyInviteLink} variant="outline" className="gap-2">
        {copiedInvite ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Invite Partner
          </>
        )}
      </Button>

      {/* Tertiary: Create Discount */}
      {onCreateDiscount && (
        <Button onClick={onCreateDiscount} variant="ghost" className="gap-2">
          <Tag className="h-4 w-4" />
          New Code
        </Button>
      )}
    </div>
  );
}
