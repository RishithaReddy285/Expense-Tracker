from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.mongodb import get_database
from app.models.common import serialize_doc
from app.schemas.user import UserCreate, UserLogin


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "monthly_budget": user.get("monthly_budget", 0),
    }


async def register_user(payload: UserCreate) -> dict:
    db = get_database()
    user = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": get_password_hash(payload.password),
        "monthly_budget": 0,
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user["id"] = str(result.inserted_id)
    return {"access_token": create_access_token(user["id"]), "user": public_user(user)}


async def login_user(payload: UserLogin) -> dict:
    db = get_database()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    user = serialize_doc(user)
    return {"access_token": create_access_token(user["id"]), "user": public_user(user)}
