from datetime import date
from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from app.api.deps import get_current_user
from app.schemas.expense import ExpenseCreate, ExpenseListOut, ExpenseOut, ExpenseUpdate, MonthlySummaryOut, UploadAnalysisOut
from app.services.expense_service import analyze_upload, create_expense, delete_expense, export_csv, export_pdf, list_expenses, monthly_summary, update_expense

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=ExpenseListOut)
async def get_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("date", pattern="^(date|amount|title|category)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    search: str | None = None,
    category: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    user: dict = Depends(get_current_user),
):
    return await list_expenses(user["id"], page, page_size, sort, order, search, category, start_date, end_date)


@router.post("", response_model=ExpenseOut, status_code=201)
async def post_expense(payload: ExpenseCreate, user: dict = Depends(get_current_user)):
    return await create_expense(user["id"], payload)


@router.post("/analyze-upload", response_model=UploadAnalysisOut)
async def upload_receipt(
    file: UploadFile = File(...),
    client_modified_at: str | None = Form(default=None),
    user: dict = Depends(get_current_user),
):
    data = await file.read()
    return await analyze_upload(data, file.content_type, client_modified_at)


@router.put("/{expense_id}", response_model=ExpenseOut)
async def put_expense(expense_id: str, payload: ExpenseUpdate, user: dict = Depends(get_current_user)):
    return await update_expense(user["id"], expense_id, payload)


@router.delete("/{expense_id}", status_code=204)
async def remove_expense(expense_id: str, user: dict = Depends(get_current_user)):
    await delete_expense(user["id"], expense_id)


@router.get("/summary/monthly", response_model=MonthlySummaryOut)
async def summary(month: str = Query(pattern=r"^\d{4}-\d{2}$"), user: dict = Depends(get_current_user)):
    return await monthly_summary(user, month)


@router.get("/export/csv")
async def csv_export(user: dict = Depends(get_current_user)):
    data = await export_csv(user["id"])
    return Response(data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=expenses.csv"})


@router.get("/export/pdf")
async def pdf_export(user: dict = Depends(get_current_user)):
    data = await export_pdf(user["id"])
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=expenses.pdf"})
