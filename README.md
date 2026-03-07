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
- **LLM Provider:** OpenAI API
- **Validation:** Zod
- **Runtime:** Node.js

---

# Project Structure

/app
page.tsx

/api
recipe/route.ts

/lib
ai/generateRecipe.ts

/schema
recipeSchema.ts

/docs
architecture.md
prompting.md
evaluation.md


### Key Components

**Frontend (page.tsx)**  
Handles user input and displays the generated recipe.

**API Route (route.ts)**  
Receives requests from the UI, validates input, applies rate limiting, and forwards the request to the AI generation layer.

**LLM Layer (generateRecipe.ts)**  
Builds prompts and sends requests to the OpenAI API to generate structured recipes.

**Validation Layer**  
Uses Zod schemas to validate both input and LLM output.

---

# Getting Started

## Install dependencies

```bash
npm install

## Run development server
npm run dev

## Open the application at:

http://localhost:3000

## Environment Variables

Create a .env.local file and add:

OPENAI_API_KEY=your_api_key_here

## Error Handling

The system includes multiple layers of protection:

- Input validation before requests are sent
- Schema validation of LLM output
- Automatic retry if the model returns invalid data
- Error responses if generation fails

These safeguards help ensure that the application returns reliable structured data.

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

- Token usage and cost monitoring
- Improved logging and observability
- Retrieval-Augmented Generation (RAG) for recipe knowledge
- Prompt versioning
- Automated evaluation of generated recipes

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