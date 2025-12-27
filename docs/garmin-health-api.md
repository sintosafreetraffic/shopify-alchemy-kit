# Garmin Health API Integration

## Overview

RiseByNight integrates with the Garmin Health API to receive objective sleep and daily activity data. This data enhances sleep coaching by providing wearable-derived insights without creating a health dashboard.

**Purpose**: Improve coaching quality with objective data, not metric obsession.

## Architecture

### Data Flow

```
Garmin Connect → Health API → Edge Functions → Supabase → Coach AI
                    ↓
              garmin_events_raw (raw storage)
                    ↓
              garmin_dailies / garmin_sleeps (normalized)
                    ↓
              sleep_coach_metrics_daily (qualitative signals)
```

### Endpoints

| Endpoint | Path | Purpose |
|----------|------|---------|
| Ping | `POST /garmin-health-ping` | Receives ping notifications with callback URLs |
| Push | `POST /garmin-health-push` | Receives direct data pushes |
| Compute Signals | `POST /garmin-compute-coach-signals` | CRON job for qualitative signal computation |

## Supported Summary Types

Currently normalized (v1):
- `dailies` → `garmin_dailies`
- `sleeps` → `garmin_sleeps`

Stored raw only (future):
- `epochs`
- `activities`
- `bodyCompositions`
- `stressDetails`
- `userMetrics`
- `pulseOx`
- `respiration`
- `healthSnapshots`
- `hrv`
- `bloodPressures`
- `moveIQ`
- `activityDetails`
- `menstrualCycleTracking`
- `intensityMinutes`
- `healthSnapshotMobile`
- `womenHealthPeriodTracking`
- `pregnancyTracking`
- `pregnancy`

## Database Schema

### Tables

#### `garmin_events_raw`
Raw event storage for all summary types (deduped by `payload_hash`).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| domain | text | Always 'health' |
| summary_type | text | e.g., 'dailies', 'sleeps' |
| garmin_user_id | text | Garmin's user identifier |
| summary_id | text | Garmin's summary identifier |
| received_at | timestamptz | When we received it |
| payload | jsonb | Full raw payload |
| payload_hash | text | SHA-256 for deduplication |

#### `garmin_dailies`
Normalized daily summaries (UPSERT by user + date).

| Column | Type | Description |
|--------|------|-------------|
| garmin_user_id | text | Garmin's user identifier |
| calendar_date | date | Summary date |
| summary_id | text | Garmin's ID |
| steps | int | Daily steps |
| active_seconds | int | Active time |
| floors_climbed | int | Floors climbed |

#### `garmin_sleeps`
Normalized sleep summaries (UPSERT by user + start time).

| Column | Type | Description |
|--------|------|-------------|
| garmin_user_id | text | Garmin's user identifier |
| calendar_date | date | Sleep date |
| summary_id | text | Garmin's ID |
| duration_sleep_seconds | int | Total sleep duration |
| deep_seconds | int | Deep sleep |
| light_seconds | int | Light sleep |
| rem_seconds | int | REM sleep |
| awake_seconds | int | Time awake |
| validation | text | Device validation status |

#### `sleep_coach_metrics_daily`
Qualitative signals for coach consumption.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Internal user ID |
| calendar_date | date | Signal date |
| signal_key | text | e.g., 'bedtime_consistency' |
| signal_value | text | e.g., 'consistent', 'irregular' |
| data_sources | text[] | e.g., ['garmin_health'] |

### Connection State

Extended `sleep_sources` table fields:
- `health_last_sync_at` - Last successful Health API sync
- `on_hold` - Maintenance mode flag
- `domains` - Array of enabled domains (e.g., ['sleep', 'health'])

## Timing Rules

### Ping Handling
1. Return HTTP 200 immediately (< 1 second)
2. Process callback asynchronously after response
3. Callback URL is pre-authenticated (contains token params)

### Update/Replace Behavior
- Summaries are frequently updated by Garmin
- Always UPSERT to replace older versions
- Key: `(garmin_user_id, calendar_date)` for dailies
- Key: `(garmin_user_id, start_time_seconds)` for sleeps

### Timestamps
- All Garmin timestamps are UTC epoch seconds
- Store in UTC, convert to local only for display
- Use timezone from `sleep_sources.user_timezone`

## Coach Signals

### Computed Signals

| Signal | Values | Logic |
|--------|--------|-------|
| `bedtime_consistency` | consistent / moderate / irregular | Stddev of bedtimes over 7-14 days |
| `sleep_fragmentation` | improved / stable / worse | Awake seconds trend vs baseline |
| `recovery_proxy` | strong / moderate / low | Deep sleep percentage trend |

### Freshness Rules
- Only compute from last 30 days
- Require minimum 3 valid nights
- Show "baseline building" state if insufficient data

### AI Guardrails
- Wearable data is context, not causality
- Never attribute changes to products
- Use language: "compared to your baseline", "on nights after..."

## Security

### RLS Policies
- Users can only read their own data from normalized tables
- `garmin_events_raw` is service-only (no user reads)
- Coach signals are user-scoped

### Webhook Verification
- HMAC-SHA256 signature verification on all endpoints
- Secret stored in `GARMIN_WEBHOOK_SECRET`

## On Hold Support

When `sleep_sources.on_hold = true`:
- Accept webhooks (return 200)
- Skip processing (no-op)
- Prevents Garmin-side escalation during maintenance

## Deregistration

When user revokes access:
- Ping received without callback URL
- Set `sleep_sources.status = 'revoked'`
- Stop processing new events
- Historical data preserved per privacy policy

## Monitoring

### Structured Logs
- Ping/push received with summary_type, garmin_user_id
- Callback success/failure with status
- Dedupe hit counts
- Normalize upsert counts

### Key Metrics to Watch
- Ping response time (must be < 1s)
- Callback failure rate
- Dedupe ratio (high = good)
- User mapping failures

## Local Testing

```bash
# Test ping endpoint
curl -X POST https://ofryballwrjrgivokzln.supabase.co/functions/v1/garmin-health-ping \
  -H "Content-Type: application/json" \
  -d '{"dailies": [{"userId": "test123", "summaryId": "abc", "calendarDate": "2025-01-15"}]}'

# Test push endpoint
curl -X POST https://ofryballwrjrgivokzln.supabase.co/functions/v1/garmin-health-push \
  -H "Content-Type: application/json" \
  -d '{"dailies": [{"userId": "test123", "summaryId": "abc", "calendarDate": "2025-01-15", "steps": 8000}]}'
```

## Backfill (Admin Only)

**Not implemented in v1** - Historical backfill is deferred. The `garmin_backfill_jobs` table exists but the endpoint is not active.

When implemented:
- One request per connected user per timeframe
- Track jobs in `garmin_backfill_jobs`
- Respect Garmin rate limits
