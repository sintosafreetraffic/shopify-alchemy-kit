# Phase 4: Pinterest CAPI Production Launch Runbook

**Document Version:** 1.0  
**Last Updated:** 2025-12-25  
**Status:** ✅ Production Ready

---

## 1. System Overview

### Architecture Summary

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Shopify       │────▶│  shopify-order-      │────▶│  Pinterest      │
│   Webhook       │     │  webhook             │     │  CAPI           │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────────┐
                        │  pinterest_purchase_ │
                        │  events (DB)         │
                        └──────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  reconcile-      │  │  aggregate-      │  │  recover-        │
│  shopify-orders  │  │  tracking-health │  │  missing-        │
│  (hourly)        │  │  (daily 3am)     │  │  purchases       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Key Components

| Component | Purpose | Schedule |
|-----------|---------|----------|
| `shopify-order-webhook` | Primary tracking - captures orders and sends to Pinterest | Real-time |
| `pinterest-capi-direct` | Direct Pinterest API integration | On-demand |
| `reconcile-shopify-orders` | Detects missing orders | Hourly (0 * * * *) |
| `aggregate-tracking-health` | Calculates daily metrics & triggers alerts | Daily (0 3 * * *) |
| `recover-missing-purchases` | Attempts to recover failed events | Hourly (20 * * * *) |
| `send-tracking-alert` | Sends email notifications for alerts | On-demand |

---

## 2. Current Configuration Status

### ✅ Production Checklist

- [x] **Pinterest CAPI Enabled** - `app_settings.pinterest_capi_enabled = true`
- [x] **Chaos Tests Passed** - All 9 scenarios (C1-C9) verified
- [x] **Test Order Isolation** - `is_test` flag separates test from production data
- [x] **Reconciliation Active** - Hourly cron job running
- [x] **Health Aggregation Active** - Daily cron job running
- [x] **Email Alerts Configured** - Resend integration active
- [x] **Real-time Monitoring** - Live events feed in dashboard
- [x] **Recovery Pipeline** - Automatic retry with exponential backoff

### Cron Job Schedule

| Job Name | Schedule | Next Run |
|----------|----------|----------|
| reconcile-shopify-orders-hourly | `0 * * * *` | Every hour at :00 |
| aggregate-tracking-health-daily | `0 3 * * *` | Daily at 3:00 AM UTC |
| recover-missing-purchases-hourly | `20 * * * *` | Every hour at :20 |
| purge-pinterest-context-daily | `0 3 * * *` | Daily at 3:00 AM UTC |

---

## 3. Monitoring Dashboard

**URL:** `https://risebynight.com/risebynight/tracking` → Phase 4 Tab

### Key Metrics to Watch

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Success Rate (7d) | ≥95% | 80-95% | <80% |
| Error Rate | <5% | 5-10% | >10% |
| EPIK Rate | >20% | 10-20% | <10% |
| Dead Letters (7d) | 0 | 1-5 | >5 |
| Active Alerts | 0 | 1-2 | >2 |

### Real-time Indicators

- **Live Connection** - Green "Live" badge means WebSocket connected
- **Status Indicator** - Pulsing dot shows system health
- **Auto-refresh** - Dashboard updates every 30 seconds

---

## 4. Alert Types & Severity

### Critical Alerts (Immediate Action Required)

| Alert Type | Trigger | Action |
|------------|---------|--------|
| `success_rate_drop` | Drop ≥10% from yesterday | Check Pinterest API status, review error logs |
| `error_spike` | Error rate >10% | Investigate webhook failures, check API credentials |
| `epik_collapse` | EPIK rate <10% | Check frontend consent flow, verify context capture |
| `context_capture_failure` | IP or UA rate <10% | Verify Cloudflare headers, check webhook parsing |

### Warning Alerts (Monitor Closely)

| Alert Type | Trigger | Action |
|------------|---------|--------|
| `success_rate_drop` | Drop 5-10% | Monitor for next 24 hours |
| `error_spike` | Error rate 5-10% | Review recent changes |
| `reconciliation_mismatch` | 1-9 missing orders | Check for timing issues |

### Email Notifications

All alerts are sent to: `info.optiseek@gmail.com`

Email format includes:
- Severity emoji (🚨 critical, ⚠️ warning, ℹ️ info)
- Alert type and message
- Date/day affected
- Context data (rates, counts)
- Link to dashboard

---

## 5. Incident Response Procedures

### P1: Complete Tracking Failure

**Symptoms:** No successful events, 100% error rate

**Response Steps:**
1. Check Pinterest API status at https://status.pinterest.com
2. Verify `PINTEREST_CONVERSION_TOKEN` secret is valid
3. Review edge function logs: `supabase functions logs shopify-order-webhook`
4. If Pinterest is down, events will queue in `pinterest_purchase_events` with `render_status = 'pending'`
5. Recovery will automatically retry when service restores

**Rollback:** Disable CAPI temporarily:
```sql
UPDATE app_settings SET value = false WHERE key = 'pinterest_capi_enabled';
```

### P2: High Error Rate (>20%)

**Symptoms:** Many `error_*` render statuses

**Response Steps:**
1. Check error distribution: `SELECT render_status, COUNT(*) FROM pinterest_purchase_events WHERE created_at > now() - interval '1 hour' GROUP BY 1;`
2. Review specific errors in `render_response` column
3. Check if errors are retry-able (network) vs permanent (bad data)
4. Manually trigger recovery: Call `recover-missing-purchases` with `dry_run=0`

### P3: Missing Orders Detected

**Symptoms:** Reconciliation finds orders not in `pinterest_purchase_events`

**Response Steps:**
1. Check `missing_purchase_events` table for details
2. Verify order wasn't filtered (cancelled, test, etc.)
3. Check `recovery_purchase_attempts` for retry history
4. If persistent, manually add to dead letters for investigation

### P4: Context Capture Degradation

**Symptoms:** Low EPIK, IP, or UA rates

**Response Steps:**
1. Test consent flow on live site
2. Check `pinterest_context` table for recent entries
3. Verify `track-context` edge function is receiving data
4. Check Cloudflare headers are passing through

---

## 6. Manual Operations

### Force Health Aggregation

```bash
curl -X POST "https://ofryballwrjrgivokzln.supabase.co/functions/v1/aggregate-tracking-health?days=1" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Force Reconciliation

```bash
curl -X POST "https://ofryballwrjrgivokzln.supabase.co/functions/v1/reconcile-shopify-orders?dry_run=0" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Force Recovery

```bash
curl -X POST "https://ofryballwrjrgivokzln.supabase.co/functions/v1/recover-missing-purchases" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Toggle CAPI On/Off

```bash
# Disable
curl -X POST "https://ofryballwrjrgivokzln.supabase.co/functions/v1/toggle-pinterest-capi" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Enable
curl -X POST "https://ofryballwrjrgivokzln.supabase.co/functions/v1/toggle-pinterest-capi" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 7. Database Tables Reference

### Core Tables

| Table | Purpose | Retention |
|-------|---------|-----------|
| `pinterest_purchase_events` | Primary tracking events | Permanent |
| `pinterest_context` | User consent & context data | 7 days (auto-purge) |
| `tracking_health_daily` | Daily aggregated metrics | Permanent |
| `tracking_alerts` | Alert history | Permanent |
| `missing_purchase_events` | Detected missing orders | Permanent |
| `recovery_purchase_attempts` | Retry attempt logs | 30 days |
| `recovery_dead_letters` | Unrecoverable events | Permanent |

### Key Queries

**Today's tracking summary:**
```sql
SELECT render_status, COUNT(*), SUM(value) as total_value
FROM pinterest_purchase_events
WHERE created_at > CURRENT_DATE
  AND is_test = false
GROUP BY render_status;
```

**Recent alerts:**
```sql
SELECT severity, type, message, day, created_at
FROM tracking_alerts
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

**Recovery attempts:**
```sql
SELECT order_id, attempt_no, outcome, error_message, created_at
FROM recovery_purchase_attempts
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## 8. Contacts & Escalation

| Role | Contact | When to Contact |
|------|---------|-----------------|
| Primary Ops | info.optiseek@gmail.com | All P1/P2 incidents |
| Pinterest Support | https://help.pinterest.com/business | API issues lasting >1 hour |
| Shopify Support | Admin panel | Webhook delivery issues |

---

## 9. Appendix: Chaos Test Reference

All chaos tests passed on 2025-12-25:

| Test | Scenario | Result |
|------|----------|--------|
| C1 | CAPI disabled | ✅ Skipped correctly |
| C2 | Missing context | ✅ Fallback worked |
| C3 | Pinterest 500 error | ✅ Retry queued |
| C4 | Duplicate order | ✅ Deduplicated |
| C5 | Invalid payload | ✅ Error logged |
| C6 | Test mode order | ✅ Marked is_test=true |
| C7 | Timestamp skew | ✅ Window adjusted |
| C8 | Recovery dry run | ✅ No side effects |
| C9 | High volume | ✅ Processed correctly |

---

**End of Document**

*Generated by Rise By Night Pinterest CAPI Tracking System*
