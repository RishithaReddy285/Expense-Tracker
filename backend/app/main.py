from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes.auth import router as auth_router
from app.api.routes.expenses import router as expenses_router
from app.core.config import get_settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo

app = FastAPI(title="Expense Tracker API", version="1.0.0", docs_url="/docs", redoc_url="/redoc")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})


@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok"}


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Expense Tracker API is running",
        "frontend": "https://frontend-nine-ivory-45.vercel.app",
        "docs": "/docs",
        "health": "/health",
    }


app.include_router(auth_router)
app.include_router(expenses_router)
