# AI Resume Analyzer & Interview Coach

## What is connected

- A first-visit name screen saves a display name in the current browser and, when MongoDB is configured, in a MongoDB profile. The sidebar profile button lets the user change it. This is personalization only, not password-based authentication or a secure account.
- `POST /api/analyze` accepts a PDF or DOCX resume, extracts its text in memory, and asks the configured AI model for a role match, strengths, improvements, missing keywords, and tailored interview questions.
- `POST /api/interview-feedback` evaluates an answer for the current question and target role.
- `GET /api/health` reports whether the server is running and whether an API key is configured.

Resume content is not written to disk by this app. By default, it is sent to Ollama running locally on your computer. If you switch `AI_PROVIDER` to `openai`, it is sent to OpenAI instead. Do not deploy this demo publicly without adding authentication, rate limits, and your own privacy/retention policy.

## Run locally

1. Install Node.js 20 or later and [Ollama for Windows](https://ollama.com/download/windows).
2. Open PowerShell and download the default local model: `ollama pull qwen2.5:3b` (about 1.9 GB).
3. In the project root folder, run `npm.cmd install`.
4. Copy `.env.example` to `.env`. The defaults use local Ollama and do not need an OpenAI key.
5. Optionally set `MONGODB_URI` in `.env` to enable saved profiles and session history. The example uses a local MongoDB server; MongoDB Atlas users can use their Atlas connection string.
6. Run `npm.cmd start` and open `http://localhost:3000`.

Resume analysis and interview feedback use local Ollama by default. Set `OLLAMA_MODEL` to choose another model already installed in Ollama. To use OpenAI instead, set `AI_PROVIDER=openai` and configure `OPENAI_API_KEY` and `OPENAI_MODEL`. Both features work without MongoDB, but results and profiles are not saved until MongoDB is connected.

`GET /api/health` includes `databaseConnected`. Profile names are stored under a random browser profile ID. No password or multi-user authentication is implemented.

Only PDF and DOCX are supported. Scanned/image-only PDFs need OCR and are not currently extractable.

## Project layout

- `frontend/` contains the browser page, styles, and client-side JavaScript.
- `backend/` contains the Express server and API routes.
- `package.json`, `package-lock.json`, `.env`, `.env.example`, and this README stay in the project root.
