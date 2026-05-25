from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.db.mongodb import get_database
from app.models.common import object_id
from app.schemas.user import TokenOut, UserCreate, UserLogin, UserOut, UserUpdate
from app.services.auth_service import login_user, public_user, register_user

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(payload: UserCreate):
    return await register_user(payload)


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin):
    return await login_user(payload)


@router.get("/profile", response_model=UserOut)
async def profile(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.put("/profile", response_model=UserOut)
async def update_profile(payload: UserUpdate, user: dict = Depends(get_current_user)):
    update = payload.model_dump(exclude_unset=True)
    if update:
        await get_database().users.update_one({"_id": object_id(user["id"])}, {"$set": update})
        user.update(update)
    return public_user(user)
