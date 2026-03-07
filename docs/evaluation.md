# Evaluation Strategy

## Overview

Evaluating LLM-generated output is important because language models are probabilistic systems.  
This means that even well-designed prompts can occasionally produce incorrect, malformed, or low-quality results.

The goal of evaluation in this project is to ensure that generated recipes are:

- structurally valid
- logically consistent
- useful for the user

Evaluation in this project combines **schema validation**, **manual inspection**, and potential future automated checks.

---

## Validation-Based Evaluation

The first level of evaluation is strict schema validation.

The system uses Zod schemas to verify that the generated recipe matches the expected structure.

Example checks include:

- required fields exist
- arrays contain the expected data types
- strings contain valid content
- optional fields follow the schema definition

If validation fails, the system retries generation once.

This step ensures that the application never returns malformed data to the user.

---

## Logical Consistency Checks

Even when the JSON structure is valid, the recipe itself may contain logical issues.

Examples include:

- steps referencing ingredients that do not exist
- missing cooking instructions
- unrealistic ingredient combinations

Currently these cases are handled through prompt design and manual inspection during development.

Future improvements may include rule-based checks for:

- ingredient consistency
- step completeness
- recipe structure validation

---

## Manual Evaluation

During development, manual evaluation is used to inspect generated recipes.

Typical evaluation questions include:

- Is the recipe coherent and understandable?
- Are the cooking steps logically ordered?
- Do the ingredients match the preparation steps?
- Is the output consistent across repeated runs?

Manual evaluation helps identify weaknesses in prompt design and schema structure.

---

## Retry Effectiveness

Part of the evaluation process involves monitoring how often retries are required.

Metrics that can be useful include:

- percentage of responses failing schema validation
- frequency of retry generation
- success rate after retry

Tracking these metrics helps identify prompt weaknesses and model limitations.

---

## Potential Metrics

Future evaluation metrics may include:

- average generation latency
- token usage per request
- retry rate
- schema validation failure rate

These metrics help measure system reliability and cost efficiency.

---

## Future Improvements

Potential future improvements to the evaluation system include:

- automated scoring of recipe quality
- rule-based validation of ingredient consistency
- prompt A/B testing
- evaluation datasets with known expected outputs

These approaches would allow more systematic testing of prompt quality and model behavior.

---

## Evaluation Goals

The evaluation strategy aims to ensure that the system:

- produces structured and valid outputs
- maintains logical recipe quality
- handles model errors gracefully
- improves over time through better prompts and validation