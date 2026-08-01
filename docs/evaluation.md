# Evaluation Strategy

## Overview

Evaluating LLM-generated output is important because language models are probabilistic systems.  
This means that even well-designed prompts can occasionally produce incorrect, malformed, or low-quality results.

The goal of evaluation in this project is to ensure that generated recipes are:

- structurally valid
- logically consistent
- useful for the user

Evaluation in this project combines **schema validation**, **manual inspection**, and an **automated eval harness** that runs a fixed set of inputs against the model.

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

## Automated Eval Harness

`evals/` runs a fixed set of inputs through the application's own
`generateRecipeFromAI`. It calls production code rather than a copy, so the
prompt, the schema validation, the language and unit checks and the retry
behaviour under test are exactly the ones that serve users.

```bash
npm install          # the harness runs on the host, not in the container
npm run eval         # all cases, once each
npm run eval -- --case vegetar --runs 5
npm run eval -- --model qwen3.6 --json evals/qwen.json
npm run eval -- --list
```

Ollama must be running on the host, and the model under test must be pulled.
The harness checks this up front and stops with a clear message instead of
timing out case by case. It pins the model itself — `gemma4:e4b` unless
`--model` says otherwise — so a run does not silently depend on whatever
`AI_MODEL` happens to be set to.

### What the cases cover

| Case | What it protects |
| --- | --- |
| `hverdagsmiddag` | ordinary request returns a recipe within the time limit |
| `få-ingredienser` | a thin pantry still yields a recipe, honest about what is missing |
| `vegetar` | a stated preference is respected |
| `melkeallergi` | an allergy is treated as a hard constraint |
| `lang-tid` | `allowLongerTime` is not quietly ignored |
| `vagt-input` | sparse input may yield either a recipe or a clarifying question |

Each case declares the shape it expects (`recipe`, `clarifyingQuestion` or
`either`) plus assertions from `evals/assertions.ts`. Schema, language and unit
violations need no assertion: production code rejects those already, so they
surface as a failed generation.

### Reading the output

Per run the harness reports pass/fail, the number of attempts, wall-clock time
and token usage. The summary adds a pass count, how many runs needed no retry,
and mean latency. Failures print the offending value, the full model output and
the captured application logs — the retry rate and latency numbers listed under
*Potential Metrics* below come out of the same run.

Because the model is probabilistic, a single green run proves little. Use
`--runs` to sample repeatedly; `--json` writes the full result for comparing two
models or two prompt revisions.

### A caveat on content assertions

`forbidsWords` is a tripwire over word lists, not a nutrition checker. Norwegian
compounds cut both ways: `kylling` should catch `kyllingfilet`, but `ost` must
not catch `frokost`, and `smør` in *«smør formen»* is a verb. The matcher
therefore separates substring rules from whole-word rules, and content checks
read the ingredient list rather than free text, since that is where a real
violation has to appear. Assertions print the exact word that tripped, so a
false positive is recognisable rather than being mistaken for a regression.

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
- prompt A/B testing, comparing two revisions over the same cases
- growing the eval set as real failures show up in use

These approaches would allow more systematic testing of prompt quality and model behavior.

---

## Evaluation Goals

The evaluation strategy aims to ensure that the system:

- produces structured and valid outputs
- maintains logical recipe quality
- handles model errors gracefully
- improves over time through better prompts and validation