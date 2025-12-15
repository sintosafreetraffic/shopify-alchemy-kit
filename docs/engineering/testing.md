# Testing Guide

## Sleep Quiz Test Suite

The Sleep Quiz system has a comprehensive test suite ensuring value contract alignment between the frontend quiz and backend assessment logic.

### Test Files

| File | Type | Description |
|------|------|-------------|
| `src/tests/persona-detection.test.ts` | Unit | Tests persona detection logic with mock signals |
| `src/tests/persona-detection.fixtures.ts` | Fixtures | Test data for all 4 personas + mixed signals |
| `src/tests/e2e-quiz-answer-flow.test.ts` | Unit/E2E | Tests QuizConfig values against backend contracts |
| `src/tests/analyze-sleep-quiz.integration.test.ts` | Integration | Tests actual edge function with real HTTP calls |

### Running Tests

```bash
# Unit tests only (fast, no network)
npm run test:quiz:unit

# Integration tests (requires deployed edge function)
npm run test:quiz:int

# All quiz tests
npm run test:quiz:all

# Single test file
npx vitest run src/tests/persona-detection.test.ts
```

### Understanding Persona Test Failures

When persona tests fail, it signals a **behavior drift** in the quiz engine:

1. **Cluster mismatch** - The detected persona doesn't match expected
   - Check if quiz signals have changed
   - Verify PERSONA_RULES scoring weights
   - Review signal detection thresholds

2. **Confidence too low** - Clear archetype not getting ≥70%
   - Fixture may need stronger signals
   - Scoring weights may need adjustment
   - Check for competing signals

3. **Mixed signals confidence too high** - Should be <70%
   - The ambiguous fixture is too clear
   - Add competing signals to the fixture

### Value Contract Alignment

The test suite enforces these value contracts between `QuizConfig.ts` and `sleep-assessment.ts`:

```typescript
sleepPosition:     "side" | "back" | "stomach" | "combination"
movesOften:        "never" | "sometimes" | "often" | "always"
pillowCount:       "0" | "1" | "2" | "3" | "3+"
nightAwakenings:   "never" | "rarely" | "once" | "twice" | "frequently"
sleepTemperature:  "hot" | "cold" | "neutral"
roomBrightness:    "dark" | "dim" | "bright"
sleepLatency:      "quick" | "normal" | "slow" | "very_slow"
sleepHours:        "less_than_5" | "5_6" | "6_7" | "7_8" | "over_8"
sleepGoals:        "reduce_pain" | "better_posture" | "better_quality" | ...
sleepEquipment:    "oura" | "whoop" | "fitness_tracker" | "smart_watch" | ...
```

If you change any quiz option values, update both:
1. `src/components/sleep-quiz/QuizConfig.ts`
2. `supabase/functions/_shared/sleep-assessment.ts`

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/quiz-tests.yml`) runs:
- **Unit tests**: On every push/PR affecting quiz files
- **Integration tests**: On main branch or manual trigger

### Integration Test Environment

Integration tests call the deployed `analyze-sleep-quiz` edge function.

To test against a different environment:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co npx vitest run src/tests/analyze-sleep-quiz.integration.test.ts
```

If the edge function is unavailable, integration tests will gracefully fail with a clear message rather than hard-failing the build.
