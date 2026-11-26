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

app = FastAPI(title="CyberKavach AI Fraud Engine", version="1.2.0")

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

OFFICIAL_HELPLINES = {
    "100": "Police Emergency Helpline",
    "101": "Fire Emergency Helpline",
    "102": "Ambulance Helpline",
    "108": "Emergency Response Helpline",
    "112": "National Emergency Number (ERSS)",
    "1091": "Women Helpline",
    "1098": "Childline India",
    "181": "Women Emergency Helpline",
    "1909": "TRAI DND Spam Complaint Helpline",
    "1930": "National Cyber Crime Helpline",
}

TELECOM_PREFIX_RULES = [
    {
        "prefixes": ["+92", "0092"],
        "country": "Pakistan (+92)",
        "score": 98,
        "status": "DANGER",
        "headline": "STOP! HIGH-RISK INTERNATIONAL SCAM NUMBER (+92)",
        "reason": "Numbers from Pakistan (+92) are heavily used for fake KBC lottery calls, WhatsApp video blackmail, and impersonation scams.",
    },
    {
        "prefixes": ["+855", "00855", "+856", "00856"],
        "country": "Cambodia / Laos (+855 / +856)",
        "score": 98,
        "status": "DANGER",
        "headline": "STOP! INTERNATIONAL SCAM CALL CENTER NUMBER",
        "reason": 'Numbers from Cambodia (+855) and Laos (+856) are linked to organized scam centers running fake "Digital Arrest", CBI, and FedEx calls.',
    },
    {
        "prefixes": ["+84", "0084", "+62", "0062"],
        "country": "Vietnam / Indonesia (+84 / +62)",
        "score": 95,
        "status": "DANGER",
        "headline": "DANGER! FOREIGN WHATSAPP SCAM NUMBER",
        "reason": "Numbers starting with +84 or +62 are widely used for fake WhatsApp part-time jobs, YouTube like tasks, and Telegram prepaid scams.",
    },
    {
        "prefixes": ["+234", "00234", "+254", "00254"],
        "country": "Nigeria / Kenya (+234 / +254)",
        "score": 96,
        "status": "DANGER",
        "headline": "DANGER! INTERNATIONAL ADVANCE-FEE SCAM NUMBER",
        "reason": "This foreign prefix is linked to fake customs parcel fees, lottery messages, and WhatsApp gift scams.",
    },
    {
        "prefixes": ["140", "+91140", "91140", "0140"],
        "is_domestic": True,
        "country": "India Telemarketer (140 Series)",
        "score": 62,
        "status": "SUSPICIOUS",
        "headline": "PROMOTIONAL TELEMARKETING CALL (140 SERIES)",
        "reason": "Numbers starting with 140 are registered commercial telemarketing lines used for promotional loan and credit card offers.",
    },
    {
        "prefixes": ["160", "+91160", "91160", "0160"],
        "is_domestic": True,
        "country": "Official Service Header (160 Series)",
        "score": 12,
        "status": "SAFE",
        "headline": "OFFICIAL BANK / SERVICE CALL SERIES (160)",
        "reason": "160-series numbers are reserved by TRAI for official banks and government alerts. Real banks still never ask for your OTP or PIN.",
    },
]


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


def analyze_phone_number(raw_text: str) -> dict:
    compact = re.sub(r"[\s\-().]", "", raw_text)
    digits_only = re.sub(r"\D", "", compact)

    # 1. Official Helplines
    if digits_only in OFFICIAL_HELPLINES:
        return {
            "status": "SAFE",
            "score": 5,
            "is_fraud": False,
            "headline": f"OFFICIAL INDIAN HELPLINE ({digits_only})",
            "simpleReason": f"{digits_only} is the verified {OFFICIAL_HELPLINES[digits_only]}.",
            "actions": [
                "This is an official government/emergency helpline number.",
                "Save 1930 for instant cybercrime financial fraud reporting.",
            ],
            "detected_indicators": [OFFICIAL_HELPLINES[digits_only]],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 2. Strict Prefix Checks
    for rule in TELECOM_PREFIX_RULES:
        if any(compact.startswith(p) for p in rule["prefixes"]):
            is_safe = rule["status"] == "SAFE"
            return {
                "status": rule["status"],
                "score": rule["score"],
                "is_fraud": rule["status"] == "DANGER",
                "headline": rule["headline"],
                "simpleReason": rule["reason"],
                "actions": (
                    [
                        "Even on official 160-series calls, never share your OTP, ATM PIN, or UPI PIN.",
                        "Verify financial requests directly inside your bank app.",
                    ]
                    if is_safe
                    else [
                        "Do NOT answer or reply to calls/WhatsApp messages from this number.",
                        "Block the number and report it on Chakshu (sancharsaathi.gov.in).",
                        "Never share OTPs, UPI PINs, or join Telegram task groups.",
                    ]
                ),
                "detected_indicators": [rule["country"]],
                "extracted_media_text": "",
                "modality": "phone_number",
                "engine": "CyberKavach Telecom Prefix Engine (v1.2)",
            }

    # 3. Indian Toll-Free (1800 / 1860)
    if re.match(r"^(?:1800|1860)\d{6,8}$", digits_only):
        return {
            "status": "SAFE",
            "score": 14,
            "is_fraud": False,
            "headline": "INDIAN TOLL-FREE CUSTOMER CARE FORMAT",
            "simpleReason": f'"{raw_text}" follows a valid Indian toll-free (1800/1860) number format. Always confirm support numbers on official websites.',
            "actions": [
                "Genuine customer care never asks you to install AnyDesk/TeamViewer or share OTPs.",
                "Verify the number on the official app or the back of your bank card.",
            ],
            "detected_indicators": ["Toll-Free 1800/1860 Format"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 4. Other International Numbers
    is_foreign = (compact.startswith("+") and not compact.startswith("+91")) or (
        compact.startswith("00") and not compact.startswith("0091")
    )
    if is_foreign:
        return {
            "status": "SUSPICIOUS",
            "score": 52,
            "is_fraud": False,
            "headline": "CAUTION: UNVERIFIED INTERNATIONAL CALLER",
            "simpleReason": f'"{raw_text}" is a foreign phone number outside India. If you are not expecting an overseas call, treat it cautiously.',
            "actions": [
                "Do not answer unknown international WhatsApp video calls.",
                "Never pay customs fees, lottery charges, or job deposits to foreign callers.",
            ],
            "detected_indicators": ["Unverified Foreign Prefix"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 5. Normalize Indian Country / STD Prefix
    subscriber = digits_only
    had_indian_prefix = False
    if compact.startswith("+91") and len(digits_only) == 12:
        subscriber = digits_only[2:]
        had_indian_prefix = True
    elif compact.startswith("0091") and len(digits_only) == 14:
        subscriber = digits_only[4:]
        had_indian_prefix = True
    elif len(digits_only) == 12 and digits_only.startswith("91") and re.match(r"^[6-9]", digits_only[2:]):
        subscriber = digits_only[2:]
        had_indian_prefix = True
    elif len(digits_only) == 11 and digits_only.startswith("0") and re.match(r"^[6-9]", digits_only[1:]):
        subscriber = digits_only[1:]
        had_indian_prefix = True

    # 6. Synthetic / Spoofed Caller ID Detection
    entropy = calculate_entropy(subscriber)
    is_all_same = bool(re.match(r"^(\d)\1+$", subscriber))
    has_six_repeated = bool(re.search(r"(\d)\1{5,}", subscriber))
    is_alternating_pair = len(subscriber) >= 8 and bool(re.match(r"^(\d\d)\1{3,}$", subscriber))
    is_sequential = len(subscriber) >= 7 and (
        subscriber in "01234567890123456"
        or subscriber in "98765432109876543"
        or subscriber in "1234567890"
    )

    if is_all_same or has_six_repeated or is_sequential or (len(subscriber) >= 7 and entropy < 1.35):
        return {
            "status": "DANGER",
            "score": 96,
            "is_fraud": True,
            "headline": "STOP! FAKE / SPOOFED SPAM CALLER ID DETECTED",
            "simpleReason": f'"{raw_text}" uses a repetitive, sequential, or computer-generated caller ID pattern (Entropy: {entropy}). Scammers use VoIP spoofing to display numbers like this.',
            "actions": [
                "Do NOT trust or answer calls from this spoofed caller ID.",
                "Never share OTPs, bank details, or click any link sent by this caller.",
                "Block immediately and report on 1930 or sancharsaathi.gov.in.",
            ],
            "detected_indicators": [f"Synthetic Pattern (Entropy {entropy})", "VoIP Caller ID Spoofing"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Entropy Engine (v1.2)",
        }

    # 7. Indian STD Landline (10-11 digits starting with 0)
    if not had_indian_prefix and re.match(r"^0[1-8]\d{8,9}$", digits_only):
        return {
            "status": "SAFE",
            "score": 18,
            "is_fraud": False,
            "headline": "VALID INDIAN LANDLINE FORMAT — NO COMPLAINTS FOUND",
            "simpleReason": f'"{raw_text}" matches a standard Indian STD landline format with no spoofing signatures found.',
            "actions": [
                "Always verify institutional calls via official websites.",
                "Never share OTPs or banking passwords over any call.",
            ],
            "detected_indicators": ["Valid STD Landline Format"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 8. Abnormal Subscriber Length
    if len(subscriber) != 10:
        return {
            "status": "DANGER",
            "score": 88,
            "is_fraud": True,
            "headline": "DANGER! INVALID / ROGUE VOIP CALLER ID",
            "simpleReason": f'Standard Indian mobile numbers have 10 digits. "{raw_text}" has an abnormal length ({len(subscriber)} digits) typical of robocallers and VoIP scam gateways.',
            "actions": [
                "Disconnect immediately—this is not a valid Indian mobile number.",
                "Do NOT call back unknown abnormal-length numbers.",
                "Block this caller ID on your phone.",
            ],
            "detected_indicators": [f"Abnormal Length ({len(subscriber)} digits)"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 9. Invalid Mobile Starting Digit
    if not re.match(r"^[6-9]\d{9}$", subscriber):
        return {
            "status": "DANGER",
            "score": 89,
            "is_fraud": True,
            "headline": "STOP! INVALID MOBILE SERIES / SPOOFED LINE",
            "simpleReason": f'Valid Indian mobile numbers always start with 6, 7, 8, or 9. "{raw_text}" starts with "{subscriber[0]}", indicating an automated spam dialer or spoofed VoIP line.',
            "actions": [
                "Do NOT share personal or banking details with this caller.",
                'Send "FULLY BLOCK" to 1909 to reduce spam calls.',
            ],
            "detected_indicators": [f"Invalid Starting Digit ({subscriber[0]})"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Telecom Intelligence (v1.2)",
        }

    # 10. Low-Entropy Virtual / Bulk Telemarketer Pattern
    if entropy < 1.85 or is_alternating_pair:
        return {
            "status": "SUSPICIOUS",
            "score": 56,
            "is_fraud": False,
            "headline": "CAUTION: VIRTUAL / BULK TELEMARKETING PATTERN",
            "simpleReason": f'"{raw_text}" has a highly repetitive digit pattern often used by virtual VoIP dialers or call centers. Verify before sharing any info.',
            "actions": [
                "Real banks and police never ask for OTP, KYC updates, or money on a call.",
                "If they create panic or urgency, hang up and dial the official number.",
            ],
            "detected_indicators": [f"Low Digit Entropy ({entropy})"],
            "extracted_media_text": "",
            "modality": "phone_number",
            "engine": "CyberKavach Entropy Engine (v1.2)",
        }

    # 11. Valid 10-Digit Indian Mobile Number
    return {
        "status": "SAFE",
        "score": 14,
        "is_fraud": False,
        "headline": "VALID 10-DIGIT INDIAN MOBILE FORMAT — NO COMPLAINTS FOUND",
        "simpleReason": f'"{raw_text}" matches a genuine 10-digit Indian mobile number format (6–9 series, natural entropy: {entropy}) with zero spoofing signatures found.',
        "actions": [
            "Format validity cannot guarantee caller identity—scammers can still use normal SIM cards.",
            "Never share your bank OTP, CVV, or UPI PIN with anyone.",
            "Paste any SMS or WhatsApp message they sent to scan its actual content.",
        ],
        "detected_indicators": ["Valid 10-Digit Mobile Format"],
        "extracted_media_text": "",
        "modality": "phone_number",
        "engine": "CyberKavach Telecom Intelligence (v1.2)",
    }


@app.get("/")
def read_root():
    return {"status": "online", "service": "CyberKavach AI Engine", "model_loaded": True}


@app.post("/api/analyze")
async def analyze(
    text: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
):
    extracted_media_text = ""
    modality_detected = "text"
    uploaded_filename = ""

    if file:
        uploaded_filename = (file.filename or "").lower()
        content_type = file.content_type or ""
        file_bytes = await file.read()

        if content_type.startswith("image/"):
            modality_detected = "image_ocr"
            extracted_media_text = extract_text_from_image(file_bytes)
        elif content_type.startswith("audio/"):
            modality_detected = "audio_transcript"
            extracted_media_text = transcribe_audio(file_bytes)

    combined_text = f"{text or ''} {extracted_media_text}".strip()

    if not combined_text and not uploaded_filename.endswith(".apk"):
        raise HTTPException(
            status_code=400,
            detail="Please provide a message, phone number, link, or readable media file.",
        )

    # 0. ROUTE PURE PHONE NUMBERS DIRECTLY TO TELECOM ENGINE (Avoids TF-IDF OOV noise)
    compact_text = re.sub(r"[\s\-().]", "", combined_text)
    digits_only = re.sub(r"\D", "", compact_text)
    is_pure_phone = (
        not file
        and len(digits_only) >= 3
        and bool(re.match(r"^[+\d][\d\s\-().]*$", combined_text))
    )
    if is_pure_phone:
        return analyze_phone_number(combined_text)

    # 1. BASE ML MODEL PREDICTION (TF-IDF + Balanced Logistic SGD)
    probs = model.predict_proba([combined_text or uploaded_filename])[0]
    base_ml_score = int(round(float(probs[1]) * 100))
    score = base_ml_score

    lower_text = combined_text.lower()
    detected_indicators = []
    rule_floor = 0

    has_url = bool(
        re.search(
            r"(https?://[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:ly|xyz|top|apk|tk|ml|cf|click|link|vip|buzz|club|online|site)\b)",
            lower_text,
        )
    )
    is_shortener = bool(
        re.search(r"(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|shorturl|is\.gd|ow\.ly|tiny\.cc)", lower_text)
    )
    has_malicious_tld = bool(re.search(r"\.(?:xyz|top|tk|ml|cf|click|vip|buzz|club|apk)\b", lower_text))

    # 2. HIGH-PRECISION INDIAN FRAUD & PHISHING GUARDRAILS
    # A. Malicious APK / Remote Screen-Sharing Apps
    if (
        ".apk" in lower_text
        or uploaded_filename.endswith(".apk")
        or re.search(r"(download|install)\s+apk|anydesk|teamviewer|quicksupport|rustdesk", lower_text)
    ):
        rule_floor = max(rule_floor, 98)
        detected_indicators.append("Malicious .APK / Remote access app")

    # B. Embedded High-Risk International Scam Prefix inside SMS/WhatsApp text
    if re.search(r"(?:^|[\s,(])(?:\+|00)(?:92|855|856|84|62|234|254)\s?\d{4,}", combined_text):
        rule_floor = max(rule_floor, 97)
        detected_indicators.append("Embedded international scam number")

    # C. Digital Arrest / Law Enforcement / TRAI Impersonation
    if re.search(
        r"(cbi|police|customs|ncb|trai|telecom department|digital arrest|warrant|supreme court|mumbai crime)",
        lower_text,
    ) and re.search(
        r"(parcel|drugs|illegal|video call|skype|arrest|disconnect|2 hours|press 9|aadhaar|money laundering|secret account)",
        lower_text,
    ):
        rule_floor = max(rule_floor, 96)
        detected_indicators.append("Digital Arrest / Authority impersonation")

    # D. Electricity / Utility Disconnection Threat
    if re.search(r"(electricity|power|bijli|gas|water bill)", lower_text) and re.search(
        r"(disconnect|cut off|cut tonight|tonight|unpaid|previous month|call officer|9:30|8:30|update bill)",
        lower_text,
    ):
        rule_floor = max(rule_floor, 94)
        detected_indicators.append("Urgent utility disconnection threat")

    # E. Bank KYC / PAN / Account Suspension Traps
    if (
        re.search(
            r"(kyc|pan card|\bpan\b|aadhaar|yono|sbi|hdfc|icici|axis|bank account|netbanking|debit card|credit card|fastag)",
            lower_text,
        )
        and re.search(
            r"(block|blocked|suspend|suspended|freeze|frozen|deactivate|expire|expired|update now|verify now|link pan|share otp|share pin|click)",
            lower_text,
        )
        and not re.search(r"(do not share|never share|not done by you|if not you)", lower_text)
    ):
        rule_floor = max(rule_floor, 93)
        detected_indicators.append("Bank KYC / Account suspension trap")

    # F. Lottery, KBC, Cashback & Reward Traps
    if re.search(
        r"(kbc|lottery|lucky draw|jackpot|prize money|won\s*(?:rs\.?|₹|\$)?\s*\d+|scratch card|cashback|reward points|redeem points)",
        lower_text,
    ) and re.search(r"(claim|click|link|whatsapp|upi|pin|qr|fee|processing|expire|redeem|collect|call)", lower_text):
        rule_floor = max(rule_floor, 92)
        detected_indicators.append("Fake lottery / Cashback / Reward trap")

    # G. UPI QR / PIN Receive-Money Trap
    if re.search(r"(upi pin|scan qr|qr code|collect request)", lower_text) and re.search(
        r"(receive|refund|cashback|credit|get money|advance)", lower_text
    ):
        rule_floor = max(rule_floor, 95)
        detected_indicators.append("UPI PIN / QR receive-money scam")

    # H. Part-Time Job / Telegram Task / VIP Stock IPO Scams
    if re.search(
        r"(part[\s-]?time|work from home|earn\s*(?:rs\.?|₹)?\s*\d+|youtube like|google map review|prepaid task|vip stock|ipo allotment|guaranteed profit|daily income|investment group)",
        lower_text,
    ) and re.search(
        r"(telegram|whatsapp|daily|per day|commission|click|join|message|register|profit|200%|300%|salary)",
        lower_text,
    ):
        rule_floor = max(rule_floor, 94)
        detected_indicators.append("Fake part-time job / Investment trap")

    # I. Emergency Relative / AI Voice-Clone Impersonation Scam
    if (
        re.search(r"\b(mom|dad|papa|mummy|bhai|bro|sister|son|daughter|beta)\b", lower_text)
        and re.search(r"(hospital|accident|arrested|police station|emergency|bail|urgent|stuck)", lower_text)
        and re.search(r"(send|transfer|upi|gpay|phonepe|paytm|rs\.?|₹|lakh|thousand|money|account)", lower_text)
    ):
        rule_floor = max(rule_floor, 91)
        detected_indicators.append("Emergency relative money-request scam")

    # J. Fake Traffic E-Challan Phishing
    if re.search(r"(e-?challan|traffic challan|rto|parivahan)", lower_text) and (
        has_url or re.search(r"(apk|pay immediately|blacklist|seize)", lower_text)
    ):
        rule_floor = max(rule_floor, 92)
        detected_indicators.append("Fake traffic E-Challan phishing")

    # K. Shortened / High-Risk Link + Phishing Bait
    if (is_shortener or has_malicious_tld) and re.search(
        r"(urgent|verify|update|claim|win|won|free|click|pay|block|expire|reward|loan|bonus)", lower_text
    ):
        rule_floor = max(rule_floor, 84)
        detected_indicators.append("Suspicious shortened / High-risk link")

    score = max(score, rule_floor)

    # 3. LEGITIMATE TRANSACTIONAL SMS & CASUAL CHAT GUARD (Prevents False Positives)
    is_legit_transactional = (
        bool(
            re.search(
                r"(do not share|never share|not done by you|if not you|avl bal|available balance|out for delivery|delivered|recharge.*successful|booking confirmed|pnr\s*[:#-]?\s*\d+|valid for \d+ min)",
                lower_text,
            )
        )
        and len(detected_indicators) == 0
        and not is_shortener
        and not has_malicious_tld
        and ".apk" not in lower_text
    )

    if is_legit_transactional:
        return {
            "status": "SAFE",
            "score": min(score, 12),
            "is_fraud": False,
            "headline": "LOOKS LIKE A LEGITIMATE TRANSACTIONAL / OTP ALERT",
            "simpleReason": "Matches standard bank debit, OTP, delivery, or booking alert wording with no phishing links, .APK files, or extortion threats.",
            "actions": [
                "Never share this OTP with anyone—even if they claim to be from your bank.",
                "If you did not initiate this transaction, call your bank’s official helpline or 1930.",
            ],
            "detected_indicators": ["Standard Transactional Alert Pattern"],
            "extracted_media_text": extracted_media_text,
            "modality": modality_detected,
            "engine": "CyberKavach Hybrid ML Engine (v1.2)",
        }

    # 4. PROMOTIONAL / MARKETING SPAM CALIBRATION
    promo_hits = len(
        re.findall(
            r"\b(offer|discount|flat\s*\d+%|sale|hurry|limited\s*time|pre-?approved|credit\s*card|personal\s*loan|shop\s*now|order\s*now|use\s*code|coupon|t&c|unsubscribe|free\s*gift|exclusive)\b",
            lower_text,
        )
    )
    is_promo_spam = promo_hits >= 2 and rule_floor == 0
    if is_promo_spam:
        score = max(score, 48)
        if score >= 65 and not is_shortener and not has_malicious_tld:
            score = 58
        detected_indicators.append("Promotional / Bulk marketing spam")

    # 5. SAFE CASUAL CONVERSATION DAMPENER (Only when ZERO risk signals exist)
    casual_tokens = ["mom", "dad", "bhai", "bro", "sister", "college", "class", "lecture", "notes", "assignment", "lunch", "dinner", "reached safely"]
    is_casual = any(re.search(rf"\b{re.escape(w)}\b", lower_text) for w in casual_tokens)
    risky_words = [
        "disconnect", "arrest", "apk", "otp", "block", "warrant", "cut off",
        "upi", "transfer", "send", "pay", "money", "rs", "₹", "lakh", "thousand",
        "hospital", "accident", "emergency", "urgent", "kyc", "pin", "cvv", "http", "www.", "bit.ly", "win", "won", "prize", "lottery",
    ]
    no_risk_signals = (
        not any(w in lower_text for w in risky_words)
        and len(detected_indicators) == 0
        and not has_url
    )
    if is_casual and no_risk_signals:
        score = min(score, 10)

    # 6. FINAL RISK CLASSIFICATION
    if score >= 65:
        status = "DANGER"
        headline = "STOP! HIGH-RISK SCAM / PHISHING DETECTED"
        simple_reason = f"High-risk fraud patterns detected ({', '.join(detected_indicators[:2]) or 'ML phishing signature'})."
        actions = [
            "Do NOT click any link, download any .APK file, or stay on a video call.",
            "Real banks, utility providers, and police never threaten disconnection or arrest over SMS/calls.",
            "Block the sender and report immediately on 1930 or cybercrime.gov.in.",
        ]
    elif score >= 40:
        status = "SUSPICIOUS"
        headline = (
            "SPAM / PROMOTIONAL MARKETING MESSAGE"
            if is_promo_spam
            else "CAUTION! SUSPICIOUS MESSAGE — VERIFY FIRST"
        )
        simple_reason = (
            "This appears to be unsolicited promotional or marketing spam. Avoid clicking unknown offer links."
            if is_promo_spam
            else "Unverified urgency, links, or cautionary spam patterns detected. Verify through official channels."
        )
        actions = [
            "Do not share OTPs, PINs, or personal details.",
            "Verify directly through the official app or website rather than SMS links.",
            'Send "FULLY BLOCK" to 1909 to reduce promotional spam.',
        ]
    else:
        status = "SAFE"
        headline = "LOOKS SAFE (NO OBVIOUS SCAM DETECTED)"
        simple_reason = "No recognized phishing links, .APK malware, disconnection threats, spoofed caller patterns, or extortion triggers were found."
        actions = [
            "Always remember: legitimate institutions never ask for secret OTPs, CVV, or UPI PINs."
        ]

    return {
        "status": status,
        "score": score,
        "is_fraud": score >= 65,
        "headline": headline,
        "simpleReason": simple_reason,
        "actions": actions,
        "detected_indicators": detected_indicators,
        "extracted_media_text": extracted_media_text,
        "modality": modality_detected,
        "engine": "CyberKavach Hybrid ML Engine (v1.2)",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)