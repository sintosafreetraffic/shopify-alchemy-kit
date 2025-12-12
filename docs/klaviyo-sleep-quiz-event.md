# Klaviyo Sleep Quiz Event Reference

## Event: `RBN_SleepQuiz_Completed` (v6)

This event is sent after a user completes the Rise By Night Sleep Quiz. It contains comprehensive persona, segmentation, and product recommendation data for email flow automation.

---

## Persona Fields

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `persona_cluster` | string | Primary persona classification | `pain_sleeper`, `stress_insomnia`, `optimizer` |
| `persona_label` | string | Human-readable persona label | `"Pain Sleeper"`, `"Stress & Environment Sleeper"`, `"Sleep Optimizer"` |
| `persona_description` | string | Full persona description | `"A sleeper whose rest is shaped by physical tension..."` |
| `persona_rationale` | string | Why this persona was assigned | `"Your responses indicate that neck tension and lower back discomfort..."` |
| `recommended_modules` | array[int] | Coach module IDs for this persona | `[4, 10, 11]`, `[6, 9]`, `[7, 8, 10]` |
| `sleep_identity_label` | string | Sleep identity description | `"Side sleeper seeking alignment support"` |

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

## Klaviyo Segmentation Snapshot

For building flows, use this flat segmentation snapshot:

```json
{
  "persona_cluster": "pain_sleeper",
  "persona_label": "Pain Sleeper",
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

---

## Example Payloads by Persona

### Pain Sleeper

```json
{
  "persona_cluster": "pain_sleeper",
  "persona_label": "Pain Sleeper",
  "persona_description": "A sleeper whose rest is shaped by physical tension and alignment challenges. Improving cervical and spinal support meaningfully enhances comfort and morning ease.",
  "persona_rationale": "Your responses indicate that neck tension and lower back discomfort are your primary areas for improvement. Addressing cervical and spinal support can meaningfully reduce morning tension.",
  "recommended_modules": [4, 10, 11],
  "alignment_priority": true,
  "environment_priority": false,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "alignment_set",
  "persona_reasoning": "As a Pain Sleeper, cervical and hip alignment support provides the strongest impact on your sleep comfort and morning ease."
}
```

### Stress & Insomnia Sleeper

```json
{
  "persona_cluster": "stress_insomnia",
  "persona_label": "Stress & Environment Sleeper",
  "persona_description": "A sleeper whose rest is influenced by environmental cues and nervous-system activation. Calming routines and environmental control strengthen sleep continuity.",
  "persona_rationale": "Your sleep patterns suggest that light exposure and temperature regulation are influencing your rest quality. Optimizing your sleep environment can strengthen your natural sleep cycles.",
  "recommended_modules": [6, 9],
  "alignment_priority": false,
  "environment_priority": true,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "silk_mask",
  "recommended_bundle": "deep_sleep_set",
  "persona_reasoning": "As a Stress & Environment Sleeper, complete darkness and calming sleep rituals are essential for your sleep continuity and nervous system regulation."
}
```

### Sleep Optimizer

```json
{
  "persona_cluster": "optimizer",
  "persona_label": "Sleep Optimizer",
  "persona_description": "A motivated sleeper focused on enhancing recovery, energy, and long-term performance through consistent, measurable sleep improvements.",
  "persona_rationale": "You're focused on enhancing morning energy and deeper sleep. With a solid sleep foundation, targeted improvements can maximize your body's natural recovery processes.",
  "recommended_modules": [7, 8, 10],
  "alignment_priority": false,
  "environment_priority": false,
  "primary_product": "ergonomic_pillow",
  "secondary_product": "knee_pillow",
  "recommended_bundle": "performance_set",
  "persona_reasoning": "As a Sleep Optimizer, comprehensive support combined with recovery-focused practices will help you achieve consistent, high-quality sleep for peak performance."
}
```

---

## Liquid Template Usage

In Klaviyo email templates, access these fields using:

```liquid
{% if event.persona_cluster == "pain_sleeper" %}
  <h2>Your Pain Sleeper Plan</h2>
  <p>{{ event.persona_rationale }}</p>
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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v6 | 2025-01 | Added persona_cluster, persona_label, persona_description, persona_rationale, recommended_modules, persona_reasoning |
| v5 | 2024-12 | Added structured assessment scores |
| v4 | 2024-11 | Added product recommendations |
