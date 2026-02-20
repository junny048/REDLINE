import base64
import hashlib
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def confirm_payment(payment_key: str, order_id: str, amount: int) -> None:
    secret_key = os.getenv("TOSS_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("TOSS_SECRET_KEY is not set.")

    payload = json.dumps(
        {
            "paymentKey": payment_key,
            "orderId": order_id,
            "amount": amount,
        }
    ).encode("utf-8")

    auth_value = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
    idempotency_source = f"{payment_key}:{order_id}:{amount}"
    idempotency_key = hashlib.sha256(idempotency_source.encode("utf-8")).hexdigest()
    request = Request(
        "https://api.tosspayments.com/v1/payments/confirm",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Basic {auth_value}",
            "Content-Type": "application/json",
            "Idempotency-Key": idempotency_key,
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError("Toss confirm failed with non-2xx status.")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(detail or f"Toss confirm failed: {exc.code}") from exc
    except URLError as exc:
        raise RuntimeError(f"Toss confirm network error: {exc.reason}") from exc
