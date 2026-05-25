from bson import ObjectId


def object_id(id_value: str) -> ObjectId:
    if not ObjectId.is_valid(id_value):
        raise ValueError("Invalid object id")
    return ObjectId(id_value)


def serialize_doc(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc
