"""
Florence-2 OCR microservice for 3R Scan.

POST /ocr  {"image": "<base64 jpeg, with or without data: prefix>"}
-> {"text": "...", "brand": "...", "size": "...", "ms": 1234}

Run:  uvicorn app:app --port 8000
"""
import base64
import io
import re
import time

import torch
from fastapi import FastAPI
from PIL import Image
from pydantic import BaseModel
from transformers import AutoProcessor, Florence2ForConditionalGeneration

MODEL_ID = "florence-community/Florence-2-base"

# Edit this list: brands you want recognised (matched ignoring case/spaces/punctuation)
BRANDS = [
    "Coca-Cola", "Coke", "Pepsi", "Sprite", "Fanta", "7UP", "Mountain Dew", "100PLUS",
    "F&N", "Milo", "Nescafe", "Nestle", "Dutch Lady", "Marigold", "Farm Fresh", "Vitagen",
    "Yeo's", "Ice Mountain", "Spritzer", "Cactus", "Pocari Sweat", "Revive", "Red Bull",
    "Lipton", "Heineken", "Carlsberg", "Tiger", "Guinness", "Maggi", "Mamee", "Munchy's",
    "Oreo", "Nutella", "Colgate", "Dettol", "Clorox", "Dynamo", "Breeze", "Daia",
]

torch.set_num_threads(max(1, torch.get_num_threads()))
processor = AutoProcessor.from_pretrained(MODEL_ID)
model = Florence2ForConditionalGeneration.from_pretrained(
    MODEL_ID, torch_dtype=torch.float32
).eval()

app = FastAPI()


class OcrRequest(BaseModel):
    image: str


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


SIZE_RE = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(ml|cl|l|ltr|litre|liter|kg|g|oz)\b", re.IGNORECASE
)


def parse_size(text: str) -> str:
    # OCR often reads 0 as O inside numbers (5OOml -> 500ml)
    fixed = re.sub(
        r"\b\d[\dOo]*(?=\s?(?:ml|cl|l|kg|g|oz)\b)",
        lambda m: m.group(0).replace("O", "0").replace("o", "0"),
        text,
        flags=re.IGNORECASE,
    )
    m = SIZE_RE.search(fixed)
    if not m:
        return "unknown"
    num = m.group(1).replace(",", ".")
    unit = {"ltr": "L", "litre": "L", "liter": "L", "l": "L", "ml": "ml",
            "cl": "cl", "kg": "kg", "g": "g", "oz": "oz"}[m.group(2).lower()]
    return f"{num}{unit}"


def parse_brand(text: str) -> str:
    n = _norm(text)
    best, best_pos = None, None
    for b in BRANDS:
        nb = _norm(b)
        pos = n.find(nb) if nb else -1
        if pos < 0:
            continue
        # earliest in the text wins; ties -> longer name
        if best is None or pos < best_pos or (pos == best_pos and len(nb) > len(_norm(best))):
            best, best_pos = b, pos
    return best or "unknown"


def run_ocr(img: Image.Image) -> str:
    inputs = processor(text="<OCR>", images=img, return_tensors="pt")
    with torch.inference_mode():
        ids = model.generate(
            **inputs, max_new_tokens=64, num_beams=1, do_sample=False
        )
    return processor.batch_decode(ids, skip_special_tokens=True)[0].strip()


# warm-up so the first real scan isn't slow
try:
    run_ocr(Image.new("RGB", (256, 256), "white"))
    print("Florence-2 ready")
except Exception as e:  # pragma: no cover
    print("Warm-up failed:", e)


@app.post("/ocr")
def ocr(req: OcrRequest):
    t0 = time.time()
    b64 = req.image.split(",", 1)[1] if "," in req.image else req.image
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
    text = run_ocr(img)
    return {
        "text": text,
        "brand": parse_brand(text),
        "size": parse_size(text),
        "ms": int((time.time() - t0) * 1000),
    }


@app.get("/health")
def health():
    return {"ok": True}
