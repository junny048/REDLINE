# REDLINE

24H Hackathon MVP skeleton for the REDLINE verification engine demo.

## Branch Strategy
- `main`: shared baseline, integration only
- `jun`: A-track (resume upload/extraction + `/api/analyze-resume` real AI logic)
- `hyeso`: B-track (question improver + `/api/improve-question` real AI logic)

## Project Structure
- `frontend/`: Next.js (App Router) + TS + Tailwind
- `backend/`: FastAPI + Pydantic schemas

## API Contracts
- `POST /api/analyze-resume` (`multipart/form-data`)
  - request: `file` (required, PDF/TXT), `job_description`, `language` (`ko|en`, optional, default: `ko`)
  - response: `key_risks[]`, `pressure_questions[]`
- `POST /api/improve-question` (`application/json`)
  - request: `question`, `job_description?`
  - response: `is_generic`, `issues[]`, `improved_question`, `follow_ups`

## Local Run
### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Required environment variable:
```bash
OPENAI_API_KEY=your_key
```

Optional:
```bash
OPENAI_MODEL=gpt-5-mini
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

If needed, set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

## GitHub Pages Deploy
- `main` branch push triggers `.github/workflows/deploy-pages.yml`.
- Target URL format: `https://<github-username>.github.io/<repo-name>/`
- Set repository variable `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL
  (example: `https://your-backend.example.com`), otherwise API calls fail in production.
- Set repository secret `NEXT_PUBLIC_TOSS_CLIENT_KEY` for payment flow in production.

## A-track Notes (`jun`)
- `/api/analyze-resume` uses exactly one OpenAI call.
- Supports `PDF` and `TXT` extraction in-memory only.

## B-track Notes (`hyeso`)
- `/api/improve-question` uses exactly one OpenAI call.
- Works without resume upload.
- Returns `is_generic`, `issues`, STAR-upgraded question, and 3 follow-ups
  (`trade_off`, `metrics`, `personal_contribution`).
