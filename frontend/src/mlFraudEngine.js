/**
 * CyberKavach Fraud, Phishing, Spam & Telecom Detection Engine (Client-Side)
 * - Passes genuine Indian mobile numbers (6-9 series), landlines, toll-free, and official helplines
 * - Flags spoofed VoIP caller IDs, international scam prefixes, and community-reported numbers
 * - Separates legitimate OTP/bank alerts, promotional spam, and high-risk Indian scams
 */

const OFFICIAL_HELPLINES = {
  '100': 'Police Emergency Helpline',
  '101': 'Fire Emergency Helpline',
  '102': 'Ambulance Helpline',
  '108': 'Emergency Response Helpline',
  '112': 'National Emergency Number (ERSS)',
  '1091': 'Women Helpline',
  '1098': 'Childline India',
  '181': 'Women Emergency Helpline',
  '1909': 'TRAI DND Spam Complaint Helpline',
  '1930': 'National Cyber Crime Helpline'
};

const TELECOM_PREFIX_RULES = [
  {
    prefixes: ['+92', '0092'],
    country: 'Pakistan (+92)',
    score: 98,
    status: 'DANGER',
    headline: 'STOP! HIGH-RISK INTERNATIONAL SCAM NUMBER (+92)',
    reason:
      'Numbers from Pakistan (+92) are heavily used for fake KBC lottery calls, WhatsApp video blackmail, and impersonation scams.'
  },
  {
    prefixes: ['+855', '00855', '+856', '00856'],
    country: 'Cambodia / Laos (+855 / +856)',
    score: 98,
    status: 'DANGER',
    headline: 'STOP! INTERNATIONAL SCAM CALL CENTER NUMBER',
    reason:
      'Numbers from Cambodia (+855) and Laos (+856) are linked to organized cyber scam centers running fake "Digital Arrest", CBI, and FedEx parcel calls.'
  },
  {
    prefixes: ['+84', '0084', '+62', '0062'],
    country: 'Vietnam / Indonesia (+84 / +62)',
    score: 95,
    status: 'DANGER',
    headline: 'DANGER! FOREIGN WHATSAPP SCAM NUMBER',
    reason:
      'Numbers starting with +84 or +62 are widely used for fake WhatsApp part-time jobs, YouTube like tasks, and Telegram prepaid scams.'
  },
  {
    prefixes: ['+234', '00234', '+254', '00254'],
    country: 'Nigeria / Kenya (+234 / +254)',
    score: 96,
    status: 'DANGER',
    headline: 'DANGER! INTERNATIONAL ADVANCE-FEE SCAM NUMBER',
    reason:
      'This foreign prefix is linked to fake customs parcel fees, lottery messages, and WhatsApp gift scams.'
  },
  {
    prefixes: ['140', '+91140', '91140', '0140'],
    isDomesticSeries: true,
    country: 'India Telemarketer (140 Series)',
    score: 62,
    status: 'SUSPICIOUS',
    headline: 'PROMOTIONAL TELEMARKETING CALL (140 SERIES)',
    reason:
      'Numbers starting with 140 are registered commercial telemarketing lines used for loans, credit cards, and promotional offers.'
  },
  {
    prefixes: ['160', '+91160', '91160', '0160'],
    isDomesticSeries: true,
    country: 'Official Service Header (160 Series)',
    score: 12,
    status: 'SAFE',
    headline: 'OFFICIAL BANK / SERVICE CALL SERIES (160)',
    reason:
      '160-series numbers are reserved by TRAI for official banks, financial institutions, and government alerts. Real banks still never ask for your OTP or PIN.'
  }
];

const TOKEN_WEIGHTS = {
  // High-risk financial & KYC scam triggers
  kyc: 2.3,
  suspended: 2.1,
  blocked: 1.9,
  deactivated: 2.1,
  freeze: 1.9,
  pan: 1.3,
  aadhaar: 1.5,
  cvv: 2.6,
  pin: 1.6,
  refund: 1.2,

  // Coercion & Digital Arrest triggers
  arrest: 2.9,
  cbi: 2.8,
  customs: 2.5,
  ncb: 2.6,
  fedex: 2.5,
  trai: 1.8,
  parcel: 1.9,
  drugs: 2.5,
  warrant: 2.9,
  police: 1.6,
  interrogation: 2.4,
  skype: 1.8,

  // Lottery, Job, Crypto & Investment traps
  lottery: 2.8,
  kbc: 3.0,
  jackpot: 2.5,
  won: 1.9,
  prize: 2.1,
  winner: 2.1,
  lakhs: 1.7,
  lakh: 1.5,
  telegram: 2.0,
  prepaid: 2.0,
  commission: 1.8,
  parttime: 1.9,
  crypto: 1.7,
  ipo: 1.4,
  double: 1.6,
  cashback: 1.4,
  scratch: 1.5,
  claim: 1.6,

  // Utility, Malware & Urgency triggers
  electricity: 2.0,
  bijli: 2.2,
  disconnected: 2.4,
  disconnect: 2.2,
  challan: 2.0,
  apk: 3.5,
  anydesk: 3.2,
  teamviewer: 3.0,
  quicksupport: 3.0,
  urgent: 1.5,
  immediately: 1.5,
  expire: 1.6,
  expires: 1.6,
  click: 1.4,

  // Promotional spam words (moderate weight)
  offer: 0.7,
  discount: 0.7,
  sale: 0.6,
  hurry: 0.9,
  limited: 0.7,
  free: 0.9,
  exclusive: 0.7,
  loan: 0.9,
  congratulations: 1.3,
  congrats: 1.2
};

function calculateShannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(2));
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function checkCommunityMatch(digitsOnly, communityComplaints) {
  if (digitsOnly.length < 6 || !Array.isArray(communityComplaints)) return null;
  const targetTail = digitsOnly.slice(-10);
  return communityComplaints.find((c) => {
    const cDigits = (c.scammerNumber || '').replace(/\D/g, '');
    if (cDigits.length < 6) return false;
    const cTail = cDigits.slice(-10);
    return targetTail === cTail || digitsOnly === cDigits;
  });
}

function analyzePhoneNumber(text, compact, digitsOnly) {
  // 1. Official Indian Emergency & Helpline Short Codes
  if (OFFICIAL_HELPLINES[digitsOnly]) {
    return {
      status: 'SAFE',
      score: 5,
      headline: `OFFICIAL INDIAN HELPLINE (${digitsOnly})`,
      simpleReason: `${digitsOnly} is the verified ${OFFICIAL_HELPLINES[digitsOnly]}.`,
      detected_indicators: [OFFICIAL_HELPLINES[digitsOnly]],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'This is an official government/emergency helpline number.',
        'Save 1930 for instant cybercrime financial fraud reporting.'
      ]
    };
  }

  // 2. Known Scam International & TRAI Domestic Prefixes (Strict StartsWith Only)
  for (const rule of TELECOM_PREFIX_RULES) {
    if (rule.prefixes.some((p) => compact.startsWith(p))) {
      return {
        status: rule.status,
        score: rule.score,
        headline: rule.headline,
        simpleReason: rule.reason,
        detected_indicators: [rule.country],
        engine: 'CyberKavach Telecom Prefix Engine',
        actions:
          rule.status === 'SAFE'
            ? [
                'Even on official 160-series calls, never share your OTP, ATM PIN, or UPI PIN.',
                'Verify financial requests directly inside your bank app.'
              ]
            : [
                'Do NOT answer or reply to calls/WhatsApp messages from this number.',
                'Block the number and report it on Chakshu (sancharsaathi.gov.in).',
                'Never share OTPs, UPI PINs, or join Telegram task groups.'
              ]
      };
    }
  }

  // 3. Indian Toll-Free Numbers (1800 / 1860)
  if (/^(?:1800|1860)\d{6,8}$/.test(digitsOnly)) {
    return {
      status: 'SAFE',
      score: 14,
      headline: 'INDIAN TOLL-FREE CUSTOMER CARE FORMAT',
      simpleReason: `"${text}" follows a valid Indian toll-free (1800/1860) number format. Still verify the number on the official company website—not random Google search ads.`,
      detected_indicators: ['Toll-Free 1800/1860 Format'],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'Genuine toll-free customer care never asks you to install AnyDesk/TeamViewer or share OTPs.',
        'Always cross-check support numbers on the official app or back of your bank card.'
      ]
    };
  }

  // 4. Other International Numbers (Starts with + or 00, but NOT +91 / 0091)
  const isForeignFormat =
    (compact.startsWith('+') && !compact.startsWith('+91')) ||
    (compact.startsWith('00') && !compact.startsWith('0091'));

  if (isForeignFormat) {
    return {
      status: 'SUSPICIOUS',
      score: 52,
      headline: 'CAUTION: UNVERIFIED INTERNATIONAL CALLER',
      simpleReason: `"${text}" is a foreign phone number outside India. If you are not expecting a call from family or colleagues abroad, treat it cautiously—scammers frequently use foreign VoIP lines.`,
      detected_indicators: ['Unverified Foreign Prefix'],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'Do not answer unknown international WhatsApp video calls.',
        'Never pay customs fees, lottery charges, or job deposits to foreign callers.',
        'Block the number if you do not recognize the caller.'
      ]
    };
  }

  // 5. Normalize Indian Country / STD Prefix
  let subscriber = digitsOnly;
  let hadIndianPrefix = false;
  if (compact.startsWith('+91') && digitsOnly.length === 12) {
    subscriber = digitsOnly.slice(2);
    hadIndianPrefix = true;
  } else if (compact.startsWith('0091') && digitsOnly.length === 14) {
    subscriber = digitsOnly.slice(4);
    hadIndianPrefix = true;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^[6-9]/.test(digitsOnly.slice(2))) {
    subscriber = digitsOnly.slice(2);
    hadIndianPrefix = true;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0') && /^[6-9]/.test(digitsOnly.slice(1))) {
    subscriber = digitsOnly.slice(1);
    hadIndianPrefix = true;
  }

  // 6. Synthetic / Spoofed Caller ID Detection
  const digitEntropy = calculateShannonEntropy(subscriber);
  const isAllSame = /^(\d)\1+$/.test(subscriber);
  const hasSixRepeated = /(\d)\1{5,}/.test(subscriber); // e.g., 9999990000, 8111111118
  const isAlternatingPair = subscriber.length >= 8 && /^(\d\d)\1{3,}$/.test(subscriber); // e.g., 9898989898
  const isSequential =
    subscriber.length >= 7 &&
    ('01234567890123456'.includes(subscriber) ||
      '98765432109876543'.includes(subscriber) ||
      '1234567890'.includes(subscriber));

  if (isAllSame || hasSixRepeated || isSequential || (subscriber.length >= 7 && digitEntropy < 1.35)) {
    return {
      status: 'DANGER',
      score: 96,
      headline: 'STOP! FAKE / SPOOFED SPAM CALLER ID DETECTED',
      simpleReason: `"${text}" uses a repetitive, sequential, or computer-generated caller ID pattern (Entropy: ${digitEntropy}). Real telecom subscribers are not assigned synthetic numbers like this.`,
      detected_indicators: [`Synthetic Pattern (Entropy ${digitEntropy})`, 'VoIP Caller ID Spoofing'],
      engine: 'CyberKavach Entropy Engine',
      actions: [
        'Do NOT trust or answer calls from this spoofed caller ID.',
        'Never share OTPs, bank details, or click any link sent by this caller.',
        'Block immediately and report on 1930 or sancharsaathi.gov.in.'
      ]
    };
  }

  // 7. Indian Landline Format (e.g., 040-23456789, 022-26543210, 080-41234567 -> 10-11 digits starting with 0)
  if (!hadIndianPrefix && /^0[1-8]\d{8,9}$/.test(digitsOnly)) {
    return {
      status: 'SAFE',
      score: 18,
      headline: 'VALID INDIAN LANDLINE FORMAT — NO COMPLAINTS FOUND',
      simpleReason: `"${text}" matches a standard Indian STD landline number format with no spam complaints or spoofing signatures found.`,
      detected_indicators: ['Valid STD Landline Format', '0 Citizen Complaints'],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'Always verify institutional calls by checking the official website.',
        'Never share OTPs or banking passwords over any landline call.'
      ]
    };
  }

  // 8. Abnormal Length Check (Not 10-digit Indian mobile)
  if (subscriber.length !== 10) {
    return {
      status: 'DANGER',
      score: 88,
      headline: 'DANGER! INVALID / ROGUE VOIP CALLER ID',
      simpleReason: `Standard Indian mobile numbers have 10 digits. "${text}" has an abnormal length (${subscriber.length} digits), commonly seen in internet robocallers and spoofed VoIP gateways.`,
      detected_indicators: [`Abnormal Length (${subscriber.length} digits)`],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'Disconnect immediately—this is not a valid Indian mobile number.',
        'Do NOT call back unknown abnormal-length numbers.',
        'Block this caller ID on your phone.'
      ]
    };
  }

  // 9. Invalid Mobile Starting Digit (Indian mobiles must start with 6, 7, 8, or 9)
  if (!/^[6-9]\d{9}$/.test(subscriber)) {
    return {
      status: 'DANGER',
      score: 89,
      headline: 'STOP! INVALID MOBILE SERIES / SPOOFED LINE',
      simpleReason: `Valid Indian mobile numbers always start with 6, 7, 8, or 9. "${text}" starts with "${subscriber[0]}", which indicates an automated spam dialer or spoofed VoIP line.`,
      detected_indicators: [`Invalid Starting Digit (${subscriber[0]})`],
      engine: 'CyberKavach Telecom Intelligence',
      actions: [
        'Do NOT share personal or banking details with this caller.',
        'Send "FULLY BLOCK" to 1909 to reduce spam calls.',
        'Block and report if they impersonate a bank or police.'
      ]
    };
  }

  // 10. Low-Entropy Virtual / Bulk Telemarketer Pattern (e.g., 9898989898 or 9000900090)
  if (digitEntropy < 1.85 || isAlternatingPair) {
    return {
      status: 'SUSPICIOUS',
      score: 56,
      headline: 'CAUTION: VIRTUAL / BULK TELEMARKETING PATTERN',
      simpleReason: `"${text}" has a highly repetitive digit pattern often used by virtual VoIP dialers or commercial call centers. Verify who is calling before sharing any info.`,
      detected_indicators: [`Low Digit Entropy (${digitEntropy})`],
      engine: 'CyberKavach Entropy Engine',
      actions: [
        'Real banks and police never ask for OTP, KYC updates, or money on a call.',
        'If they create panic or urgency, hang up and dial the official number.'
      ]
    };
  }

  // 11. Valid 10-Digit Indian Mobile Number (Passes real numbers cleanly, including 9000123456, 9876140321, etc.)
  return {
    status: 'SAFE',
    score: 14,
    headline: 'VALID 10-DIGIT INDIAN MOBILE FORMAT — NO COMPLAINTS FOUND',
    simpleReason: `"${text}" matches a genuine 10-digit Indian mobile number format (6–9 series, natural entropy: ${digitEntropy}) with zero spoofing signatures or citizen fraud complaints.`,
    detected_indicators: ['Valid 10-Digit Mobile Format', '0 Citizen Complaints'],
    engine: 'CyberKavach Telecom Intelligence',
    actions: [
      'Format validity cannot guarantee caller identity—scammers can still use normal SIM cards.',
      'Never share your bank OTP, CVV, or UPI PIN with anyone.',
      'Paste any SMS or WhatsApp message they sent to scan its actual content.'
    ]
  };
}

export function predictFraudWithML(rawText = '', file = null, communityComplaints = []) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const compact = text.replace(/[\s\-().]/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  const fileName = file ? file.name.toLowerCase() : '';

  // 0. CHECK CITIZEN COMMUNITY COMPLAINTS DATABASE FIRST
  const reportedMatch = checkCommunityMatch(digitsOnly, communityComplaints);
  if (reportedMatch) {
    return {
      status: 'DANGER',
      score: 97,
      headline: 'STOP! NUMBER REPORTED BY CITIZENS FOR FRAUD!',
      simpleReason: `This number matches a citizen complaint registered under "${reportedMatch.category}" (${reportedMatch.title}). Do not trust this caller!`,
      detected_indicators: ['Matched Citizen Community Scam Ledger'],
      engine: 'CyberKavach Citizen Ledger + Local Engine',
      actions: [
        'Do NOT answer calls or send any money to this reported number.',
        'Block this number immediately on your phone and WhatsApp.',
        'Report it on 1930 or sancharsaathi.gov.in.'
      ]
    };
  }

  // 1. PURE PHONE NUMBER INPUT CHECK (Strictly digits/formatting only — never confuses OTP SMS!)
  const isPurePhoneInput =
    !file && digitsOnly.length >= 3 && /^[+\d][\d\s\-().]*$/.test(text);

  if (isPurePhoneInput) {
    return analyzePhoneNumber(text, compact, digitsOnly);
  }

  // 2. EMBEDDED INTERNATIONAL SCAM PREFIX IN MESSAGE TEXT
  for (const rule of TELECOM_PREFIX_RULES) {
    if (!rule.isDomesticSeries) {
      const hasEmbeddedIntl = rule.prefixes.some((p) => {
        const escaped = p.replace('+', '\\+');
        return new RegExp(`(?:^|[\\s,(])${escaped}\\s?\\d{4,}`).test(text);
      });
      if (hasEmbeddedIntl) {
        return {
          status: rule.status,
          score: rule.score,
          headline: rule.headline,
          simpleReason: rule.reason,
          detected_indicators: [`Embedded ${rule.country} Number`],
          engine: 'CyberKavach Hybrid Engine (Local)',
          actions: [
            'Do NOT call back or reply on WhatsApp to this foreign number.',
            'Block the sender and report on sancharsaathi.gov.in.'
          ]
        };
      }
    }
  }

  // 3. COMPOUND SCAM PATTERN DETECTORS (High-Precision Indian Fraud Rules)
  const detectedIndicators = [];
  let ruleFloorScore = 0;

  const hasUrl = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:ly|xyz|top|apk|tk|ml|cf|click|link|vip|buzz|club|online|site)\b)/i.test(lower);
  const isShortener = /(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|shorturl|is\.gd|ow\.ly|tiny\.cc)/i.test(lower);
  const hasMaliciousTld = /\.(?:xyz|top|tk|ml|cf|click|vip|buzz|club|apk)\b/i.test(lower);

  // A. Malicious APK / Remote Screen-Sharing Malware
  if (lower.includes('.apk') || fileName.endsWith('.apk') || /(download|install)\s+apk|anydesk|teamviewer|quicksupport|rustdesk/.test(lower)) {
    ruleFloorScore = Math.max(ruleFloorScore, 98);
    detectedIndicators.append ? null : detectedIndicators.push('Malicious .APK / Remote Access App');
  }

  // B. Digital Arrest / Law Enforcement / TRAI Impersonation
  if (
    /(cbi|police|customs|ncb|ed\b|trai|telecom department|digital arrest|warrant|supreme court|mumbai crime)/.test(lower) &&
    /(parcel|drugs|illegal|video call|skype|arrest|disconnect|2 hours|press 9|aadhaar|money laundering|secret account)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 96);
    detectedIndicators.push('Digital Arrest / Authority Impersonation');
  }

  // C. Electricity / Utility Disconnection Threat
  if (
    /(electricity|power|bijli|gas|water bill)/.test(lower) &&
    /(disconnect|cut off|cut tonight|tonight|unpaid|previous month|call officer|9:30|8:30|update bill)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 94);
    detectedIndicators.push('Utility Disconnection Extortion Threat');
  }

  // D. Bank KYC / PAN / Account Freeze Phishing
  if (
    /(kyc|pan card|pan\b|aadhaar|yono|sbi|hdfc|icici|axis|bank account|netbanking|debit card|credit card|fastag)/.test(lower) &&
    /(block|blocked|suspend|suspended|freeze|frozen|deactivate|expire|expired|update now|verify now|link pan|share otp|share pin|click)/.test(lower) &&
    !/(do not share|never share|not done by you|if not you)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 93);
    detectedIndicators.push('Bank KYC / Account Suspension Phishing');
  }

  // E. Lottery, KBC, Cashback & UPI QR Collect Traps
  if (
    /(kbc|lottery|lucky draw|jackpot|prize money|won\s*(rs\.?|₹|\$)?\s*\d+|scratch card|cashback|reward points|redeem points)/.test(lower) &&
    /(claim|click|link|whatsapp|upi|pin|qr|fee|processing|expire|redeem|collect|call)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 92);
    detectedIndicators.push('Fake Lottery / Cashback / Reward Trap');
  }

  // F. UPI "Scan QR / Enter PIN to Receive Money" Trap
  if (/(upi pin|scan qr|qr code|collect request)/.test(lower) && /(receive|refund|cashback|credit|get money|advance)/.test(lower)) {
    ruleFloorScore = Math.max(ruleFloorScore, 95);
    detectedIndicators.push('UPI PIN / QR Receive-Money Scam');
  }

  // G. Telegram / WhatsApp Part-Time Job / Task / VIP Stock IPO Scam
  if (
    /(part[\s-]?time|work from home|earn\s*(rs\.?|₹)?\s*\d+|youtube like|google map review|prepaid task|vip stock|ipo allotment|guaranteed profit|daily income|investment group)/.test(lower) &&
    /(telegram|whatsapp|daily|per day|commission|click|join|message|register|profit|200%|300%|salary)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 94);
    detectedIndicators.push('Fake Part-Time Job / Investment Trap');
  }

  // H. Emergency Relative / AI Voice-Clone Impersonation
  if (
    /\b(mom|dad|papa|mummy|bhai|bro|sister|son|daughter|beta)\b/.test(lower) &&
    /(hospital|accident|arrested|police station|emergency|bail|urgent|stuck)/.test(lower) &&
    /(send|transfer|upi|gpay|phonepe|paytm|rs\.?|₹|lakh|thousand|money|account)/.test(lower)
  ) {
    ruleFloorScore = Math.max(ruleFloorScore, 91);
    detectedIndicators.push('Emergency Relative Money-Request Scam');
  }

  // I. Traffic E-Challan Phishing
  if (/(e-?challan|traffic challan|rto|parivahan)/.test(lower) && (hasUrl || /(apk|pay immediately|blacklist|seize)/.test(lower))) {
    ruleFloorScore = Math.max(ruleFloorScore, 92);
    detectedIndicators.push('Fake Traffic E-Challan Phishing');
  }

  // J. Shortened Link + Urgency / Action Phishing
  if ((isShortener || hasMaliciousTld) && /(urgent|verify|update|claim|win|won|free|click|pay|block|expire|reward|loan|bonus)/.test(lower)) {
    ruleFloorScore = Math.max(ruleFloorScore, 84);
    detectedIndicators.push('Suspicious Shortened / High-Risk Link');
  }

  // 4. LEGITIMATE TRANSACTIONAL SMS & CASUAL CHAT GUARD (Prevents False Positives)
  const isLegitTransactional =
    /(do not share|never share|not done by you|if not you|avl bal|available balance|out for delivery|delivered|recharge.*successful|booking confirmed|pnr\s*[:#-]?\s*\d+|valid for \d+ min)/.test(lower) &&
    detectedIndicators.length === 0 &&
    !isShortener &&
    !hasMaliciousTld &&
    !lower.includes('.apk');

  if (isLegitTransactional) {
    return {
      status: 'SAFE',
      score: 10,
      headline: 'LOOKS LIKE A LEGITIMATE TRANSACTIONAL / OTP ALERT',
      simpleReason:
        'This matches standard bank debit, OTP, delivery, or booking alert wording with no phishing links, .APK files, or coercion threats.',
      detected_indicators: ['Standard Transactional Alert Pattern'],
      engine: 'CyberKavach Hybrid Engine (Local)',
      actions: [
        'Never share this OTP with anyone—even if they claim to be from your bank or delivery company.',
        'If you did not initiate this transaction, call your bank’s official helpline or 1930.'
      ]
    };
  }

  // 5. WEIGHTED TOKEN + URL + PROMOTIONAL SPAM SCORING
  let z = -1.6;
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let tokenSum = 0;

  tokens.forEach((tok) => {
    if (TOKEN_WEIGHTS[tok] !== undefined) {
      tokenSum += TOKEN_WEIGHTS[tok];
    }
  });

  z += Math.min(5.0, tokenSum);

  if (isShortener) {
    z += 2.2;
    if (!detectedIndicators.includes('Suspicious Shortened / High-Risk Link')) {
      detectedIndicators.push('Shortened URL detected');
    }
  } else if (hasMaliciousTld) {
    z += 2.0;
    detectedIndicators.push('High-risk domain extension');
  } else if (hasUrl) {
    const urlMatch = lower.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (urlMatch && calculateShannonEntropy(urlMatch[0]) > 4.0) {
      z += 1.2;
    }
  }

  if (file) {
    z += 0.6;
  }

  // Check if it is regular promotional / marketing spam
  const promoHits = (lower.match(/\b(offer|discount|flat\s*\d+%|sale|hurry|limited\s*time|pre-?approved|credit\s*card|personal\s*loan|shop\s*now|order\s*now|use\s*code|coupon|t&c|unsubscribe|free\s*gift|exclusive)\b/g) || []).length;
  const isPromoSpam = promoHits >= 2 && ruleFloorScore === 0;

  let riskScore = Math.max(5, Math.min(99, Math.round(sigmoid(z) * 100)));
  riskScore = Math.max(riskScore, ruleFloorScore);

  if (isPromoSpam) {
    riskScore = Math.max(riskScore, 48);
    if (riskScore >= 65 && !isShortener && !hasMaliciousTld) {
      riskScore = 58; // Keep pure marketing spam in SUSPICIOUS instead of crying wolf as DANGER
    }
    detectedIndicators.push('Promotional / Bulk Marketing Spam');
  }

  // Safe casual family/college chat dampening (ONLY when zero scam/spam indicators exist)
  const isCasualChat = /\b(mom|dad|bhai|bro|sister|college|class|lecture|notes|assignment|lunch|dinner|reached|safely|meeting|tomorrow)\b/.test(lower);
  if (isCasualChat && detectedIndicators.length === 0 && ruleFloorScore === 0 && !hasUrl) {
    riskScore = Math.min(riskScore, 12);
  }

  // 6. FINAL VERDICT CLASSIFICATION
  if (riskScore >= 65) {
    return {
      status: 'DANGER',
      score: riskScore,
      headline: 'STOP! HIGH-RISK SCAM / PHISHING DETECTED!',
      simpleReason: `Dangerous fraud patterns detected (${detectedIndicators.slice(0, 2).join(', ') || 'urgent financial/extortion triggers'}). Do not trust or respond to this message.`,
      detected_indicators: detectedIndicators,
      engine: 'CyberKavach Hybrid Engine (Local)',
      actions: [
        'Do NOT click any link, download any .APK file, or stay on a video call.',
        'Never share your secret OTP, CVV, ATM PIN, or UPI PIN with anyone.',
        'Block the sender immediately and call 1930 if you lost money.'
      ]
    };
  }

  if (riskScore >= 40) {
    return {
      status: 'SUSPICIOUS',
      score: riskScore,
      headline: isPromoSpam
        ? 'SPAM / PROMOTIONAL MARKETING MESSAGE'
        : 'BE CAREFUL! SUSPICIOUS MESSAGE — VERIFY FIRST',
      simpleReason: isPromoSpam
        ? 'This looks like unsolicited promotional or marketing spam. Avoid clicking unknown offer links or sharing personal details.'
        : 'This input contains cautionary signals (such as unverified links, urgency, or unsolicited offers). Verify through official channels first.',
      detected_indicators: detectedIndicators,
      engine: 'CyberKavach Hybrid Engine (Local)',
      actions: [
        'Never scan a QR code or enter your UPI PIN to receive money or cashback.',
        'Do not share OTPs or apply for loans via random SMS/WhatsApp links.',
        'Send "FULLY BLOCK" to 1909 to reduce promotional SMS spam.'
      ]
    };
  }

  return {
    status: 'SAFE',
    score: riskScore,
    headline: 'LOOKS SAFE (NO OBVIOUS SCAM FOUND)',
    simpleReason:
      'No known phishing links, .APK malware, spoofed caller patterns, lottery traps, or urgent extortion threats were found.',
    detected_indicators: detectedIndicators,
    engine: 'CyberKavach Hybrid Engine (Local)',
    actions: [
      'Even on safe-looking messages, never share your secret OTP or UPI PIN.',
      'Verify any sudden money request by calling the person directly on their known number.'
    ]
  };
}