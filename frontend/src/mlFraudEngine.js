/**
 * CyberKavach Fraud, Phishing & Telecom Number Detection Engine
 * - Marks genuine high-entropy 10-digit Indian mobile numbers (6-9 series) as SAFE (Green)
 * - Cross-checks numbers against the Citizen Community Complaint Database
 * - Flags spoofed caller IDs (111-11-1111), virtual low-entropy numbers, and international scam prefixes (+92, +855)
 */

const TOKEN_WEIGHTS = {
  // Financial & KYC triggers
  kyc: 2.4,
  suspended: 2.0,
  blocked: 1.9,
  freeze: 1.85,
  pan: 1.6,
  aadhaar: 1.7,
  otp: 2.2,
  pin: 1.95,
  upi: 1.4,
  refund: 1.5,

  // Coercion & Digital Arrest triggers
  arrest: 2.9,
  digital: 1.4,
  cbi: 2.8,
  customs: 2.45,
  ncb: 2.6,
  fedex: 2.5,
  parcel: 2.15,
  drugs: 2.5,
  warrant: 2.85,
  police: 1.8,
  court: 1.7,
  interrogation: 2.35,
  skype: 1.85,

  // Lottery, Job & Task Scams
  lottery: 2.75,
  kbc: 2.9,
  won: 2.15,
  prize: 2.3,
  winner: 2.2,
  lakhs: 1.9,
  telegram: 2.15,
  task: 1.9,
  prepaid: 2.0,
  commission: 1.95,
  invest: 1.65,
  crypto: 1.75,
  double: 1.8,

  // Utility & Malware triggers
  electricity: 2.25,
  power: 1.55,
  disconnected: 2.35,
  tonight: 1.65,
  apk: 3.3,
  install: 1.5,
  urgent: 1.85,
  immediately: 1.8,
  click: 1.65,

  // Normal conversational words
  mom: -1.6,
  dad: -1.6,
  class: -1.4,
  college: -1.5,
  lecture: -1.5,
  dinner: -1.4,
  lunch: -1.4,
  reached: -1.3,
  safely: -1.4,
  notes: -1.2,
  assignment: -1.3
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
      'Numbers from Cambodia (+855) and Laos (+856) are used by cyber scam call centers for fake "Digital Arrest", CBI, and FedEx parcel calls.'
  },
  {
    prefixes: ['+84', '0084', '+62', '0062'],
    country: 'Vietnam / Indonesia (+84 / +62)',
    score: 95,
    status: 'DANGER',
    headline: 'DANGER! FOREIGN WHATSAPP SCAM NUMBER',
    reason:
      'Numbers starting with +84 or +62 are widely used for fake WhatsApp part-time jobs, YouTube like tasks, and lottery traps.'
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
    prefixes: ['140', '+91140', '0140'],
    country: 'India Telemarketer (140 Series)',
    score: 76,
    status: 'SUSPICIOUS',
    headline: 'SPAM / PROMOTIONAL TELEMARKETING CALL (140 SERIES)',
    reason:
      'Numbers starting with 140 are commercial telemarketing and promotional spam calls. Unsolicited loan and credit card scams often use promotional lines.'
  },
  {
    prefixes: ['160', '+91160', '0160'],
    country: 'Official Service Header (160 Series)',
    score: 12,
    status: 'SAFE',
    headline: 'OFFICIAL SERVICE / BANK CALL SERIES (160)',
    reason:
      '160-series numbers are reserved for official bank and government alerts. Still remember: real banks never ask for your OTP or PIN.'
  }
];

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

export function predictFraudWithML(rawText = '', file = null, communityComplaints = []) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const compact = text.replace(/[\s\-().]/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  const fileName = file ? file.name.toLowerCase() : '';

  // 0. CHECK CITIZEN COMMUNITY COMPLAINTS DATABASE FIRST
  if (digitsOnly.length >= 6 && Array.isArray(communityComplaints)) {
    const reportedMatch = communityComplaints.find((c) => {
      const cDigits = (c.scammerNumber || '').replace(/\D/g, '');
      return cDigits.length >= 6 && (digitsOnly.includes(cDigits) || cDigits.includes(digitsOnly));
    });

    if (reportedMatch) {
      return {
        status: 'DANGER',
        score: 97,
        headline: 'STOP! NUMBER REPORTED BY CITIZENS FOR FRAUD!',
        simpleReason: `This number matches a citizen complaint registered under "${reportedMatch.category}" (${reportedMatch.title}). Do not trust this caller!`,
        actions: [
          'Do NOT answer calls or send any money to this reported number.',
          'Block this number immediately on your phone and WhatsApp.',
          'Report it on 1930 or sancharsaathi.gov.in.'
        ]
      };
    }
  }

  // 1. CHECK KNOWN INTERNATIONAL & DOMESTIC PREFIXES
  for (const rule of TELECOM_PREFIX_RULES) {
    const matched = rule.prefixes.some((p) => compact.startsWith(p) || compact.includes(p));
    if (matched) {
      return {
        status: rule.status,
        score: rule.score,
        headline: rule.headline,
        simpleReason: rule.reason,
        actions:
          rule.status === 'SAFE'
            ? [
                'Still, never share your secret OTP, ATM PIN, or UPI PIN on any call.',
                'Verify any financial request directly inside your official bank app.',
                'Report any impersonation on 1930.'
              ]
            : [
                'Do NOT answer calls or reply to messages from this number.',
                'Block this number immediately and report it on Chakshu (sancharsaathi.gov.in).',
                'Never share your OTP, UPI PIN, or join unknown WhatsApp/Telegram groups.'
              ]
      };
    }
  }

  // 2. DEEP PHONE NUMBER & CALLER ID SPOOFING CHECK
  const looksLikePhoneInput =
    digitsOnly.length >= 5 && digitsOnly.length / Math.max(1, compact.length) >= 0.7;

  if (looksLikePhoneInput) {
    let subscriber = digitsOnly;
    if (subscriber.length === 12 && subscriber.startsWith('91')) {
      subscriber = subscriber.slice(2);
    } else if (subscriber.length === 11 && subscriber.startsWith('0')) {
      subscriber = subscriber.slice(1);
    }

    const digitEntropy = calculateShannonEntropy(subscriber);
    const hasRepeatedRun = /(\d)\1{3,}/.test(subscriber); // 4+ identical digits in a row (e.g. 1111, 9999)
    const isAlternatingPair = /^(\d\d)\1{3,}/.test(subscriber); // e.g., 9898989898
    const isSequential =
      '0123456789012345'.includes(subscriber) ||
      '9876543210987654'.includes(subscriber) ||
      '1234567890'.includes(subscriber);

    // Case A: Fake / Dummy / Repeated-Digit Spoofed Caller ID (e.g. 111-11-1111, 0000000000, 1234567890)
    if (digitEntropy < 1.85 || hasRepeatedRun || isSequential) {
      return {
        status: 'DANGER',
        score: 96,
        headline: 'STOP! FAKE / SPOOFED SPAM CALLER ID DETECTED',
        simpleReason: `The number "${text}" uses a fake, repetitive, or computer-generated caller ID pattern. Scammers use internet VoIP spoofing to display fake numbers like this.`,
        actions: [
          'Do NOT trust or answer calls from this spoofed number.',
          'Never share your OTP, bank details, or click any link sent by this caller.',
          'Block the number immediately and report it on 1930 or sancharsaathi.gov.in.'
        ]
      };
    }

    // Case B: Invalid subscriber length (not 10 digits)
    if (subscriber.length !== 10) {
      return {
        status: 'DANGER',
        score: 91,
        headline: 'DANGER! INVALID / ROGUE VOIP SPAM NUMBER',
        simpleReason: `Real mobile numbers have 10 digits. "${text}" has an abnormal number length (${subscriber.length} digits) used by internet robocallers and VoIP scam gateways.`,
        actions: [
          'Disconnect immediately—this is not a genuine mobile subscriber number.',
          'Do NOT call back unknown short or international numbers.',
          'Block this caller ID on your phone.'
        ]
      };
    }

    // Case C: 10-digit number starting with invalid mobile digit (0, 1, 2, 3, 4, 5)
    if (!/^[6-9]\d{9}$/.test(subscriber)) {
      return {
        status: 'DANGER',
        score: 89,
        headline: 'STOP! SUSPICIOUS TELEMARKETER / SPOOFED NUMBER',
        simpleReason: `Valid Indian mobile numbers always start with 6, 7, 8, or 9. "${text}" starts with "${subscriber[0]}", which is used by automated spam dialers or spoofed VoIP lines.`,
        actions: [
          'Do NOT share any personal or banking information with this caller.',
          'Send "FULLY BLOCK" to 1909 to block commercial spam calls.',
          'Block and report the number if they claim to be from a bank or police.'
        ]
      };
    }

    // Case D: Low-to-moderate entropy virtual/vanity number (e.g. 9898989898 or 9000900090)
    if (digitEntropy < 2.25 || isAlternatingPair) {
      return {
        status: 'SUSPICIOUS',
        score: 58,
        headline: 'CAUTION: VIRTUAL / BULK TELEMARKETING PATTERN',
        simpleReason: `"${text}" has a repetitive digit pattern often used by virtual VoIP dialers or commercial call centers. Verify who is calling before sharing any info.`,
        actions: [
          'Real banks and police never ask for OTP, KYC updates, or money over a phone call.',
          'If they create panic or urgency, hang up and dial the official number.',
          'Never enter your UPI PIN to receive money.'
        ]
      };
    }

    // Case E: GENUINE 10-DIGIT INDIAN MOBILE NUMBER (Starts with 6-9, healthy natural entropy >= 2.25, zero complaints)
    return {
      status: 'SAFE',
      score: 14,
      headline: 'VALID 10-DIGIT INDIAN MOBILE NUMBER (LOOKS SAFE)',
      simpleReason: `"${text}" follows a genuine 10-digit Indian mobile number format with no spam complaints or spoofing signatures found.`,
      actions: [
        'This number format is genuine, but remember: never share your bank OTP or UPI PIN with anyone.',
        'If an unknown person on this number claims to be Police/CBI or asks for KYC, do not trust them.',
        'You can also paste the SMS or message they sent to check its content.'
      ]
    };
  }

  // 3. TEXT, LINK & MEDIA SCORING
  let z = -1.4;
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let tokenScoreSum = 0;

  tokens.forEach((tok) => {
    if (TOKEN_WEIGHTS[tok] !== undefined) {
      tokenScoreSum += TOKEN_WEIGHTS[tok];
    }
  });

  z += Math.max(-2.5, Math.min(4.8, tokenScoreSum));

  const urlMatch = lower.match(
    /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:ly|xyz|top|apk|tk|ml|cf|click|link|in\/[^\s]+))/i
  );
  if (urlMatch) {
    const urlStr = urlMatch[0];
    const urlEntropy = calculateShannonEntropy(urlStr);
    const isShortener = /(bit\.ly|tinyurl|t\.co|cutt\.ly|rb\.gy|shorturl)/i.test(urlStr);

    if (isShortener) {
      z += 2.4;
    } else if (urlEntropy > 3.8) {
      z += 1.7;
    }
  }

  if (lower.includes('.apk') || fileName.endsWith('.apk')) {
    z += 3.6;
  }

  if (file) {
    z += 0.9;
  }

  const probability = sigmoid(z);
  const riskScore = Math.max(5, Math.min(99, Math.round(probability * 100)));

  if (riskScore >= 65) {
    return {
      status: 'DANGER',
      score: riskScore,
      headline: 'STOP! THIS IS A SCAM / FRAUD!',
      simpleReason:
        'This message uses dangerous scam patterns (such as fake urgency, suspicious links, .APK apps, fake police threats, or lottery claims) to steal your money.',
      actions: [
        'Do NOT click any link, download any file, or stay on a video call.',
        'Never share your secret OTP, ATM PIN, or UPI PIN with anyone.',
        'Block the sender immediately and call 1930 if you lost money.'
      ]
    };
  }

  if (riskScore >= 40) {
    return {
      status: 'SUSPICIOUS',
      score: riskScore,
      headline: 'BE CAREFUL! VERIFY BEFORE TRUSTING',
      simpleReason:
        'This input contains unusual or cautionary signs. Please verify carefully before clicking anything or sending money.',
      actions: [
        'Never scan a QR code or enter your UPI PIN to receive money.',
        'Do not share personal banking details or OTPs.',
        'Call your bank or family member directly on their real number to confirm.'
      ]
    };
  }

  return {
    status: 'SAFE',
    score: riskScore,
    headline: 'LOOKS SAFE (NO OBVIOUS SCAM FOUND)',
    simpleReason:
      'We did not find known scam links, spoofed caller numbers, fake lottery traps, or urgent OTP threats in this message.',
    actions: [
      'Even on safe calls or messages, never share your secret OTP or UPI PIN.',
      'Verify any sudden money request by calling the person directly.',
      'Keep DND active via 1909 to reduce promotional telemarketing.'
    ]
  };
}