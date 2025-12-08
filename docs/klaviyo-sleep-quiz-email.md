# Klaviyo Sleep Quiz Completion Email

## Event Name
`RBN_SleepQuiz_Completed`

## Event Properties

| Property | Type | Description |
|----------|------|-------------|
| `sleep_position` | string | Primary sleep position (back, side, stomach, combination) |
| `pain_points` | string | Comma-separated pain areas (e.g., "neck, lower_back") |
| `temperature_preference` | string | cool, warm, or neutral |
| `room_brightness` | string | dark, dim, or bright |
| `stress_level` | string | low, medium, or high |
| `wake_up_condition` | string | stiff, tired, neutral, or energized |
| `detected_issues` | array | Top 3-5 detected sleep issues |
| `alignment_score` | number | 0-100 spinal alignment score |
| `environment_score` | number | 0-100 sleep environment score |
| `consistency_score` | number | 0-100 sleep consistency score |
| `primary_recommendation` | string | First recommended product name |
| `secondary_recommendation` | string | Second recommended product name |
| `quiz_completed_at` | string | ISO timestamp |
| `has_sleep_coach_access` | boolean | Whether user has Sleep Coach access |
| `results_url` | string | URL to results page with tracking params |
| `sleep_quiz_version` | string | Quiz version (e.g., "v2") |

---

## Email Template Structure

### Subject Lines
- "Your Rise By Night Sleep Assessment is ready 🌙"
- "We found what's hurting your sleep (and how to fix it)"

### Top Section

```liquid
<h1>Your Sleep Assessment Is Ready</h1>
<p>Here's a quick summary of what we found based on your answers. Your full plan is waiting in your Sleep Coach.</p>

<a href="{{ event.results_url }}" class="btn">View My Full Results</a>
```

### Block 1 — What We Detected

```liquid
{% if event.detected_issues %}
  <h2>What we detected</h2>
  <ul>
    {% for issue in event.detected_issues %}
      <li>{{ issue }}</li>
    {% endfor %}
  </ul>
{% endif %}
```

### Block 2 — Profile Snapshot

```liquid
<h2>Your Sleep Profile</h2>
<p>Position: {{ event.sleep_position | title }}</p>
<p>Pain areas: {{ event.pain_points }}</p>
<p>Room: {{ event.room_brightness }}, {{ event.temperature_preference }}</p>
<p>Stress level: {{ event.stress_level }}</p>
<p>Wake up feeling: {{ event.wake_up_condition }}</p>
<p style="font-size: 12px; color: #777;">
  We'll use this profile as the baseline for your AI Sleep Coach and future recommendations.
</p>
```

### Block 3 — Top 1–2 Recommendations

```liquid
<h2>Recommended for you</h2>

{% if event.primary_recommendation %}
  <p><strong>{{ event.primary_recommendation }}</strong><br/>
  Designed to directly address the main issues detected in your assessment.</p>
{% endif %}

{% if event.secondary_recommendation %}
  <p><strong>{{ event.secondary_recommendation }}</strong><br/>
  Supports your sleep environment and overall sleep quality.</p>
{% endif %}

<a href="{{ event.results_url }}&view=recommendations" class="btn">
  Shop My Recommended Setup
</a>
```

### Block 4 — Sleep Coach CTA

```liquid
<h2>Your AI Sleep Coach</h2>

{% if event.has_sleep_coach_access %}
  <p>Your 7-day plan uses this assessment and your future sleep logs to adjust over time.</p>
  <a href="{{ event.results_url }}" class="btn">Open My Sleep Coach</a>
{% else %}
  <p>Create your free account to save your results and unlock your dynamic sleep plan.</p>
  <a href="{{ event.results_url }}" class="btn">Activate My Sleep Coach</a>
{% endif %}
```

---

## Design Guidelines

1. **Keep it SHORT** — The email teases results; the website is home for full details
2. **1–2 recommendations max** — Don't dump all products
3. **No charts in email** — Charts stay on-site
4. **No day-by-day plan** — That's a Sleep Coach feature
5. **Clear CTAs** — Push to Sleep Coach / Results page

---

## Testing

1. Complete the Sleep Quiz with a valid email
2. Check Supabase Edge Function logs for: `[Klaviyo] RBN_SleepQuiz_Completed event sent for:`
3. Verify event appears in Klaviyo under the profile's activity
4. Confirm all properties are present and correctly formatted
