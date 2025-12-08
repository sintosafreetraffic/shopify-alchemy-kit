# Affiliate System Overview

This document provides a comprehensive overview of the Rise By Night affiliate system architecture, including commission logic, CRON jobs, fraud controls, and Klaviyo integration.

---

## Commission Structure

### Tier-Based Commission Rates (Level 1 - Direct Sales)

| Tier     | Commission Rate | Requirement                    |
|----------|-----------------|--------------------------------|
| Bronze   | 10%             | Default (0-9 sales/30 days)    |
| Silver   | 15%             | 10-24 sales in last 30 days   |
| Gold     | 20%             | 25-49 sales in last 30 days   |
| Platinum | 25%             | 50+ sales in last 30 days     |
| Diamond  | 25%             | Invite-only (manually assigned)|

### Level 2 Commission (Sub-Affiliate Sales)

- **Fixed 5%** on all sales made by affiliates you referred
- Calculated when a referred affiliate makes a sale
- Independent of tier status

### Commission Calculation Example

```
Order: $100 product sale
Affiliate Tier: Gold (20%)

Level 1 (direct sale):     $100 × 20% = $20.00
Level 2 (sub-affiliate):   $100 × 5%  = $5.00 (to parent affiliate)
```

---

## CRON Jobs

### 1. affiliate-tier-daily-recalc

- **Schedule**: Daily at 02:00 UTC
- **Purpose**: Recalculates all affiliate tiers based on 30-day rolling sales performance
- **Actions**:
  - Counts direct sales (Level 1) in the last 30 days
  - Updates tier and tier_expires_at
  - Sends `RBN_Affiliate_Tier_Updated` Klaviyo event on tier changes

### 2. affiliate-payout-daily-check

- **Schedule**: Daily at 02:15 UTC (after tier recalc)
- **Purpose**: Calculates pending payout amounts and notifies affiliates when threshold is met
- **Actions**:
  - Sums all eligible commissions (fraud_flag=false, status IN pending/approved)
  - Updates pending_payout_amount in affiliates table
  - Sends `RBN_Affiliate_Payout_Ready` Klaviyo event when threshold is met

### Authentication Method

Both CRON jobs accept authorization via:

1. **Authorization Header**: `Bearer <CRON_SECRET>`
2. **Internal pg_cron**: Identified by `X-Supabase-Internal: true` header or `pg_net` User-Agent

---

## Fraud Controls

### Automatic Detection

The `shopify-order-webhook` edge function implements fraud detection:

1. **Email Self-Referral Block**
   - Checks if customer email matches affiliate's registered email
   - Flags: `self_referral_email`

2. **6-Hour Same Identity Protection**
   - Blocks repeat purchases from same email OR IP within 6 hours
   - Flags: `repeated_purchase_same_identity`

### Manual Review

- **Admin Route**: `/admin/affiliate-fraud`
- **Access**: Requires `admin` role in `user_roles` table
- **Actions**:
  - **Mark as Legit**: Clears fraud flags, recalculates affiliate totals
  - **Confirm Fraud**: Sets status to `rejected`, preserves fraud_flag

### Commission Status Flow

```
Order received → "pending"
    ↓
Fraud detected? → "flagged" (fraud_flag=true)
    ↓
Admin review:
  - Legit → "pending" (fraud_flag=false)
  - Fraud → "rejected" (fraud_flag=true)
    ↓
Payout processed → "paid"
```

---

## Klaviyo Events

### RBN_Affiliate_Joined

Triggered when a new affiliate signs up.

**Properties**:
- `affiliate_code`: Referral code
- `tier`: Starting tier (bronze)
- `joined_at`: Timestamp

### RBN_Affiliate_First_Sale

Triggered on an affiliate's first successful sale.

**Properties**:
- `affiliate_code`: Referral code
- `tier`: Current tier
- `order_amount`: Sale amount
- `commission_earned`: Commission amount

### RBN_Affiliate_Tier_Updated

Triggered when an affiliate's tier changes (daily CRON at 02:00 UTC). This event fires **only when the tier actually changes** - not on every recalculation.

**Properties**:
- `affiliate_code`: Referral code
- `old_tier`: Previous tier
- `new_tier`: New tier
- `tier`: Current tier (alias of new_tier)
- `commission_rate`: New commission rate percentage
- `earnings`: Total lifetime commissions
- `monthly_performance`: { sales, revenue }
- `tier_direction`: `"up"` or `"down"` - indicates direction of tier change
- `tier_change_context`: Fine-grained context for Klaviyo flow branching:
  - `"upgrade_from_lower_tier"` - Bronze → Silver, Silver → Gold, Gold → Platinum, etc.
  - `"downgrade_from_higher_tier"` - Any tier decrease (e.g., Gold → Silver)
  - `"maintained_top_tier"` - Staying at Diamond (if event is sent for Diamond maintenance)
- `updated_at`: Timestamp

**Common Use Cases for Email Flows**:
- "Congratulations! You've unlocked Gold tier - enjoy 20% commission on all sales"
- "Heads up: Your tier has changed. Here's how to get back on track"
- Segmented messaging based on `tier_change_context` for upgrade vs. downgrade scenarios

### RBN_Affiliate_Payout_Ready

Triggered when pending payout exceeds threshold (daily CRON).

**Properties**:
- `affiliate_code`: Referral code
- `tier`: Current tier
- `pending_payout_amount`: Amount ready for payout
- `payout_threshold`: Configured threshold
- `total_commissions`: Lifetime total
- `monthly_performance`: { sales_count, revenue_generated }
- `is_above_threshold`: true
- `payout_mode`: "manual"
- `ready_at`: Timestamp

### RBN_Affiliate_Payout_Processed

Triggered when an admin processes a payout via `/admin/affiliate-payouts`.

**Properties**:
- `affiliate_code`: Referral code
- `tier`: Current tier
- `payout_amount`: Amount just processed
- `total_commissions`: Lifetime total after payout
- `pending_payout_amount`: 0 (reset after payout)
- `payout_threshold`: Configured threshold
- `monthly_performance`: { sales_count, revenue_generated }
- `processed_at`: Timestamp
- `processed_by_admin`: { admin_user_id }
- `payout_mode`: "manual"
- `payout_method`: "manual_review" (default)

---

## Database Schema

### affiliates

| Column                    | Type      | Description                        |
|---------------------------|-----------|------------------------------------|
| id                        | uuid      | Primary key                        |
| user_id                   | uuid      | Reference to auth.users            |
| referral_code             | text      | Unique affiliate code              |
| status                    | text      | active, inactive, suspended        |
| tier                      | text      | bronze, silver, gold, platinum, diamond |
| tier_expires_at           | timestamp | When current tier expires          |
| total_commissions         | numeric   | Lifetime earnings                  |
| total_referrals           | integer   | Count of Level 1 sales             |
| pending_payout_amount     | numeric   | Current unpaid balance             |
| payout_threshold          | numeric   | Minimum for payout (default: $50)  |
| last_payout_at            | timestamp | Last payout date                   |
| monthly_sales_count       | integer   | Sales in rolling 30 days           |
| monthly_revenue_generated | numeric   | Revenue in rolling 30 days         |
| parent_affiliate_id       | uuid      | For Level 2 tracking               |
| level                     | integer   | 1 or 2 (affiliate level)           |

### commissions

| Column         | Type    | Description                           |
|----------------|---------|---------------------------------------|
| id             | uuid    | Primary key                           |
| affiliate_id   | uuid    | Reference to affiliates               |
| order_id       | text    | Shopify order ID                      |
| order_amount   | numeric | Total order value                     |
| amount         | numeric | Commission amount                     |
| level          | integer | 1 (direct) or 2 (sub-affiliate)       |
| status         | text    | pending, approved, rejected, paid     |
| fraud_flag     | boolean | True if flagged for fraud             |
| fraud_reason   | text    | Reason for flagging                   |
| customer_email | text    | For fraud detection                   |
| customer_ip    | text    | For fraud detection                   |

### affiliate_payouts

| Column               | Type      | Description                        |
|----------------------|-----------|------------------------------------|
| id                   | uuid      | Primary key                        |
| affiliate_id         | uuid      | Reference to affiliates            |
| amount               | numeric   | Payout amount                      |
| currency             | text      | Currency (default: USD)            |
| processed_at         | timestamp | When payout was processed          |
| processed_by_user_id | uuid      | Admin who processed the payout     |
| method               | text      | Payout method (manual_review, etc) |
| note                 | text      | Optional notes                     |

### affiliate_goals

| Column        | Type      | Description                            |
|---------------|-----------|----------------------------------------|
| id            | uuid      | Primary key                            |
| affiliate_id  | uuid      | Reference to affiliates                |
| goal_type     | text      | Type of goal (30d_commission, 30d_revenue) |
| target_amount | numeric   | Target amount to achieve               |
| currency      | text      | Currency (default: USD)                |
| period_start  | date      | Start of goal tracking period          |
| period_end    | date      | End of goal tracking period            |
| created_at    | timestamp | When goal was created                  |
| updated_at    | timestamp | When goal was last updated             |

---

## Environment Variables

### Required for Edge Functions

- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Admin access key
- `CRON_SECRET`: Authorization for CRON jobs

### Optional

- `KLAVIYO_PRIVATE_API_KEY`: For Klaviyo event delivery

---

## Security Considerations

1. **RLS Policies**: All tables have Row-Level Security enabled
2. **Admin Access**: Fraud panel requires `admin` role verification via `has_role()` function
3. **CRON Auth**: Edge functions validate either CRON_SECRET or internal pg_cron headers
4. **Fraud Detection**: Automatic flagging prevents self-referral and rapid repeat purchases

---

## Payout Processing (Manual)

Currently, payouts are processed manually:

1. Run `affiliate-payout-check` CRON to identify ready affiliates
2. Navigate to `/admin/affiliate-payouts` to review pending payouts
3. For each affiliate ready for payout:
   - Click "Mark payout processed"
   - Confirm the action in the modal
   - This marks all eligible commissions as `paid` and resets `pending_payout_amount` to 0
4. Process actual payment externally (PayPal, bank transfer, etc.)

**Note**: The admin payout UI only records the payout in the system. Actual money transfer must be done externally.

---

## Payout History

### affiliate_payouts Table

Stores a ledger of all processed payouts for audit and display purposes.

### Views

- **Affiliate Dashboard**: Affiliates see their own payout history under "Payout History" section
- **Admin Payouts Page**: Admins see "Recent Payouts" showing last 20 payouts across all affiliates

---

## Affiliate Leaderboard

The affiliate dashboard includes a leaderboard showing top performers.

### Features

- **Top 10 ranking** by 30-day revenue (`monthly_revenue_generated`)
- **Privacy-safe**: No emails or user IDs exposed
  - Other affiliates shown as "Partner #XXXX" (last 4 chars of referral code)
  - Current user shown as "You"
- **Data displayed per entry**:
  - Rank (1-10)
  - Display label
  - 30-day revenue
  - Tier (with icon)
  - Total commissions earned

### API Endpoint

- **Action**: `get-leaderboard`
- **Auth**: Requires authenticated user
- **Response**:
  - `is_affiliate`: boolean (false if user hasn't joined program)
  - `leaderboard`: array of top 10 entries
  - `current_user_referral_code`: string (if affiliate)

### Update Frequency

Leaderboard data reflects real-time database values. The `monthly_revenue_generated` field is recalculated by the `affiliate-tier-daily-recalc` CRON job at 02:00 UTC daily.

---

## Analytics & Charts

The Affiliate Dashboard includes a "Performance Analytics (Last 30 Days)" section with visual charts.

### get-analytics API Action

- **Action**: `get-analytics`
- **Auth**: Requires authenticated affiliate
- **Response**:
  - `daily`: Array of { date, sales_count, commission_amount } for last 30 days
  - `totals`: { total_30d_sales, total_30d_commissions }

### Data Displayed

- **Summary Cards**: 30-day sales count and commission totals
- **Area Chart**: Daily commission amounts over the 30-day window
- Filters: Only counts non-fraud commissions with status in (pending, approved, paid)

---

## Affiliate Goal Tracking

Affiliates can set personal 30-day goals and track their progress in the dashboard.

### affiliate_goals Table

Stores goal definitions for each affiliate:

- `goal_type`: Currently supports `30d_commission` (30-day commission target) and `30d_revenue` (30-day revenue target)
- `target_amount`: The target amount to achieve
- `period_start` / `period_end`: The 30-day rolling window for the goal

### API Actions

#### get-goals

- **Action**: `get-goals`
- **Auth**: Requires authenticated affiliate
- **Response**:
  - `goals`: Array of active goals with computed `current_progress` and `progress_percentage`

#### set-goal

- **Action**: `set-goal`
- **Auth**: Requires authenticated affiliate
- **Input**: `{ goal_type, target_amount }`
- **Behavior**:
  - If a goal of that type exists for the current period, updates it
  - Otherwise, creates a new goal with a 30-day period starting today
- **Response**: `{ goal, action: 'created' | 'updated' }`

### Dashboard UI

The "Your Goals" section in the Affiliate Dashboard displays:
- Current goal progress with a visual progress bar
- Percentage of goal achieved
- Amount remaining to reach the goal
- A form to set or update the 30-day commission target

---

## Tier Email Flows

Klaviyo email flows are triggered by the `RBN_Affiliate_Tier_Updated` event. Use the `tier_change_context` property to branch flows:

| Flow | tier_change_context | Description |
|------|---------------------|-------------|
| Tier Upgrade | `upgrade_from_lower_tier` | Celebratory email when affiliate moves up a tier |
| Tier Downgrade | `downgrade_from_higher_tier` | Supportive email with action plan when tier drops |
| Diamond Maintenance | `maintained_top_tier` | VIP recognition for Diamond affiliates |

For detailed email templates, subject lines, and body structure, see **[docs/affiliate-tier-email-templates.md](./affiliate-tier-email-templates.md)**.

For step-by-step Klaviyo implementation instructions (for agencies), see **[docs/klaviyo-tier-flows-setup.md](./klaviyo-tier-flows-setup.md)**.

---

## Affiliate Resources (Database-Driven)

The Affiliate Resources section in the dashboard is database-driven, allowing admins to manage resources without code changes.

### affiliate_resources Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| category | text | Resource category (Getting Started, Content Ideas, Brand Assets, FAQ) |
| title | text | Resource title |
| description | text | Resource description |
| link_label | text | Optional button label |
| link_url | text | Optional button URL |
| badge | text | Optional badge (e.g., "Recommended", "New") |
| is_active | boolean | Whether resource is visible (default: true) |
| sort_order | integer | Display order within category |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### RLS Policies

- **SELECT**: All authenticated users can read active resources (`is_active = true`)
- **INSERT/UPDATE/DELETE**: Only users with `admin` role can modify resources

### Example Resources

| Category | Title | Description |
|----------|-------|-------------|
| Getting Started | How the Affiliate Program Works | Overview of commission structure and referral links |
| Getting Started | Main Product Page | Link to bestselling Ergonomic Sleep Pillow |
| Content Ideas | Content Best Practices | Tips for authentic promotion |
| Content Ideas | Social Media Hooks | Example hooks for social posts |
| Brand Assets | Logos, Images & Creatives | Link to downloadable brand assets |
| FAQ | When do I get paid? | Payment schedule and thresholds |
| FAQ | How are referrals tracked? | Cookie tracking and attribution window |

### API Action

The `get-resources` action in `affiliate-api` returns all active resources sorted by category and sort_order:

```json
{
  "resources": [
    {
      "id": "...",
      "category": "Getting Started",
      "title": "How the Affiliate Program Works",
      "description": "...",
      "link_label": null,
      "link_url": null,
      "badge": "Recommended",
      "sort_order": 1
    }
  ]
}
```

### Admin Management

Resources can be managed via:
1. **Admin UI** at `/admin/affiliate-resources` (full CRUD with filters)
2. Supabase dashboard (direct SQL or table editor)

### Seed Data

New environments are bootstrapped with default affiliate resources via a SQL migration:

**Migration file**: `supabase/migrations/*_seed_affiliate_resources.sql`

The migration:
- Creates a unique constraint on `(category, title)` to enable idempotent inserts
- Uses `ON CONFLICT DO NOTHING` to safely re-run without duplicates
- Seeds 8 default resources across all 4 categories (Getting Started, Content Ideas, Brand Assets, FAQ)

Default seeded resources include:
- **Getting Started**: Program overview and dashboard guide
- **Content Ideas**: Best performing hooks and short-form video ideas
- **Brand Assets**: Logos/brand kit and product images
- **FAQ**: Payouts FAQ and tracking/attribution FAQ

---

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin/affiliate-fraud` | Review and resolve flagged commissions |
| `/admin/affiliate-payouts` | Process manual payouts for eligible affiliates |
| `/admin/affiliate-resources` | Manage affiliate resources (CRUD) |

All routes require `admin` role verification via `has_role()` function.

All admin pages include an `AdminNav` component providing quick navigation between admin tools.
