from fastapi import APIRouter

from ..schemas import FakeDoorLeadRequest

router = APIRouter(prefix="/api/fakedoor", tags=["fakedoor"])


@router.post("/lead")
def collect_lead(payload: FakeDoorLeadRequest) -> dict[str, str]:
    print(f"[fakedoor] lead submitted email={payload.email!r}")
    return {"status": "ok"}
