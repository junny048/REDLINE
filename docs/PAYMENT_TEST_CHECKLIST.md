# REDLINE Payment Flow Checklist (MCP + Toss)

## 1) MCP readiness
- `.vscode/mcp.json` contains `tosspayments` server using `@tosspayments/integration-guide-mcp`.
- VS Code restarted or MCP server reloaded.
- MCP tool is discoverable in your IDE session.

## 2) Env setup
## Frontend: `frontend/.env.local`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY=...`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` (if needed)

## Backend: `backend/.env`
- `TOSS_SECRET_KEY=...`
- `APP_URL=http://localhost:3000`
- `OPENAI_API_KEY=...`

Rules:
- Use matching test keys (client/secret from same Toss test merchant).
- Never expose `TOSS_SECRET_KEY` to frontend.

## 3) Run services
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`

## 4) Manual E2E scenario
1. Upload JD + resume and click Analyze.
2. Confirm paywall state:
- One risk/question visible.
- Remaining items blurred/locked.
3. Click `2,000 결제하고 전체 보기`.
4. Complete payment in Toss test UI.
5. Success route checks:
- `/payment/success` is visited.
- Backend `POST /api/payment/confirm` returns `{"status":"ok"}`.
- Redirect back to `/?payment=success`.
- All blur removed, unlocked badge visible.
6. Fail route checks:
- Cancel in Toss UI or fail payment.
- Redirect to `/payment/fail` then home.
- Lock remains.

## 5) Event logging checklist
- `paywall_viewed`
- `pay_clicked`
- `payment_success`
- `payment_fail_or_cancel`
- `fakedoor_clicked`
- `fakedoor_email_submitted`

Verify in browser console (`[analytics]` prefix).

## 6) Fake door checks
1. Unlock first.
2. Click `팀용 기능 베타 신청` -> `fakedoor_clicked`.
3. Submit email -> `fakedoor_email_submitted`.
4. Backend receives `POST /api/fakedoor/lead` and logs lead info.

## 7) No-scope guardrails
- No DB writes.
- No user login.
- No plans/subscription logic.
- No payment history storage.
