import os

from fastapi import APIRouter, HTTPException

from ..schemas import PaymentConfirmRequest, PaymentConfirmResponse
from ..services.toss import confirm_payment

router = APIRouter(prefix="/api/payment", tags=["payment"])
EXPECTED_AMOUNT_KRW = int(os.getenv("REDLINE_PAYMENT_AMOUNT", "2000"))


@router.post("/confirm", response_model=PaymentConfirmResponse)
def payment_confirm(payload: PaymentConfirmRequest) -> PaymentConfirmResponse:
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive.")
    if payload.amount != EXPECTED_AMOUNT_KRW:
        raise HTTPException(status_code=400, detail=f"amount must be exactly {EXPECTED_AMOUNT_KRW}.")

    try:
        confirm_payment(payload.paymentKey, payload.orderId, payload.amount)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return PaymentConfirmResponse(status="ok")
