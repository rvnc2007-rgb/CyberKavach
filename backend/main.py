# backend/main.py
import os
import io
import re
import math
import joblib
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# 1. OPTIONAL MEDIA PACKAGES
try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None

app = FastAPI(title="CyberKavach AI Fraud Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. LOAD TRAINED MODEL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "ml_model.joblib")
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.join(BASE_DIR, "ml_model.joblib")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Could not find ml_model.joblib at {MODEL_PATH}")

print(f"Loading trained CyberKavach ML Model from: {MODEL_PATH}")
model = joblib.load(MODEL_PATH)
print("Model loaded successfully!")


def calculate_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    entropy = -sum((cnt / len(s)) * math.log2(cnt / len(s)) for cnt in freq.values())
    return round(entropy, 2)


def extract_text_from_image(image_bytes: bytes) -> str:
    if pytesseract is None:
        return ""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(image).strip()
    except Exception:
        return ""


def transcribe_audio(audio_bytes: bytes) -> str:
    if sr is None:
        return ""
    try:
        r = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio_data = r.record(source)
            recognizer = getattr(r, "recognize_google", None)
            if recognizer:
                return str(recognizer(audio_data)).strip()
            return ""
    except Exception:
        return ""


@app.get("/")
def read_root():
    return {"status": "online", "service": "CyberKavach AI Engine", "model_loaded": True}


@app.post("/api/analyze")
async def analyze(
    text: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None)
):
    extracted_media_text = ""
    modality_detected = "text"

    if file:
        content_type = file.content_type or ""
        file_bytes = await file.read()

        if content_type.startswith("image/"):
            modality_detected = "image_ocr"
            extracted_media_text = extract_text_from_image(file_bytes)
        elif content_type.startswith("audio/"):
            modality_detected = "audio_transcript"
            extracted_media_text = transcribe_audio(file_bytes)

    combined_text = f"{text or ''} {extracted_media_text}".strip()

    if not combined_text:
        raise HTTPException(
            status_code=400,
            detail="Please provide a message, phone number, link, or media file."
        )

    # 1. Base ML Model Prediction
    probs = model.predict_proba([combined_text])[0]
    base_ml_score = int(round(float(probs[1]) * 100))
    score = base_ml_score

    lower_text = combined_text.lower()
    detected_indicators = []

    # 2. COMPOUND PATTERN CHECKS (Requires trigger + urgency threat)
    # A. Utility Disconnection Scam (Must have utility AND threat of cutoff)
    has_utility = any(w in lower_text for w in ['electricity', 'power', 'bijli', 'water bill'])
    has_cutoff = any(w in lower_text for w in ['disconnect', 'cut off', 'cut tonight', 'tonight at', 'unpaid', 'call officer', '9:30'])
    if has_utility and has_cutoff:
        score = max(score, 94)
        detected_indicators.append("Urgent electricity disconnection threat")

    # B. Digital Arrest / Law Enforcement Impersonation
    has_police = any(w in lower_text for w in ['cbi', 'police', 'customs', 'ncb', 'digital arrest', 'warrant', 'court'])
    has_threat = any(w in lower_text for w in ['parcel', 'drugs', 'illegal', 'video call', 'skype', 'arrest', 'secret account'])
    if has_police and has_threat:
        score = max(score, 96)
        detected_indicators.append("Law enforcement impersonation / Digital arrest")

    # C. Bank KYC / PAN Card Freeze Traps
    has_bank = any(w in lower_text for w in ['kyc', 'pan card', 'aadhaar', 'bank account', 'debit card', 'credit card'])
    has_freeze = any(w in lower_text for w in ['block', 'suspend', 'freeze', 'deactivate', 'expire today', 'send otp', 'share pin'])
    if has_bank and has_freeze:
        score = max(score, 93)
        detected_indicators.append("Bank KYC / Account suspension trap")

    # D. Fake Lottery & Task Scams
    if any(w in lower_text for w in ['kbc lottery', 'won 25 lakh', 'lucky draw winner', 'youtube like job', 'prepaid task']):
        score = max(score, 95)
        detected_indicators.append("Lottery / Task job advance fee scam")

    # E. Malicious APK App
    if any(w in lower_text for w in ['.apk', 'download apk', 'install apk']):
        score = max(score, 98)
        detected_indicators.append("Malicious .APK file download")

    # 3. CONVERSATIONAL SAFE WORDS (Dampens false positives for family chats)
    family_tokens = ['mom', 'dad', 'bhai', 'bro', 'sister', 'college', 'class', 'yesterday', 'lunch', 'dinner', 'reached safely']
    is_casual_family = any(w in lower_text for w in family_tokens)
    no_active_threat = not any(w in lower_text for w in ['disconnect', 'arrest', 'apk', 'otp', 'block', 'warrant', 'cut off'])
    if is_casual_family and no_active_threat:
        score = min(score, 8)  # Safe casual conversation

    # 4. Telecom Rules (International scam prefixes / Spoofed numbers)
    digits_only = re.sub(r'\D', '', combined_text)
    if 5 <= len(digits_only) <= 12:
        entropy = calculate_entropy(digits_only)
        if any(combined_text.startswith(p) for p in ['+92', '+855', '+856', '+234', '140']):
            score = max(score, 97)
            detected_indicators.append("International high-risk fraud prefix")
        elif entropy < 1.85:
            score = max(score, 95)
            detected_indicators.append("Spoofed repetitive VoIP caller ID")

    # 5. Realistic Risk Classification
    if score >= 50:
        status = "DANGER"
        headline = "STOP! DANGEROUS SCAM / FRAUD DETECTED"
        simple_reason = f"Recognized high-risk fraud patterns detected ({', '.join(detected_indicators[:2]) or 'urgent extortion indicators'})."
        actions = [
            "Do NOT click any link, call back, or send money.",
            "Real utility providers & banks never threaten disconnection or arrest over text/calls.",
            "Report immediately on 1930 or cybercrime.gov.in."
        ]
    elif score >= 35:
        status = "SUSPICIOUS"
        headline = "CAUTION! SUSPICIOUS ACTIVITY DETECTED"
        simple_reason = "Unverified urgency or cautionary signs detected. Verify directly through official channels."
        actions = [
            "Do not share OTPs, PINs, or personal details.",
            "Call the service provider on their official verified number to confirm."
        ]
    else:
        status = "SAFE"
        headline = "LOOKS SAFE (NO OBVIOUS SCAM DETECTED)"
        simple_reason = "No recognized phishing links, disconnection threats, spoofed caller patterns, or extortion triggers were found."
        actions = [
            "Always remember: legitimate institutions will never ask for secret OTPs or passwords."
        ]

    return {
        "status": status,
        "score": score,
        "is_fraud": score >= 50,
        "headline": headline,
        "simpleReason": simple_reason,
        "actions": actions,
        "detected_indicators": detected_indicators,
        "extracted_media_text": extracted_media_text,
        "modality": modality_detected,
        "engine": "CyberKavach Hybrid ML Engine (v1)"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)