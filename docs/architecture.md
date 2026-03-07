# Architecture

## Overview

The AI Recipe Generator is a web application that allows users to enter available ingredients and receive a structured recipe in return.

The application consists of four main parts:

- a frontend UI for collecting user input and displaying results
- an API route for request handling and orchestration
- an LLM layer for prompt construction and recipe generation
- a validation layer for ensuring reliable structured output

The system is designed to return recipes in a predictable format, with validation and retry logic to handle malformed LLM responses.

---

## System Components

### Frontend (`page.tsx`)

The frontend is responsible for collecting user input and rendering the generated recipe.

Main responsibilities:

- allow the user to enter available ingredients
- send the request to the backend API
- display the structured output returned by the system

The UI presents generated recipe data such as:

- recipe title
- ingredients
- preparation steps
- missing ingredients
- notes

---

### API Route (`route.ts`)

The API route acts as the main orchestration layer between the frontend and the LLM generation logic.

Main responsibilities:

- receive user input from the frontend
- validate input before processing
- generate a request ID
- start request timing
- check rate limits
- call the LLM layer
- validate the returned result against expected criteria
- return the final response to the frontend

This layer ensures that only valid and allowed requests are passed to the recipe generation logic.

---

### LLM Layer (`generateRecipe.ts`)

The LLM layer handles prompt construction and interaction with the OpenAI API.

Main responsibilities:

- build the system prompt
- build the user prompt
- send the request to the OpenAI API
- check whether the response matches the expected structure, format, and language
- retry generation if the first result is invalid

This layer is the core AI generation component of the application.

---

### Validation Layer

Validation is performed using Zod schemas.

Main responsibilities:

- validate user input before generation
- validate LLM output after generation

This helps ensure that the system receives valid input and only returns structured output that matches the expected schema.

---

### Response Mapping

After the LLM output has been validated, the response is returned in the format expected by the frontend.

In practice, this means that validated recipe data is passed back to the UI so it can be rendered consistently.

---

### Observability

The current observability setup is limited.

Currently implemented:

- rate limiter logging
- console logging for errors

Future improvements may include:

- token usage tracking
- request latency tracking
- cost monitoring
- structured error logging
- retry metrics

---

## Data Flow

The application follows this flow:

```text
User
  -> enters ingredients in the UI
  -> submits request

Frontend (page.tsx)
  -> sends request to API route

API Route (route.ts)
  -> validates input
  -> creates request ID
  -> starts timing
  -> checks rate limits
  -> calls generateRecipe.ts

LLM Layer (generateRecipe.ts)
  -> builds system prompt
  -> builds user prompt
  -> sends request to OpenAI API
  -> receives response

Validation Layer
  -> parses response
  -> validates response with Zod

If valid
  -> return structured recipe to frontend

If invalid
  -> retry generation once

If retry also fails
  -> return error response

Frontend
  -> renders recipe data to the user


## Failure Points

The system can fail at several stages.

Typical failure scenarios include:

- The LLM does not return valid JSON
- The returned JSON does not match the Zod schema
- The user sends invalid input
- The API rate limit is exceeded
- The OpenAI API request fails
- The generated output does not meet formatting or language requirements

---

## Error Handling Strategy

The system uses a layered error handling strategy:

1. User input is validated before the generation process starts.
2. LLM output is parsed and validated after generation.
3. If the first generated response is invalid, the system retries once with feedback that the previous output was invalid.
4. If the retry also fails, the system returns an error response and logs the issue.

This approach improves reliability while keeping the system simple.

---

## Architectural Goals

The architecture is designed around the following goals:

- Generate structured and predictable recipe output
- Validate both input and output
- Handle malformed LLM responses gracefully
- Protect the API with rate limiting
- Keep the system modular and easy to extend

This design also makes the application a useful learning platform for building more robust AI-powered systems in the future.



The following diagram shows the high-level data flow of the application.
User input flows through the frontend and API layer before interacting with the LLM.  
The system validates the response before returning structured data to the UI.

## System Architecture

```mermaid
flowchart TD

User[User]

UI[Frontend UI<br/>page.tsx]

API[API Route<br/>route.ts]

RateLimit[Rate Limiter]

LLM[LLM Layer<br/>generateRecipe.ts]

OpenAI[OpenAI API]

Validation[Zod Validation]

Response[Structured Recipe Response]

Error[Error Handling]

User --> UI
UI --> API

API --> RateLimit
RateLimit --> LLM

LLM --> OpenAI
OpenAI --> Validation

Validation -->|Valid| Response
Response --> UI

Validation -->|Invalid| Error
Error --> LLM
``` id="y1j0ai"
