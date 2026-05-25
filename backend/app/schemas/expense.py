from datetime import date as Date
from enum import Enum
from pydantic import BaseModel, Field


class Category(str, Enum):
    food = "Food"
    transport = "Transport"
    shopping = "Shopping"
    housing = "Housing"
    utilities = "Utilities"
    health = "Health"
    entertainment = "Entertainment"
    travel = "Travel"
    education = "Education"
    other = "Other"


class PaymentMethod(str, Enum):
    cash = "Cash"
    credit_card = "Credit Card"
    debit_card = "Debit Card"
    upi = "UPI"
    bank_transfer = "Bank Transfer"
    wallet = "Wallet"


class Recurrence(str, Enum):
    none = "None"
    weekly = "Weekly"
    monthly = "Monthly"
    yearly = "Yearly"


class ExpenseBase(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    amount: float = Field(gt=0)
    category: Category
    date: Date
    payment_method: PaymentMethod
    notes: str | None = Field(default=None, max_length=500)
    recurrence: Recurrence = Recurrence.none


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    amount: float | None = Field(default=None, gt=0)
    category: Category | None = None
    date: Date | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = Field(default=None, max_length=500)
    recurrence: Recurrence | None = None


class ExpenseOut(ExpenseBase):
    id: str
    user_id: str


class ExpenseListOut(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int


class MonthlySummaryOut(BaseModel):
    month: str
    total: float
    by_category: dict[str, float]
    budget: float
    budget_used_percent: float
    alert: str | None = None
