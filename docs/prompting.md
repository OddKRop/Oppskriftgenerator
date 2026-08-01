# Prompting Strategy

## Overview

The AI Recipe Generator relies on a structured prompting strategy to ensure reliable and predictable output from the language model.

The system separates prompts into two components:

- **System Prompt** – defines the rules and output format
- **User Prompt** – contains the user's request

This separation improves reliability and makes the system easier to maintain and debug.

---

## Prompt Structure

Each request to the LLM consists of two main prompt parts.

### System Prompt

The system prompt is deliberately short. It establishes the role, that the
answer must be valid JSON, and that all text is written in Norwegian bokmål.

The detailed rules — output shape, language, units, how missing ingredients are
to be reported, the time limit — live in the user prompt instead, since several
of them depend on the request. The time limit, for instance, is phrased
differently depending on `allowLongerTime`.

The system prompt is identical across requests.

---

### User Prompt

The user prompt is built per request by `buildPrompt()` and carries both the
rules and the user's input:

- language rules (Norwegian bokmål, no English phrases)
- unit rules (dl, ss, ts, gram, kg — never cups, ounces or tablespoons)
- rules for how missing ingredients must be reported
- a time limit phrased according to `allowLongerTime`
- worked examples of both accepted output shapes
- the user's ingredients and preferences

Including examples of the output shape in the prompt matters more for a small
local model than the schema description alone does.

---

## Structured Output

The request sets `response_format: { type: "json_object" }`, and the prompt
requires the answer to be exactly one of two shapes.

A recipe:

```json
{
  "recipe": {
    "id": "kylling-i-form",
    "title": "Kylling i form",
    "servings": 2,
    "timeMinutes": 35,
    "ingredients": [{ "item": "kylling", "quantity": "400 gram" }],
    "steps": ["Sett stekeovnen på 200 grader."],
    "missingIngredients": [{ "item": "fløte", "reason": "til saus" }],
    "notes": ["Smaker best nylaget."]
  },
  "assumptions": ["Antar at du har salt og pepper."]
}
```

Or a single clarifying question, when the input is too thin to work from:

```json
{ "clarifyingQuestion": "Har du egg tilgjengelig?" }
```

The two are mutually exclusive: a clarifying question may not be accompanied by
assumptions, and the schema rejects the combination.

Validation after generation happens in three steps, not one:

1. Zod validates the structure
2. A language and unit check rejects English phrases and imperial units that
   slipped through despite the prompt
3. Missing ingredients are reconciled against the user's list, so anything the
   recipe calls for but the user did not mention is reported as missing

Only the first two can fail the attempt and trigger a retry. The third corrects
the output rather than rejecting it.

---

## Temperature and Sampling

### Temperature

Temperature controls the randomness of the model output.

Typical behavior:

- **Low temperature (0–0.3)**  
  More deterministic and stable output.

- **High temperature (0.7–1.0)**  
  More creative but less predictable.

For structured JSON generation, lower temperature values are generally preferred.

The system sends `temperature: 0.2`. The task is structured extraction rather
than creative writing, and the output has to survive schema validation, so
stability is worth more here than variety.

---

### top_p

The `top_p` parameter controls nucleus sampling.

Instead of selecting from all possible tokens, the model only considers the most probable tokens whose cumulative probability exceeds the `top_p` threshold.

Example behavior:

- **top_p = 1.0**  
  All tokens are considered.

- **top_p = 0.9**  
  Only the most probable tokens forming 90% of the probability mass are considered.

In most practical applications, developers tune **temperature** and leave **top_p** at its default value.

---

## Retry Strategy

LLM output can occasionally be malformed or incomplete.

To improve reliability, the system implements a retry strategy.

Steps:

1. The LLM generates a response.
2. The response is parsed and validated using Zod, then checked for language
   and unit violations.
3. If either fails, the system retries generation once.
4. The retry includes feedback indicating that the previous output was invalid.
5. If the second attempt also fails, the system returns an error response.

An empty response counts as a failed attempt and is retried the same way. Some
reasoning models put their chain of thought in a separate field and can run out
of tokens before writing the answer itself.

This approach improves robustness while keeping the system simple.

---

## Prompt Design Goals

The prompting system is designed to achieve the following goals:

- Predictable structured output
- Minimal hallucination risk
- Compatibility with schema validation
- Clear separation between system instructions and user input

---

## Future Improvements

Potential improvements to the prompting strategy include:

- Prompt versioning
- Comparing prompt revisions over the eval set in `evals/`, rather than judging
  a change by a handful of manual runs
- Stronger protection against prompt injection

---

## Summary

The prompting strategy combines structured prompts, schema validation, and retry logic to create reliable AI-generated recipes.

By separating system rules from user input and enforcing structured output, the system maintains consistent behavior even when interacting with probabilistic language models.