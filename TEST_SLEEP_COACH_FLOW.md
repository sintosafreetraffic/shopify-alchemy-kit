# Sleep Coach End-to-End Test Checklist

This document describes manual test scenarios to verify the Sleep Coach system works correctly.

---

## Scenario A – First-time User

### Step 1: Complete Sleep Quiz (Logged Out)

1. Open `/sleep-quiz` in an incognito/private browser window
2. Complete all 22 quiz questions with your test answers
3. On the final step, enter a test email (e.g., `test-new-user@example.com`)
4. Submit the quiz

**Expected Results:**
- [ ] `analyze-sleep-quiz` edge function runs successfully (check edge function logs)
- [ ] A new row is created in `sleep_profiles` table with:
  - [ ] `quiz_completed = true`
  - [ ] `quiz_completed_at` set to current timestamp
  - [ ] `sleep_position` matches your quiz answer
  - [ ] `pain_points` array populated from quiz
  - [ ] `temperature_preference` set correctly
  - [ ] `stress_level` set correctly
  - [ ] `wake_up_condition` set correctly

### Step 2: Sign In

1. Sign in with the same email used in the quiz
2. Navigate to `/sleep-coach`

**Expected Results:**
- [ ] `verify-sleep-coach-access` returns `hasAccess: true` (check console logs)
- [ ] Dashboard loads without redirect to quiz
- [ ] Your sleep profile card shows the quiz data

### Step 3: Generate First Plan

1. Click "Generate Weekly Plan" button in the AI Coach tab

**Expected Results:**
- [ ] `coach-generate-sleep-plan` logs show quiz/log summary in edge function logs:
  ```
  [SleepCoach] Plan context summary {
    email: "...",
    quiz_profile: { sleep_position, pain_points, ... },
    log_summary: { nights: 0, ... }
  }
  ```
- [ ] New row created in `coach_plans` table with:
  - [ ] `quiz_snapshot` object populated with current quiz profile
  - [ ] `sleep_plan` contains personalized recommendations
- [ ] UI shows: "This plan uses your sleep quiz assessment and logged sleep data"

---

## Scenario B – Retake Quiz & Updated Plan

### Prerequisites
- User already has quiz completed and a generated plan

### Step 1: Initiate Retake

1. From `/sleep-coach`, click "Update Assessment" button (in the Sleep Profile card header)

**Expected Results:**
- [ ] Navigates to `/sleep-quiz?returnTo=/sleep-coach&mode=retake&quizUpdated=true`
- [ ] Quiz loads normally

### Step 2: Complete Quiz with Different Answers

1. Fill the quiz with **clearly different answers**:
   - Change sleep position (e.g., `back` → `side`)
   - Change pain points (e.g., remove `neck`, add `lower_back`)
   - Change temperature preference
   - Change other fields to something distinct
2. Submit the quiz

**Expected Results:**
- [ ] Redirected to `/sleep-coach?quizUpdated=true`
- [ ] Toast appears: "Sleep profile updated! Your sleep assessment has been updated..."
- [ ] In `sleep_profiles` table:
  - [ ] Quiz fields updated to new values
  - [ ] `quiz_completed` remains `true` (not reset)
  - [ ] `quiz_completed_at` updated to new timestamp
  - [ ] Other fields (purchases, WhatsApp, etc.) preserved

### Step 3: Verify Historical Data Preserved

1. Check database tables

**Expected Results:**
- [ ] All historical `sleep_logs` remain in database (not deleted)
- [ ] All previous `coach_plans` remain in database (not deleted)

### Step 4: Generate New Plan

1. Click "Generate Weekly Plan" button

**Expected Results:**
- [ ] New row created in `coach_plans` with fresh `quiz_snapshot`
- [ ] `quiz_snapshot` reflects the NEW quiz answers (not old ones)
- [ ] Plan content aligns with new profile:
  - [ ] If you changed to side sleeper, plan mentions side sleeping
  - [ ] If you added lower back pain, plan addresses lower back
  - [ ] etc.
- [ ] Old plans remain in `coach_plans` (new plan is additional row)

---

## Scenario C – Quiz Gate for Existing Access Users

### Test Case: User has access but never completed quiz

1. Manually set `quiz_completed = false` in `sleep_profiles` for a test user
2. Sign in and navigate to `/sleep-coach`

**Expected Results:**
- [ ] `verify-sleep-coach-access` returns `accessReason: "quiz_required"`
- [ ] Toast appears: "Complete the Sleep Quiz first"
- [ ] Automatically redirected to `/sleep-quiz?returnTo=/sleep-coach`

---

## Debug View (Dev Only)

If `VITE_SHOW_SLEEP_DEBUG=true` is set in `.env`:

1. Navigate to `/sleep-coach-debug`
2. View current user's:
   - Quiz profile fields from `sleep_profiles`
   - Last 3 `coach_plans` with their `quiz_snapshot`

---

## Quick Database Queries for Verification

### Check sleep_profiles for a user:
```sql
SELECT email, sleep_position, pain_points, temperature_preference, 
       stress_level, wake_up_condition, quiz_completed, quiz_completed_at
FROM sleep_profiles 
WHERE email = 'test@example.com';
```

### Check coach_plans with quiz_snapshot:
```sql
SELECT id, email, generated_at, 
       sleep_plan->'quiz_snapshot' as quiz_snapshot
FROM coach_plans 
WHERE email = 'test@example.com'
ORDER BY generated_at DESC
LIMIT 5;
```

### Check sleep_logs are preserved:
```sql
SELECT COUNT(*) as log_count 
FROM sleep_logs 
WHERE email = 'test@example.com';
```
