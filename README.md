# AI Recipe Generator

An AI-powered web application that generates structured recipes based on ingredients provided by the user.  
The system uses a large language model (LLM) to generate recipes while enforcing strict schema validation to ensure reliable and structured output.

The goal of the project is both to build a useful tool and to explore how to design robust AI-powered applications with validation, error handling, and controlled prompt design.

---

# Features

- Generate recipes from available ingredients
- Structured JSON output validated with schema
- Detection of missing ingredients
- Retry mechanism if the LLM returns invalid output
- Rate limiting to prevent API abuse
- Clean UI for entering ingredients and viewing results

---

# Tech Stack

- **Frontend:** Next.js
- **Backend:** Next.js API routes
- **Language:** TypeScript
- **LLM Provider:** Ollama running on the host, called through its OpenAI-compatible endpoint
- **Model:** `gemma4:e4b`
- **Validation:** Zod
- **Runtime:** Node.js

---

# Project Structure

```text
app/
  page.tsx                        UI for entering ingredients
  favorites/page.tsx              saved recipes
  api/generate/route.ts           main endpoint
  api/ai/health/route.ts          checks that the model is reachable

lib/
  ai/generateRecipe.ts            prompt, retry and output validation
  ai/modelClient.ts               points the OpenAI client at Ollama
  schema/generatedRecipe.ts       Zod schemas for input and output
  security/ratelimit.ts           in-memory rate limiting
  utils/ingredientMatching.ts     matches recipe items against the user's list

evals/                            eval harness, see docs/evaluation.md
docs/
  architecture.md                 system architecture and data flow
  prompting.md                    prompt design and LLM interaction strategy
  evaluation.md                   evaluation strategy and the eval harness
```

### Key Components

**Frontend (`app/page.tsx`)**  
Handles user input and displays the generated recipe.

**API Route (`app/api/generate/route.ts`)**  
Receives requests from the UI, validates input, applies rate limiting, and forwards the request to the AI generation layer.

**LLM Layer (`lib/ai/generateRecipe.ts`)**  
Builds prompts and sends requests through `client.chat.completions.create()` to generate structured recipes.

**Validation Layer**  
Uses Zod schemas to validate both input and LLM output.

---

# Getting Started

## Prerequisites

The application talks to a local [Ollama](https://ollama.com) instance, so no
API key and no cloud provider is involved. Pull the model first:

```bash
ollama pull gemma4:e4b
```

## Install dependencies

```bash
npm install
```
## Run development server
```bash
npm run dev
```

## Open the application at:

http://localhost:3000

`GET /api/ai/health` reports whether the model endpoint answers and the
configured model is actually pulled — the quickest way to tell a model problem
apart from an application problem.

## Environment Variables

Both have sensible defaults in `lib/ai/modelClient.ts`, so a local setup needs
no configuration at all. Set them only to override:

```bash
AI_BASE_URL=http://127.0.0.1:11434/v1   # Ollama's OpenAI-compatible endpoint
AI_MODEL=gemma4:e4b
```

`AI_API_KEY` exists for the case where the endpoint is swapped for one that
actually authenticates. Ollama needs no key.

## Tests

```bash
npm test        # unit tests (node:test)
npm run eval    # runs fixed inputs against the model, see docs/evaluation.md
```

The eval harness needs Ollama running and the model pulled.

## Deploy

```bash
npm run deploy               # check, then rebuild the container
npm run deploy -- --check    # run the checks without deploying
npm run deploy -- --skip-eval
```

The script type-checks, runs the unit tests and runs the eval harness, and only
rebuilds if all three pass. Afterwards it waits for the app to answer and
requires `/api/ai/health` to be green before reporting success.

The checks deliberately live here rather than in CI. The model runs on this
machine, so a hosted runner would have to download it on every run — while a
deploy already happens here, with Ollama available. The cost is that the gate
only guards deploys made through this script; `docker compose up --build` still
bypasses it.

A failed eval blocks the deploy. The model is probabilistic, so an occasional
flake can stop one — that is the intent, and `--skip-eval` is the way out when
something needs to ship regardless. It says plainly in the output that model
behaviour went unverified.

## Error Handling

The system includes multiple layers of protection:

- Input validation before requests are sent
- Schema validation of LLM output
- Automatic retry if the model returns invalid data
- Error responses if generation fails

## Model Integration

- Generation runs against a local Ollama instance, not a cloud provider
- The `openai` client is kept and pointed at Ollama's OpenAI-compatible endpoint
- Calls use `client.chat.completions.create()`; Ollama implements
  `/v1/chat/completions` but not the Responses API
- Output is read from `response.choices[0].message.content` and validated with
  Zod before it reaches the UI

Because the model runs locally, generation has no per-request cost, and the
ingredients a user types never leave the machine.

Reasoning models are worth a note: some return their chain of thought in a
separate field and can leave `content` empty if they run out of tokens before
answering. The LLM layer treats an empty response as a failed attempt and
retries.

---

## Security Considerations

Basic safeguards currently implemented include:

- Input validation
- Rate limiting
- Controlled prompt structure

Future improvements may include stronger protection against prompt injection attacks.

---

## Documentation

Additional documentation is available in the `/docs` directory.

- `architecture.md` – system architecture and data flow
- `prompting.md` – prompt design and LLM interaction strategy
- `evaluation.md` – evaluation and quality considerations

---

## Future Improvements

Planned improvements include:

- Improved logging and observability
- Retrieval-Augmented Generation (RAG) for recipe knowledge
- Prompt versioning
- Closing the gap the deploy gate leaves: a direct `docker compose up --build`
  still skips every check

---

## Purpose of the Project

This project is also used as a learning platform to explore how to build reliable AI-powered applications.

It focuses on system design concepts such as:

- validation
- prompt control
- error handling
- observability

---

## License

MIT License
