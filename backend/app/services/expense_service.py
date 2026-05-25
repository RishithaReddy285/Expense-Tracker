from datetime import date, datetime
from io import BytesIO, StringIO
import base64
import csv
import json
import re
from bson import ObjectId
from fastapi import HTTPException, status
import httpx
from PIL import Image, ExifTags
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.core.config import get_settings
from app.db.mongodb import get_database
from app.models.common import object_id, serialize_doc
from app.schemas.expense import ExpenseCreate, ExpenseUpdate

CATEGORIES = {"Food", "Transport", "Shopping", "Housing", "Utilities", "Health", "Entertainment", "Travel", "Education", "Other"}
PAYMENT_METHODS = {"Cash", "Credit Card", "Debit Card", "UPI", "Bank Transfer", "Wallet"}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")


def expense_doc(payload: ExpenseCreate | ExpenseUpdate, user_id: str | None = None) -> dict:
    data = payload.model_dump(exclude_unset=True)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    if user_id:
        data["user_id"] = user_id
    return data


async def list_expenses(user_id: str, page: int, page_size: int, sort: str, order: str, search: str | None, category: str | None, start_date: date | None, end_date: date | None) -> dict:
    db = get_database()
    query: dict = {"user_id": user_id}
    if search:
        query["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"notes": {"$regex": search, "$options": "i"}}]
    if category:
        query["category"] = category
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date.isoformat()
        if end_date:
            query["date"]["$lte"] = end_date.isoformat()
    direction = -1 if order == "desc" else 1
    cursor = db.expenses.find(query).sort(sort, direction).skip((page - 1) * page_size).limit(page_size)
    items = [serialize_doc(doc) async for doc in cursor]
    total = await db.expenses.count_documents(query)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


async def create_expense(user_id: str, payload: ExpenseCreate) -> dict:
    db = get_database()
    doc = expense_doc(payload, user_id)
    result = await db.expenses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def update_expense(user_id: str, expense_id: str, payload: ExpenseUpdate) -> dict:
    db = get_database()
    try:
        oid = object_id(expense_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense id")
    update = expense_doc(payload)
    if not update:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    await db.expenses.update_one({"_id": oid, "user_id": user_id}, {"$set": update})
    doc = await db.expenses.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return serialize_doc(doc)


async def delete_expense(user_id: str, expense_id: str) -> None:
    try:
        oid = object_id(expense_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense id")
    result = await get_database().expenses.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")


async def monthly_summary(user: dict, month: str) -> dict:
    db = get_database()
    query = {"user_id": user["id"], "date": {"$regex": f"^{month}"}}
    docs = [doc async for doc in db.expenses.find(query)]
    by_category: dict[str, float] = {}
    total = 0.0
    for doc in docs:
        amount = float(doc["amount"])
        total += amount
        by_category[doc["category"]] = by_category.get(doc["category"], 0) + amount
    budget = float(user.get("monthly_budget", 0) or 0)
    used = round((total / budget) * 100, 2) if budget else 0
    alert = "Monthly budget exceeded" if budget and total > budget else "You are over 80% of budget" if budget and used >= 80 else None
    return {"month": month, "total": total, "by_category": by_category, "budget": budget, "budget_used_percent": used, "alert": alert}


async def export_csv(user_id: str) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Amount", "Category", "Date", "Payment Method", "Recurrence", "Notes"])
    async for doc in get_database().expenses.find({"user_id": user_id}).sort("date", -1):
        writer.writerow([doc["title"], doc["amount"], doc["category"], doc["date"], doc["payment_method"], doc.get("recurrence", "None"), doc.get("notes", "")])
    return output.getvalue()


async def export_pdf(user_id: str) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle("Expense Report")
    y = 760
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(40, y, "Expense Report")
    y -= 30
    pdf.setFont("Helvetica", 10)
    async for doc in get_database().expenses.find({"user_id": user_id}).sort("date", -1):
        line = f"{doc['date']} | {doc['title']} | {doc['category']} | {doc['payment_method']} | {doc['amount']}"
        pdf.drawString(40, y, line[:110])
        y -= 18
        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = 760
    pdf.save()
    return buffer.getvalue()


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1)
    else:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI response could not be parsed")


def _image_timestamp(file_bytes: bytes) -> datetime | None:
    try:
        with Image.open(BytesIO(file_bytes)) as image:
            exif = image.getexif()
            if not exif:
                return None
            names = {ExifTags.TAGS.get(tag, tag): value for tag, value in exif.items()}
            raw = names.get("DateTimeOriginal") or names.get("DateTimeDigitized") or names.get("DateTime")
            if not raw:
                return None
            return datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None


def _valid_date(value: object) -> str | None:
    if isinstance(value, str) and DATE_PATTERN.match(value):
        return value
    return None


def _valid_time(value: object) -> str | None:
    if isinstance(value, str) and TIME_PATTERN.match(value):
        return value
    return None


def _client_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone().replace(tzinfo=None)
    except ValueError:
        return None


def _analysis_payload(model: str, prompt: str, content_type: str, encoded_image: str) -> dict:
    return {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{encoded_image}"}},
                ],
            }
        ],
    }


async def _ask_groq(prompt: str, encoded_image: str, content_type: str, headers: dict, model: str) -> dict:
    payload = _analysis_payload(model, prompt, content_type, encoded_image)
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
    if response.status_code >= 400:
        detail = response.text[:500]
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Groq analysis failed: {detail}")
    content = response.json()["choices"][0]["message"]["content"]
    return _extract_json(content)


async def analyze_upload(file_bytes: bytes, content_type: str | None, client_modified_at: str | None = None) -> dict:
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GROQ_API_KEY is not configured")
    if not content_type or not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a receipt image file")
    if len(file_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File must be smaller than 8 MB")

    encoded = base64.b64encode(file_bytes).decode("utf-8")
    prompt = (
        "Analyze this expense receipt, bill, invoice, or payment screenshot. First read all visible text carefully. "
        "Find the transaction date and transaction time from labels like date, time, paid at, order time, bill time, invoice date, or UPI timestamp. "
        "Return only strict JSON with keys: title, amount, category, date, time, payment_method, notes, confidence. "
        "Use ISO date YYYY-MM-DD. Use 24-hour time HH:MM. "
        "category must be one of Food, Transport, Shopping, Housing, Utilities, Health, Entertainment, Travel, Education, Other. "
        "payment_method must be one of Cash, Credit Card, Debit Card, UPI, Bank Transfer, Wallet. "
        "Use null only when the receipt image truly has no visible value."
    )
    headers = {"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"}
    result = await _ask_groq(prompt, encoded, content_type, headers, settings.groq_vision_model)
    result["confidence"] = float(result.get("confidence") or 0)
    if result.get("category") not in CATEGORIES:
        result["category"] = "Other" if result.get("category") else None
    if result.get("payment_method") not in PAYMENT_METHODS:
        result["payment_method"] = None
    if result.get("amount") is not None:
        try:
            result["amount"] = float(result["amount"])
        except (TypeError, ValueError):
            result["amount"] = None
    result["date"] = _valid_date(result.get("date"))
    result["time"] = _valid_time(result.get("time"))

    if not result["date"] or not result["time"]:
        focused_prompt = (
            "Look only for the transaction date and transaction time in this image. "
            "Check small text, headers, footers, UPI/payment timestamps, invoice date, bill date, order date, and paid-at lines. "
            "Return strict JSON only with keys date, time, confidence. "
            "Use date as YYYY-MM-DD and time as HH:MM 24-hour format. Use null only if no visible date/time exists."
        )
        focused = await _ask_groq(focused_prompt, encoded, content_type, headers, settings.groq_vision_model)
        result["date"] = result["date"] or _valid_date(focused.get("date"))
        result["time"] = result["time"] or _valid_time(focused.get("time"))
        result["confidence"] = max(result["confidence"], float(focused.get("confidence") or 0))

    result["date_source"] = "receipt" if result["date"] else "not_found"
    result["time_source"] = "receipt" if result["time"] else "not_found"

    metadata_timestamp = _image_timestamp(file_bytes)
    browser_timestamp = _client_timestamp(client_modified_at)
    fallback = metadata_timestamp or browser_timestamp or datetime.now().astimezone().replace(tzinfo=None)
    fallback_source = "image metadata" if metadata_timestamp else "file timestamp" if browser_timestamp else "upload time"
    if not result["date"]:
        result["date"] = fallback.date().isoformat()
        result["date_source"] = fallback_source
    if not result["time"]:
        result["time"] = fallback.strftime("%H:%M")
        result["time_source"] = fallback_source
    if fallback_source == "upload time" and (result["date_source"] == "upload time" or result["time_source"] == "upload time"):
        note = "Receipt date/time was not visible, so upload time was used."
        result["notes"] = f"{result.get('notes')}\n{note}" if result.get("notes") else note
    return result
