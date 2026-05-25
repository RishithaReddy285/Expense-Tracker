from datetime import date
from io import BytesIO, StringIO
import csv
from bson import ObjectId
from fastapi import HTTPException, status
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.db.mongodb import get_database
from app.models.common import object_id, serialize_doc
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


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
