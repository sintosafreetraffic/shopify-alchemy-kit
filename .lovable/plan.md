

## Fix: Meta CAPI Purchase Tracking Failure

### Problem
Every Meta CAPI purchase event fails with this error:
> Object with ID ' 1419388323215799' does not exist

The `META_PIXEL_ID` secret currently stores the **removed** pixel ID `1419388323215799` (with a leading space). This causes all server-side purchase tracking to Meta to fail.

### Evidence
- **Feb 19 order** (6874136641756): Failed with "Object does not exist"
- **Feb 11 order** (6848817266908): Same failure
- **Jan 27 order** (6823221035228): Succeeded (no error) -- meaning the pixel was changed/removed between Jan 27 and Feb 11

### Fix
Update the `META_PIXEL_ID` secret to the correct, active pixel ID: **785246637951871** (already used by the client-side Meta Pixel).

No code changes are needed. The edge function (`supabase/functions/meta-capi/index.ts`) correctly reads from `Deno.env.get("META_PIXEL_ID")` -- only the stored secret value is wrong.

### Steps
1. Update the `META_PIXEL_ID` secret to `785246637951871`
2. Verify by checking the next purchase event logs

### What This Fixes
- All future purchases will be correctly sent to Meta via server-side CAPI
- Attribution classification will work (click_id / email_match tracking)
- Meta Ads Manager will receive conversion data for campaign optimization
