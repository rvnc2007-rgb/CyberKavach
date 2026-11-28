// src/translations.js

export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    speechLang: 'en-IN'
  },
  hi: {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिन्दी',
    speechLang: 'hi-IN'
  },
  bn: {
    code: 'bn',
    label: 'Bengali',
    nativeName: 'বাংলা',
    speechLang: 'bn-IN'
  },
  mr: {
    code: 'mr',
    label: 'Marathi',
    nativeName: 'मराठी',
    speechLang: 'mr-IN'
  },
  te: {
    code: 'te',
    label: 'Telugu',
    nativeName: 'తెలుగు',
    speechLang: 'te-IN'
  }
};

// Map Indian State / UT names to regional language codes
const STATE_TO_LANG = {
  telangana: 'te',
  'andhra pradesh': 'te',
  maharashtra: 'mr',
  goa: 'mr',
  'west bengal': 'bn',
  tripura: 'bn',
  delhi: 'hi',
  'national capital territory of delhi': 'hi',
  'uttar pradesh': 'hi',
  'madhya pradesh': 'hi',
  bihar: 'hi',
  rajasthan: 'hi',
  haryana: 'hi',
  uttarakhand: 'hi',
  'himachal pradesh': 'hi',
  jharkhand: 'hi',
  chhattisgarh: 'hi',
  chandigarh: 'hi'
};

// Offline coordinate fallback when reverse-geocode API is unreachable
function detectLangFromCoords(lat, lon) {
  if (lat >= 12.6 && lat <= 19.9 && lon >= 77.0 && lon <= 84.8) {
    return { lang: 'te', region: 'Telangana / Andhra Pradesh' };
  }
  if (lat >= 21.5 && lat <= 27.2 && lon >= 85.8 && lon <= 89.9) {
    return { lang: 'bn', region: 'West Bengal' };
  }
  if (lat >= 15.6 && lat <= 22.0 && lon >= 72.6 && lon <= 80.9) {
    return { lang: 'mr', region: 'Maharashtra' };
  }
  if (lat >= 22.0 && lat <= 32.5 && lon >= 73.0 && lon <= 85.8) {
    return { lang: 'hi', region: 'North / Central India' };
  }
  return { lang: 'en', region: 'India' };
}

/**
 * Automatically resolves user's state and regional language from browser geolocation.
 * Returns { lang, region, status: 'granted' | 'denied' | 'unavailable' }
 */
export function detectLanguageByLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ lang: 'en', region: null, status: 'unavailable' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok) {
            const data = await res.json();
            const stateRaw = (data.principalSubdivision || '').trim();
            const matchedLang = STATE_TO_LANG[stateRaw.toLowerCase()];
            resolve({
              lang: matchedLang || 'en',
              region: stateRaw || null,
              status: 'granted'
            });
            return;
          }
        } catch {
          // Fall through to offline coordinate mapping
        }

        const offline = detectLangFromCoords(latitude, longitude);
        resolve({
          lang: offline.lang,
          region: offline.region,
          status: 'granted'
        });
      },
      (err) => {
        // err.code === 1 -> PERMISSION_DENIED
        resolve({
          lang: 'en',
          region: null,
          status: err && err.code === 1 ? 'denied' : 'unavailable'
        });
      },
      { timeout: 7000, maximumAge: 300000 }
    );
  });
}

// =========================================================================
// DYNAMIC CACHED TRANSLATION ENGINE (For user reports, AI chat, analytics)
// =========================================================================
const memoryCache = new Map();
const pendingRequests = new Map();
const SESSION_CACHE_PREFIX = 'ck_tr_v1_';

export function getCachedTranslation(text, targetLang) {
  if (!text) return '';
  if (targetLang === 'en' && !/[\u0900-\u0D7F]/.test(text)) {
    return text;
  }
  const key = `${targetLang}::${text}`;
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const stored = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (stored) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text || '';
  if (targetLang === 'en' && !/[\u0900-\u0D7F]/.test(text)) {
    return text;
  }

  const cached = getCachedTranslation(text, targetLang);
  if (cached) return cached;

  const key = `${targetLang}::${text}`;
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const reqPromise = (async () => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Translation service unavailable');
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((segment) => (Array.isArray(segment) ? segment[0] : ''))
          .join('');
        if (translated) {
          memoryCache.set(key, translated);
          try {
            sessionStorage.setItem(SESSION_CACHE_PREFIX + key, translated);
          } catch {
            // ignore quota limits
          }
          return translated;
        }
      }
    } catch {
      // Offline or blocked -> gracefully return original text
    } finally {
      pendingRequests.delete(key);
    }
    return text;
  })();

  pendingRequests.set(key, reqPromise);
  return reqPromise;
}

// =========================================================================
// INSTANT LOCALIZED DICTIONARIES (Months, Categories, UI & Modal Forms)
// =========================================================================
export const MONTH_NAMES_BY_LANG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  mr: ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'],
  te: ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్']
};

export const CATEGORY_LABELS_BY_LANG = {
  en: {
    'Fake Traffic E-Challan & RTO APK Scam': 'Fake Traffic E-Challan & RTO APK Scam',
    'Fake Stock IPO & VIP Trading Group Scam': 'Fake Stock IPO & VIP Trading Group Scam',
    'Fake "Digital Arrest" CBI / FedEx Video Call': 'Fake "Digital Arrest" CBI / FedEx Video Call',
    'Telegram Part-Time YouTube Like / Task Scam': 'Telegram Part-Time YouTube Like / Task Scam',
    'UPI QR Code / Fake Bank KYC Call Scam': 'UPI QR Code / Fake Bank KYC Call Scam',
    'AI Voice Clone Emergency Relative Call': 'AI Voice Clone Emergency Relative Call'
  },
  hi: {
    'Fake Traffic E-Challan & RTO APK Scam': 'फर्जी ट्रैफिक ई-चालान और RTO APK स्कैम',
    'Fake Stock IPO & VIP Trading Group Scam': 'फर्जी स्टॉक IPO और VIP ट्रेडिंग ग्रुप स्कैम',
    'Fake "Digital Arrest" CBI / FedEx Video Call': 'फर्जी "डिजिटल अरेस्ट" CBI / FedEx वीडियो कॉल',
    'Telegram Part-Time YouTube Like / Task Scam': 'टेलीग्राम पार्ट-टाइम YouTube लाइक / टास्क स्कैम',
    'UPI QR Code / Fake Bank KYC Call Scam': 'UPI QR कोड / फर्जी बैंक KYC कॉल स्कैम',
    'AI Voice Clone Emergency Relative Call': 'AI वॉइस क्लोन रिश्तेदार इमरजेंसी कॉल स्कैम'
  },
  bn: {
    'Fake Traffic E-Challan & RTO APK Scam': 'ভুয়ো ট্রাফিক ই-চালান ও RTO APK স্ক্যাম',
    'Fake Stock IPO & VIP Trading Group Scam': 'ভুয়ো স্টক IPO ও VIP ট্রেডিং গ্রুপ স্ক্যাম',
    'Fake "Digital Arrest" CBI / FedEx Video Call': 'ভুয়ো "ডিজিটাল অ্যারেস্ট" CBI / FedEx ভিডিও কল',
    'Telegram Part-Time YouTube Like / Task Scam': 'টেলিগ্রাম পার্ট-টাইম YouTube লাইক / টাস্ক স্ক্যাম',
    'UPI QR Code / Fake Bank KYC Call Scam': 'UPI QR কোড / ভুয়ো ব্যাংক KYC কল স্ক্যাম',
    'AI Voice Clone Emergency Relative Call': 'AI ভয়েস ক্লোন জরুরি আত্মীয় কল স্ক্যাম'
  },
  mr: {
    'Fake Traffic E-Challan & RTO APK Scam': 'बनावट ट्रॅफिक ई-चलान आणि RTO APK स्कॅम',
    'Fake Stock IPO & VIP Trading Group Scam': 'बनावट स्टॉक IPO आणि VIP ट्रेडिंग ग्रुप स्कॅम',
    'Fake "Digital Arrest" CBI / FedEx Video Call': 'बनावट "डिजिटल अरेस्ट" CBI / FedEx व्हिडिओ कॉल',
    'Telegram Part-Time YouTube Like / Task Scam': 'टेलिग्राम पार्ट-टाइम YouTube लाईक / टास्क स्कॅम',
    'UPI QR Code / Fake Bank KYC Call Scam': 'UPI QR कोड / बनावट बँक KYC कॉल स्कॅम',
    'AI Voice Clone Emergency Relative Call': 'AI व्हॉइस क्लोन नातेवाईक इमर्जन्सी कॉल स्कॅम'
  },
  te: {
    'Fake Traffic E-Challan & RTO APK Scam': 'నకిలీ ట్రాఫిక్ ఈ-చలాన్ & RTO APK స్కామ్',
    'Fake Stock IPO & VIP Trading Group Scam': 'నకిలీ స్టాక్ IPO & VIP ట్రేడింగ్ గ్రూప్ స్కామ్',
    'Fake "Digital Arrest" CBI / FedEx Video Call': 'నకిలీ "డిజిటల్ అరెస్ట్" CBI / FedEx వీడియో కాల్',
    'Telegram Part-Time YouTube Like / Task Scam': 'టెలిగ్రామ్ పార్ట్-టైమ్ YouTube లైక్ / టాస్క్ స్కామ్',
    'UPI QR Code / Fake Bank KYC Call Scam': 'UPI QR కోడ్ / నకిలీ బ్యాంక్ KYC కాల్ స్కామ్',
    'AI Voice Clone Emergency Relative Call': 'AI వాయిస్ క్లోన్ అత్యవసర బంధువుల కాల్ స్కామ్'
  }
};

export const TRANSLATIONS = {
  en: {
    subtitle: 'Public Cyber Fraud, Spam Call & Scam Awareness Portal',
    officialPortalsBtn: 'Official Cyber Help Portals',
    helpline: 'Helpline: 1930',
    detectedBanner: 'Language automatically updated based on your location:',
    locationDeniedBanner:
      'Location access denied. Default language is set to English. You can change the languages if you want.',
    tabChecker: '🔍 Check Scam / Number',
    tabTrending: '🚨 Trending',
    tabAnalytics: '📊 10-Year & Call Data',
    tabCommunity: '📢 Citizen Reports',
    inputLabel: '👇 Enter Suspicious Phone Number, Link, SMS, or Upload Media:',
    trySample: 'Try Sample:',
    sampleValidMobile: '✅ Valid Mobile (9876140321)',
    samplePromoSpam: '⚠️ Promo Spam SMS',
    sampleSpoofed: '🚫 Spoofed Caller (111-11-1111)',
    sampleKycScam: '🚨 Bank KYC Phishing SMS',
    placeholder:
      'Type any mobile number (e.g. 9876140321, +92..., 111-11-1111), paste a suspicious SMS/link, or upload a screenshot/audio...',
    uploadBtn: '+ Screenshot / Call Audio',
    speakBtn: 'Speak',
    listeningBtn: 'Listening...',
    checkNowBtn: 'CHECK NOW',
    checkingBtn: '⏳ Checking...',
    readyToScan: 'Ready to scan',
    riskScoreLabel: 'Scam Risk Score',
    signalsLabel: 'Signals:',
    extractedFromPhoto: '📷 Extracted from Photo:',
    transcribedFromAudio: '🎙️ Transcribed from Audio:',
    statusLabels: {
      DANGER: 'HIGH RISK — SCAM / FRAUD',
      SUSPICIOUS: 'CAUTION — VERIFY FIRST',
      SAFE: 'SAFE / NO SCAM FOUND'
    },
    whatToDoNow: '🛡️ What You Must Do Now:',
    callerGuideTitle: 'Quick Caller ID Guide: Spot International & Spam Numbers Instantly',
    traiAlertBadge: 'TRAI & Cyber Crime Alert',
    originLabel: 'Origin:',
    trendingBannerTitle: 'Live Trending Cyber Scams (Pattern + Citizen Monitored)',
    trendingBannerDesc:
      'When 3 or more citizens report the same scam category in our Community Ledger, our Pattern Monitor automatically promotes it here!',
    reportScamBtn: 'Report a Scam',
    goldenRule: 'Golden Rule:',
    analyticsBadge: '10-Year Cyber Crime & Caller Trend Explorer (2017 – 2026)',
    analyticsTitle: 'Year-Wise Money Lost to Spam Calls, International Callers & SMS',
    analyticsSubtitle:
      'Click any year bar or year button below to inspect that year’s detailed numbers and scam tactics.',
    barGraphTab: 'Year-Wise Fraud Graph',
    callersTab: 'Spam & Intl Callers',
    statTotalLostTitle: 'Estimated Total Lost (10 Yrs)',
    statTotalLostSub: 'Across calls, SMS, UPI & investment scams',
    statCallLostTitle: 'Lost to Scam Phone Calls',
    statCallLostSub: '₹10,160 Cr Domestic + ₹6,665 Cr Intl Callers',
    statSimsTitle: 'Fake SIMs & Numbers Blocked',
    statSimsSub: 'Disconnected via Sanchar Saathi & AI filters',
    statSpoofTitle: 'Intl Spoofed Calls Blocked',
    statSpoofSub: 'Foreign calls pretending to be +91 numbers',
    barGraphHeading: '📊 Interactive 10-Year Fraud Bar Graph (2017 – 2026)',
    barGraphHint: '👆 Click any bar or year button below to see the full breakdown for that year!',
    viewingYear: 'Viewing Year:',
    yearLabel: 'Year',
    dominantCrimeIn: '#1 Dominant Cyber Crime in',
    prevYear: 'Prev Year',
    nextYear: 'Next Year',
    totalMoneyLostIn: 'Total Money Lost in',
    crores: 'Crores',
    increaseFrom: 'increase from',
    complaintsRegistered: 'Complaints Registered',
    reportedVia: 'Reported via 1930 & Cyber Portal',
    spamSimsBlocked: 'Spam SIMs & Numbers Blocked',
    disconnectedBy: 'Disconnected by Telecom & DoT',
    whatHappened: 'What happened:',
    keyWarningSign: 'Key Warning Sign:',
    primaryTarget: 'Primary Target:',
    callerGraphHeading: '📞 Interactive 10-Year Spam & International Call Graph (2017 – 2026)',
    callerGraphHint: 'Compare Domestic Scam Calls (Red) vs. International VoIP Callers (Orange) across years!',
    domesticCallsLegend: 'Domestic Calls',
    intlCallersLegend: 'Intl Callers',
    telecomSplitTitle: 'Telecom Scam Split',
    totalCallFraud: 'Total Call Fraud',
    spoofedBlocked: 'Spoofed Blocked:',
    domesticScamCalls: '🔴 Domestic Scam Calls',
    intlCallersCard: '🟠 International Callers',
    topForeignPrefixes: 'Top Foreign Prefixes:',
    callerTacticLabel: 'Caller Tactic:',
    cumulativeShareHeading: '📌 10-Year Cumulative Fraud Share by Channel',
    analyticsNote:
      'Note: Prototype trend dataset compiled for awareness visualization based on publicly reported I4C/TRAI cybercrime growth trajectories.',
    portalsBadge: 'Web Directory: Indian Cyber & Data Security Portals',
    portalsHeading: 'Official National Cyber Support & Reporting Portals',
    backToChecker: 'Back to Scam Checker',
    filterAudience: 'Filter by Audience:',
    allPortals: 'All Portals',
    tablePortalName: 'Portal Name',
    tableAudience: 'Target Audience',
    tablePurpose: 'When to Approach & Purpose',
    tableWebsite: 'Official Website',
    communityTitle: 'Live Citizen Incident Ledger',
    communitySubPrefix: 'Total community reports recorded:',
    communitySubSuffix: '• Any scammer number reported here is immediately flagged in the Scam Checker.',
    registerExpBtn: '+ Register New Experience',
    selectYear: 'Select Year:',
    noReportsForYear: 'No citizen reports recorded for',
    reportsCount: 'Reports',
    byLabel: 'By',
    lostLabel: 'Lost',
    scammerNumTag: '☎️ Scammer Number / ID:',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    confirmDelete: 'Are you sure you want to delete this registered complaint from the database?',
    fabShare: '📢 Share Scam Experience',
    fabChat: '💬 Cyber Crime Investigator',
    chatTitle: 'CyberKavach Case Investigator',
    chatPlaceholder: 'Type your situation here...',
    modalTitleNew: 'Register Citizen Scam Experience',
    modalTitleEdit: 'Edit Scam Experience',
    modalSub: 'Reported numbers immediately trigger alerts in the Scam Checker.',
    labelNameCity: 'Your Name & City (Optional)',
    placeholderNameCity: 'e.g. Ravi T. (Hyderabad)',
    labelIncidentDate: 'Incident Date',
    labelScamCategory: 'Scam Category',
    labelShortHeadline: 'Short Headline *',
    placeholderHeadline: 'e.g. Fake CBI video call from +855 demanding ₹50,000',
    labelWhatHappened: 'What Happened? (Min. 15 characters) *',
    placeholderDesc: 'Describe how the scammer contacted you and what red flags others should watch for...',
    labelScammerNum: 'Scammer Phone / UPI ID',
    placeholderScammerNum: 'e.g. +91 9876543210 or +855...',
    labelAmountLost: 'Amount Lost in ₹ (0 if avoided)',
    labelAttachProof: 'Attach Proof Screenshot (Optional, max 4 MB)',
    btnUploadScreenshot: 'Upload Screenshot',
    btnChangeScreenshot: 'Change Screenshot',
    btnRemove: 'Remove',
    modalSubmitNew: 'Submit Report',
    modalSubmitEdit: 'Save Changes',
    modalCancel: 'Cancel',
    alertEmptyInput: 'Please type/paste a phone number, message, link, or upload a photo/audio file first!',
    alertMissingFields: 'Please enter a title and description of your experience.',
    alertShortDesc: 'Please write a genuine, detailed description (at least 15 characters) so others can understand the scam.'
  },

  hi: {
    subtitle: 'सार्वजनिक साइबर धोखाधड़ी, स्पैम कॉल और स्कैम जागरूकता पोर्टल',
    officialPortalsBtn: 'आधिकारिक साइबर पोर्टल',
    helpline: 'हेल्पलाइन: 1930',
    detectedBanner: 'आपकी लोकेशन के अनुसार भाषा अपने आप अपडेट हो गई है:',
    locationDeniedBanner:
      'लोकेशन की अनुमति नहीं दी गई। डिफ़ॉल्ट भाषा अंग्रेज़ी (English) सेट है। आप चाहें तो ऊपर से भाषा बदल सकते हैं।',
    tabChecker: '🔍 स्कैम / नंबर जांचें',
    tabTrending: '🚨 ट्रेंडिंग स्कैम',
    tabAnalytics: '📊 10-वर्षीय कॉल डेटा',
    tabCommunity: '📢 नागरिक रिपोर्ट',
    inputLabel: '👇 संदिग्ध मोबाइल नंबर, लिंक, SMS दर्ज करें या फ़ोटो/ऑडियो अपलोड करें:',
    trySample: 'उदाहरण जांचें:',
    sampleValidMobile: '✅ सामान्य मोबाइल (9876140321)',
    samplePromoSpam: '⚠️ प्रमोशनल स्पैम SMS',
    sampleSpoofed: '🚫 फर्जी कॉलर ID (111-11-1111)',
    sampleKycScam: '🚨 बैंक KYC फिशिंग SMS',
    placeholder:
      'कोई भी मोबाइल नंबर (जैसे 9876140321, +92..., 111-11-1111) लिखें, संदिग्ध SMS/लिंक पेस्ट करें या रिकॉर्डिंग अपलोड करें...',
    uploadBtn: '+ स्क्रीनशॉट / कॉल ऑडियो',
    speakBtn: 'बोलें',
    listeningBtn: 'सुन रहे हैं...',
    checkNowBtn: 'अभी जांचें',
    checkingBtn: '⏳ जांच हो रही है...',
    readyToScan: 'स्कैन के लिए तैयार',
    riskScoreLabel: 'स्कैम जोखिम स्कोर',
    signalsLabel: 'संकेत:',
    extractedFromPhoto: '📷 फ़ोटो से निकाला गया टेक्स्ट:',
    transcribedFromAudio: '🎙️ ऑडियो से लिखा गया टेक्स्ट:',
    statusLabels: {
      DANGER: 'खतरा — साइबर धोखाधड़ी / स्कैम',
      SUSPICIOUS: 'सावधान — पहले पुष्टि करें',
      SAFE: 'सुरक्षित — कोई स्पष्ट स्कैम नहीं मिला'
    },
    whatToDoNow: '🛡️ अब आपको तुरंत क्या करना चाहिए:',
    callerGuideTitle: 'त्वरित कॉलर ID गाइड: विदेशी और स्पैम नंबर तुरंत पहचानें',
    traiAlertBadge: 'TRAI और साइबर क्राइम अलर्ट',
    originLabel: 'स्रोत देश:',
    trendingBannerTitle: 'लाइव ट्रेंडिंग साइबर स्कैम (नागरिक रिपोर्ट आधारित)',
    trendingBannerDesc:
      'जब 3 या अधिक नागरिक एक ही श्रेणी के स्कैम की रिपोर्ट करते हैं, तो हमारा सिस्टम उसे यहाँ प्रमुख चेतावनी के रूप में दिखाता है।',
    reportScamBtn: 'स्कैम रिपोर्ट करें',
    goldenRule: 'सुनहरा नियम:',
    analyticsBadge: '10-वर्षीय साइबर क्राइम और कॉलर ट्रेंड रिपोर्ट (2017 – 2026)',
    analyticsTitle: 'स्पैम कॉल, विदेशी कॉल और SMS से हर साल हुआ आर्थिक नुकसान',
    analyticsSubtitle:
      'उस वर्ष के विस्तृत आंकड़े और स्कैम के तरीके देखने के लिए नीचे किसी भी वर्ष पर क्लिक करें।',
    barGraphTab: 'वर्ष-वार धोखाधड़ी ग्राफ',
    callersTab: 'स्पैम और विदेशी कॉलर',
    statTotalLostTitle: 'अनुमानित कुल नुकसान (10 वर्ष)',
    statTotalLostSub: 'कॉल, SMS, UPI और निवेश स्कैम मिलाकर',
    statCallLostTitle: 'स्कैम फोन कॉल से नुकसान',
    statCallLostSub: '₹10,160 करोड़ घरेलू + ₹6,665 करोड़ विदेशी कॉल',
    statSimsTitle: 'फर्जी सिम और नंबर ब्लॉक किए गए',
    statSimsSub: 'संचार साथी और AI फ़िल्टर द्वारा बंद किए गए',
    statSpoofTitle: 'विदेशी स्पूफ्ड कॉल ब्लॉक',
    statSpoofSub: '+91 बनकर आने वाली विदेशी कॉल',
    barGraphHeading: '📊 इंटरैक्टिव 10-वर्षीय धोखाधड़ी बार ग्राफ (2017 – 2026)',
    barGraphHint: '👆 उस वर्ष का पूरा विवरण देखने के लिए किसी भी बार या वर्ष बटन पर क्लिक करें!',
    viewingYear: 'चयनित वर्ष:',
    yearLabel: 'वर्ष',
    dominantCrimeIn: '#1 सबसे बड़ा साइबर अपराध —',
    prevYear: 'पिछला वर्ष',
    nextYear: 'अगला वर्ष',
    totalMoneyLostIn: 'कुल आर्थिक नुकसान —',
    crores: 'करोड़',
    increaseFrom: 'वृद्धि (पिछले वर्ष से)',
    complaintsRegistered: 'दर्ज की गई शिकायतें',
    reportedVia: '1930 और साइबर पोर्टल पर रिपोर्ट की गईं',
    spamSimsBlocked: 'स्पैम सिम और नंबर ब्लॉक',
    disconnectedBy: 'टेलीकॉम और DoT द्वारा बंद',
    whatHappened: 'क्या हुआ था:',
    keyWarningSign: 'मुख्य चेतावनी संकेत:',
    primaryTarget: 'मुख्य शिकार:',
    callerGraphHeading: '📞 इंटरैक्टिव 10-वर्षीय स्पैम और विदेशी कॉल ग्राफ (2017 – 2026)',
    callerGraphHint: 'घरेलू स्कैम कॉल (लाल) बनाम विदेशी VoIP कॉल (नारंगी) की तुलना करें!',
    domesticCallsLegend: 'घरेलू कॉल',
    intlCallersLegend: 'विदेशी कॉलर',
    telecomSplitTitle: 'टेलीकॉम स्कैम विभाजन',
    totalCallFraud: 'कुल कॉल धोखाधड़ी',
    spoofedBlocked: 'स्पूफ्ड कॉल ब्लॉक:',
    domesticScamCalls: '🔴 घरेलू स्कैम कॉल',
    intlCallersCard: '🟠 विदेशी कॉलर',
    topForeignPrefixes: 'प्रमुख विदेशी कोड:',
    callerTacticLabel: 'स्कैमर का तरीका:',
    cumulativeShareHeading: '📌 माध्यम के अनुसार 10-वर्षीय कुल धोखाधड़ी हिस्सा',
    analyticsNote:
      'नोट: यह जागरूकता विज़ुअलाइज़ेशन प्रोटोटाइप डेटा सार्वजनिक I4C/TRAI साइबर अपराध रुझानों पर आधारित है।',
    portalsBadge: 'वेब निर्देशिका: भारतीय साइबर और डेटा सुरक्षा पोर्टल',
    portalsHeading: 'आधिकारिक राष्ट्रीय साइबर सहायता और रिपोर्टिंग पोर्टल',
    backToChecker: 'स्कैम चेकर पर वापस जाएं',
    filterAudience: 'श्रेणी चुनें:',
    allPortals: 'सभी पोर्टल',
    tablePortalName: 'पोर्टल का नाम',
    tableAudience: 'किसके लिए',
    tablePurpose: 'कब संपर्क करें और उद्देश्य',
    tableWebsite: 'आधिकारिक वेबसाइट',
    communityTitle: 'लाइव नागरिक शिकायत रजिस्टर',
    communitySubPrefix: 'कुल दर्ज नागरिक रिपोर्ट:',
    communitySubSuffix: '• यहाँ रिपोर्ट किया गया कोई भी स्कैमर नंबर तुरंत स्कैम चेकर में फ्लैग हो जाता है।',
    registerExpBtn: '+ नया अनुभव दर्ज करें',
    selectYear: 'वर्ष चुनें:',
    noReportsForYear: 'इस वर्ष के लिए अभी कोई नागरिक रिपोर्ट दर्ज नहीं है:',
    reportsCount: 'रिपोर्ट',
    byLabel: 'द्वारा',
    lostLabel: 'नुकसान',
    scammerNumTag: '☎️ स्कैमर नंबर / ID:',
    editBtn: 'संपादित करें',
    deleteBtn: 'हटाएं',
    confirmDelete: 'क्या आप वाकई इस दर्ज शिकायत को डेटाबेस से हटाना चाहते हैं?',
    fabShare: '📢 स्कैम अनुभव साझा करें',
    fabChat: '💬 साइबर क्राइम जांचकर्ता',
    chatTitle: 'साइबरकवच केस इन्वेस्टिगेटर',
    chatPlaceholder: 'अपनी समस्या यहाँ लिखें...',
    modalTitleNew: 'नागरिक स्कैम अनुभव दर्ज करें',
    modalTitleEdit: 'स्कैम अनुभव संपादित करें',
    modalSub: 'रिपोर्ट किए गए नंबर तुरंत स्कैम चेकर में अलर्ट दिखाते हैं।',
    labelNameCity: 'आपका नाम और शहर (वैकल्पिक)',
    placeholderNameCity: 'जैसे: रवि टी. (हैदराबाद)',
    labelIncidentDate: 'घटना की तारीख',
    labelScamCategory: 'स्कैम की श्रेणी',
    labelShortHeadline: 'संक्षिप्त शीर्षक *',
    placeholderHeadline: 'जैसे: +855 से फर्जी CBI वीडियो कॉल में ₹50,000 की मांग',
    labelWhatHappened: 'क्या हुआ था? (कम से कम 15 अक्षर) *',
    placeholderDesc: 'बताएं कि स्कैमर ने आपसे कैसे संपर्क किया और दूसरों को किन संकेतों से सावधान रहना चाहिए...',
    labelScammerNum: 'स्कैमर का फोन नंबर / UPI ID',
    placeholderScammerNum: 'जैसे: +91 9876543210 या +855...',
    labelAmountLost: 'नुकसान की राशि ₹ में (बच गए हों तो 0)',
    labelAttachProof: 'सबूत का स्क्रीनशॉट जोड़ें (वैकल्पिक, अधिकतम 4 MB)',
    btnUploadScreenshot: 'स्क्रीनशॉट अपलोड करें',
    btnChangeScreenshot: 'स्क्रीनशॉट बदलें',
    btnRemove: 'हटाएं',
    modalSubmitNew: 'रिपोर्ट सबमिट करें',
    modalSubmitEdit: 'बदलाव सहेजें',
    modalCancel: 'रद्द करें',
    alertEmptyInput: 'कृपया पहले कोई फोन नंबर, संदेश, लिंक दर्ज करें या फ़ोटो/ऑडियो अपलोड करें!',
    alertMissingFields: 'कृपया अपने अनुभव का शीर्षक और विवरण दर्ज करें।',
    alertShortDesc: 'कृपया कम से कम 15 अक्षरों में स्पष्ट विवरण लिखें ताकि दूसरे इस स्कैम को समझ सकें।'
  },

  bn: {
    subtitle: 'জনসাধারণের সাইবার প্রতারণা, স্প্যাম কল ও স্ক্যাম সচেতনতা পোর্টাল',
    officialPortalsBtn: 'সরকারি সাইবার পোর্টাল',
    helpline: 'হেল্পলাইন: 1930',
    detectedBanner: 'আপনার অবস্থান অনুযায়ী ভাষা স্বয়ংক্রিয়ভাবে আপডেট হয়েছে:',
    locationDeniedBanner:
      'লোকেশন অনুমতি দেওয়া হয়নি। ডিফল্ট ভাষা ইংরেজি (English) সেট করা হয়েছে। আপনি চাইলে ভাষা পরিবর্তন করতে পারেন।',
    tabChecker: '🔍 স্ক্যাম / নম্বর যাচাই',
    tabTrending: '🚨 ট্রেন্ডিং স্ক্যাম',
    tabAnalytics: '📊 ১০-বছরের কল ডেটা',
    tabCommunity: '📢 নাগরিক রিপোর্ট',
    inputLabel: '👇 সন্দেহজনক মোবাইল নম্বর, লিঙ্ক, SMS লিখুন বা ছবি/অডিও আপলোড করুন:',
    trySample: 'নমুনা যাচাই করুন:',
    sampleValidMobile: '✅ সাধারণ মোবাইল (9876140321)',
    samplePromoSpam: '⚠️ প্রোমোশনাল স্প্যাম SMS',
    sampleSpoofed: '🚫 ভুয়ো কলার ID (111-11-1111)',
    sampleKycScam: '🚨 ব্যাংক KYC ফিশিং SMS',
    placeholder:
      'যেকোনো মোবাইল নম্বর (যেমন 9876140321, +92..., 111-11-1111) লিখুন, সন্দেহজনক SMS/লিঙ্ক পেস্ট করুন বা অডিও আপলোড করুন...',
    uploadBtn: '+ স্ক্রিনশট / কল অডিও',
    speakBtn: 'বলুন',
    listeningBtn: 'শুনছি...',
    checkNowBtn: 'এখনই যাচাই করুন',
    checkingBtn: '⏳ যাচাই হচ্ছে...',
    readyToScan: 'স্ক্যানের জন্য প্রস্তুত',
    riskScoreLabel: 'স্ক্যাম ঝুঁকি স্কোর',
    signalsLabel: 'সংকেত:',
    extractedFromPhoto: '📷 ছবি থেকে প্রাপ্ত লেখা:',
    transcribedFromAudio: '🎙️ অডিও থেকে প্রাপ্ত লেখা:',
    statusLabels: {
      DANGER: 'বিপদ — সাইবার প্রতারণা / স্ক্যাম',
      SUSPICIOUS: 'সাবধান — আগে যাচাই করুন',
      SAFE: 'নিরাপদ — কোনো স্পষ্ট স্ক্যাম পাওয়া যায়নি'
    },
    whatToDoNow: '🛡️ এখনই আপনার কী করা উচিত:',
    callerGuideTitle: 'দ্রুত কলার ID গাইড: বিদেশি ও স্প্যাম নম্বর সহজে চিনুন',
    traiAlertBadge: 'TRAI ও সাইবার ক্রাইম সতর্কতা',
    originLabel: 'উৎস দেশ:',
    trendingBannerTitle: 'লাইভ ট্রেন্ডিং সাইবার স্ক্যাম (নাগরিক রিপোর্ট ভিত্তিক)',
    trendingBannerDesc:
      '৩ জন বা তার বেশি নাগরিক একই ধরনের প্রতারণার রিপোর্ট করলে আমাদের সিস্টেম স্বয়ংক্রিয়ভাবে তা এখানে সতর্কতা হিসেবে দেখায়।',
    reportScamBtn: 'স্ক্যাম রিপোর্ট করুন',
    goldenRule: 'মূল নিয়ম:',
    analyticsBadge: '১০-বছরের সাইবার অপরাধ ও কলার ট্রেন্ড এক্সপ্লোরার (২০১৭ – ২০২৬)',
    analyticsTitle: 'স্প্যাম কল, বিদেশি কল ও SMS প্রতারণায় বছরভিত্তিক ক্ষতির হিসাব',
    analyticsSubtitle:
      'সেই বছরের বিস্তারিত তথ্য ও প্রতারণার কৌশল দেখতে নিচের যেকোনো বছরে ক্লিক করুন।',
    barGraphTab: 'বছরভিত্তিক প্রতারণা গ্রাফ',
    callersTab: 'স্প্যাম ও বিদেশি কলার',
    statTotalLostTitle: 'আনুমানিক মোট ক্ষতি (১০ বছর)',
    statTotalLostSub: 'কল, SMS, UPI ও বিনিয়োগ প্রতারণা জুড়ে',
    statCallLostTitle: 'স্ক্যাম ফোন কলে ক্ষতি',
    statCallLostSub: '₹১০,১৬০ কোটি দেশীয় + ₹৬,৬৬৫ কোটি বিদেশি কল',
    statSimsTitle: 'ভুয়ো সিম ও নম্বর ব্লক করা হয়েছে',
    statSimsSub: 'সঞ্চার সাথী ও AI ফিল্টারের মাধ্যমে বন্ধ',
    statSpoofTitle: 'বিদেশি স্পুফড কল ব্লক',
    statSpoofSub: '+91 সেজে আসা বিদেশি কল',
    barGraphHeading: '📊 ইন্টারঅ্যাক্টিভ ১০-বছরের প্রতারণা বার গ্রাফ (২০১৭ – ২০২৬)',
    barGraphHint: '👆 সেই বছরের পূর্ণ বিবরণ দেখতে যেকোনো বার বা বছর বোতামে ক্লিক করুন!',
    viewingYear: 'নির্বাচিত বছর:',
    yearLabel: 'বছর',
    dominantCrimeIn: '#১ প্রধান সাইবার অপরাধ —',
    prevYear: 'আগের বছর',
    nextYear: 'পরের বছর',
    totalMoneyLostIn: 'মোট আর্থিক ক্ষতি —',
    crores: 'কোটি',
    increaseFrom: 'বৃদ্ধি (আগের বছর থেকে)',
    complaintsRegistered: 'নথিভুক্ত অভিযোগ',
    reportedVia: '১৯৩০ ও সাইবার পোর্টালে রিপোর্ট করা হয়েছে',
    spamSimsBlocked: 'স্প্যাম সিম ও নম্বর ব্লক',
    disconnectedBy: 'টেলিকম ও DoT দ্বারা সংযোগ বিচ্ছিন্ন',
    whatHappened: 'কী ঘটেছিল:',
    keyWarningSign: 'মূল সতর্কতা সংকেত:',
    primaryTarget: 'প্রধান লক্ষ্য:',
    callerGraphHeading: '📞 ইন্টারঅ্যাক্টিভ ১০-বছরের স্প্যাম ও বিদেশি কল গ্রাফ (২০১৭ – ২০২৬)',
    callerGraphHint: 'দেশীয় স্ক্যাম কল (লাল) বনাম বিদেশি VoIP কলার (কমলা) তুলনা করুন!',
    domesticCallsLegend: 'দেশীয় কল',
    intlCallersLegend: 'বিদেশি কলার',
    telecomSplitTitle: 'টেলিকম স্ক্যাম বিভাজন',
    totalCallFraud: 'মোট কল প্রতারণা',
    spoofedBlocked: 'স্পুফড কল ব্লক:',
    domesticScamCalls: '🔴 দেশীয় স্ক্যাম কল',
    intlCallersCard: '🟠 বিদেশি কলার',
    topForeignPrefixes: 'প্রধান বিদেশি কোড:',
    callerTacticLabel: 'প্রতারকদের কৌশল:',
    cumulativeShareHeading: '📌 মাধ্যম অনুযায়ী ১০-বছরের মোট প্রতারণার অংশ',
    analyticsNote:
      'দ্রষ্টব্য: এই সচেতনতামূলক প্রোটোটাইপ ডেটা I4C/TRAI-এর প্রকাশিত সাইবার অপরাধ প্রবণতার ওপর ভিত্তি করে তৈরি।',
    portalsBadge: 'ওয়েব ডিরেক্টরি: ভারতীয় সাইবার ও ডেটা সুরক্ষা পোর্টাল',
    portalsHeading: 'সরকারি জাতীয় সাইবার সহায়তা ও রিপোর্টিং পোর্টাল',
    backToChecker: 'স্ক্যাম চেকারে ফিরে যান',
    filterAudience: 'বিভাগ বাছাই করুন:',
    allPortals: 'সব পোর্টাল',
    tablePortalName: 'পোর্টালের নাম',
    tableAudience: 'যাঁদের জন্য',
    tablePurpose: 'কখন যোগাযোগ করবেন ও উদ্দেশ্য',
    tableWebsite: 'অফিশিয়াল ওয়েবসাইট',
    communityTitle: 'লাইভ নাগরিক অভিযোগ খাতা',
    communitySubPrefix: 'মোট নথিভুক্ত নাগরিক রিপোর্ট:',
    communitySubSuffix: '• এখানে রিপোর্ট করা যেকোনো প্রতারকের নম্বর সঙ্গে সঙ্গে স্ক্যাম চেকারে চিহ্নিত হয়।',
    registerExpBtn: '+ নতুন অভিজ্ঞতা নথিভুক্ত করুন',
    selectYear: 'বছর নির্বাচন করুন:',
    noReportsForYear: 'এই বছরের জন্য এখনো কোনো নাগরিক রিপোর্ট নেই:',
    reportsCount: 'রিপোর্ট',
    byLabel: 'দ্বারা',
    lostLabel: 'ক্ষতি',
    scammerNumTag: '☎️ প্রতারকের নম্বর / ID:',
    editBtn: 'সম্পাদনা',
    deleteBtn: 'মুছুন',
    confirmDelete: 'আপনি কি নিশ্চিত যে এই নথিভুক্ত অভিযোগটি মুছে ফেলতে চান?',
    fabShare: '📢 প্রতারণার অভিজ্ঞতা জানান',
    fabChat: '💬 সাইবার ক্রাইম তদন্তকারী',
    chatTitle: 'সাইবারকবচ কেস ইনভেস্টিগেটর',
    chatPlaceholder: 'আপনার সমস্যা এখানে লিখুন...',
    modalTitleNew: 'নাগরিক প্রতারণার অভিজ্ঞতা নথিভুক্ত করুন',
    modalTitleEdit: 'অভিজ্ঞতা সম্পাদনা করুন',
    modalSub: 'রিপোর্ট করা নম্বরগুলো সাথে সাথেই স্ক্যাম চেকারে সতর্কতা দেখায়।',
    labelNameCity: 'আপনার নাম ও শহর (ঐচ্ছিক)',
    placeholderNameCity: 'যেমন: রবি টি. (কলকাতা)',
    labelIncidentDate: 'ঘটনার তারিখ',
    labelScamCategory: 'প্রতারণার ধরন',
    labelShortHeadline: 'সংক্ষিপ্ত শিরোনাম *',
    placeholderHeadline: 'যেমন: +855 থেকে ভুয়ো CBI ভিডিও কলে ₹৫০,০০০ দাবি',
    labelWhatHappened: 'কী ঘটেছিল? (কমপক্ষে ১৫ অক্ষর) *',
    placeholderDesc: 'প্রতারক কীভাবে আপনার সাথে যোগাযোগ করেছিল এবং অন্যদের কী বিষয়ে সতর্ক থাকা উচিত তা লিখুন...',
    labelScammerNum: 'প্রতারকের ফোন নম্বর / UPI ID',
    placeholderScammerNum: 'যেমন: +91 9876543210 বা +855...',
    labelAmountLost: 'ক্ষতির পরিমাণ ₹-এ (বেঁচে গেলে 0 লিখুন)',
    labelAttachProof: 'প্রমাণ হিসেবে স্ক্রিনশট যোগ করুন (ঐচ্ছিক, সর্বোচ্চ 4 MB)',
    btnUploadScreenshot: 'স্ক্রিনশট আপলোড করুন',
    btnChangeScreenshot: 'স্ক্রিনশট পরিবর্তন করুন',
    btnRemove: 'মুছুন',
    modalSubmitNew: 'রিপোর্ট জমা দিন',
    modalSubmitEdit: 'পরিবর্তন সংরক্ষণ করুন',
    modalCancel: 'বাতিল করুন',
    alertEmptyInput: 'অনুগ্রহ করে প্রথমে একটি ফোন নম্বর, বার্তা, লিঙ্ক লিখুন বা ছবি/অডিও আপলোড করুন!',
    alertMissingFields: 'অনুগ্রহ করে আপনার অভিজ্ঞতার শিরোনাম ও বিবরণ লিখুন।',
    alertShortDesc: 'অনুগ্রহ করে কমপক্ষে ১৫ অক্ষরের স্পষ্ট বিবরণ লিখুন যাতে অন্যরা প্রতারণাটি বুঝতে পারে।'
  },

  mr: {
    subtitle: 'सार्वजनिक सायबर फसवणूक, स्पॅम कॉल आणि स्कॅम जनजागृती पोर्टल',
    officialPortalsBtn: 'अधिकृत सायबर पोर्टल',
    helpline: 'हेल्पलाइन: 1930',
    detectedBanner: 'तुमच्या लोकेशननुसार भाषा आपोआप अपडेट झाली आहे:',
    locationDeniedBanner:
      'लोकेशनची परवानगी नाकारली गेली. डीफॉल्ट भाषा इंग्रजी (English) सेट केली आहे. हवे असल्यास तुम्ही भाषा बदलू शकता.',
    tabChecker: '🔍 स्कॅम / नंबर तपासा',
    tabTrending: '🚨 ट्रेंडिंग स्कॅम',
    tabAnalytics: '📊 १०-वर्षांचा कॉल डेटा',
    tabCommunity: '📢 नागरिक तक्रारी',
    inputLabel: '👇 संशयास्पद मोबाईल नंबर, लिंक, SMS टाका किंवा फोटो/ऑडिओ अपलोड करा:',
    trySample: 'नमुना तपासा:',
    sampleValidMobile: '✅ वैध मोबाईल (9876140321)',
    samplePromoSpam: '⚠️ जाहिरात स्पॅम SMS',
    sampleSpoofed: '🚫 बनावट कॉलर ID (111-11-1111)',
    sampleKycScam: '🚨 बँक KYC फिशिंग SMS',
    placeholder:
      'कोणताही मोबाईल नंबर (उदा. 9876140321, +92..., 111-11-1111) लिहा, संशयास्पद SMS/लिंक पेस्ट करा किंवा रेकॉर्डिंग अपलोड करा...',
    uploadBtn: '+ स्क्रीनशॉट / कॉल ऑडिओ',
    speakBtn: 'बोला',
    listeningBtn: 'ऐकत आहे...',
    checkNowBtn: 'आता तपासा',
    checkingBtn: '⏳ तपासत आहे...',
    readyToScan: 'स्कॅनसाठी तयार',
    riskScoreLabel: 'फसवणुकीचा धोका स्कोर',
    signalsLabel: 'संकेत:',
    extractedFromPhoto: '📷 फोटोमधून काढलेला मजकूर:',
    transcribedFromAudio: '🎙️ ऑडिओमधून लिहिलेला मजकूर:',
    statusLabels: {
      DANGER: 'धोका — सायबर फसवणूक / स्कॅम',
      SUSPICIOUS: 'सावधान — आधी खात्री करा',
      SAFE: 'सुरक्षित — स्पष्ट फसवणूक आढळली नाही'
    },
    whatToDoNow: '🛡️ आता तुम्ही तात्काळ काय करावे:',
    callerGuideTitle: 'त्वरित कॉलर ID मार्गदर्शक: परदेशी आणि स्पॅम नंबर लगेच ओळखा',
    traiAlertBadge: 'TRAI व सायबर क्राइम इशारा',
    originLabel: 'मूळ देश:',
    trendingBannerTitle: 'लाइव्ह ट्रेंडिंग सायबर स्कॅम (नागरिक तक्रारींवर आधारित)',
    trendingBannerDesc:
      'जेव्हा ३ किंवा अधिक नागरिक एकाच प्रकारच्या फसवणुकीची तक्रार करतात, तेव्हा आमची प्रणाली ती येथे तातडीचा इशारा म्हणून दाखवते.',
    reportScamBtn: 'स्कॅम नोंदवा',
    goldenRule: 'सुवर्ण नियम:',
    analyticsBadge: '१०-वर्षांचा सायबर गुन्हे आणि कॉलर ट्रेंड अहवाल (२०१७ – २०२६)',
    analyticsTitle: 'स्पॅम कॉल, परदेशी कॉल आणि SMS मुळे दरवर्षी झालेले आर्थिक नुकसान',
    analyticsSubtitle:
      'त्या वर्षाची सविस्तर आकडेवारी आणि फसवणुकीच्या पद्धती पाहण्यासाठी खालील कोणत्याही वर्षावर क्लिक करा.',
    barGraphTab: 'वर्षनिहाय फसवणूक आलेख',
    callersTab: 'स्पॅम व परदेशी कॉलर',
    statTotalLostTitle: 'अंदाजित एकूण नुकसान (१० वर्षे)',
    statTotalLostSub: 'कॉल, SMS, UPI आणि गुंतवणूक फसवणुकीत',
    statCallLostTitle: 'स्कॅम फोन कॉलमुळे नुकसान',
    statCallLostSub: '₹१०,१६० कोटी देशांतर्गत + ₹६,६६५ कोटी परदेशी कॉल',
    statSimsTitle: 'बनावट सिम व नंबर ब्लॉक केले',
    statSimsSub: 'संचार साथी आणि AI फिल्टरद्वारे बंद केले',
    statSpoofTitle: 'परदेशी स्पूफ्ड कॉल ब्लॉक',
    statSpoofSub: '+91 बनून येणारे परदेशी कॉल',
    barGraphHeading: '📊 इंटरअॅक्टिव्ह १०-वर्षांचा फसवणूक बार आलेख (२०१७ – २०२६)',
    barGraphHint: '👆 त्या वर्षाचा संपूर्ण तपशील पाहण्यासाठी कोणत्याही बार किंवा वर्ष बटनावर क्लिक करा!',
    viewingYear: 'निवडलेले वर्ष:',
    yearLabel: 'वर्ष',
    dominantCrimeIn: '#१ सर्वात मोठा सायबर गुन्हा —',
    prevYear: 'मागील वर्ष',
    nextYear: 'पुढील वर्ष',
    totalMoneyLostIn: 'एकूण आर्थिक नुकसान —',
    crores: 'कोटी',
    increaseFrom: 'वाढ (मागील वर्षापेक्षा)',
    complaintsRegistered: 'नोंदवलेल्या तक्रारी',
    reportedVia: '१९३० आणि सायबर पोर्टलवर नोंदवलेले',
    spamSimsBlocked: 'स्पॅम सिम व नंबर ब्लॉक',
    disconnectedBy: 'टेलिकॉम व DoT द्वारे बंद',
    whatHappened: 'काय घडले होते:',
    keyWarningSign: 'मुख्य धोक्याची खूण:',
    primaryTarget: 'मुख्य लक्ष्य:',
    callerGraphHeading: '📞 इंटरअॅक्टिव्ह १०-वर्षांचा स्पॅम आणि परदेशी कॉल आलेख (२०१७ – २०२६)',
    callerGraphHint: 'देशांतर्गत स्कॅम कॉल (लाल) विरुद्ध परदेशी VoIP कॉलर (केशरी) तुलना करा!',
    domesticCallsLegend: 'देशांतर्गत कॉल',
    intlCallersLegend: 'परदेशी कॉलर',
    telecomSplitTitle: 'टेलिकॉम स्कॅम विभागणी',
    totalCallFraud: 'एकूण कॉल फसवणूक',
    spoofedBlocked: 'स्पूफ्ड कॉल ब्लॉक:',
    domesticScamCalls: '🔴 देशांतर्गत स्कॅम कॉल',
    intlCallersCard: '🟠 परदेशी कॉलर',
    topForeignPrefixes: 'प्रमुख परदेशी कोड:',
    callerTacticLabel: 'फसवणुकीची पद्धत:',
    cumulativeShareHeading: '📌 माध्यमानुसार १०-वर्षांचा एकूण फसवणूक हिस्सा',
    analyticsNote:
      'टीप: हा जनजागृती प्रोटोटाइप डेटा सार्वजनिक I4C/TRAI सायबर गुन्हे वाढीच्या अहवालांवर आधारित आहे.',
    portalsBadge: 'वेब निर्देशिका: भारतीय सायबर आणि डेटा सुरक्षा पोर्टल',
    portalsHeading: 'अधिकृत राष्ट्रीय सायबर मदत आणि तक्रार पोर्टल',
    backToChecker: 'स्कॅम चेकरवर परत जा',
    filterAudience: 'गट निवडा:',
    allPortals: 'सर्व पोर्टल',
    tablePortalName: 'पोर्टलचे नाव',
    tableAudience: 'कोणासाठी',
    tablePurpose: 'कधी संपर्क साधावा आणि उद्देश',
    tableWebsite: 'अधिकृत वेबसाइट',
    communityTitle: 'लाइव्ह नागरिक तक्रार नोंदवही',
    communitySubPrefix: 'एकूण नोंदवलेल्या नागरिक तक्रारी:',
    communitySubSuffix: '• येथे नोंदवलेला कोणताही स्कॅमर नंबर लगेच स्कॅम चेकरमध्ये धोक्याचा म्हणून दिसतो.',
    registerExpBtn: '+ नवीन अनुभव नोंदवा',
    selectYear: 'वर्ष निवडा:',
    noReportsForYear: 'या वर्षासाठी अद्याप कोणतीही नागरिक तक्रार नोंदवलेली नाही:',
    reportsCount: 'तक्रारी',
    byLabel: 'द्वारे',
    lostLabel: 'नुकसान',
    scammerNumTag: '☎️ स्कॅमर नंबर / ID:',
    editBtn: 'संपादित करा',
    deleteBtn: 'काढून टाका',
    confirmDelete: 'तुम्हाला खरोखर ही नोंदवलेली तक्रार डेटाबेसमधून काढायची आहे का?',
    fabShare: '📢 फसवणुकीचा अनुभव सांगा',
    fabChat: '💬 सायबर क्राइम तपासनीस',
    chatTitle: 'सायबरकवच केस इन्व्हेस्टिगेटर',
    chatPlaceholder: 'तुमची समस्या येथे लिहा...',
    modalTitleNew: 'नागरिक फसवणुकीचा अनुभव नोंदवा',
    modalTitleEdit: 'फसवणुकीचा अनुभव संपादित करा',
    modalSub: 'नोंदवलेले नंबर लगेच स्कॅम चेकरमध्ये इशारा दाखवतात.',
    labelNameCity: 'तुमचे नाव आणि शहर (ऐच्छिक)',
    placeholderNameCity: 'उदा. रवी टी. (पुणे)',
    labelIncidentDate: 'घटनेची तारीख',
    labelScamCategory: 'फसवणुकीचा प्रकार',
    labelShortHeadline: 'संक्षिप्त शीर्षक *',
    placeholderHeadline: 'उदा. +855 वरून बनावट CBI व्हिडिओ कॉलद्वारे ₹50,000 ची मागणी',
    labelWhatHappened: 'काय घडले? (किमान 15 अक्षरे) *',
    placeholderDesc: 'फसवणूक करणाऱ्याने तुमच्याशी कसा संपर्क साधला आणि इतरांनी कोणत्या गोष्टींपासून सावध राहावे ते लिहा...',
    labelScammerNum: 'स्कॅमरचा फोन नंबर / UPI ID',
    placeholderScammerNum: 'उदा. +91 9876543210 किंवा +855...',
    labelAmountLost: 'झालेले नुकसान ₹ मध्ये (वाचले असल्यास 0)',
    labelAttachProof: 'पुराव्याचा स्क्रीनशॉट जोडा (ऐच्छिक, कमाल 4 MB)',
    btnUploadScreenshot: 'स्क्रीनशॉट अपलोड करा',
    btnChangeScreenshot: 'स्क्रीनशॉट बदला',
    btnRemove: 'काढा',
    modalSubmitNew: 'तक्रार सबमिट करा',
    modalSubmitEdit: 'बदल जतन करा',
    modalCancel: 'रद्द करा',
    alertEmptyInput: 'कृपया आधी फोन नंबर, संदेश, लिंक टाका किंवा फोटो/ऑडिओ अपलोड करा!',
    alertMissingFields: 'कृपया तुमच्या अनुभवाचे शीर्षक आणि वर्णन लिहा.',
    alertShortDesc: 'कृपया किमान 15 अक्षरांचे स्पष्ट वर्णन लिहा जेणेकरून इतरांना फसवणूक समजेल.'
  },

  te: {
    subtitle: 'ప్రజా సైబర్ మోసాలు, స్పామ్ కాల్స్ & స్కామ్ అవగాహన పోర్టల్',
    officialPortalsBtn: 'అధికారిక సైబర్ పోర్టల్స్',
    helpline: 'హెల్ప్‌లైన్: 1930',
    detectedBanner: 'మీ లొకేషన్ ఆధారంగా భాష ఆటోమేటిక్‌గా అప్‌డేట్ అయింది:',
    locationDeniedBanner:
      'లొకేషన్ అనుమతి నిరాకరించబడింది. డిఫాల్ట్ భాష ఇంగ్లీష్ (English) గా సెట్ చేయబడింది. మీకు కావాలంటే భాషను మార్చుకోవచ్చు.',
    tabChecker: '🔍 స్కామ్ / నంబర్ తనిఖీ',
    tabTrending: '🚨 ట్రెండింగ్ స్కామ్స్',
    tabAnalytics: '📊 10-ఏళ్ల కాల్ డేటా',
    tabCommunity: '📢 పౌర ఫిర్యాదులు',
    inputLabel: '👇 అనుమానాస్పద ఫోన్ నంబర్, లింక్, SMS నమోదు చేయండి లేదా ఫైల్ అప్‌లోడ్ చేయండి:',
    trySample: 'నమూనా పరీక్షించండి:',
    sampleValidMobile: '✅ సాధారణ మొబైల్ (9876140321)',
    samplePromoSpam: '⚠️ ప్రమోషనల్ స్పామ్ SMS',
    sampleSpoofed: '🚫 నకిలీ కాలర్ ID (111-11-1111)',
    sampleKycScam: '🚨 బ్యాంక్ KYC ఫిషింగ్ SMS',
    placeholder:
      'ఏదైనా మొబైల్ నంబర్ (ఉదా. 9876140321, +92..., 111-11-1111) టైప్ చేయండి, అనుమానాస్పద SMS/లింక్ పేస్ట్ చేయండి లేదా ఆడియో అప్‌లోడ్ చేయండి...',
    uploadBtn: '+ స్క్రీన్‌షాట్ / కాల్ ఆడియో',
    speakBtn: 'మాట్లాడండి',
    listeningBtn: 'వింటున్నాను...',
    checkNowBtn: 'ఇప్పుడే తనిఖీ చేయండి',
    checkingBtn: '⏳ తనిఖీ చేస్తోంది...',
    readyToScan: 'స్కాన్ చేయడానికి సిద్ధం',
    riskScoreLabel: 'స్కామ్ రిస్క్ స్కోర్',
    signalsLabel: 'సంకేతాలు:',
    extractedFromPhoto: '📷 ఫోటో నుండి తీసిన టెక్స్ట్:',
    transcribedFromAudio: '🎙️ ఆడియో నుండి రాసిన టెక్స్ట్:',
    statusLabels: {
      DANGER: 'ప్రమాదం — సైబర్ మోసం / స్కామ్',
      SUSPICIOUS: 'జాగ్రత్త — ముందుగా నిర్ధారించుకోండి',
      SAFE: 'సురక్షితం — స్పష్టమైన స్కామ్ కనబడలేదు'
    },
    whatToDoNow: '🛡️ ఇప్పుడు మీరు వెంటనే చేయాల్సినవి:',
    callerGuideTitle: 'కాలర్ ID గైడ్: విదేశీ & స్పామ్ నంబర్లను వెంటనే గుర్తించండి',
    traiAlertBadge: 'TRAI & సైబర్ క్రైమ్ హెచ్చరిక',
    originLabel: 'దేశం:',
    trendingBannerTitle: 'లైవ్ ట్రెండింగ్ సైబర్ స్కామ్స్ (పౌర ఫిర్యాదుల ఆధారితం)',
    trendingBannerDesc:
      '3 లేదా అంతకంటే ఎక్కువ మంది పౌరులు ఒకే రకమైన మోసాన్ని ఫిర్యాదు చేస్తే, మా సిస్టమ్ దాన్ని ఆటోమేటిక్‌గా ఇక్కడ హెచ్చరికగా చూపుతుంది.',
    reportScamBtn: 'స్కామ్ ఫిర్యాదు చేయండి',
    goldenRule: 'ముఖ్య నియమం:',
    analyticsBadge: '10-ఏళ్ల సైబర్ నేరాలు & కాలర్ ట్రెండ్ నివేదిక (2017 – 2026)',
    analyticsTitle: 'స్పామ్ కాల్స్, విదేశీ కాల్స్ & SMS వల్ల సంవత్సరాల వారీగా జరిగిన నష్టం',
    analyticsSubtitle:
      'ఆ సంవత్సరం పూర్తి వివరాలు మరియు మోసగాళ్ల పద్ధతులను చూడటానికి కింద ఉన్న ఏదైనా సంవత్సరాన్ని క్లిక్ చేయండి.',
    barGraphTab: 'సంవత్సరాల వారీ గ్రాఫ్',
    callersTab: 'స్పామ్ & విదేశీ కాలర్లు',
    statTotalLostTitle: 'అంచనా మొత్తం నష్టం (10 ఏళ్లు)',
    statTotalLostSub: 'కాల్స్, SMS, UPI & పెట్టుబడి మోసాలలో',
    statCallLostTitle: 'స్కామ్ ఫోన్ కాల్స్ వల్ల నష్టం',
    statCallLostSub: '₹10,160 కోట్లు దేశీయ + ₹6,665 కోట్లు విదేశీ కాల్స్',
    statSimsTitle: 'నకిలీ సిమ్‌లు & నంబర్లు బ్లాక్',
    statSimsSub: 'సంచార్ సాథీ & AI ఫిల్టర్ల ద్వారా తొలగించబడ్డాయి',
    statSpoofTitle: 'విదేశీ స్పూఫ్డ్ కాల్స్ బ్లాక్',
    statSpoofSub: '+91 లాగా కనిపించే విదేశీ కాల్స్',
    barGraphHeading: '📊 ఇంటరాక్టివ్ 10-ఏళ్ల మోసాల బార్ గ్రాఫ్ (2017 – 2026)',
    barGraphHint: '👆 ఆ సంవత్సరం పూర్తి వివరాలు చూడటానికి ఏదైనా బార్ లేదా సంవత్సరం బటన్‌పై క్లిక్ చేయండి!',
    viewingYear: 'ఎంచుకున్న సంవత్సరం:',
    yearLabel: 'సంవత్సరం',
    dominantCrimeIn: '#1 ప్రధాన సైబర్ నేరం —',
    prevYear: 'మునుపటి ఏడాది',
    nextYear: 'తరువాతి ఏడాది',
    totalMoneyLostIn: 'మొత్తం ఆర్థిక నష్టం —',
    crores: 'కోట్లు',
    increaseFrom: 'పెరుగుదల (మునుపటి ఏడాది కంటే)',
    complaintsRegistered: 'నమోదైన ఫిర్యాదులు',
    reportedVia: '1930 & సైబర్ పోర్టల్ ద్వారా నమోదు',
    spamSimsBlocked: 'స్పామ్ సిమ్‌లు & నంబర్లు బ్లాక్',
    disconnectedBy: 'టెలికాం & DoT ద్వారా నిలిపివేత',
    whatHappened: 'ఏమి జరిగింది:',
    keyWarningSign: 'ప్రధాన హెచ్చరిక సంకేతం:',
    primaryTarget: 'ప్రధాన లక్ష్యం:',
    callerGraphHeading: '📞 ఇంటరాక్టివ్ 10-ఏళ్ల స్పామ్ & విదేశీ కాల్స్ గ్రాఫ్ (2017 – 2026)',
    callerGraphHint: 'దేశీయ స్కామ్ కాల్స్ (ఎరుపు) vs విదేశీ VoIP కాలర్లు (నారింజ) పోల్చి చూడండి!',
    domesticCallsLegend: 'దేశీయ కాల్స్',
    intlCallersLegend: 'విదేశీ కాలర్లు',
    telecomSplitTitle: 'టెలికాం స్కామ్ విభజన',
    totalCallFraud: 'మొత్తం కాల్ మోసం',
    spoofedBlocked: 'స్పూఫ్డ్ బ్లాక్:',
    domesticScamCalls: '🔴 దేశీయ స్కామ్ కాల్స్',
    intlCallersCard: '🟠 విదేశీ కాలర్లు',
    topForeignPrefixes: 'ప్రధాన విదేశీ కోడ్‌లు:',
    callerTacticLabel: 'మోసగాళ్ల పద్ధతి:',
    cumulativeShareHeading: '📌 మాధ్యమం వారీగా 10-ఏళ్ల మొత్తం మోసాల వాటా',
    analyticsNote:
      'గమనిక: ఈ అవగాహన ప్రోటోటైప్ డేటా పబ్లిక్ I4C/TRAI సైబర్ నేరాల గణాంకాల ధోరణుల ఆధారంగా రూపొందించబడింది.',
    portalsBadge: 'వెబ్ డైరెక్టరీ: భారతీయ సైబర్ & డేటా భద్రతా పోర్టల్స్',
    portalsHeading: 'అధికారిక జాతీయ సైబర్ సహాయ & ఫిర్యాదు పోర్టల్స్',
    backToChecker: 'స్కామ్ చెకర్‌కు తిరిగి వెళ్ళండి',
    filterAudience: 'వర్గాన్ని ఎంచుకోండి:',
    allPortals: 'అన్ని పోర్టల్స్',
    tablePortalName: 'పోర్టల్ పేరు',
    tableAudience: 'ఎవరి కోసం',
    tablePurpose: 'ఎప్పుడు సంప్రదించాలి & ఉద్దేశ్యం',
    tableWebsite: 'అధికారిక వెబ్‌సైట్',
    communityTitle: 'లైవ్ పౌర ఫిర్యాదుల రిజిస్టర్',
    communitySubPrefix: 'మొత్తం నమోదైన పౌర ఫిర్యాదులు:',
    communitySubSuffix: '• ఇక్కడ ఫిర్యాదు చేసిన ఏ స్కామర్ నంబర్ అయినా వెంటనే స్కామ్ చెకర్‌లో హెచ్చరికగా చూపబడుతుంది.',
    registerExpBtn: '+ కొత్త అనుభవాన్ని నమోదు చేయండి',
    selectYear: 'సంవత్సరం ఎంచుకోండి:',
    noReportsForYear: 'ఈ సంవత్సరానికి ఇంకా పౌర ఫిర్యాదులు నమోదు కాలేదు:',
    reportsCount: 'ఫిర్యాదులు',
    byLabel: 'ద్వారా',
    lostLabel: 'నష్టం',
    scammerNumTag: '☎️ స్కామర్ నంబర్ / ID:',
    editBtn: 'సవరించు',
    deleteBtn: 'తొలగించు',
    confirmDelete: 'మీరు నిజంగా ఈ నమోదైన ఫిర్యాదును డేటాబేస్ నుండి తొలగించాలనుకుంటున్నారా?',
    fabShare: '📢 స్కామ్ అనుభవాన్ని పంచుకోండి',
    fabChat: '💬 సైబర్ క్రైమ్ ఇన్వెస్టిగేటర్',
    chatTitle: 'సైబర్‌కవచ్ కేస్ ఇన్వెస్టిగేటర్',
    chatPlaceholder: 'మీ సమస్యను ఇక్కడ టైప్ చేయండి...',
    modalTitleNew: 'పౌర స్కామ్ అనుభవాన్ని నమోదు చేయండి',
    modalTitleEdit: 'స్కామ్ అనుభవాన్ని సవరించండి',
    modalSub: 'ఇక్కడ నమోదు చేసిన నంబర్లు వెంటనే స్కామ్ చెకర్‌లో హెచ్చరికలను చూపిస్తాయి.',
    labelNameCity: 'మీ పేరు & నగరం (ఐచ్ఛికం)',
    placeholderNameCity: 'ఉదా. రవి టి. (హైదరాబాద్)',
    labelIncidentDate: 'సంఘటన తేదీ',
    labelScamCategory: 'స్కామ్ వర్గం',
    labelShortHeadline: 'చిన్న శీర్షిక *',
    placeholderHeadline: 'ఉదా. +855 నుండి నకిలీ CBI వీడియో కాల్ చేసి ₹50,000 అడిగారు',
    labelWhatHappened: 'ఏమి జరిగింది? (కనీసం 15 అక్షరాలు) *',
    placeholderDesc: 'మోసగాడు మిమ్మల్ని ఎలా సంప్రదించాడు మరియు ఇతరులు ఏ విషయాలలో జాగ్రత్తగా ఉండాలో వివరించండి...',
    labelScammerNum: 'స్కామర్ ఫోన్ నంబర్ / UPI ID',
    placeholderScammerNum: 'ఉదా. +91 9876543210 లేదా +855...',
    labelAmountLost: 'నష్టపోయిన మొత్తం ₹ లలో (తప్పించుకుంటే 0)',
    labelAttachProof: 'ఆధారంగా స్క్రీన్‌షాట్ జత చేయండి (ఐచ్ఛికం, గరిష్టంగా 4 MB)',
    btnUploadScreenshot: 'స్క్రీన్‌షాట్ అప్‌లోడ్ చేయండి',
    btnChangeScreenshot: 'స్క్రీన్‌షాట్ మార్చండి',
    btnRemove: 'తొలగించు',
    modalSubmitNew: 'ఫిర్యాదు సమర్పించండి',
    modalSubmitEdit: 'మార్పులు సేవ్ చేయండి',
    modalCancel: 'రద్దు చేయండి',
    alertEmptyInput: 'దయచేసి ముందుగా ఫోన్ నంబర్, మెసేజ్, లింక్ టైప్ చేయండి లేదా ఫోటో/ఆడియో అప్‌లోడ్ చేయండి!',
    alertMissingFields: 'దయచేసి మీ అనుభవానికి శీర్షిక మరియు వివరణ నమోదు చేయండి.',
    alertShortDesc: 'ఇతరులు ఈ మోసాన్ని అర్థం చేసుకునేలా దయచేసి కనీసం 15 అక్షరాల స్పష్టమైన వివరణ రాయండి.'
  }
};