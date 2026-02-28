# My Recipe Generator

Minimal Next.js foundation for recipe generation UI and upcoming AI pipeline.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI key to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

4. Start dev server:

```bash
npm run dev
```

## Environment variables

- `OPENAI_API_KEY` is read from `process.env.OPENAI_API_KEY`.
- Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
- No API key should be hardcoded in source files.
- If the key is missing, the app shows a friendly UI error and logs a clear server console message.

## Project structure

```text
app/
components/
lib/
  ai/
  schema/
  utils/
types/
```

- AI logic: `lib/ai`
- Schemas and static recipe data: `lib/schema`
- Shared helpers: `lib/utils`
- Type definitions: `types`

## AI generation API

Single server entrypoint:

- `POST /api/generate`

Input (validated with Zod):

```json
{
  "ingredients": ["chicken", "rice"],
  "preferences": "optional string",
  "allowLongerTime": false
}
```

Responses:

- `200`: `{ requestId, recipe }` (recipe validated against shared schema)
- `400`: invalid request input
- `500`: safe error message (provider failure, invalid/unparseable model output, or missing server key)

Server logs include `requestId`, duration/timing, and validation failures. Full user prompt text is not logged.

## UI state conventions

- `LoadingState`: spinner + "Generating..."
- `ErrorState`: friendly message + retry action when possible
- `EmptyState`: clear CTA to start generation

These states are used in `app/page.tsx` to keep behavior consistent.
