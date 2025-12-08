# Rise By Night - 3-Layer Sleep Intelligence Architecture

## Overview

The Sleep Coach system implements a comprehensive 3-layer personalization engine that powers all sleep recommendations, Klaviyo marketing automation, and AI coaching.

## The 3 Layers

### Layer 1: Static Identity
Who the sleeper is (rarely changes, set during quiz).

| Field | Type | Source |
|-------|------|--------|
| `sleep_position` | side/back/stomach/mixed | Quiz |
| `pain_points` | string[] | Quiz |
| `temperature_preference` | cold/neutral/warm | Quiz |
| `stress_level` | low/medium/high | Quiz |
| `wake_up_condition` | energized/neutral/tired/stiff | Quiz |
| `products_owned` | string[] | Shopify webhook |
| `quiz_completed` | boolean | Quiz completion |

### Layer 2: Semi-Static Environment
Their sleep setup (user-editable via Sleep Setup form).

| Field | Type | Options |
|-------|------|---------|
| `mattress_thickness` | thin/medium/thick | User editable |
| `mattress_firmness` | soft/medium/firm | User editable |
| `bed_height` | low/standard/high | User editable |
| `co_sleeping` | alone/partner/pet/both | User editable |
| `bedding_material` | cotton/bamboo/silk/synthetic | User editable |
| `pillow_type` | standard/memory_foam/contour/down | User editable |
| `room_brightness` | dark/dim/moderate/bright | Quiz |
| `room_noise` | quiet/some/moderate/noisy | Quiz |
| `environment_updated_at` | timestamp | Auto on save |

### Layer 3: Dynamic State
How their sleep behaves over time (computed from data).

| Field | Calculation |
|-------|-------------|
| `sleep_trend` | Compare avg(7d) vs avg(8-14d) |
| `pain_trend` | Compare avg(7d) vs avg(8-14d) |
| `avg_sleep_quality_7d` | Average of last 7 days |
| `avg_pain_7d` | Average of last 7 days |
| `streak_days` | Consecutive logging days |
| `log_consistency_score` | (logs_14d / 14) * 100 |
| `engagement_level` | Weighted score: logs + visits + whatsapp + coach |
| `risk_level` | Based on trends, engagement, complaints |
| `churn_risk_score` | 0-100 based on inactivity signals |
| `upsell_score` | 0-100 based on positive signals |
| `affiliate_potential_score` | 0-100 based on engagement + purchases |

## Database Tables

### `sleep_profiles`
Main user profile table containing Layer 1 + Layer 2 data.

```sql
- email (PK)
- sleep_position, pain_points, temperature_preference... (Layer 1)
- mattress_thickness, mattress_firmness, bed_height... (Layer 2)
- quiz_data, sleep_assessment (JSONB for raw quiz answers)
```

### `sleep_logs`
Daily sleep entries for computing Layer 3.

```sql
- email, date (composite unique)
- sleep_quality (1-10)
- pain_level_morning (0-10)
- felt_hot, felt_stressed (boolean)
- notes (text)
```

### `sleep_attributes_state`
Current 3-layer snapshot per user.

```sql
- email (PK)
- data (JSONB - full SleepAttributes object)
- updated_at (timestamp)
```

### `sleep_attributes_history`
Historical snapshots for analytics.

```sql
- id (PK)
- email
- data (JSONB)
- created_at
```

### `engagement_meta`
Tracks engagement signals.

```sql
- email
- last_seen_at
- total_streak_days
- last_whatsapp_nudge_at
- decline_detected, improvement_detected
```

### `coach_plans`
AI-generated sleep plans with snapshots.

```sql
- email
- sleep_plan (JSONB)
- profile_snapshot, logs_snapshot (JSONB)
- trend_at_generation
- generated_reason
- valid_until
```

## Edge Functions & Triggers

### `sleep-attributes-sync`
Main sync endpoint. Accepts `source` parameter.

**Triggers:**
- `manual` - User clicks refresh
- `setup_update` - User saves Sleep Setup form
- `sleep_log` - After new log submission
- `quiz` - After quiz completion
- `shopify` - After order webhook
- `sleep_plan` - After plan generation

### `coach-generate-sleep-plan`
Generates AI sleep plan using all 3 layers.

**Flow:**
1. Fetch profile + logs + latest `sleep_attributes_state`
2. Build snapshots with environment data
3. Call AI Brain with 3-layer context and hard constraints
4. Validate/sanitize output
5. Save plan with snapshots
6. Trigger `fullSleepSync` with source `sleep_plan`

**3-Layer AI Prompt Context:**
The AI prompt explicitly references all layers:

```
LAYER 1 - IDENTITY:
- Sleep position: {side/back/stomach/mixed}
- Pain points: {lower_back, neck, shoulders, etc.}
- Temperature preference: {cold/neutral/warm}
- Stress level: {low/medium/high}
- Products owned: {ergonomic_pillow, knee_pillow, sleep_mask}

LAYER 2 - ENVIRONMENT:
- Mattress: {thickness} thickness, {firmness} firmness
- Bed height: {low/standard/high}
- Co-sleeping: {alone/partner/pet/both}
- Bedding: {cotton/bamboo/silk/synthetic}
- Pillow type: {standard/memory_foam/contour/down}
- Room brightness: {dark/dim/moderate/bright}
- Room noise: {quiet/some/moderate/noisy}

LAYER 3 - DYNAMIC STATE:
- Sleep trend: {improving/stable/declining} (7d vs 14d avg)
- Pain trend: {improving/stable/worsening}
- Current streak: {X} days
- Risk level: {low/medium/high}
- Engagement level: {low/medium/high}
- Upsell score: {0-100}
```

**Tone Adjustment:**
- High risk → Urgent, encouraging, focus on quick wins
- Medium risk → Balanced, educational
- Low risk → Optimistic, maintain momentum

### `analyze-sleep-quiz`
Processes quiz answers, creates profile.

**Flow:**
1. Parse quiz payload
2. Create/update `sleep_profiles`
3. Call `fullSleepSync` with source `quiz`
4. Send `RBN_SleepQuiz_Completed` Klaviyo event

### `shopify-order-webhook`
Handles Shopify order notifications.

**Flow:**
1. Validate HMAC
2. Update `products_owned`, `purchase_count`
3. Call `fullSleepSync` with source `shopify`
4. Send Klaviyo profile update

## Klaviyo Integration

### Event: `RBN_SleepSync_Updated`
Sent on every sync. Contains full 3-layer payload.

**Payload includes:**
- All Layer 1, 2, 3 fields
- Prefixed with `rbn_` for environment fields
- Timestamps for traceability

### Profile Properties
Updated via `$set` operation on every sync.

**Properties:**
- `rbn_sleep_position`
- `rbn_pain_points`
- `rbn_mattress_firmness`
- `rbn_sleep_trend`
- `rbn_engagement_level`
- `rbn_risk_level`
- `rbn_upsell_score`
- ... (40+ properties)

## UI Components

### `SleepSetupForm`
Edits Layer 2 environment fields.

**Location:** Profile tab in Sleep Coach Dashboard
**On Save:** 
1. Updates `sleep_profiles`
2. Calls `sleep-attributes-sync` with `setup_update`

### `SleepSyncOverview`
Displays current 3-layer state.

**Features:**
- Sleep/pain trends with icons
- Key metrics (quality, streak, pain)
- Environment badges
- Plan status
- Risk & engagement levels
- Manual sync button

## Deterministic Calculations

**CRITICAL:** All attribute calculations are deterministic. No AI is used for scoring or trend detection.

| Metric | Formula |
|--------|---------|
| `purchase_status` | 0 orders = "not_bought", 1 = "bought_once", 2+ = "repeat_buyer" |
| `is_new_customer` | `days_since_first_order <= 30` |
| `engagement_level` | 40% consistency + 20% dashboard + 20% whatsapp + 20% coach |
| `risk_level` | Sum of: trend penalties + engagement penalty + complaint flags |
| `churn_risk_score` | Weighted: inactivity + low engagement + declining trends |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER POINTS                           │
│  Quiz │ Sleep Log │ Shopify │ Setup Update │ Plan Gen      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │    fullSleepSync()          │
              │    _shared/sleep-sync.ts    │
              └─────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐ ┌───────────┐ ┌────────────┐
        │ Layer 1  │ │  Layer 2  │ │  Layer 3   │
        │ Profile  │ │Environment│ │  Dynamic   │
        │ (quiz)   │ │ (user)    │ │ (computed) │
        └──────────┘ └───────────┘ └────────────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
              ┌─────────────────────────────┐
              │    SleepAttributes object   │
              └─────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
    ┌────────────────┐ ┌───────────┐ ┌──────────┐
    │ DB: state +    │ │  Klaviyo  │ │  AI      │
    │     history    │ │  Event +  │ │  Coach   │
    │                │ │  Profile  │ │          │
    └────────────────┘ └───────────┘ └──────────┘
```

## Best Practices

1. **Always use `fullSleepSync`** for any trigger point
2. **Never calculate attributes ad-hoc** - always go through the centralized function
3. **Environment changes = `setup_update` source**
4. **AI Brain uses snapshots** - never raw database queries in prompts
5. **Validate AI output** against user data before saving
6. **Log everything** with `[Sleep Sync]` prefix for debugging

## Trigger Implementation Summary

| Trigger Point | Edge Function | Source | When |
|---------------|---------------|--------|------|
| Manual sync | `sleep-attributes-sync` | `manual` | User clicks sync button |
| Sleep log | `useSleepApi.ts` → `sleep-attributes-sync` | `sleep_log` | After log insert |
| Quiz completion | `analyze-sleep-quiz` | `quiz` | After quiz processing |
| Shopify order | `shopify-order-webhook` | `shopify` | After order processing |
| Sleep setup save | `SleepSetupForm` → `sleep-attributes-sync` | `setup_update` | After form save |
| Plan generation | `coach-generate-sleep-plan` | `sleep_plan` | After AI plan saved |

## Testing Checklist

- [ ] Complete quiz → verify `sleep_attributes_state` created with quiz source
- [ ] Log sleep → verify attributes updated with `sleep_log` source
- [ ] Save sleep setup → verify environment fields sync
- [ ] Generate plan → verify plan tracking fields update
- [ ] Check Klaviyo → verify `RBN_SleepSync_Updated` events and `rbn_*` profile properties
