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

3. Add your keys to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

4. Start dev server:

```bash
npm run dev
```

## Environment variables

- `OPENAI_API_KEY` is read from `process.env.OPENAI_API_KEY`.
- Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
- `UPSTASH_REDIS_REST_URL` is required for API rate limiting.
- `UPSTASH_REDIS_REST_TOKEN` is required for API rate limiting.
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
- `429`: too many requests (rate-limited)
- `500`: safe error message (provider failure, invalid/unparseable model output, or missing server key)

Server logs include `requestId`, duration/timing, and validation failures. Full user prompt text is not logged.

## Rate limiting and quota

`POST /api/generate` is protected with Upstash Redis + `@upstash/ratelimit`.

Current defaults (per IP):

- 5 requests per 60 seconds
- 25 requests per day
- Unknown IP gets stricter limits

When a limit is hit:

- API returns `429` with `{ "error": "Too many requests. Please try again later." }`
- `Retry-After` and `X-RateLimit-Reset` headers are included
- Server logs warning: `console.warn("[RateLimit]", { ip, reason, path })`
- OpenAI is not called

You can change the limits in `lib/security/ratelimit.ts`.

## Manual test checklist

1. Start app with valid OpenAI + Upstash env vars.
2. Send 6 quick POST requests to `/api/generate` from same IP within 60 seconds.
3. Confirm request 6 returns `429` and JSON error.
4. Continue sending requests until daily limit is exceeded, then confirm `429`.
5. Check server logs for `[RateLimit]` entries.
6. Confirm frontend shows a friendly error when `429` is returned.

## UI state conventions

- `LoadingState`: spinner + "Generating..."
- `ErrorState`: friendly message + retry action when possible
- `EmptyState`: clear CTA to start generation

These states are used in `app/page.tsx` to keep behavior consistent.
