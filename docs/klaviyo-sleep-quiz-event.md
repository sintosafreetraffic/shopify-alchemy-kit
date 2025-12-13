# Klaviyo Sleep Quiz Event Reference

## Event: `RBN_SleepQuiz_Completed` (v10)

This event is sent after a user completes the Rise By Night Sleep Quiz. It contains comprehensive persona, segmentation, product recommendation, coach readiness, and A/B experiment variant data for email flow automation.

---

## ⚠️ CRITICAL: Human Names Are INTERNAL ONLY

> **DO NOT USE `{{ event.persona_name }}`** (Jason/Mila/Leo/Riley) in customer-facing email templates!
>
> Human names exist for internal segmentation, A/B testing, and ops dashboards ONLY.
> 
> **For all customer-facing content**, use:
> - `{{ event.persona_label }}` → "The Pain Sleeper", "The Sleep Optimizer", etc.
> - `{{ event.persona_cluster }}` → For conditional blocks
> - `{{ event.persona_description }}` → Full calm, Scandinavian description

---

## Persona Fields (v7)

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `persona_cluster` | string | Primary persona classification | `pain_sleeper`, `stress_insomnia`, `optimizer`, `recovery_sleeper` |
| `persona_name` | string | **INTERNAL ONLY** - Human name for segmentation | `"Jason"`, `"Mila"`, `"Leo"`, `"Riley"` |
| `persona_label` | string | Customer-facing persona label | `"Pain Sleeper"`, `"Stress & Environment Sleeper"`, `"Sleep Optimizer"`, `"Recovery Sleeper"` |
| `persona_legacy_type` | string | Legacy type for backwards compat | `"jason"`, `"mila"`, `"leo"` |
| `core_need` | string | Primary need for segmentation | `"alignment"`, `"environment"`, `"optimization"`, `"recovery"` |
| `persona_description` | string | Full persona description | `"A sleeper whose rest is shaped by physical tension..."` |
| `persona_rationale` | string | Why this persona was assigned | `"Your responses indicate that neck tension and lower back discomfort..."` |
| `recommended_modules` | array[int] | Coach module IDs for this persona | `[4, 10, 11]`, `[6, 9, 12]`, `[7, 8, 10, 12]`, `[7, 8, 10]` |
| `sleep_identity_label` | string | Sleep identity description | `"Side sleeper seeking alignment support"` |

---

## Persona Mapping (v7)

> **Note**: Human names are for internal segmentation only. Use `persona_label` in customer-facing content.

| Cluster Key | Human Name (Internal) | Label (Customer-Facing) | Legacy Type | Core Need | Default Modules |
|-------------|----------------------|-------------------------|-------------|-----------|-----------------|
| `pain_sleeper` | Jason | Pain Sleeper | `jason` | `alignment` | [4, 10, 11] |
| `stress_insomnia` | Mila | Stress & Environment Sleeper | `mila` | `environment` | [6, 9, 12] |
| `optimizer` | Leo | Sleep Optimizer | `leo` | `optimization` | [7, 8, 10, 12] |
| `recovery_sleeper` | Riley | Recovery Sleeper | `leo` | `recovery` | [7, 8, 10] |

---

## Segmentation Priority Flags

| Property | Type | Description |
|----------|------|-------------|
| `alignment_priority` | boolean | True if alignment/pain is the primary concern |
| `environment_priority` | boolean | True if environment/sleep quality is the primary concern |
| `top_risk_drivers` | array[string] | Top 3 risk factors identified |

---

## Assessment Scores

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `alignment_risk_score` | number | 0-100 | Higher = more alignment risk |
| `neck_support_score` | number | 0-100 | Higher = better support |
| `sleep_stability_score` | number | 0-100 | Higher = more stable sleep |
| `environment_score_v2` | number | 0-100 | Higher = better environment |
| `light_sensitivity_score` | number | 0-100 | Higher = more affected by light |
| `temperature_disruption_score` | number | 0-100 | Higher = more temp disruption |

---

## Product Recommendations

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `primary_product` | string | Main recommended product | `ergonomic_pillow` |
| `secondary_product` | string/null | Add-on product | `knee_pillow`, `silk_mask` |
| `recommended_bundle` | string/null | Best value bundle | `alignment_set`, `deep_sleep_set`, `performance_set` |
| `recommendation_confidence` | number | 0-100 confidence score | `85` |
| `fit_explanation` | string | Why this setup fits | `"This setup addresses your cervical support needs..."` |
| `persona_reasoning` | string | Persona-specific reasoning | `"As a Pain Sleeper, cervical + hip alignment support..."` |

---

## Klaviyo Segmentation Snapshot (v7)

For building flows, use this flat segmentation snapshot:

```json
{
  "persona_cluster": "pain_sleeper",
  "persona_name": "Jason",
  "persona_label": "The Pain Sleeper",
  "persona_legacy_type": "jason",
  "core_need": "alignment",
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "alignment_set"
}
```

### Core Need Mapping
- `pain_sleeper` → `"alignment"`
- `stress_insomnia` → `"environment"`
- `optimizer` → `"optimization"`
- `recovery_sleeper` → `"recovery"`

---

## Example Payloads by Persona (v7)

### Jason — The Pain Sleeper

```json
{
  "persona_cluster": "pain_sleeper",
  "persona_name": "Jason",
  "persona_label": "The Pain Sleeper",
  "persona_legacy_type": "jason",
  "core_need": "alignment",
  "persona_description": "A sleeper whose rest is shaped by physical tension and alignment challenges. Improving cervical and spinal support meaningfully enhances comfort and morning ease.",
  "persona_rationale": "Your responses indicate that neck tension and lower back discomfort are your primary areas for improvement. Addressing cervical and spinal support can meaningfully reduce morning tension.",
  "recommended_modules": [4, 10, 11],
  "alignment_priority": true,
  "environment_priority": false,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "alignment_set",
  "persona_reasoning": "As a Pain Sleeper, your physical comfort and alignment are the primary focus. This setup directly addresses your tension points and supports healthier spinal positioning throughout the night."
}
```

### Mila — The Stress & Environment Sleeper

```json
{
  "persona_cluster": "stress_insomnia",
  "persona_name": "Mila",
  "persona_label": "The Stress & Environment Sleeper",
  "persona_legacy_type": "mila",
  "core_need": "environment",
  "persona_description": "A sleeper whose rest is influenced by environmental cues and nervous-system activation. Calming routines and environmental control strengthen sleep continuity.",
  "persona_rationale": "Your sleep patterns suggest that light exposure and temperature regulation are influencing your rest quality. Optimizing your sleep environment can strengthen your natural sleep cycles.",
  "recommended_modules": [6, 9, 12],
  "alignment_priority": false,
  "environment_priority": true,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "silk_mask",
  "recommended_bundle": "deep_sleep_set",
  "persona_reasoning": "As a Stress & Environment Sleeper, controlling environmental factors is key to your sleep quality. This recommendation creates optimal conditions for uninterrupted rest."
}
```

### Leo — The Sleep Optimizer

```json
{
  "persona_cluster": "optimizer",
  "persona_name": "Leo",
  "persona_label": "The Sleep Optimizer",
  "persona_legacy_type": "leo",
  "core_need": "optimization",
  "persona_description": "A motivated sleeper focused on enhancing recovery, energy, and long-term performance through consistent, measurable sleep improvements.",
  "persona_rationale": "You're focused on enhancing morning energy and deeper sleep. With a solid sleep foundation, targeted improvements can maximize your body's natural recovery processes.",
  "recommended_modules": [7, 8, 10, 12],
  "alignment_priority": false,
  "environment_priority": false,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "performance_set",
  "persona_reasoning": "As a Sleep Optimizer, you're looking to maximize recovery and performance. This setup provides the foundation for measurable improvements in your sleep quality."
}
```

### Riley — The Recovery Sleeper (v7)

```json
{
  "persona_cluster": "recovery_sleeper",
  "persona_name": "Riley",
  "persona_label": "The Recovery Sleeper",
  "persona_legacy_type": "leo",
  "core_need": "recovery",
  "persona_description": "A sleeper oriented toward physical restoration and training recovery. Temperature regulation, deep sleep optimization, and morning readiness support athletic and active lifestyles.",
  "persona_rationale": "Your focus on physical recovery and performance tracking indicates a recovery-oriented approach to sleep. You already have a relatively stable sleep foundation. Optimizing deep sleep phases and temperature regulation can enhance your body's natural restoration processes.",
  "recommended_modules": [7, 8, 10],
  "alignment_priority": false,
  "environment_priority": false,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "performance_set",
  "persona_reasoning": "As a Recovery Sleeper, optimizing deep sleep and temperature regulation are essential for physical restoration. This setup supports consistent recovery and morning readiness for active lifestyles."
}
```

---

## Module 12: Sleep Hygiene Foundations (v7)

Module 12 is automatically added for:
- **Mila (stress_insomnia)**: Always included by default
- **Leo (optimizer)**: Added when sleep_stability_score is 40-75 OR environment_score is 50-80
- **Riley (recovery_sleeper)**: Added when sleep_stability_score is 40-75 OR environment_score is 50-80
- **Jason (pain_sleeper)**: Never added by default (alignment-focused)

---

## Liquid Template Usage

> **IMPORTANT**: Do NOT use `{{ event.persona_name }}` (Jason/Mila/Leo/Riley) directly in generic email templates.  
> Use `{{ event.persona_label }}` for customer-facing content. Human names are for internal segmentation only.

In Klaviyo email templates, access these fields using:

```liquid
{% if event.persona_cluster == "pain_sleeper" %}
  <h2>Your Pain Sleeper Plan</h2>
  <p>{{ event.persona_rationale }}</p>
{% endif %}

{% if event.persona_cluster == "recovery_sleeper" %}
  <h2>Your Recovery Plan</h2>
  <p>Optimize your {{ event.core_need }} with these focus areas:</p>
{% endif %}

<h3>Recommended Modules</h3>
<ul>
{% for module in event.recommended_modules %}
  <li>Module {{ module }}</li>
{% endfor %}
</ul>

<p>Primary: {{ event.primary_product }}</p>
<p>{{ event.persona_reasoning }}</p>
```

---

## Detection Logic Summary

### Jason (pain_sleeper)
- **Triggers**: Neck/shoulder/back/hip pain, high pain severity (≥6), low pillow satisfaction, "reduce_pain" goals
- **Guardrails**: Cannot be overtaken by optimizer/recovery when pain is dominant

### Mila (stress_insomnia)
- **Triggers**: Bright room, hot/cold temperature, frequent awakenings, slow sleep onset, restless movement without pain
- **Guardrails**: Cannot be overtaken by optimizer/recovery when environment issues are dominant

### Leo (optimizer)
- **Triggers**: "wake_refreshed", "better_quality", "more_energy" goals, high pillow satisfaction, quick sleep onset, multiple goals
- **Guardrails**: Capped below Jason when painSeverity ≥ 6 OR alignment_risk_score ≥ 50; capped below Mila when environment_score < 55

### Riley (recovery_sleeper)
- **Triggers**: "faster_recovery", "better_recovery", "muscle_repair" goals, Oura/WHOOP/fitness tracker usage, multiple performance goals
- **Guardrails**: Same as Leo; prefers performance_set unless alignment_risk ≥ 50

---

## A/B Experiment Variants (v8)

The event includes deterministic experiment variant assignments for persona-based A/B testing.

### Experiment Variant Fields

| Property | Type | Description |
|----------|------|-------------|
| `persona_experiment_variants` | object | Map of experiment keys to assigned variants |
| `persona_experiment_variants.coach_hero_v1` | string | Variant for Sleep Coach Dashboard hero ("A" or "B") |
| `persona_experiment_variants.quiz_results_hero_v1` | string | Variant for Quiz Results hero ("A" or "B") |

### Example Payload

```json
{
  "persona_cluster": "pain_sleeper",
  "persona_label": "The Pain Sleeper",
  "core_need": "alignment",
  "persona_experiment_variants": {
    "coach_hero_v1": "A",
    "quiz_results_hero_v1": "B"
  }
}
```

### How Variants Are Assigned

Variants are assigned using a deterministic hash of `persona_cluster + experimentKey`:
- Same persona + same experiment always yields same variant
- No flicker or reassignment between sessions
- Evenly distributed across A/B (or A/B/C for future experiments)

### Liquid Template Usage for Experiments

```liquid
{% if event.persona_experiment_variants.coach_hero_v1 == "A" %}
  <h2>Your Personalized Sleep Coach</h2>
{% else %}
  <h2>Wake Up Feeling Better</h2>
{% endif %}
```

---

## Persona Landing Page URLs (v9)

Use these URLs in email templates to link users to their personalized landing page:

```liquid
<a href="https://www.risebynight.com/persona/{{ event.persona_cluster | replace: '_', '-' }}">
  View your {{ event.persona_label }} plan
</a>
```

### URL Mapping

| Persona Cluster | URL Slug | Full URL |
|-----------------|----------|----------|
| `pain_sleeper` | `pain-sleeper` | `/persona/pain-sleeper` |
| `stress_insomnia` | `stress-sleeper` | `/persona/stress-sleeper` |
| `optimizer` | `optimizer` | `/persona/optimizer` |
| `recovery_sleeper` | `recovery-sleeper` | `/persona/recovery-sleeper` |

### Example Liquid Block

```liquid
{% if event.persona_cluster %}
  <p>
    <a href="https://www.risebynight.com/persona/{{ event.persona_cluster | replace: '_', '-' }}">
      View your complete {{ event.persona_label }} plan →
    </a>
  </p>
{% endif %}
```

---

## Coach Readiness (v10)

Coach readiness indicates how prepared a user is to benefit from guided coaching.

### Coach Readiness Fields

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `coach_readiness_score` | number | 0-100, readiness level | `35`, `65`, `85` |
| `coach_readiness_label` | string | Human-readable label | `"Early Stage"`, `"Developing"`, `"Ready"` |
| `coach_readiness_rationale` | string | Supportive explanation | `"You're in the early stage of building a stable sleep foundation..."` |

### Readiness Level Mapping

| Score Range | Label | Description |
|-------------|-------|-------------|
| 0-39 | Early Stage | Building foundational habits |
| 40-69 | Developing | Making good progress, refining habits |
| 70-100 | Ready | Strong foundation, optimization mode |

### Liquid Template Usage

```liquid
{% if event.coach_readiness_label == "Ready" %}
  <p>You've built a strong sleep foundation! Let's optimize further.</p>
{% elsif event.coach_readiness_label == "Developing" %}
  <p>Your sleep patterns are developing nicely. Keep building on your progress.</p>
{% else %}
  <p>Welcome! Let's start building your sleep foundation together.</p>
{% endif %}
```

---

## Persona Confidence (v10)

Persona confidence indicates how clearly the user fits a specific persona pattern.

### Confidence Fields

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `persona_confidence` | number | 0-100, signal strength | `45`, `68`, `85` |
| `persona_confidence_reasoning` | string | Short explanation | `"Clear pain signals from neck and lower back..."` |

### Confidence Level Mapping

| Score Range | Level | Messaging Recommendation |
|-------------|-------|--------------------------|
| 0-49 | Low | Use neutral, assessment-focused language |
| 50-74 | Medium | Standard persona messaging is appropriate |
| 75-100 | High | Strong persona-specific messaging |

### Best Practices for Low Confidence

When `persona_confidence < 50`, avoid strong persona-positioning language like "You're a Pain Sleeper" and instead use softer framing like:

- "Your current sleep pattern suggests..."
- "Based on your responses, we see a pattern of..."
- "Your closest match right now is..."

### Liquid Template Usage

```liquid
{% if event.persona_confidence >= 50 %}
  <h2>Your {{ event.persona_label }} Plan</h2>
  <p>{{ event.persona_description }}</p>
{% else %}
  <h2>Your Personalized Sleep Plan</h2>
  <p>Based on your responses, we've identified patterns that suggest 
     {{ event.persona_label | downcase }} tendencies.</p>
{% endif %}
```

---

## Product Fit Score (v10)

Enhanced product recommendation with fit scoring.

### Product Fit Fields

| Property | Type | Description |
|----------|------|-------------|
| `product_fit_score` | number | 0-100, how well products match needs |
| `product_fit_reasoning` | string | Explanation of fit score |
| `confidence_weighted_recommendation` | boolean | True if confidence >= 50 |

### Liquid Usage

```liquid
{% if event.product_fit_score >= 80 %}
  <p class="highlight">Excellent match for your sleep profile!</p>
{% elsif event.product_fit_score >= 60 %}
  <p>Good match based on your assessment.</p>
{% endif %}
```

---

## Best Practices (v10)

### General Guidelines

1. **Always use `persona_label`** for customer-facing content, never `persona_name`
2. **Check `persona_confidence`** before using strong persona positioning
3. **Use `coach_readiness_label`** to tailor coaching-related messaging
4. **Include `persona_landing_page_url`** for personalized post-quiz journeys

### Conditional Messaging Pattern

```liquid
{# Good: Confidence-aware persona messaging #}
{% if event.persona_confidence >= 50 %}
  {% if event.persona_cluster == "pain_sleeper" %}
    <h2>Your Pain Sleeper Alignment Plan</h2>
  {% elsif event.persona_cluster == "stress_insomnia" %}
    <h2>Your Environment & Calm Plan</h2>
  {% endif %}
{% else %}
  <h2>Your Personalized Sleep Plan</h2>
{% endif %}
```

### Revenue Attribution Integration

The event includes fields for full-funnel attribution:
- `persona_cluster` and `persona_confidence` for persona-based segmentation
- `coach_readiness_score` for coaching readiness segmentation
- `persona_experiment_variants` for A/B test analysis
- Use these in conjunction with purchase events for complete attribution

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v10 | 2025-01 | Added persona_confidence (0-100) with confidence_reasoning, coach_readiness_score with label/rationale, product_fit_score with reasoning, shouldPersonalizePersonaMessaging() helper, revenue attribution hooks, persona_lp_hero_v1 experiment. Full documentation of best practices for confidence-aware messaging. |
| v9 | 2025-01 | Added persona landing page URLs for email templates. New route `/persona/:cluster` with URL slug mapping. |
| v8 | 2025-01 | Added persona_experiment_variants for A/B testing infrastructure. Deterministic variant assignment per persona × experiment. |
| v7 | 2025-01 | Added persona_name (Jason/Mila/Leo/Riley), persona_legacy_type, core_need fields. Added recovery_sleeper (Riley). Added Sleep Hygiene module (12). Refined optimizer detection with guardrails. Cache expiration (30 days). |
| v6 | 2025-01 | Added persona_cluster, persona_label, persona_description, persona_rationale, recommended_modules, persona_reasoning |
| v5 | 2024-12 | Added structured assessment scores |
| v4 | 2024-11 | Added product recommendations |
