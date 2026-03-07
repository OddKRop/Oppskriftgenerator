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

The system prompt defines the role and rules for the language model.

Responsibilities of the system prompt include:

- defining the role of the model (recipe generator)
- enforcing structured JSON output
- specifying language and formatting rules
- ensuring consistency in recipe generation

Example responsibilities:

- Generate a complete recipe
- Return output in structured JSON
- Follow a predefined schema

The system prompt remains relatively stable across requests.

---

### User Prompt

The user prompt contains dynamic user input.

Typical user prompt content includes:

- ingredients available to the user
- dietary preferences
- optional instructions or constraints


The user prompt is generated for every request and reflects the user's current input.

---

## Structured Output

The system requires the LLM to return structured JSON.

This ensures that the generated recipe can be validated and safely rendered in the UI.

Example output structure:

```json
{
  "title": "Tomato Pasta",
  "ingredients": [],
  "steps": [],
  "missingIngredients": [],
  "notes": ""
}

After generation, the JSON output is validated using Zod schemas before being returned to the frontend.

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

Currently, the system uses the model's default temperature.

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
2. The response is parsed and validated using Zod.
3. If validation fails, the system retries generation once.
4. The retry includes feedback indicating that the previous output was invalid.
5. If the second attempt also fails, the system returns an error response.

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
- Automated prompt evaluation
- Prompt testing with multiple examples
- Stronger protection against prompt injection

---

## Summary

The prompting strategy combines structured prompts, schema validation, and retry logic to create reliable AI-generated recipes.

By separating system rules from user input and enforcing structured output, the system maintains consistent behavior even when interacting with probabilistic language models.