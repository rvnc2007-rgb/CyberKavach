import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Upload,
  Mic,
  Send,
  FileAudio,
  X,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trash2,
  ExternalLink,
  BarChart3,
  Bot,
  TrendingUp,
  Globe,
  PhoneIncoming,
  PhoneOff,
  Radio,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  Landmark,
  ArrowLeft,
  MessageSquarePlus,
  Edit3,
  Camera,
  Flame,
  PlusCircle,
  FolderOpen,
  Languages,
  MapPin
} from 'lucide-react';
import { predictFraudWithML } from './mlFraudEngine';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  MONTH_NAMES_BY_LANG,
  CATEGORY_LABELS_BY_LANG,
  detectLanguageByLocation,
  getCachedTranslation,
  translateText
} from './translations';

// Reusable component that dynamically translates & caches any text block across all pages
function Trans({ text, lang }) {
  const [output, setOutput] = useState(
    () => getCachedTranslation(text, lang) || text || ''
  );

  useEffect(() => {
    let mounted = true;
    if (!text) {
      setOutput('');
      return;
    }

    const cached = getCachedTranslation(text, lang);
    if (cached) {
      setOutput(cached);
      return;
    }

    translateText(text, lang).then((translated) => {
      if (mounted) setOutput(translated);
    });

    return () => {
      mounted = false;
    };
  }, [text, lang]);

  return <>{output}</>;
}

// 1. OFFICIAL INDIAN CYBER & DATA SECURITY PORTALS DIRECTORY
const NATIONAL_CYBER_PORTALS = [
  {
    name: 'National Cybercrime Reporting Portal (NCRP)',
    audience: 'Everyday Citizens',
    audienceBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    whenToApproach:
      'Approach immediately when you lose money to UPI/bank fraud, face online blackmail, sextortion, or abusive digital content.',
    purpose:
      'A single window to report any online crime, financial fraud, or abusive digital content directly to the police.',
    actionEngine:
      'Registers official police complaints online, links them to your local state police station, and generates a tracking ID.',
    url: 'https://cybercrime.gov.in',
    displayUrl: 'cybercrime.gov.in'
  },
  {
    name: 'Sanchar Saathi (& Chakshu)',
    audience: 'Mobile Users',
    audienceBadge: 'bg-blue-100 text-blue-800 border-blue-300',
    whenToApproach:
      'Approach when your phone is lost/stolen, when you receive a scam call/SMS (Chakshu), or to check how many SIM cards are issued in your name.',
    purpose:
      'A dashboard to manage your mobile identity, block lost phones, and check if others are using your identity.',
    actionEngine:
      'Instantly blocks lost/stolen device IMEIs across all networks and unlinks fraudulent SIM cards registered under your name.',
    url: 'https://sancharsaathi.gov.in',
    displayUrl: 'sancharsaathi.gov.in'
  },
  {
    name: 'Cyber Swachhta Kendra',
    audience: 'Everyday Citizens',
    audienceBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    whenToApproach:
      'Approach when your phone or computer behaves strangely, shows pop-up ads, or if you accidentally clicked a suspicious link or .APK file.',
    purpose:
      'A digital "sanitation" center that helps regular users scan, clean, and protect their personal devices from malware.',
    actionEngine:
      'Provides free automated tools to scan computers/mobiles, remove hidden spy networks (botnets), and fix security holes.',
    url: 'https://www.cyberswachhtakendra.gov.in',
    displayUrl: 'cyberswachhtakendra.gov.in'
  },
  {
    name: 'CERT-In (Indian Computer Emergency Response Team)',
    audience: 'IT Admins & Businesses',
    audienceBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    whenToApproach:
      'Approach when an organization, company server, or institutional website suffers a ransomware attack, data breach, or software vulnerability.',
    purpose:
      'The national watchdog that monitors internet traffic for large-scale hacks, data breaches, and system vulnerabilities.',
    actionEngine:
      'Issues emergency cyber alerts, handles major data breach reporting, and coordinates recovery steps for hacked companies.',
    url: 'https://www.cert-in.org.in',
    displayUrl: 'cert-in.org.in'
  },
  {
    name: 'NCIIPC Portal',
    audience: 'Critical Industries',
    audienceBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    whenToApproach:
      'Approach for reporting threats or vulnerabilities affecting national critical sectors (banking backbones, power grids, telecom, railways).',
    purpose:
      'A specialized shield protecting major national assets like power grids, nuclear plants, banks, and transport networks.',
    actionEngine:
      'Tracks critical infrastructure networks, receives secret vulnerability reports, and issues strict security guidelines.',
    url: 'https://nciipc.gov.in',
    displayUrl: 'nciipc.gov.in'
  },
  {
    name: 'CyTrain (NCTC)',
    audience: 'Government & Police',
    audienceBadge: 'bg-slate-200 text-slate-800 border-slate-300',
    whenToApproach:
      'Used by police personnel, judicial officers, and public prosecutors seeking official cyber-forensics training and certification.',
    purpose:
      'A digital academy built to train police officers, lawyers, and judges on how to handle modern digital evidence.',
    actionEngine:
      'Hosts interactive training courses, runs mock cyber-forensic labs, and issues official certifications to state officers.',
    url: 'https://cytrain.ncrb.gov.in',
    displayUrl: 'cytrain.ncrb.gov.in'
  },
  {
    name: 'SAMANVAYA Platform (I4C)',
    audience: 'Law Enforcement',
    audienceBadge: 'bg-red-100 text-red-800 border-red-300',
    whenToApproach:
      'Used by state police forces to coordinate interstate investigations against cybercriminals operating from another state.',
    purpose:
      'A hidden data intelligence network used by police forces to track interstate cybercriminals who jump borders.',
    actionEngine:
      'Acts as a joint database where different state police departments upload and cross-reference active cybercrime patterns.',
    url: 'https://i4c.mha.gov.in',
    displayUrl: 'i4c.mha.gov.in'
  }
];

const PORTAL_AUDIENCES = [
  'ALL',
  'Everyday Citizens',
  'Mobile Users',
  'IT Admins & Businesses',
  'Critical Industries',
  'Government & Police',
  'Law Enforcement'
];

// 2. BASE TRENDING SCAMS DATABASE
const BASE_TRENDING_SCAMS = [
  {
    id: 1,
    title: 'Fake "Digital Arrest" Video Call',
    emoji: '👮‍♂️📹',
    badge: 'VERY HIGH RISK',
    shortDesc:
      'Fake Police, CBI, or Customs officers on WhatsApp video call claiming a parcel in your name has illegal items.',
    steps: [
      {
        icon: '📞',
        title: '1. The Scare',
        text: 'Scammer calls wearing a police uniform on WhatsApp or Skype video call (often from +92, +855, or spoofed numbers).'
      },
      {
        icon: '📄',
        title: '2. Fake Arrest Warrant',
        text: 'They tell you not to disconnect the call ("Digital Arrest") or you will be arrested immediately.'
      },
      {
        icon: '💸',
        title: '3. Money Demand',
        text: 'They force you to transfer lakhs to a "secret verification bank account" to clear your name.'
      }
    ],
    rule: 'Real Police, CBI, or Courts NEVER interrogate or arrest anyone over WhatsApp video calls!'
  },
  {
    id: 2,
    title: 'International WhatsApp Call & Fake KBC / Job Scam',
    emoji: '🌍📞',
    badge: 'INTERNATIONAL SCAM CALLS',
    shortDesc:
      'Calls or WhatsApp messages from foreign numbers (+92, +855, +84, +62, +234) offering ₹25 Lakh lottery or part-time jobs.',
    steps: [
      {
        icon: '📲',
        title: '1. Foreign Number Rings',
        text: 'You get a WhatsApp voice/video call or missed call starting with +92, +855, +62, or +234.'
      },
      {
        icon: '🎁',
        title: '2. Lottery or Task Trap',
        text: 'They show a fake KBC lottery ticket, part-time YouTube-like job, or secretly record your face on video call.'
      },
      {
        icon: '🔒',
        title: '3. Extortion or Fee',
        text: 'They demand "processing fees" or blackmail you using a morphed video clip.'
      }
    ],
    rule: 'NEVER answer unknown international WhatsApp video calls! Block and report numbers starting with +92, +855, +84, or +234.'
  },
  {
    id: 3,
    title: 'UPI QR Code "Scan to Receive" Scam',
    emoji: '📱💸',
    badge: 'COMMON SCAM',
    shortDesc:
      'Scammers send a QR code on WhatsApp/marketplace and say "Scan this and enter your PIN to receive money."',
    steps: [
      {
        icon: '🛒',
        title: '1. Fake Buyer / Prize',
        text: 'Scammer pretends to send you advance payment or lottery reward.'
      },
      {
        icon: '🔳',
        title: '2. Sends QR Code',
        text: 'They send a QR image or payment collect request on your phone.'
      },
      {
        icon: '🔑',
        title: '3. Asks for UPI PIN',
        text: 'When you enter your UPI PIN, money is deducted FROM your bank instead of coming in.'
      }
    ],
    rule: 'You NEVER need to scan a QR code or enter your UPI PIN to RECEIVE money!'
  },
  {
    id: 4,
    title: 'Electricity Bill / Bank KYC APK Scam',
    emoji: '⚡🏦',
    badge: 'SMS & WHATSAPP',
    shortDesc:
      'Urgent message saying "Your electricity will be disconnected tonight" or "Bank PAN blocked, update KYC now."',
    steps: [
      {
        icon: '📩',
        title: '1. Urgent SMS',
        text: 'You receive an SMS saying power will be cut at 9:30 PM or your bank account is frozen.'
      },
      {
        icon: '🔗',
        title: '2. Malicious Link / APK',
        text: 'Clicking the link installs a harmful app (.apk) or opens a fake banking page.'
      },
      {
        icon: '🕵️',
        title: '3. OTP Stolen',
        text: 'The scammer reads your SMS OTPs remotely and steals money from your bank account.'
      }
    ],
    rule: 'Never download .APK files sent on WhatsApp or click unknown short links in SMS!'
  }
];

// Fraud Categories for Citizen Reports & Pattern Monitor
const COMPLAINT_CATEGORIES = [
  {
    name: 'Fake Traffic E-Challan & RTO APK Scam',
    emoji: '🚓📲',
    rule: 'Official Parivahan/RTO traffic challans NEVER ask you to download an .APK file on WhatsApp!'
  },
  {
    name: 'Fake Stock IPO & VIP Trading Group Scam',
    emoji: '📈💹',
    rule: 'Never transfer money to personal bank accounts shown inside WhatsApp/Telegram VIP stock trading apps!'
  },
  {
    name: 'Fake "Digital Arrest" CBI / FedEx Video Call',
    emoji: '👮‍♂️📹',
    rule: 'Real Police, CBI, or Customs officers NEVER conduct arrests or ask for money on video calls!'
  },
  {
    name: 'Telegram Part-Time YouTube Like / Task Scam',
    emoji: '💼📲',
    rule: 'Never pay "prepaid task money" to unlock your commission on Telegram or WhatsApp job groups!'
  },
  {
    name: 'UPI QR Code / Fake Bank KYC Call Scam',
    emoji: '🏦🔑',
    rule: 'Never enter your UPI PIN to receive money or share OTPs with anyone claiming to be from your bank!'
  },
  {
    name: 'AI Voice Clone Emergency Relative Call',
    emoji: '🎭🗣️',
    rule: 'Always cut the call and phone your family member directly on their real number before sending emergency money!'
  }
];

// Initial Seeded Citizen Complaints
const INITIAL_COMMUNITY_COMPLAINTS = [
  {
    id: 'c-101',
    reporterName: 'Ramesh K. (Hyderabad)',
    category: 'Fake Traffic E-Challan & RTO APK Scam',
    title: 'Got WhatsApp message saying my car has ₹1,500 pending challan with APK file',
    description:
      'Received a message from an unknown number with an app named "mParivahan-Challan.apk". They asked me to install it to view the traffic violation photo. Thankfully I checked it here and blocked the sender.',
    scammerNumber: '+91 8111111118',
    amountLost: '0',
    dateISO: '2026-10-12',
    year: '2026',
    monthName: 'October',
    monthIndex: 9,
    photoData: null
  },
  {
    id: 'c-102',
    reporterName: 'Ananya S. (Bengaluru)',
    category: 'Fake Traffic E-Challan & RTO APK Scam',
    title: 'RTO Challan APK stole my cousin’s SMS OTPs',
    description:
      'My cousin downloaded a "Traffic_Challan_View.apk" sent on WhatsApp. Within 10 minutes, SMS forwarding was enabled and ₹24,000 was debited via credit card OTP. We immediately called 1930 to freeze the transaction.',
    scammerNumber: '+91 7000000007',
    amountLost: '24000',
    dateISO: '2026-10-04',
    year: '2026',
    monthName: 'October',
    monthIndex: 9,
    photoData: null
  },
  {
    id: 'c-103',
    reporterName: 'Vikramjit P. (Pune)',
    category: 'Fake Traffic E-Challan & RTO APK Scam',
    title: 'Fake Police E-Challan SMS link with APK download',
    description:
      'Got an SMS saying my two-wheeler registration will be blacklisted unless I pay ₹500 challan via a shortened bit.ly link that downloaded an APK file.',
    scammerNumber: '1409999999',
    amountLost: '0',
    dateISO: '2026-09-19',
    year: '2026',
    monthName: 'September',
    monthIndex: 8,
    photoData: null
  },
  {
    id: 'c-104',
    reporterName: 'Srinivas Rao (Secunderabad)',
    category: 'Fake "Digital Arrest" CBI / FedEx Video Call',
    title: 'Cambodia (+855) caller pretended to be Mumbai Cyber Police',
    description:
      'Received an automated IVR call saying my identity was used to send a FedEx parcel to Taiwan. They connected me to a Skype video call showing a fake police station. I disconnected immediately.',
    scammerNumber: '+855 97234112',
    amountLost: '0',
    dateISO: '2026-08-22',
    year: '2026',
    monthName: 'August',
    monthIndex: 7,
    photoData: null
  },
  {
    id: 'c-105',
    reporterName: 'Meena D. (Delhi)',
    category: 'Fake Stock IPO & VIP Trading Group Scam',
    title: 'Added to fake Institutional VIP Stock WhatsApp Group',
    description:
      'Scammers added me to a WhatsApp group showing fake 200% daily profits on block deals and asked me to install an unlisted trading app.',
    scammerNumber: '+84 912345678',
    amountLost: '15000',
    dateISO: '2025-11-14',
    year: '2025',
    monthName: 'November',
    monthIndex: 10,
    photoData: null
  },
  {
    id: 'c-106',
    reporterName: 'Karthik V. (Chennai)',
    category: 'Telegram Part-Time YouTube Like / Task Scam',
    title: 'Vietnam (+84) WhatsApp caller offered ₹4,500/day for Google Map reviews',
    description:
      'They paid ₹150 for reviewing 3 hotels on Google Maps, then asked me to pay ₹5,000 for a "prepaid VIP task" on Telegram. Blocked them right away.',
    scammerNumber: '+84 888231109',
    amountLost: '0',
    dateISO: '2024-07-09',
    year: '2024',
    monthName: 'July',
    monthIndex: 6,
    photoData: null
  }
];

const SPAM_CALLER_PREFIXES = [
  {
    code: '+92',
    country: 'Pakistan',
    risk: 'EXTREME DANGER',
    riskColor: 'bg-red-600 text-white',
    scamType: 'Fake KBC Lottery, WhatsApp Video Blackmail & Impersonation Calls',
    advice: 'Never pick up or reply on WhatsApp. Block immediately.'
  },
  {
    code: '+855 / +856',
    country: 'Cambodia / Laos',
    risk: 'EXTREME DANGER',
    riskColor: 'bg-red-600 text-white',
    scamType: '"Digital Arrest" Police/CBI Calls, Fake FedEx Parcel & Stock Scams',
    advice: 'Scam call centers operate here using VoIP. Hang up immediately.'
  },
  {
    code: '+84 / +62',
    country: 'Vietnam / Indonesia',
    risk: 'HIGH RISK',
    riskColor: 'bg-orange-500 text-white',
    scamType: 'Telegram Part-Time Job Scams (Like YouTube Videos / Hotel Rating)',
    advice: 'Do not join any Telegram group or invest money for tasks.'
  },
  {
    code: '+234 / +254',
    country: 'Nigeria / Kenya',
    risk: 'HIGH RISK',
    riskColor: 'bg-orange-500 text-white',
    scamType: 'Custom Parcel Gift Traps, Romance Scams & Foreign Lottery SMS',
    advice: 'Never pay "customs clearance charges" for unknown foreign gifts.'
  },
  {
    code: '140-XXXXXXX',
    country: 'India (Telemarketer)',
    risk: 'SPAM / PROMO',
    riskColor: 'bg-amber-400 text-slate-950',
    scamType: 'Promotional Telemarketing, Unsolicited Loan & Credit Card Offers',
    advice: 'Safe to ignore. Never share OTP on promotional calls.'
  },
  {
    code: '160-XXXXXXX',
    country: 'India (Official Service)',
    risk: 'VERIFIED SERIES',
    riskColor: 'bg-emerald-600 text-white',
    scamType: 'TRAI Official Series for Real Banks, Insurance & Govt Alerts',
    advice: 'Official service prefix—still remember: real banks NEVER ask for OTP or PIN.'
  }
];

const QUICK_DEMO_SAMPLES = [
  {
    labelKey: 'sampleValidMobile',
    value: '9876140321',
    style: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    labelKey: 'samplePromoSpam',
    value:
      'Hurry! Limited time offer: Flat 60% OFF sale ends tonight! Use code SAVE60 to shop now. T&C apply.',
    style: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    labelKey: 'sampleSpoofed',
    value: '111-11-1111',
    style: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300'
  },
  {
    labelKey: 'sampleKycScam',
    value:
      'URGENT: Your SBI PAN KYC has expired and your bank account will be blocked tonight. Update now: bit.ly/sbi-kyc-verify',
    style: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300'
  }
];

const TEN_YEAR_FRAUD_DATA = [
  {
    year: '2017',
    totalLostCr: 185,
    casesReported: '42,500',
    domesticScamCallsCr: 70,
    intlCallerFraudCr: 25,
    smsPhishingCr: 55,
    upiQrFraudCr: 35,
    spamNumbersBlockedLakhs: '1.2 Lakh',
    spoofedCallsBlockedPerDay: '4.5 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +234 (Nigeria)',
    majorTrend: 'Fake Bank Manager ATM Card Blocked Calls',
    elaboratedStory:
      'In 2017, scammers posed as bank officials calling from regular mobile numbers claiming your ATM/Debit card was blocked. They tricked people into reading out their 16-digit card number, CVV, and SMS OTP.',
    callerTactic:
      'Scammers used bulk SIM cards bought on fake IDs to make domestic voice calls pretending to be SBI or RBI verification officers.',
    topTarget: 'Senior citizens & new debit card users',
    keyWarningSign: 'Caller asking for the 3-digit CVV printed on the back of your ATM card.'
  },
  {
    year: '2018',
    totalLostCr: 310,
    casesReported: '68,900',
    domesticScamCallsCr: 105,
    intlCallerFraudCr: 35,
    smsPhishingCr: 90,
    upiQrFraudCr: 80,
    spamNumbersBlockedLakhs: '2.8 Lakh',
    spoofedCallsBlockedPerDay: '8.2 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +44 (UK Virtual Numbers)',
    majorTrend: 'SIM Swap Frauds & +92 WhatsApp KBC Lottery Audio Calls',
    elaboratedStory:
      'Scammers sent fake telecom messages asking users to press "1" or forward an SMS to upgrade to 4G—silently swapping their SIM card. Meanwhile, +92 (Pakistan) WhatsApp voice notes claiming ₹25 Lakh KBC lottery prizes surged.',
    callerTactic:
      'Cross-border callers used WhatsApp voice recordings with fake Amitabh Bachchan / KBC posters to bypass regular telecom filters.',
    topTarget: 'Mobile banking users & WhatsApp users in tier-2/3 towns',
    keyWarningSign: 'Sudden loss of mobile network signal followed by bank alerts, or +92 WhatsApp lottery posters.'
  },
  {
    year: '2019',
    totalLostCr: 540,
    casesReported: '1,15,000',
    domesticScamCallsCr: 155,
    intlCallerFraudCr: 55,
    smsPhishingCr: 135,
    upiQrFraudCr: 195,
    spamNumbersBlockedLakhs: '5.4 Lakh',
    spoofedCallsBlockedPerDay: '14.0 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +1 (US VoIP Numbers)',
    majorTrend: 'OLX / Marketplace Buyer Calls & UPI "Request Money" QR Traps',
    elaboratedStory:
      'As UPI adoption grew, fraudsters called sellers on OLX/Quikr pretending to be army officers or wholesale buyers. They sent a QR code saying "Scan and enter UPI PIN to receive advance payment."',
    callerTactic:
      'Domestic mule SIM callers stayed on the phone line continuously while guiding the victim to enter their UPI PIN on a collect request.',
    topTarget: 'Online second-hand sellers, small shopkeepers & UPI beginners',
    keyWarningSign: 'Anyone asking you to enter your UPI PIN or scan a QR code to RECEIVE money.'
  },
  {
    year: '2020',
    totalLostCr: 1120,
    casesReported: '2,85,000',
    domesticScamCallsCr: 280,
    intlCallerFraudCr: 110,
    smsPhishingCr: 310,
    upiQrFraudCr: 420,
    spamNumbersBlockedLakhs: '11.5 Lakh',
    spoofedCallsBlockedPerDay: '26.5 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +234 (Nigeria), +1 (VoIP)',
    majorTrend: 'Fake Customer Care Numbers on Google & COVID Relief Phishing',
    elaboratedStory:
      'During the lockdowns, people searched Google for bank, courier, or hospital helpline numbers. Scammers published fake toll-free numbers on Google Maps and social media, tricking callers into sharing refunds/OTP details.',
    callerTactic:
      'Fraudsters bought virtual 1800/landline-looking numbers and used call-forwarding to route victims directly to scam call centers.',
    topTarget: 'People searching online for customer care numbers or refund help',
    keyWarningSign: 'Customer care representative asking you to install a support app or share an OTP.'
  },
  {
    year: '2021',
    totalLostCr: 1890,
    casesReported: '4,62,000',
    domesticScamCallsCr: 430,
    intlCallerFraudCr: 180,
    smsPhishingCr: 520,
    upiQrFraudCr: 760,
    spamNumbersBlockedLakhs: '22.0 Lakh',
    spoofedCallsBlockedPerDay: '42.0 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +855 (Cambodia), +44 (VoIP)',
    majorTrend: 'Bank KYC Expiry SMS & Remote Screen-Sharing (AnyDesk / TeamViewer)',
    elaboratedStory:
      'Mass bulk SMS campaigns claimed "Your SBI/HDFC PAN KYC is expired today." Callers convinced victims to download AnyDesk or RustDesk from the Play Store, allowing scammers to watch their phone screen live and steal OTPs.',
    callerTactic:
      'Callers impersonated bank KYC verification desks and kept victims on speakerphone while viewing their screen remotely.',
    topTarget: 'Salaried employees & pensioners receiving SMS link alerts',
    keyWarningSign: 'A caller asking you to download AnyDesk, TeamViewer, or QuickSupport.'
  },
  {
    year: '2022',
    totalLostCr: 3250,
    casesReported: '7,40,000',
    domesticScamCallsCr: 670,
    intlCallerFraudCr: 310,
    smsPhishingCr: 890,
    upiQrFraudCr: 1380,
    spamNumbersBlockedLakhs: '41.6 Lakh',
    spoofedCallsBlockedPerDay: '65.0 Lakh/day',
    topIntlOrigins: '+92 (Pakistan), +62 (Indonesia), +234 (Nigeria)',
    majorTrend: 'Electricity Bill Disconnection Tonight SMS & Instant Loan App Blackmail',
    elaboratedStory:
      'Millions received late-evening SMS messages stating "Your electricity power will be disconnected at 9:30 PM tonight—call this officer number." Predatory 7-day loan apps also accessed victims’ contact lists to harass families.',
    callerTactic:
      'High-pressure recovery callers used automated VoIP dialers and morphed photos to threaten borrowers and their phone contacts.',
    topTarget: 'Homeowners, families & small borrowers',
    keyWarningSign: 'SMS from a normal 10-digit mobile number threatening power disconnection tonight.'
  },
  {
    year: '2023',
    totalLostCr: 5680,
    casesReported: '11,28,000',
    domesticScamCallsCr: 1050,
    intlCallerFraudCr: 600,
    smsPhishingCr: 1420,
    upiQrFraudCr: 2610,
    spamNumbersBlockedLakhs: '78.5 Lakh',
    spoofedCallsBlockedPerDay: '88.0 Lakh/day',
    topIntlOrigins: '+84 (Vietnam), +62 (Indonesia), +234 (Nigeria), +254 (Kenya)',
    majorTrend: 'International WhatsApp Calls (+84/+62/+234) & Telegram Part-Time Job Scams',
    elaboratedStory:
      'Foreign VoIP numbers from Vietnam (+84), Indonesia (+62), and Nigeria (+234) flooded WhatsApp offering ₹5,000/day for liking YouTube videos or rating Google Maps hotels. Victims were paid ₹150 first, then trapped into investing lakhs.',
    callerTactic:
      'Automated "Wangiri" missed calls and WhatsApp video calls from +84/+62 numbers lured users into Telegram task groups.',
    topTarget: 'College students, homemakers & job seekers',
    keyWarningSign: 'Part-time job offers on WhatsApp/Telegram asking you to pay "prepaid task money" to unlock earnings.'
  },
  {
    year: '2024',
    totalLostCr: 8950,
    casesReported: '16,80,000',
    domesticScamCallsCr: 1850,
    intlCallerFraudCr: 1250,
    smsPhishingCr: 2100,
    upiQrFraudCr: 3750,
    spamNumbersBlockedLakhs: '1.75 Crore',
    spoofedCallsBlockedPerDay: '1.15 Crore/day',
    topIntlOrigins: '+855 (Cambodia), +856 (Laos), +92 (Pakistan)',
    majorTrend: 'Cambodia/Laos (+855) Spoofed "Digital Arrest" CBI / FedEx Video Calls',
    elaboratedStory:
      'Organized scam syndicates in Cambodia (+855) and Laos (+856) used automated IVR calls ("Press 9 for FedEx parcel") and fake police stations on WhatsApp video calls to keep victims under "Digital Arrest" for hours until they transferred their life savings.',
    callerTactic:
      'Illegal SIM-box gateways routed international calls from Cambodia/Myanmar so they appeared as local Indian numbers or IVR robocalls.',
    topTarget: 'Professionals, doctors, engineers & retired officers',
    keyWarningSign: 'Video call from someone in police uniform telling you not to disconnect the call.'
  },
  {
    year: '2025',
    totalLostCr: 11420,
    casesReported: '21,50,000',
    domesticScamCallsCr: 2450,
    intlCallerFraudCr: 1800,
    smsPhishingCr: 2670,
    upiQrFraudCr: 4500,
    spamNumbersBlockedLakhs: '2.90 Crore',
    spoofedCallsBlockedPerDay: '1.28 Crore/day',
    topIntlOrigins: '+855 (Cambodia), +92 (Pakistan), Spoofed +91 CLI',
    majorTrend: 'AI Voice Cloning "Relative in Hospital" Calls & Malicious .APK Files on WhatsApp',
    elaboratedStory:
      'Scammers used 3-second AI voice clones to mimic a crying son or daughter in a police station or hospital accident. Simultaneously, fake traffic E-Challan and wedding invitation .APK files were sent on WhatsApp to hijack SMS OTPs.',
    callerTactic:
      'Real-time AI voice modulators combined with Caller ID spoofing created panic so parents transferred money before verifying.',
    topTarget: 'Parents, elderly family members & smartphone users',
    keyWarningSign: 'Panic call from an unknown number claiming your child is in trouble, or files ending in .apk on WhatsApp.'
  },
  {
    year: '2026',
    totalLostCr: 13800,
    casesReported: '24,90,000+',
    domesticScamCallsCr: 3100,
    intlCallerFraudCr: 2300,
    smsPhishingCr: 3150,
    upiQrFraudCr: 5250,
    spamNumbersBlockedLakhs: '4.10 Crore+',
    spoofedCallsBlockedPerDay: '1.35+ Crore/day',
    topIntlOrigins: '+855 (Cambodia), +856 (Laos), +92 (Pakistan), Spoofed CLI',
    majorTrend: 'Deepfake Video Calls, International VoIP Spoofing & Fake IPO Stock Apps',
    elaboratedStory:
      'Fraudsters now combine deepfake video streams of finance experts with fake institutional stock trading apps, alongside spoofed international VoIP calls that disguise foreign numbers as local +91 callers.',
    callerTactic:
      'TRAI introduced the 160-series for genuine banks and AI international call-blocking filters, stopping over 1.35 Crore spoofed calls daily.',
    topTarget: 'Retail stock investors, UPI users & general public',
    keyWarningSign: 'WhatsApp VIP stock groups promising 300% IPO allotment profits or unknown video callers.'
  }
];

const CATEGORY_BREAKDOWN = [
  {
    id: 'domestic_calls',
    label: 'Domestic Scam Calls (Fake Bank/KYC, Customer Care & IVR Calls)',
    amountCr: 10160,
    percentage: 21.5,
    badgeBg: 'bg-red-500',
    icon: '📞'
  },
  {
    id: 'intl_calls',
    label: 'International Callers (+92, +855, +84 VoIP & "Digital Arrest" Calls)',
    amountCr: 6665,
    percentage: 14.2,
    badgeBg: 'bg-orange-500',
    icon: '🌍'
  },
  {
    id: 'sms',
    label: 'Spam SMS, Phishing Links & Malicious .APK Apps',
    amountCr: 11340,
    percentage: 24.1,
    badgeBg: 'bg-amber-500',
    icon: '📩'
  },
  {
    id: 'upi',
    label: 'UPI PIN Traps, Fake QR Scans & Telegram Investment Scams',
    amountCr: 18980,
    percentage: 40.2,
    badgeBg: 'bg-blue-500',
    icon: '📱'
  }
];

const DIAGNOSTIC_FLOW = {
  root: {
    text: 'Namaste! 🙏 I am your interactive CyberKavach Case Investigator.\n\nTo give you exact help, please tell me: What happened to you just now? (Or click an option below)',
    options: [
      { label: '💸 Money was deducted from my Bank / UPI', nextNode: 'money_lost_time' },
      { label: '📞 Got a suspicious Call / "Digital Arrest" threat', nextNode: 'call_type' },
      { label: '📱 Clicked a link or installed an .APK file', nextNode: 'apk_installed' },
      { label: '😰 Someone is blackmailing / threatening me', nextNode: 'blackmail_check' }
    ]
  },
  money_lost_time: {
    text: '🚨 I understand money was deducted. Let us act fast!\n\nQuestion 1 of 2: How long ago did this transaction happen?',
    options: [
      { label: '⏱️ Less than 2 hours ago (Golden Hour)', nextNode: 'money_golden_hour' },
      { label: '📅 More than 2 hours ago / Yesterday', nextNode: 'money_later' }
    ]
  },
  money_golden_hour: {
    text: '⚡ CRITICAL GOLDEN HOUR! Because it happened recently, police can freeze the money before the scammer withdraws it.\n\nQuestion 2 of 2: How was the money taken?',
    options: [
      { label: '📲 Via UPI (GPay / PhonePe / Paytm)', nextNode: 'verdict_upi_freeze' },
      { label: '💳 Via Debit/Credit Card or NetBanking OTP', nextNode: 'verdict_card_freeze' }
    ]
  },
  money_later: {
    text: '📌 Even if some time has passed, we must put a freeze on the scammer’s bank account.\n\nQuestion 2 of 2: Do you have the 12-digit UTR / Transaction Reference Number from your SMS or bank app?',
    options: [
      { label: '✅ Yes, I have the UTR / Reference ID', nextNode: 'verdict_file_portal' },
      { label: '❌ No, I cannot find it', nextNode: 'verdict_get_statement' }
    ]
  },
  call_type: {
    text: '🔍 Let me investigate the caller.\n\nQuestion 1 of 2: What kind of number or call was it?',
    options: [
      { label: '🌍 Foreign number (+92, +855, +84, +234)', nextNode: 'call_intl_action' },
      { label: '👮 Caller claimed to be Police / CBI / Customs / FedEx', nextNode: 'call_digital_arrest' },
      { label: '🏦 Caller asked for Bank KYC / OTP / Electricity Bill', nextNode: 'call_kyc_shared' }
    ]
  },
  call_intl_action: {
    text: '🌍 That is a cross-border VoIP scam call.\n\nQuestion 2 of 2: Did you answer a WhatsApp video call or share any money/details with them?',
    options: [
      { label: '📹 Yes, I answered a video call / shared info', nextNode: 'blackmail_check' },
      { label: '🛡️ No, I disconnected or ignored it', nextNode: 'verdict_safe_block' }
    ]
  },
  call_digital_arrest: {
    text: '👮‍♂️ WARNING: That is a 100% FAKE "Digital Arrest" scam! Real police NEVER call on WhatsApp video.\n\nQuestion 2 of 2: Are they still asking you to stay on the call or transfer money?',
    options: [
      { label: '⚠️ Yes, they are pressuring me right now', nextNode: 'verdict_hangup_now' },
      { label: '💸 I already transferred money to them', nextNode: 'money_lost_time' }
    ]
  },
  call_kyc_shared: {
    text: '🔑 Question 2 of 2: Did you tell them any OTP, UPI PIN, or install a screen-sharing app (like AnyDesk)?',
    options: [
      { label: '😱 Yes, I shared OTP or screen access', nextNode: 'apk_installed' },
      { label: '✅ No, I did not share anything', nextNode: 'verdict_safe_block' }
    ]
  },
  apk_installed: {
    text: '☣️ MALWARE ALERT! If you installed an .APK file or screen-sharing app, the scammer can read your SMS OTPs.\n\nQuestion: Is your phone currently connected to the Internet (Wi-Fi or Mobile Data)?',
    options: [
      { label: '📶 Yes, Internet is ON right now', nextNode: 'verdict_airplane_mode' },
      { label: '✈️ I already turned OFF Internet / Uninstalled it', nextNode: 'verdict_reset_bank' }
    ]
  },
  blackmail_check: {
    text: '🛡️ Stay calm—you are the victim, and the law protects you.\n\nQuestion: Have you paid any money to the blackmailer yet?',
    options: [
      { label: '❌ No, I have not paid anything', nextNode: 'verdict_blackmail_dont_pay' },
      { label: '💸 Yes, I paid once and they want more', nextNode: 'verdict_blackmail_paid' }
    ]
  },
  verdict_upi_freeze: {
    text: '✅ YOUR PERSONALIZED ACTION PLAN (UPI FRAUD):\n1. Dial 1930 right now and give them the 12-digit UPI Transaction ID.\n2. Open your UPI app (GPay/PhonePe) → tap the transaction → click "Report an Issue / Fraud".\n3. Log in to https://cybercrime.gov.in under "Report Financial Fraud" so the National Cyber Crime Portal freezes the receiver’s bank account.\n\nWould you like to investigate another issue?',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_card_freeze: {
    text: '✅ YOUR PERSONALIZED ACTION PLAN (CARD / BANK FRAUD):\n1. Immediately block your Card / NetBanking via your bank’s mobile app or toll-free helpline.\n2. Call 1930 within the next 10 minutes—tell the officer the exact time and amount deducted.\n3. Keep the bank SMS showing the debit alert; you will need to upload its screenshot at https://cybercrime.gov.in.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_file_portal: {
    text: '✅ YOUR PERSONALIZED ACTION PLAN (WITH UTR NUMBER):\n1. Call 1930 and read out your 12-digit UTR number so a hold is placed on the destination bank account.\n2. Visit https://cybercrime.gov.in, click "File a Complaint", and attach your bank statement + UTR screenshot.\n3. Take the acknowledgement number to your nearest bank branch to submit a formal dispute form.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_get_statement: {
    text: '✅ HOW TO GET YOUR TRANSACTION ID FAST:\n1. Check your bank SMS or open your UPI app’s History tab—look for a 12-digit number labeled UTR / Ref No.\n2. Even without the UTR, dial 1930 immediately and tell them your registered mobile number and exact time of debit.\n3. Call your bank’s customer care to freeze your account against further debits.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_safe_block: {
    text: '🎉 GREAT JOB! YOU ARE SAFE.\nSince you did not share any OTP/PIN or answer a video call, your money is safe.\n\nNext Steps to Protect Others:\n1. Block the number on your phone and WhatsApp.\n2. Report the scam number on the government’s Chakshu Portal (https://sancharsaathi.gov.in) so the DoT disconnects the scammer’s SIM card!',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_hangup_now: {
    text: '🛑 DISCONNECT THE CALL IMMEDIATELY!\n1. Cut the WhatsApp/Skype call right now—no real police officer ever conducts "Digital Arrest".\n2. Do NOT transfer a single rupee.\n3. Dial 1930 or visit your local police station if you want peace of mind—they will confirm it is a fake scam call.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_airplane_mode: {
    text: '✈️ EMERGENCY STEP: TURN ON AIRPLANE MODE NOW!\n1. Switch ON Airplane Mode (or turn OFF Wi-Fi & Mobile Data) immediately—this cuts off the hacker’s live access to your SMS OTPs.\n2. Go to Settings → Apps and uninstall the unknown .APK or AnyDesk app.\n3. Using another safe phone, call your bank to temporarily block mobile banking and change your passwords.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_reset_bank: {
    text: '✅ GOOD! NOW SECURE YOUR ACCOUNTS:\n1. Check your SMS Forwarding settings (dial ##002# on your phone dialer to erase any secret call/SMS forwarding set by the app).\n2. Change your NetBanking and email passwords from a clean device.\n3. Monitor your bank statement and call 1930 if you notice any unauthorized transaction.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_blackmail_dont_pay: {
    text: '🛡️ DO NOT PAY EVEN ₹1!\n1. If you pay once, scammers know you are scared and will demand 10x more money.\n2. Take screenshots of their number/messages as evidence, then Block them and set your social media accounts to Private.\n3. File an anonymous report at https://cybercrime.gov.in or dial 1930.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  },
  verdict_blackmail_paid: {
    text: '🛑 STOP PAYING IMMEDIATELY!\n1. Block the blackmailer on all platforms—never make another payment.\n2. Call 1930 to report both the extortion and the UPI/bank account where you sent the money so police can trace the mule account.\n3. Save all payment receipts and chat screenshots for your complaint on https://cybercrime.gov.in.',
    options: [{ label: '🔄 Start New Case Investigation', nextNode: 'root' }]
  }
};

const STORAGE_KEY = 'cyberkavach_community_complaints_v1';
const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
const PROMOTION_THRESHOLD = 3;

const ENGLISH_MONTH_NAMES = MONTH_NAMES_BY_LANG.en;

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('checker');
  const [portalFilter, setPortalFilter] = useState('ALL');

  // Language & Automatic Geolocation State
  const [lang, setLang] = useState('en');
  const [locationBanner, setLocationBanner] = useState(null); // { type: 'auto' | 'denied', detail?: string }
  const userManuallyChangedLangRef = useRef(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const localizedMonths = MONTH_NAMES_BY_LANG[lang] || MONTH_NAMES_BY_LANG.en;
  const localizedCategories =
    CATEGORY_LABELS_BY_LANG[lang] || CATEGORY_LABELS_BY_LANG.en;

  const getLocalizedCategory = (canonicalCat) =>
    localizedCategories[canonicalCat] || canonicalCat;

  const handleManualLanguageChange = (newLang) => {
    userManuallyChangedLangRef.current = true;
    setLang(newLang);
    setLocationBanner(null);
  };

  // Automatic location-based language switching (fires on load AND immediately if permission changes to granted)
  useEffect(() => {
    let mounted = true;
    let permissionObj = null;

    const syncLanguageFromLocation = async () => {
      const res = await detectLanguageByLocation();
      if (!mounted || userManuallyChangedLangRef.current) return;

      if (res.status === 'granted') {
        setLang(res.lang);
        if (res.region) {
          setLocationBanner({
            type: 'auto',
            detail: `${res.region} → ${SUPPORTED_LANGUAGES[res.lang].nativeName}`
          });
        } else {
          setLocationBanner(null);
        }
      } else {
        // Permission denied or geolocation unavailable -> stay on English and show notice
        setLang('en');
        setLocationBanner({ type: 'denied' });
      }
    };

    syncLanguageFromLocation();

    // Watch live browser permission changes so granting location access immediately switches language
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permStatus) => {
          if (!mounted) return;
          permissionObj = permStatus;
          permStatus.onchange = () => {
            if (permStatus.state === 'granted') {
              userManuallyChangedLangRef.current = false;
              syncLanguageFromLocation();
            } else if (permStatus.state === 'denied') {
              if (!userManuallyChangedLangRef.current) {
                setLang('en');
                setLocationBanner({ type: 'denied' });
              }
            }
          };
        })
        .catch(() => {
          // Permissions API not supported in some browsers
        });
    }

    return () => {
      mounted = false;
      if (permissionObj) permissionObj.onchange = null;
    };
  }, []);

  // Scam Checker States
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // 10-Year Analytics View Mode: 'bar' | 'callers'
  const [chartView, setChartView] = useState('bar');
  const [selectedYearIdx, setSelectedYearIdx] = useState(
    TEN_YEAR_FRAUD_DATA.length - 1
  );

  // Persistent Citizen Community Complaints Database
  const [complaints, setComplaints] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : INITIAL_COMMUNITY_COMPLAINTS;
      const now = Date.now();
      return parsed.filter((item) => {
        const itemTime = new Date(item.dateISO).getTime();
        return isNaN(itemTime) || now - itemTime <= THREE_YEARS_MS;
      });
    } catch {
      return INITIAL_COMMUNITY_COMPLAINTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    } catch (e) {
      console.error('Database storage quota warning:', e);
    }
  }, [complaints]);

  // Community Page & Modal States
  const [selectedComplaintYear, setSelectedComplaintYear] = useState('2026');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formReporter, setFormReporter] = useState('');
  const [formCategory, setFormCategory] = useState(COMPLAINT_CATEGORIES[0].name);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formScammerNum, setFormScammerNum] = useState('');
  const [formAmountLost, setFormAmountLost] = useState('');
  const [formDateISO, setFormDateISO] = useState(getTodayISO);
  const [formPhotoData, setFormPhotoData] = useState(null);

  // Diagnostic Chatbot States (All rendered dynamically through <Trans> so entire history translates live!)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [currentNodeKey, setCurrentNodeKey] = useState('root');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: DIAGNOSTIC_FLOW.root.text,
      options: DIAGNOSTIC_FLOW.root.options
    }
  ]);

  const fileInputRef = useRef(null);
  const complaintPhotoRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Pattern Monitor: auto-promotes categories reaching 3+ citizen reports
  const combinedTrendingScams = useMemo(() => {
    const counts = {};
    complaints.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });

    const dynamicTrending = [];
    COMPLAINT_CATEGORIES.forEach((catObj) => {
      const count = counts[catObj.name] || 0;
      if (count >= PROMOTION_THRESHOLD) {
        const matchingReports = complaints.filter(
          (c) => c.category === catObj.name
        );
        const latestSample = matchingReports[0];

        dynamicTrending.push({
          id: `dynamic-${catObj.name}`,
          title: catObj.name,
          emoji: catObj.emoji,
          badge: `🔥 COMMUNITY SURGE ALERT (${count} CITIZEN REPORTS)`,
          isCommunityPromoted: true,
          shortDesc: `Auto-promoted by CyberKavach Pattern Monitor from ${count} citizen complaints. Latest report: "${latestSample?.title}"`,
          steps: [
            {
              icon: '📩',
              title: '1. How Citizens Were Contacted',
              text: `Scammers approached victims via ${
                latestSample?.scammerNumber || 'unknown numbers/links'
              } using urgent claims.`
            },
            {
              icon: '⚠️',
              title: '2. Citizen Experience Pattern',
              text:
                latestSample?.description?.slice(0, 120) +
                (latestSample?.description?.length > 120 ? '...' : '')
            },
            {
              icon: '🛡️',
              title: '3. Community Defense',
              text: `Reported ${count} times in our public ledger. Numbers linked to this pattern are automatically flagged in the Scam Checker.`
            }
          ],
          rule: catObj.rule
        });
      }
    });

    return [...dynamicTrending, ...BASE_TRENDING_SCAMS];
  }, [complaints]);

  // Group Complaints by Year & Month
  const availableComplaintYears = useMemo(() => {
    const yearsSet = new Set(['2026', '2025', '2024']);
    complaints.forEach((c) => {
      if (c.year) yearsSet.add(c.year);
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [complaints]);

  const complaintsByMonthForSelectedYear = useMemo(() => {
    const yearItems = complaints
      .filter((c) => c.year === selectedComplaintYear)
      .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

    const monthGroups = {};
    yearItems.forEach((item) => {
      const idx =
        typeof item.monthIndex === 'number'
          ? item.monthIndex
          : Math.max(0, ENGLISH_MONTH_NAMES.indexOf(item.monthName));
      const mKey = String(idx);
      if (!monthGroups[mKey]) {
        monthGroups[mKey] = {
          monthIndex: idx,
          items: []
        };
      }
      monthGroups[mKey].items.push(item);
    });

    return Object.values(monthGroups).sort(
      (a, b) => b.monthIndex - a.monthIndex
    );
  }, [complaints, selectedComplaintYear]);

  const handleComplaintPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Please upload a photo smaller than 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormPhotoData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const openNewComplaintModal = () => {
    setEditingId(null);
    setFormReporter('');
    setFormCategory(COMPLAINT_CATEGORIES[0].name);
    setFormTitle('');
    setFormDesc('');
    setFormScammerNum('');
    setFormAmountLost('');
    setFormDateISO(getTodayISO());
    setFormPhotoData(null);
    setShowComplaintForm(true);
    setActiveTab('community');
  };

  const openEditComplaintModal = (item) => {
    setEditingId(item.id);
    setFormReporter(item.reporterName);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormScammerNum(item.scammerNumber || '');
    setFormAmountLost(item.amountLost || '0');
    setFormDateISO(item.dateISO || getTodayISO());
    setFormPhotoData(item.photoData || null);
    setShowComplaintForm(true);
  };

  const handleSaveComplaint = (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      alert(t.alertMissingFields);
      return;
    }

    if (formDesc.trim().length < 15) {
      alert(t.alertShortDesc);
      return;
    }

    const parsedDate = new Date(formDateISO || getTodayISO());
    const yearStr = String(parsedDate.getFullYear());
    const mIdx = isNaN(parsedDate.getMonth()) ? 9 : parsedDate.getMonth();
    const mName = ENGLISH_MONTH_NAMES[mIdx];

    const record = {
      id: editingId || `c-${Date.now()}`,
      reporterName: formReporter.trim() || 'Anonymous Citizen',
      category: formCategory,
      title: formTitle.trim(),
      description: formDesc.trim(),
      scammerNumber: formScammerNum.trim(),
      amountLost: formAmountLost.trim() || '0',
      dateISO: formDateISO || getTodayISO(),
      year: yearStr,
      monthName: mName,
      monthIndex: mIdx,
      photoData: formPhotoData
    };

    if (editingId) {
      setComplaints((prev) =>
        prev.map((item) => (item.id === editingId ? record : item))
      );
    } else {
      setComplaints((prev) => [record, ...prev]);
    }

    setSelectedComplaintYear(yearStr);
    setShowComplaintForm(false);
    setEditingId(null);
  };

  const handleDeleteComplaint = (id) => {
    if (window.confirm(t.confirmDelete)) {
      setComplaints((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 18 * 1024 * 1024) {
      alert('File is too large! Please upload a file smaller than 18 MB.');
      return;
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const clearInput = () => {
    setInputText('');
    setSelectedFile(null);
    setFilePreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is supported in Google Chrome or Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SUPPORTED_LANGUAGES[lang]?.speechLang || 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  // Connected to Citizen Ledger + FastAPI ML Backend + Local Fallback Engine
  const analyzeSuspiciousInput = async (overrideText = null) => {
    const isOverride = typeof overrideText === 'string';
    const textToAnalyze = (isOverride ? overrideText : inputText).trim();
    const fileToAnalyze = isOverride ? null : selectedFile;

    if (!textToAnalyze && !fileToAnalyze) {
      alert(t.alertEmptyInput);
      return;
    }

    setLoading(true);
    setResult(null);

    // Step 1: Always cross-check Citizen Community Complaints Ledger first
    const inputDigits = textToAnalyze.replace(/\D/g, '');
    if (inputDigits.length >= 6) {
      const targetTail = inputDigits.slice(-10);
      const reportedMatch = complaints.find((c) => {
        const cDigits = (c.scammerNumber || '').replace(/\D/g, '');
        return (
          cDigits.length >= 6 &&
          (targetTail === cDigits.slice(-10) || inputDigits === cDigits)
        );
      });

      if (reportedMatch) {
        setResult({
          status: 'DANGER',
          score: 97,
          headline: 'STOP! NUMBER REPORTED BY CITIZENS FOR FRAUD!',
          simpleReason: `This number matches a citizen complaint registered under "${reportedMatch.category}" (${reportedMatch.title}). Do not trust this caller!`,
          detected_indicators: ['Matched Citizen Community Scam Ledger'],
          engine: 'CyberKavach Citizen Ledger (Verified Match)',
          actions: [
            'Do NOT answer calls or send any money to this reported number.',
            'Block this number immediately on your phone and WhatsApp.',
            'Report it on 1930 or sancharsaathi.gov.in.'
          ]
        });
        setLoading(false);
        return;
      }
    }

    // Step 2: Query FastAPI ML Engine, falling back to local JS engine if offline
    try {
      const formData = new FormData();
      if (textToAnalyze) {
        formData.append('text', textToAnalyze);
      }
      if (fileToAnalyze) {
        formData.append('file', fileToAnalyze);
      }

      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const mlVerdict = await response.json();
      setResult(mlVerdict);
    } catch (err) {
      console.warn('Backend unavailable, using fallback:', err);
      const localPrediction = predictFraudWithML(
        textToAnalyze,
        fileToAnalyze,
        complaints
      );
      setResult(localPrediction);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSample = (sampleText) => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setInputText(sampleText);
    analyzeSuspiciousInput(sampleText);
  };

  // Interactive Guided Case Investigator Handlers (Supports multilingual text queries)
  const handleSelectDiagnosticOption = (option) => {
    const nextNode = DIAGNOSTIC_FLOW[option.nextNode] || DIAGNOSTIC_FLOW.root;
    setCurrentNodeKey(option.nextNode);
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: option.label },
      {
        sender: 'bot',
        text: nextNode.text,
        options: nextNode.options
      }
    ]);
  };

  const handleSendChatMessage = async () => {
    const userText = chatInput.trim();
    if (!userText) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    // If user typed in a regional language, translate to English for accurate intent routing
    const normalizedForRouting = /[\u0900-\u0D7F]/.test(userText)
      ? await translateText(userText, 'en')
      : userText;

    const q = normalizedForRouting.toLowerCase();
    let targetKey = 'root';

    if (currentNodeKey === 'money_lost_time') {
      targetKey =
        q.includes('now') ||
        q.includes('min') ||
        q.includes('hour') ||
        q.includes('today')
          ? 'money_golden_hour'
          : 'money_later';
    } else if (
      q.includes('lost') ||
      q.includes('deduct') ||
      q.includes('stole') ||
      q.includes('money') ||
      q.includes('upi') ||
      q.includes('debited') ||
      q.includes('rs')
    ) {
      targetKey = 'money_lost_time';
    } else if (
      q.includes('arrest') ||
      q.includes('police') ||
      q.includes('cbi') ||
      q.includes('fedex')
    ) {
      targetKey = 'call_digital_arrest';
    } else if (
      q.includes('+92') ||
      q.includes('+855') ||
      q.includes('call') ||
      q.includes('number')
    ) {
      targetKey = 'call_type';
    } else if (
      q.includes('apk') ||
      q.includes('link') ||
      q.includes('hack') ||
      q.includes('otp')
    ) {
      targetKey = 'apk_installed';
    } else if (
      q.includes('blackmail') ||
      q.includes('photo') ||
      q.includes('video') ||
      q.includes('threat')
    ) {
      targetKey = 'blackmail_check';
    }

    const matchedNode = DIAGNOSTIC_FLOW[targetKey] || DIAGNOSTIC_FLOW.root;
    setCurrentNodeKey(targetKey);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'bot',
        text: matchedNode.text,
        options: matchedNode.options
      }
    ]);
  };

  const resetChatInvestigation = () => {
    setCurrentNodeKey('root');
    setChatMessages([
      {
        sender: 'bot',
        text: DIAGNOSTIC_FLOW.root.text,
        options: DIAGNOSTIC_FLOW.root.options
      }
    ]);
  };

  const activeYearData = TEN_YEAR_FRAUD_DATA[selectedYearIdx];
  const prevYearData =
    selectedYearIdx > 0 ? TEN_YEAR_FRAUD_DATA[selectedYearIdx - 1] : null;
  const yoyGrowthPercent = prevYearData
    ? Math.round(
        ((activeYearData.totalLostCr - prevYearData.totalLostCr) /
          prevYearData.totalLostCr) *
          100
      )
    : null;

  const totalCallLossSelectedYear =
    activeYearData.domesticScamCallsCr + activeYearData.intlCallerFraudCr;
  const domCallSharePct = Math.round(
    (activeYearData.domesticScamCallsCr / totalCallLossSelectedYear) * 100
  );
  const intlCallSharePct = 100 - domCallSharePct;

  const filteredPortals =
    portalFilter === 'ALL'
      ? NATIONAL_CYBER_PORTALS
      : NATIONAL_CYBER_PORTALS.filter((p) => p.audience === portalFilter);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col relative pb-24">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div
            onClick={() => setActiveTab('checker')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                CyberKavach <span className="text-emerald-400">AI</span>
              </h1>
              <p className="text-xs text-slate-300">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Regional Language Switcher (Auto-updates via geolocation; user can manually switch anytime) */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 gap-1.5">
              <Languages className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                aria-label="Select Language"
                value={lang}
                onChange={(e) => handleManualLanguageChange(e.target.value)}
                className="bg-slate-800 text-white text-xs font-extrabold focus:outline-none cursor-pointer"
              >
                {Object.values(SUPPORTED_LANGUAGES).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('portals')}
              className={`px-3 py-2 rounded-xl font-extrabold text-xs md:text-sm flex items-center gap-1.5 shadow transition-all ${
                activeTab === 'portals'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title="Open National Cyber & Data Security Portals Directory"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span>{t.officialPortalsBtn}</span>
            </button>

            <a
              href="tel:1930"
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl font-extrabold text-xs md:text-sm flex items-center gap-1.5 shadow"
              title="National Cyber Crime Helpline"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span>{t.helpline}</span>
            </a>
          </div>
        </div>

        {/* Location Auto-Update / Denied Notice Banner */}
        {locationBanner && (
          <div
            className={`border-t text-xs font-bold px-4 py-1.5 text-center flex items-center justify-center gap-2 ${
              locationBanner.type === 'auto'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : 'bg-amber-950/90 border-amber-700 text-amber-200'
            }`}
          >
            <MapPin
              className={`w-3.5 h-3.5 shrink-0 ${
                locationBanner.type === 'auto'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            />
            <span>
              {locationBanner.type === 'auto' ? (
                <>
                  {t.detectedBanner} <strong>{locationBanner.detail}</strong>
                </>
              ) : (
                t.locationDeniedBanner
              )}
            </span>
            <button
              type="button"
              onClick={() => setLocationBanner(null)}
              className="ml-2 opacity-80 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* Main Navigation Tabs */}
      <div className="max-w-5xl w-full mx-auto px-4 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('checker')}
            className={`py-3 px-3 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'checker'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{t.tabChecker}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trending')}
            className={`py-3 px-3 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'trending'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {t.tabTrending} ({combinedTrendingScams.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-3 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>{t.tabAnalytics}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`py-3 px-3 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'community'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            <span>
              {t.tabCommunity} ({complaints.length})
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1">
        {/* PAGE 1: SCAM & SPAM NUMBER CHECKER */}
        {activeTab === 'checker' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border-2 border-blue-200 p-4 md:p-6">
              <label className="block text-lg font-extrabold text-slate-800 mb-3">
                {t.inputLabel}
              </label>

              {selectedFile && (
                <div className="mb-4 bg-slate-100 p-3 rounded-2xl border border-slate-300 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {selectedFile.type.startsWith('image/') && (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-xl border border-slate-300"
                      />
                    )}
                    {selectedFile.type.startsWith('audio/') && (
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-10 h-10 text-blue-600 shrink-0" />
                        <audio
                          src={filePreview}
                          controls
                          className="h-10 max-w-[220px]"
                        />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-sm text-slate-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {t.readyToScan}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Quick Test Samples Bar for Live Demo */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mr-1">
                  {t.trySample}
                </span>
                {QUICK_DEMO_SAMPLES.map((sample) => (
                  <button
                    key={sample.labelKey}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickSample(sample.value)}
                    className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${sample.style}`}
                  >
                    {t[sample.labelKey]}
                  </button>
                ))}
              </div>

              <textarea
                rows="3"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.placeholder}
                className="w-full bg-slate-50 rounded-2xl p-4 text-base md:text-lg font-medium text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,.apk"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm md:text-base shadow-sm"
                  >
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <span>{t.uploadBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm md:text-base border ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse border-red-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    <Mic className="w-5 h-5 text-red-500" />
                    <span>{isListening ? t.listeningBtn : t.speakBtn}</span>
                  </button>

                  {(inputText || selectedFile) && (
                    <button
                      type="button"
                      onClick={clearInput}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-2xl"
                      title="Clear All"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => analyzeSuspiciousInput()}
                  disabled={loading}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-extrabold text-lg px-8 py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {loading ? (
                    <span>{t.checkingBtn}</span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{t.checkNowBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GIANT VISUAL VERDICT CARD (Fully translated via <Trans>) */}
            {result && (
              <div
                className={`rounded-3xl p-6 md:p-8 shadow-xl border-4 transition-all ${
                  result.status === 'DANGER'
                    ? 'bg-red-600 text-white border-red-800'
                    : result.status === 'SUSPICIOUS'
                    ? 'bg-amber-400 text-slate-950 border-amber-600'
                    : 'bg-emerald-600 text-white border-emerald-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="bg-white/20 p-5 rounded-3xl shrink-0">
                    {result.status === 'DANGER' && (
                      <XCircle className="w-24 h-24" />
                    )}
                    {result.status === 'SUSPICIOUS' && (
                      <AlertTriangle className="w-24 h-24" />
                    )}
                    {result.status === 'SAFE' && (
                      <CheckCircle2 className="w-24 h-24" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="inline-block bg-white text-slate-950 px-3 py-1 rounded-full text-xs font-black uppercase">
                        {t.statusLabels[result.status] || result.status}
                      </span>
                      <span className="inline-block bg-black/25 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                        {t.riskScoreLabel}: {result.score}%
                      </span>
                      {result.engine && (
                        <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                          ⚡ <Trans text={result.engine} lang={lang} />
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                      <Trans text={result.headline} lang={lang} />
                    </h2>
                    <p className="text-lg md:text-xl font-semibold opacity-95 leading-snug">
                      <Trans text={result.simpleReason} lang={lang} />
                    </p>

                    {result.detected_indicators &&
                      result.detected_indicators.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                          <span className="text-xs font-bold opacity-80">
                            {t.signalsLabel}
                          </span>
                          {result.detected_indicators.map((ind, i) => (
                            <span
                              key={i}
                              className="text-xs bg-black/20 px-2 py-0.5 rounded-md font-bold"
                            >
                              {result.status === 'SAFE' ? '✓' : '⚠️'}{' '}
                              <Trans text={ind} lang={lang} />
                            </span>
                          ))}
                        </div>
                      )}

                    {result.extracted_media_text && (
                      <div className="mt-2 bg-black/20 p-2.5 rounded-xl text-xs font-mono text-left max-h-24 overflow-y-auto">
                        <span className="font-bold block text-emerald-200">
                          {result.modality === 'image_ocr'
                            ? t.extractedFromPhoto
                            : t.transcribedFromAudio}
                        </span>
                        &ldquo;{result.extracted_media_text}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {result.actions && result.actions.length > 0 && (
                  <div className="mt-6 bg-black/20 rounded-2xl p-4 md:p-5">
                    <h3 className="font-extrabold text-lg mb-3 flex items-center gap-2">
                      <span>{t.whatToDoNow}</span>
                    </h3>
                    <ul className="space-y-2.5">
                      {result.actions.map((act, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 font-bold text-base md:text-lg"
                        >
                          <span className="bg-white text-slate-900 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0">
                            {idx + 1}
                          </span>
                          <span>
                            <Trans text={act} lang={lang} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Quick Caller ID Guide */}
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <PhoneOff className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {t.callerGuideTitle}
                  </h3>
                </div>
                <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {t.traiAlertBadge}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SPAM_CALLER_PREFIXES.map((item) => (
                  <div
                    key={item.code}
                    className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg font-black text-slate-900">
                          {item.code}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${item.riskColor}`}
                        >
                          <Trans text={item.risk} lang={lang} />
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">
                        {t.originLabel} <Trans text={item.country} lang={lang} />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-2">
                        <Trans text={item.scamType} lang={lang} />
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100">
                      💡 <Trans text={item.advice} lang={lang} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: TRENDING CYBER FRAUDS */}
        {activeTab === 'trending' && (
          <div className="space-y-6">
            <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📢</span>
                <div>
                  <h2 className="font-extrabold text-lg text-amber-950">
                    {t.trendingBannerTitle}
                  </h2>
                  <p className="text-sm text-amber-900 font-medium">
                    {t.trendingBannerDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openNewComplaintModal}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{t.reportScamBtn}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {combinedTrendingScams.map((scam) => (
                <div
                  key={scam.id}
                  className={`bg-white rounded-3xl shadow-md border-2 overflow-hidden ${
                    scam.isCommunityPromoted
                      ? 'border-emerald-500 ring-2 ring-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div
                    className={`${
                      scam.isCommunityPromoted
                        ? 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900'
                        : 'bg-slate-900'
                    } text-white p-5 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{scam.emoji}</span>
                      <div>
                        <span
                          className={`${
                            scam.isCommunityPromoted
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-red-600 text-white'
                          } text-xs font-black px-2.5 py-0.5 rounded-full`}
                        >
                          <Trans text={scam.badge} lang={lang} />
                        </span>
                        <h3 className="text-xl font-extrabold mt-1">
                          {scam.isCommunityPromoted ? (
                            getLocalizedCategory(scam.title)
                          ) : (
                            <Trans text={scam.title} lang={lang} />
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <p className="text-slate-700 font-semibold text-base">
                      <Trans text={scam.shortDesc} lang={lang} />
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {scam.steps.map((step, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-1"
                        >
                          <div className="text-2xl">{step.icon}</div>
                          <div className="font-extrabold text-slate-900 text-base">
                            <Trans text={step.title} lang={lang} />
                          </div>
                          <div className="text-sm text-slate-600 font-medium">
                            <Trans text={step.text} lang={lang} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-950 font-extrabold text-sm md:text-base">
                      <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span>
                        {t.goldenRule} <Trans text={scam.rule} lang={lang} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 3: 10-YEAR DATA EXPLORER */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <span className="bg-purple-100 text-purple-800 text-xs font-black px-3 py-1 rounded-full uppercase">
                  {t.analyticsBadge}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                  {t.analyticsTitle}
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  {t.analyticsSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch lg:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setChartView('bar')}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs md:text-sm flex items-center gap-2 transition-all ${
                    chartView === 'bar'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{t.barGraphTab}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartView('callers')}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs md:text-sm flex items-center gap-2 transition-all ${
                    chartView === 'callers'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <PhoneIncoming className="w-4 h-4" />
                  <span>{t.callersTab}</span>
                </button>
              </div>
            </div>

            {/* 4 Key Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-600 text-white rounded-2xl p-4 shadow">
                <div className="text-xs font-bold uppercase opacity-85">
                  {t.statTotalLostTitle}
                </div>
                <div className="text-2xl font-black mt-1">₹47,145 Cr</div>
                <div className="text-xs mt-1 opacity-90">
                  {t.statTotalLostSub}
                </div>
              </div>

              <div className="bg-orange-600 text-white rounded-2xl p-4 shadow">
                <div className="text-xs font-bold uppercase opacity-85">
                  {t.statCallLostTitle}
                </div>
                <div className="text-2xl font-black mt-1">₹16,825 Cr</div>
                <div className="text-xs mt-1 opacity-90">
                  {t.statCallLostSub}
                </div>
              </div>

              <div className="bg-amber-500 text-slate-950 rounded-2xl p-4 shadow">
                <div className="text-xs font-bold uppercase opacity-80">
                  {t.statSimsTitle}
                </div>
                <div className="text-2xl font-black mt-1">10.4+ Cr</div>
                <div className="text-xs font-bold mt-1">{t.statSimsSub}</div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow">
                <div className="text-xs font-bold uppercase text-emerald-400">
                  {t.statSpoofTitle}
                </div>
                <div className="text-2xl font-black mt-1">1.35+ Cr/Day</div>
                <div className="text-xs text-slate-300 mt-1">
                  {t.statSpoofSub}
                </div>
              </div>
            </div>

            {/* VIEW 1: BAR GRAPH */}
            {chartView === 'bar' && (
              <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {t.barGraphHeading}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      {t.barGraphHint}
                    </p>
                  </div>
                  <span className="bg-purple-100 text-purple-900 text-xs font-black px-3.5 py-1.5 rounded-xl border border-purple-200 self-start sm:self-auto">
                    {t.viewingYear} {activeYearData.year} (₹
                    {activeYearData.totalLostCr.toLocaleString('en-IN')} Cr)
                  </span>
                </div>

                <div className="pt-6 pb-2 px-2 overflow-x-auto">
                  <div className="min-w-[620px] h-72 flex items-end justify-between gap-3 border-b-2 border-slate-300 pb-2 px-2">
                    {TEN_YEAR_FRAUD_DATA.map((item, idx) => {
                      const maxVal = 14000;
                      const heightPercent = Math.max(
                        8,
                        Math.round((item.totalLostCr / maxVal) * 100)
                      );
                      const isSelected = idx === selectedYearIdx;

                      return (
                        <button
                          key={item.year}
                          type="button"
                          onClick={() => setSelectedYearIdx(idx)}
                          className={`flex-1 flex flex-col items-center justify-end h-full group focus:outline-none transition-transform ${
                            isSelected
                              ? 'scale-105'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          <span
                            className={`text-[11px] font-black mb-1.5 px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-purple-700 text-white shadow'
                                : 'text-slate-700'
                            }`}
                          >
                            ₹{item.totalLostCr}Cr
                          </span>

                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[46px] rounded-t-xl transition-all duration-300 ${
                              isSelected
                                ? 'bg-gradient-to-t from-purple-900 via-red-600 to-amber-400 ring-4 ring-purple-300 shadow-xl'
                                : 'bg-gradient-to-t from-purple-700 via-red-500 to-amber-400 group-hover:scale-105 shadow-md'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-w-[620px] flex justify-between gap-2 pt-3 px-1">
                    {TEN_YEAR_FRAUD_DATA.map((item, idx) => {
                      const isSelected = idx === selectedYearIdx;
                      return (
                        <button
                          key={item.year}
                          type="button"
                          onClick={() => setSelectedYearIdx(idx)}
                          className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                            isSelected
                              ? 'bg-purple-700 text-white shadow-md scale-105'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Year Deep Dive Card (Translated dynamically) */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-purple-500 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-600 text-white font-black text-xl md:text-2xl px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow">
                        <Calendar className="w-6 h-6 text-amber-300" />
                        <span>
                          {t.yearLabel} {activeYearData.year}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-purple-300">
                          {t.dominantCrimeIn} {activeYearData.year}
                        </div>
                        <h4 className="text-lg md:text-xl font-black text-white">
                          <Trans text={activeYearData.majorTrend} lang={lang} />
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedYearIdx((prev) => Math.max(0, prev - 1))
                        }
                        disabled={selectedYearIdx === 0}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-600 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{t.prevYear}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedYearIdx((prev) =>
                            Math.min(TEN_YEAR_FRAUD_DATA.length - 1, prev + 1)
                          )
                        }
                        disabled={
                          selectedYearIdx === TEN_YEAR_FRAUD_DATA.length - 1
                        }
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 shadow"
                      >
                        <span>{t.nextYear}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5">
                      <div className="text-xs font-bold text-slate-400 uppercase">
                        {t.totalMoneyLostIn} {activeYearData.year}
                      </div>
                      <div className="text-2xl font-black text-red-400 mt-1">
                        ₹{activeYearData.totalLostCr.toLocaleString('en-IN')}{' '}
                        {t.crores}
                      </div>
                      {yoyGrowthPercent !== null && (
                        <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                          📈 +{yoyGrowthPercent}% {t.increaseFrom}{' '}
                          {prevYearData.year}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5">
                      <div className="text-xs font-bold text-slate-400 uppercase">
                        {t.complaintsRegistered}
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {activeYearData.casesReported}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-300 mt-0.5">
                        {t.reportedVia}
                      </div>
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5">
                      <div className="text-xs font-bold text-slate-400 uppercase">
                        {t.spamSimsBlocked}
                      </div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        <Trans
                          text={activeYearData.spamNumbersBlockedLakhs}
                          lang={lang}
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-300 mt-0.5">
                        {t.disconnectedBy}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-2 text-sm">
                    <p className="text-slate-200 leading-relaxed">
                      <strong className="text-amber-300">
                        {t.whatHappened}
                      </strong>{' '}
                      <Trans
                        text={activeYearData.elaboratedStory}
                        lang={lang}
                      />
                    </p>
                    <p className="text-slate-300 text-xs">
                      <strong className="text-emerald-300">
                        {t.keyWarningSign}
                      </strong>{' '}
                      <Trans
                        text={activeYearData.keyWarningSign}
                        lang={lang}
                      />{' '}
                      •{' '}
                      <strong className="text-purple-300">
                        {t.primaryTarget}
                      </strong>{' '}
                      <Trans text={activeYearData.topTarget} lang={lang} />
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: SPAM CALLERS & INTL CALLS */}
            {chartView === 'callers' && (
              <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-6 h-6 text-red-600 shrink-0" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {t.callerGraphHeading}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        {t.callerGraphHint}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-extrabold">
                    <span className="flex items-center gap-1.5 text-red-600">
                      <span className="w-3 h-3 rounded bg-red-600 inline-block" />
                      {t.domesticCallsLegend}
                    </span>
                    <span className="flex items-center gap-1.5 text-orange-500">
                      <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
                      {t.intlCallersLegend}
                    </span>
                  </div>
                </div>

                {/* Dual-Bar Interactive Caller Chart */}
                <div className="pt-4 pb-2 px-2 overflow-x-auto">
                  <div className="min-w-[620px] h-64 flex items-end justify-between gap-3 border-b-2 border-slate-300 pb-2 px-2">
                    {TEN_YEAR_FRAUD_DATA.map((item, idx) => {
                      const maxCallVal = 3200;
                      const domPct = Math.max(
                        6,
                        Math.round((item.domesticScamCallsCr / maxCallVal) * 100)
                      );
                      const intlPct = Math.max(
                        5,
                        Math.round((item.intlCallerFraudCr / maxCallVal) * 100)
                      );
                      const isSelected = idx === selectedYearIdx;

                      return (
                        <button
                          key={item.year}
                          type="button"
                          onClick={() => setSelectedYearIdx(idx)}
                          className={`flex-1 flex flex-col items-center justify-end h-full focus:outline-none transition-transform ${
                            isSelected
                              ? 'scale-105'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="w-full h-full flex items-end justify-center gap-1">
                            <div
                              style={{ height: `${domPct}%` }}
                              title={`Domestic: ₹${item.domesticScamCallsCr} Cr`}
                              className={`w-4 sm:w-5 rounded-t-lg bg-red-600 transition-all ${
                                isSelected ? 'ring-2 ring-red-300 shadow-lg' : ''
                              }`}
                            />
                            <div
                              style={{ height: `${intlPct}%` }}
                              title={`International: ₹${item.intlCallerFraudCr} Cr`}
                              className={`w-4 sm:w-5 rounded-t-lg bg-orange-500 transition-all ${
                                isSelected ? 'ring-2 ring-orange-300 shadow-lg' : ''
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-w-[620px] flex justify-between gap-2 pt-3 px-1">
                    {TEN_YEAR_FRAUD_DATA.map((item, idx) => {
                      const isSelected = idx === selectedYearIdx;
                      return (
                        <button
                          key={item.year}
                          type="button"
                          onClick={() => setSelectedYearIdx(idx)}
                          className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                            isSelected
                              ? 'bg-red-600 text-white shadow-md scale-105'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Year Call Breakdown */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-red-500 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-lg font-black">
                      {t.yearLabel} {activeYearData.year} {t.telecomSplitTitle} (₹
                      {totalCallLossSelectedYear.toLocaleString('en-IN')}{' '}
                      {t.crores} — {t.totalCallFraud})
                    </h4>
                    <span className="text-xs font-extrabold bg-red-600/30 border border-red-400/50 text-red-200 px-3 py-1 rounded-full">
                      {t.spoofedBlocked}{' '}
                      <Trans
                        text={activeYearData.spoofedCallsBlockedPerDay}
                        lang={lang}
                      />
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3.5">
                      <div className="text-xs font-bold text-red-400 uppercase">
                        {t.domesticScamCalls} ({domCallSharePct}%)
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        ₹{activeYearData.domesticScamCallsCr.toLocaleString('en-IN')}{' '}
                        {t.crores}
                      </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3.5">
                      <div className="text-xs font-bold text-orange-400 uppercase">
                        {t.intlCallersCard} ({intlCallSharePct}%)
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        ₹{activeYearData.intlCallerFraudCr.toLocaleString('en-IN')}{' '}
                        {t.crores}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-1.5 text-xs md:text-sm">
                    <p className="text-slate-200">
                      <strong className="text-orange-300">
                        {t.topForeignPrefixes}
                      </strong>{' '}
                      <Trans text={activeYearData.topIntlOrigins} lang={lang} />
                    </p>
                    <p className="text-slate-300">
                      <strong className="text-emerald-300">
                        {t.callerTacticLabel}
                      </strong>{' '}
                      <Trans text={activeYearData.callerTactic} lang={lang} />
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 10-Year Category Share Breakdown */}
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-200 space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                {t.cumulativeShareHeading}
              </h3>
              <div className="space-y-3">
                {CATEGORY_BREAKDOWN.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between text-xs md:text-sm font-bold text-slate-800">
                      <span>
                        {cat.icon} <Trans text={cat.label} lang={lang} />
                      </span>
                      <span className="text-slate-900 font-black">
                        ₹{cat.amountCr.toLocaleString('en-IN')} {t.crores} (
                        {cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${cat.percentage}%` }}
                        className={`h-full rounded-full ${cat.badgeBg}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                <Info className="w-4 h-4 shrink-0 text-slate-400" />
                <span>{t.analyticsNote}</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: OFFICIAL CYBER PORTALS DIRECTORY */}
        {activeTab === 'portals' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border-2 border-blue-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-blue-600/30 border border-blue-400/40 text-blue-300 text-xs font-black px-3 py-1 rounded-full uppercase">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>{t.portalsBadge}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  {t.portalsHeading}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('checker')}
                className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 shadow"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backToChecker}</span>
              </button>
            </div>

            {/* Audience Filter Pills */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase mr-1">
                {t.filterAudience}
              </span>
              {PORTAL_AUDIENCES.map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setPortalFilter(aud)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    portalFilter === aud
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {aud === 'ALL' ? (
                    t.allPortals
                  ) : (
                    <Trans text={aud} lang={lang} />
                  )}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-black">
                        {t.tablePortalName}
                      </th>
                      <th className="py-4 px-4 font-black">{t.tableAudience}</th>
                      <th className="py-4 px-4 font-black">{t.tablePurpose}</th>
                      <th className="py-4 px-4 font-black text-right">
                        {t.tableWebsite}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredPortals.map((portal) => (
                      <tr
                        key={portal.name}
                        className="hover:bg-blue-50/50 transition-colors align-top"
                      >
                        <td className="py-4 px-4 font-extrabold text-slate-900">
                          <Trans text={portal.name} lang={lang} />
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block text-xs font-extrabold px-2.5 py-1 rounded-full border ${portal.audienceBadge}`}
                          >
                            <Trans text={portal.audience} lang={lang} />
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-600 leading-relaxed space-y-1">
                          <p className="font-semibold text-slate-800">
                            <Trans text={portal.whenToApproach} lang={lang} />
                          </p>
                          <p className="text-slate-500">
                            <Trans text={portal.actionEngine} lang={lang} />
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <a
                            href={portal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow"
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span>{portal.displayUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: CITIZEN SCAM EXPERIENCES */}
        {activeTab === 'community' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                  <Flame className="w-4 h-4" />
                  <span>{t.communityTitle}</span>
                </div>
                <div className="text-sm text-slate-300">
                  {t.communitySubPrefix} {complaints.length}{' '}
                  {t.communitySubSuffix}
                </div>
              </div>

              <button
                type="button"
                onClick={openNewComplaintModal}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 shrink-0"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t.registerExpBtn}</span>
              </button>
            </div>

            {/* YEAR SELECTOR TABS */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-sm md:text-base text-slate-900">
                  {t.selectYear}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableComplaintYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedComplaintYear(yr)}
                    className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${
                      selectedComplaintYear === yr
                        ? 'bg-emerald-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* MONTH-WISE COMPLAINTS (Every citizen story translated into active language!) */}
            <div className="space-y-6">
              {complaintsByMonthForSelectedYear.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500 font-semibold">
                  {t.noReportsForYear} {selectedComplaintYear}.
                </div>
              ) : (
                complaintsByMonthForSelectedYear.map((monthGroup) => (
                  <div
                    key={monthGroup.monthIndex}
                    className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden"
                  >
                    <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                      <h3 className="font-black text-base md:text-lg">
                        {localizedMonths[monthGroup.monthIndex] ||
                          ENGLISH_MONTH_NAMES[monthGroup.monthIndex]}{' '}
                        {selectedComplaintYear}
                      </h3>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full font-bold">
                        {monthGroup.items.length} {t.reportsCount}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {monthGroup.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-red-100 text-red-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                                {getLocalizedCategory(item.category)}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                📅 {item.dateISO} • {t.byLabel}{' '}
                                <Trans text={item.reporterName} lang={lang} />
                              </span>
                              {Number(item.amountLost) > 0 && (
                                <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full">
                                  💸 {t.lostLabel} ₹
                                  {Number(item.amountLost).toLocaleString(
                                    'en-IN'
                                  )}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base md:text-lg font-extrabold text-slate-900">
                              <Trans text={item.title} lang={lang} />
                            </h4>

                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                              <Trans text={item.description} lang={lang} />
                            </p>

                            {item.scammerNumber && (
                              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1 rounded-xl text-xs font-extrabold text-slate-800">
                                <span>{t.scammerNumTag}</span>
                                <span className="text-red-600">
                                  {item.scammerNumber}
                                </span>
                              </div>
                            )}

                            {item.photoData && (
                              <div className="pt-2">
                                <img
                                  src={item.photoData}
                                  alt="Citizen submitted proof"
                                  className="max-h-40 rounded-xl border border-slate-300 object-cover shadow-sm"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex md:flex-col items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditComplaintModal(item)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs px-3 py-2 rounded-xl border border-blue-200 flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{t.editBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComplaint(item.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs px-3 py-2 rounded-xl border border-red-200 flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t.deleteBtn}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={openNewComplaintModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 sm:px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-white transition-transform hover:scale-105"
        >
          <MessageSquarePlus className="w-6 h-6 text-amber-300 shrink-0" />
          <div className="text-left">
            <div className="text-xs sm:text-sm font-black leading-none">
              {t.fabShare}
            </div>
          </div>
        </button>
      </div>

      {/* FLOATING HELPER AI CASE INVESTIGATOR (Entire conversation translated live!) */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isChatOpen ? (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 sm:px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-white transition-transform hover:scale-105"
          >
            <Bot className="w-6 h-6 text-emerald-300 shrink-0" />
            <span className="text-xs sm:text-sm">{t.fabChat}</span>
          </button>
        ) : (
          <div className="w-[350px] sm:w-[410px] bg-white rounded-3xl shadow-2xl border-2 border-blue-600 overflow-hidden flex flex-col max-h-[560px]">
            <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm">{t.chatTitle}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetChatInvestigation}
                  className="text-slate-400 hover:text-white p-1.5"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3.5 space-y-3 overflow-y-auto flex-1 bg-slate-50 max-h-[390px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    className={`flex ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
                      }`}
                    >
                      <Trans text={msg.text} lang={lang} />
                    </div>
                  </div>

                  {msg.sender === 'bot' &&
                    msg.options &&
                    idx === chatMessages.length - 1 && (
                      <div className="flex flex-col gap-1.5 pl-1 pt-1">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectDiagnosticOption(opt)}
                            className="text-left text-xs font-extrabold bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white px-3.5 py-2.5 rounded-xl border border-blue-200 transition-colors shadow-sm"
                          >
                            <Trans text={opt.label} lang={lang} />
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder={t.chatPlaceholder}
                className="flex-1 bg-slate-100 text-slate-900 text-xs sm:text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CITIZEN COMPLAINT REGISTRATION / EDIT MODAL (100% Translated) */}
      {showComplaintForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquarePlus className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-black text-lg leading-tight">
                    {editingId ? t.modalTitleEdit : t.modalTitleNew}
                  </h3>
                  <p className="text-xs text-slate-300">{t.modalSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowComplaintForm(false);
                  setEditingId(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveComplaint}
              className="p-6 space-y-4 max-h-[78vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    {t.labelNameCity}
                  </label>
                  <input
                    type="text"
                    value={formReporter}
                    onChange={(e) => setFormReporter(e.target.value)}
                    placeholder={t.placeholderNameCity}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    {t.labelIncidentDate}
                  </label>
                  <input
                    type="date"
                    value={formDateISO}
                    onChange={(e) => setFormDateISO(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {t.labelScamCategory}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.emoji} {getLocalizedCategory(cat.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {t.labelShortHeadline}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t.placeholderHeadline}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {t.labelWhatHappened}
                </label>
                <textarea
                  rows="3"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t.placeholderDesc}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    {t.labelScammerNum}
                  </label>
                  <input
                    type="text"
                    value={formScammerNum}
                    onChange={(e) => setFormScammerNum(e.target.value)}
                    placeholder={t.placeholderScammerNum}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    {t.labelAmountLost}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formAmountLost}
                    onChange={(e) => setFormAmountLost(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {t.labelAttachProof}
                </label>
                <input
                  ref={complaintPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleComplaintPhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => complaintPhotoRef.current?.click()}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>
                      {formPhotoData
                        ? t.btnChangeScreenshot
                        : t.btnUploadScreenshot}
                    </span>
                  </button>
                  {formPhotoData && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formPhotoData}
                        alt="Evidence preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhotoData(null)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        {t.btnRemove}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowComplaintForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t.modalCancel}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-md"
                >
                  {editingId ? t.modalSubmitEdit : t.modalSubmitNew}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}