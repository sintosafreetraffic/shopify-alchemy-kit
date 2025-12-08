# Klaviyo Tier Flows Setup Guide

This document provides step-by-step instructions for setting up affiliate tier email flows in Klaviyo. It is designed for Klaviyo specialists or agencies implementing the Rise By Night affiliate tier notification system.

---

## Overview

The affiliate system sends a Klaviyo event called `RBN_Affiliate_Tier_Updated` whenever an affiliate's tier changes (upgrades, downgrades, or Diamond maintenance). This event powers three distinct email flows:

1. **Tier Upgrade Flow** – Celebratory email when affiliate moves up
2. **Tier Downgrade Flow** – Supportive email with action plan when tier drops
3. **Diamond Maintenance Flow** – VIP recognition for top-tier partners

All flow branching should be based on the `tier_change_context` property.

---

## Event Reference

### Event Name

```
RBN_Affiliate_Tier_Updated
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `affiliate_code` | string | The affiliate's unique referral code |
| `old_tier` | string | Previous tier before this update (bronze/silver/gold/platinum/diamond) |
| `new_tier` | string | New tier after this update |
| `tier` | string | Alias of new_tier (for convenience) |
| `commission_rate` | number | New commission percentage (e.g., 15, 20, 25) |
| `earnings` | number | Lifetime total commissions earned |
| `monthly_performance.sales` | number | Number of sales in last 30 days |
| `monthly_performance.revenue` | number | Total revenue generated in last 30 days |
| `tier_direction` | string | "up" or "down" |
| `tier_change_context` | string | Primary branching key (see below) |
| `updated_at` | string | ISO timestamp of the tier change |

### tier_change_context Values

| Value | Meaning |
|-------|---------|
| `upgrade_from_lower_tier` | Affiliate moved UP to a higher tier |
| `downgrade_from_higher_tier` | Affiliate moved DOWN to a lower tier |
| `maintained_top_tier` | Diamond affiliate maintained their status |

**Important**: Use `tier_change_context` as the primary filter for all flows. This is the single source of truth for determining which flow should trigger.

---

## Flow 1: Tier Upgrade

### Trigger Setup

1. Go to **Flows** → **Create Flow** → **Create from scratch**
2. Name: `RBN – Affiliate Tier Upgrade`
3. Trigger: **Metric** → Select `RBN_Affiliate_Tier_Updated`
4. Add **Flow Filter**:
   - Property: `tier_change_context`
   - Condition: `equals`
   - Value: `upgrade_from_lower_tier`

### Flow Structure

```
Trigger: RBN_Affiliate_Tier_Updated (tier_change_context = upgrade_from_lower_tier)
    │
    ├── Time Delay: 0 minutes (send immediately)
    │
    ├── Conditional Split (optional): by {{ event.tier }}
    │   ├── silver → "Welcome to Silver" email
    │   ├── gold → "Welcome to Gold" email
    │   ├── platinum → "Welcome to Platinum" email
    │   └── diamond → "Welcome to Diamond" email
    │
    └── (Or single "Upgrade" email with dynamic content)
```

### Email Personalization

Use these dynamic variables in your email template:

```liquid
{{ event.tier|title }}              → "Gold"
{{ event.commission_rate }}%        → "20%"
{{ event.old_tier|title }}          → "Silver"
{{ event.monthly_performance.sales }}   → 27
{{ event.monthly_performance.revenue|floatformat:2 }} → "1,234.56"
{{ event.earnings|floatformat:2 }}  → "5,678.90"
```

### Suggested Email Content

**Subject Line Examples:**
- 🎉 You just unlocked {{ event.tier|title }} tier!
- Level up! {{ event.commission_rate }}% commission is now live
- Congratulations, {{ event.tier|title }} Partner!

**Body Structure:**
1. **Hero**: Celebrate the achievement – "You've earned {{ event.tier|title }} status!"
2. **Rate highlight**: "Your new commission rate: {{ event.commission_rate }}%"
3. **Performance recap**: Show last 30-day stats (sales, revenue)
4. **What's unlocked**: Explain tier-specific benefits
5. **CTA**: "Keep the momentum – share your link now" → Link to affiliate dashboard

---

## Flow 2: Tier Downgrade

### Trigger Setup

1. Go to **Flows** → **Create Flow** → **Create from scratch**
2. Name: `RBN – Affiliate Tier Downgrade`
3. Trigger: **Metric** → Select `RBN_Affiliate_Tier_Updated`
4. Add **Flow Filter**:
   - Property: `tier_change_context`
   - Condition: `equals`
   - Value: `downgrade_from_higher_tier`

### Flow Structure

```
Trigger: RBN_Affiliate_Tier_Updated (tier_change_context = downgrade_from_higher_tier)
    │
    ├── Time Delay: 15-30 minutes (avoid "instant slap" feeling)
    │
    ├── Conditional Split (optional): by {{ event.old_tier }}
    │   ├── platinum → More empathetic tone (bigger drop)
    │   ├── gold → Moderate tone
    │   └── silver → Light encouragement
    │
    └── Send "Tier Update" email
```

### Email Personalization

```liquid
{{ event.old_tier|title }}          → Previous tier
{{ event.tier|title }}              → Current (lower) tier
{{ event.commission_rate }}%        → New rate
{{ event.monthly_performance.sales }}   → Current 30-day sales
```

### Suggested Email Content

**Subject Line Examples:**
- Quick update on your partner tier
- Your tier has changed – here's your path back
- We're rooting for you, {{ first_name }}

**Body Structure:**
1. **Honest update**: "Your tier moved from {{ event.old_tier|title }} to {{ event.tier|title }}"
2. **What changed**: Explain the 30-day sales threshold wasn't met
3. **New rate**: "Your commission rate is now {{ event.commission_rate }}%"
4. **Path back**: Show exactly what's needed to regain previous tier:
   - Silver: 10+ sales in 30 days
   - Gold: 25+ sales in 30 days
   - Platinum: 50+ sales in 30 days
5. **Quick win plan**: 2-3 actionable suggestions
6. **CTA**: "Check your dashboard" → Link to affiliate dashboard with resources

### Tier Thresholds Reference

Include this in your email copy to show affiliates what they need:

| Tier | 30-Day Sales Required | Commission Rate |
|------|----------------------|-----------------|
| Bronze | Default | 10% |
| Silver | 10+ | 15% |
| Gold | 25+ | 20% |
| Platinum | 50+ | 25% |
| Diamond | Invite only | 25% |

---

## Flow 3: Diamond Maintenance / Recognition

### Trigger Setup

1. Go to **Flows** → **Create Flow** → **Create from scratch**
2. Name: `RBN – Diamond Partner Recognition`
3. Trigger: **Metric** → Select `RBN_Affiliate_Tier_Updated`
4. Add **Flow Filters** (both must be true):
   - Filter 1:
     - Property: `tier_change_context`
     - Condition: `equals`
     - Value: `maintained_top_tier`
   - Filter 2:
     - Property: `tier`
     - Condition: `equals`
     - Value: `diamond`

### Flow Structure

```
Trigger: RBN_Affiliate_Tier_Updated 
         (tier_change_context = maintained_top_tier AND tier = diamond)
    │
    ├── Time Delay: 0-60 minutes
    │
    └── Send "Diamond Recognition" email
```

### Email Personalization

```liquid
{{ event.tier|title }}              → "Diamond"
{{ event.commission_rate }}%        → "25%"
{{ event.monthly_performance.sales }}
{{ event.monthly_performance.revenue|floatformat:2 }}
{{ event.earnings|floatformat:2 }}
```

### Suggested Email Content

**Subject Line Examples:**
- 👑 Still at the top – thank you, Diamond partner
- Your Diamond status continues
- You're in elite company, {{ first_name }}

**Body Structure:**
1. **Recognition**: "You've maintained Diamond status – our highest tier"
2. **Performance highlight**: Show their impressive 30-day numbers
3. **Exclusive perks**: Mention any Diamond-only benefits or early access
4. **Invite feedback**: Ask if they have ideas for new features or campaigns
5. **CTA**: "Explore new resources" or "Reply with your feedback"

---

## General Implementation Notes

### Flow Naming Conventions

Use consistent prefixes for easy organization:
- `RBN – Affiliate Tier Upgrade`
- `RBN – Affiliate Tier Downgrade`
- `RBN – Diamond Partner Recognition`

### Smart Sending

- **Upgrade flow**: Smart Sending OFF (always send immediately)
- **Downgrade flow**: Smart Sending OFF (time-sensitive communication)
- **Diamond flow**: Smart Sending ON is acceptable (less urgent)

### Testing

Before going live:
1. Create a test profile in Klaviyo
2. Use Klaviyo's "Preview" feature to test dynamic content
3. Send test emails to verify all liquid tags render correctly
4. Verify flow filters are working by checking Flow Analytics

### Event Timing

- The `RBN_Affiliate_Tier_Updated` event fires from a daily CRON job at 02:00 UTC
- Events only fire when an actual tier change occurs (or for Diamond maintenance)
- No duplicate events for same-tier recalculations

### Additional Segmentation (Optional)

If you want to further refine targeting, you can create segments based on:
- `tier` = specific tier
- `earnings` > threshold (high-value affiliates)
- `monthly_performance.sales` > threshold (recent high performers)

---

## Troubleshooting

### Event Not Triggering Flow

1. Check Flow Filters match exactly:
   - `tier_change_context` must be exact string match
   - Verify no typos in filter values
2. Confirm the event was received (check Klaviyo Activity Feed)
3. Ensure flow is LIVE (not Draft or Manual)

### Dynamic Content Not Rendering

1. Use `{{ event.property_name }}` syntax (not `{{ properties.property_name }}`)
2. Check for null values – use defaults: `{{ event.badge|default:"" }}`
3. For nested properties: `{{ event.monthly_performance.sales }}`

### Wrong Flow Triggering

1. Verify Flow Filter logic (AND vs OR)
2. Check that only one flow matches each `tier_change_context` value
3. Review event payload in Activity Feed to confirm property values

---

## Contact

For questions about event payloads or technical integration:
- **Email**: support@risebynight.com
- **Docs**: See `docs/affiliate-tier-email-templates.md` for conceptual templates
- **Docs**: See `docs/affiliate-system.md` for full system architecture
