# Affiliate Tier Email Flow Templates

This document provides Klaviyo-ready email flow templates for affiliate tier change notifications. All flows are driven by the `RBN_Affiliate_Tier_Updated` event.

---

## Overview

The `RBN_Affiliate_Tier_Updated` event fires **only when an affiliate's tier actually changes** during the daily CRON recalculation (02:00 UTC). Use the `tier_change_context` property to branch flows for different scenarios.

### Key Event Properties

| Property | Type | Description |
|----------|------|-------------|
| `affiliate_code` | string | Affiliate's referral code |
| `old_tier` | string | Previous tier (bronze, silver, gold, platinum, diamond) |
| `new_tier` | string | New tier after recalculation |
| `tier` | string | Alias of new_tier |
| `commission_rate` | number | New commission rate percentage |
| `earnings` | number | Lifetime total commissions |
| `monthly_performance.sales` | number | Sales in last 30 days |
| `monthly_performance.revenue` | number | Revenue generated in last 30 days |
| `tier_direction` | string | `"up"` or `"down"` |
| `tier_change_context` | string | Fine-grained context (see below) |
| `updated_at` | string | ISO timestamp of the change |

### tier_change_context Values

- `"upgrade_from_lower_tier"` — Any tier increase (Bronze→Silver, Silver→Gold, etc.)
- `"downgrade_from_higher_tier"` — Any tier decrease (Gold→Silver, Platinum→Gold, etc.)
- `"maintained_top_tier"` — Staying at Diamond tier (if event fires for Diamond maintenance)

---

## Flow 1: Tier Upgrade

**Trigger**: `RBN_Affiliate_Tier_Updated` where `tier_change_context == "upgrade_from_lower_tier"`

### Subject Line Examples

1. `🎉 You just unlocked {{ event.tier|capitalize }} tier – {{ event.commission_rate }}% commission is live!`
2. `Congrats! Your hard work paid off – welcome to {{ event.tier|capitalize }}`
3. `Level up! You're now a {{ event.tier|capitalize }} partner with Rise By Night`

### Preheader Examples

1. `Your commission rate just increased to {{ event.commission_rate }}%. Here's what's next.`
2. `{{ event.monthly_performance.sales }} sales this month = higher rewards for you`
3. `Unlock even more by reaching the next tier`

### Body Structure

#### Section 1: Hero Celebration
```
🎉 You just unlocked {{ event.tier|capitalize }} tier!

Your commission rate is now {{ event.commission_rate }}%
```

**Dynamic fields**: `{{ event.tier }}`, `{{ event.commission_rate }}`

#### Section 2: Performance Recap
```
Your last 30 days:
• {{ event.monthly_performance.sales }} sales
• ${{ event.monthly_performance.revenue }} revenue generated
• ${{ event.earnings }} lifetime earnings
```

**Dynamic fields**: `{{ event.monthly_performance.sales }}`, `{{ event.monthly_performance.revenue }}`, `{{ event.earnings }}`

#### Section 3: What This Unlocks
```
Moving from {{ event.old_tier|capitalize }} to {{ event.tier|capitalize }} means:

• Your commission increased from [old rate]% to {{ event.commission_rate }}%
• Every sale now earns you more
• You're [X] sales away from the next tier
```

**Dynamic fields**: `{{ event.old_tier }}`, `{{ event.tier }}`, `{{ event.commission_rate }}`

**Note**: Calculate old rate based on old_tier (bronze=10%, silver=15%, gold=20%, platinum=25%)

#### Section 4: Action Plan
```
Keep the momentum going:

1. Share your bestselling product link with your audience
2. Post about your success story with the pillow
3. Invite other creators to join your team (earn 5% on their sales!)
```

#### Section 5: CTA
```
[View Your Dashboard] → https://www.risebynight.com/affiliate-dashboard
```

---

## Flow 2: Tier Downgrade

**Trigger**: `RBN_Affiliate_Tier_Updated` where `tier_change_context == "downgrade_from_higher_tier"`

### Subject Line Examples

1. `Your tier has changed – here's how to bounce back`
2. `Quick update on your Rise By Night affiliate status`
3. `Let's get you back to {{ event.old_tier|capitalize }} tier`

### Preheader Examples

1. `Your commission rate is now {{ event.commission_rate }}%. Here's your action plan.`
2. `A few sales can get you back on track`
3. `We're here to help you climb back up`

### Body Structure

#### Section 1: Honest Update
```
Hey there,

Your affiliate tier has changed from {{ event.old_tier|capitalize }} to {{ event.tier|capitalize }}.

Your commission rate is now {{ event.commission_rate }}%.
```

**Dynamic fields**: `{{ event.old_tier }}`, `{{ event.tier }}`, `{{ event.commission_rate }}`

**Tone**: Empathetic but matter-of-fact. No blame, just information.

#### Section 2: What Changed
```
Based on your performance over the last 30 days:
• {{ event.monthly_performance.sales }} sales
• ${{ event.monthly_performance.revenue }} revenue

To maintain {{ event.old_tier|capitalize }}, you needed [X] sales in 30 days.
```

**Dynamic fields**: `{{ event.monthly_performance.sales }}`, `{{ event.monthly_performance.revenue }}`, `{{ event.old_tier }}`

**Thresholds reference**:
- Silver: 10+ sales/30 days
- Gold: 25+ sales/30 days  
- Platinum: 50+ sales/30 days

#### Section 3: Path Back
```
Here's what it takes to regain {{ event.old_tier|capitalize }}:

{{ event.old_tier }} requires [X] sales in the next 30 days.
That's about [X/30] sales per day.
```

#### Section 4: Quick Win Plan
```
Try these proven tactics:

1. **Repost your best-performing content** – what worked before can work again
2. **Share a personal story** – testimonials about your own sleep improvement convert best
3. **Reach out to your network** – a simple DM or email to friends can spark sales
```

#### Section 5: CTA
```
[Open Your Dashboard] → https://www.risebynight.com/affiliate-dashboard
[Access Marketing Resources] → https://www.risebynight.com/affiliate-dashboard#resources
```

---

## Flow 3: Maintained Top Tier (Diamond)

**Trigger**: `RBN_Affiliate_Tier_Updated` where `tier_change_context == "maintained_top_tier"` AND `tier == "diamond"`

### Subject Line Examples

1. `👑 You're still in the Diamond club – thank you!`
2. `Elite status confirmed: You're a top Rise By Night partner`
3. `Diamond partners like you make all the difference`

### Preheader Examples

1. `Your dedication continues to inspire us`
2. `Here's your VIP performance recap`
3. `Special perks coming your way`

### Body Structure

#### Section 1: Recognition
```
👑 Diamond Partner Status: Confirmed

You're one of our most valued affiliates, and we don't take that for granted.

Thank you for being a Rise By Night ambassador.
```

#### Section 2: Performance Recap
```
Your last 30 days:
• {{ event.monthly_performance.sales }} sales
• ${{ event.monthly_performance.revenue }} revenue generated
• ${{ event.earnings }} lifetime earnings

Commission rate: {{ event.commission_rate }}% (the highest available)
```

**Dynamic fields**: `{{ event.monthly_performance.sales }}`, `{{ event.monthly_performance.revenue }}`, `{{ event.earnings }}`, `{{ event.commission_rate }}`

#### Section 3: Exclusive Perks (Placeholder)
```
As a Diamond partner, you get:

• Early access to new products before public launch
• Priority support from our affiliate team
• Exclusive promotional materials
• [Additional perks as they become available]
```

**Note**: Update this section as actual Diamond perks are defined.

#### Section 4: Invite Feedback
```
We'd love to hear from you:

• What's working well in your promotions?
• Any product or marketing suggestions?
• Interested in co-creating content with us?

Reply to this email – we read every message from Diamond partners.
```

#### Section 5: CTA
```
[View Your Dashboard] → https://www.risebynight.com/affiliate-dashboard
```

---

## Implementation Notes for Klaviyo

### Flow Setup

1. **Create a new Flow** triggered by `RBN_Affiliate_Tier_Updated` metric
2. **Add Conditional Split** on `tier_change_context`:
   - Branch 1: `tier_change_context equals upgrade_from_lower_tier` → Upgrade email
   - Branch 2: `tier_change_context equals downgrade_from_higher_tier` → Downgrade email
   - Branch 3: `tier_change_context equals maintained_top_tier` → Diamond maintenance email

### Dynamic Content

All event properties are accessible via `{{ event.property_name }}`:

```liquid
{{ event.tier }}
{{ event.commission_rate }}
{{ event.old_tier }}
{{ event.new_tier }}
{{ event.monthly_performance.sales }}
{{ event.monthly_performance.revenue }}
{{ event.earnings }}
{{ event.tier_direction }}
{{ event.tier_change_context }}
{{ event.updated_at }}
```

### Filters & Formatting

```liquid
{{ event.tier|capitalize }}           → "Gold"
{{ event.earnings|floatformat:2 }}    → "1234.56"
{{ event.updated_at|date:"F j, Y" }}  → "December 8, 2025"
```

---

## Testing Checklist

Before going live:

- [ ] Verify flow triggers only on actual tier changes (not every recalc)
- [ ] Test upgrade path: Bronze → Silver, Silver → Gold, etc.
- [ ] Test downgrade path: Gold → Silver, Platinum → Gold, etc.
- [ ] Confirm Diamond maintenance email only sends to Diamond affiliates
- [ ] Validate all dynamic fields render correctly
- [ ] Check mobile responsiveness of email templates
- [ ] Review unsubscribe/preference links are included
