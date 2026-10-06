import type { PilgrimLanguage } from '../models/screeningLog';
import type { AnswerKey, FlagReason, RecommendationKey, RiskLevel, Zone } from '../models/types';
import type { Bilingual } from './translate';

export const UI = {
  brandSub: { ar: 'محطة الفحص الوقائي للقدم', en: 'Preventive foot screening' },
  simulated: { ar: 'بيانات تجريبية', en: 'Simulated data' },
  stepStart: { ar: 'البداية', en: 'Start' },
  stepQuestions: { ar: 'الأسئلة', en: 'Questions' },
  stepScan: { ar: 'الفحص', en: 'Scan' },
  stepResult: { ar: 'النتيجة', en: 'Result' },

  startTitle: { ar: 'فحص القدم الوقائي', en: 'Preventive foot check' },
  startLede: {
    ar: 'فحص سريع لمدة دقيقة يكشف مناطق الخطر في قدميك قبل أن تتحول إلى إصابة.',
    en: 'A one-minute check that finds risk areas on your feet before they become an injury.',
  },
  startVolunteer: {
    ar: 'للمرشد: اطلب من الحاج خلع الحذاء والجوارب والجلوس قليلًا قبل الفحص.',
    en: 'Volunteer: ask the pilgrim to take off shoes and socks and sit briefly before the scan.',
  },
  startFootHint: { ar: 'ستقف على المنصة بعد ستة أسئلة قصيرة', en: 'You will stand on the platform after six short questions' },

  questionCount: { ar: 'سؤال {n} من {total}', en: 'Question {n} of {total}' },
  yes: { ar: 'نعم', en: 'Yes' },
  no: { ar: 'لا', en: 'No' },
  back: { ar: 'رجوع', en: 'Back' },
  whyWeAsk: { ar: 'لماذا نسأل؟', en: 'Why we ask' },
  answers: { ar: 'الإجابات', en: 'Answers' },

  scanTitle: { ar: 'قف بثبات على المنصة', en: 'Stand still on the platform' },
  scanLede: {
    ar: 'ضع كل قدم على العلامة المرسومة ولا تتحرك حتى يكتمل الفحص.',
    en: 'Place each foot on its outline and keep still until the scan finishes.',
  },
  scanReading: { ar: 'جارٍ قراءة المستشعرات… {k} من {total}', en: 'Reading sensors… {k} of {total}' },
  scanComplete: { ar: 'اكتمل الفحص', en: 'Scan complete' },
  sensorPressure: { ar: 'ضغط القدم · 8 مستشعرات', en: 'Foot pressure · 8 sensors' },
  sensorThermal: { ar: 'التصوير الحراري', en: 'Thermal camera' },
  sensorCamera: { ar: 'الكاميرا', en: 'Foot camera' },
  notConnected: { ar: 'غير متصل في النموذج', en: 'Not connected in prototype' },
  showResult: { ar: 'عرض النتيجة', en: 'Show result' },
  skipWait: { ar: 'تخطي الانتظار', en: 'Skip wait' },
  sensorError: {
    ar: 'تعذّرت قراءة المستشعرات. تأكد من توصيل المنصة ثم أعد المحاولة.',
    en: "Couldn't read the sensors. Check the platform connection and try again.",
  },
  retry: { ar: 'أعد المحاولة', en: 'Try again' },

  referral: { ar: 'تحويل: رافق الحاج إلى النقطة الطبية', en: 'Referral: guide the pilgrim to the medical point' },
  qrNote: { ar: 'امسح الرمز لحفظ نتيجتك. لا يحتوي على أي بيانات شخصية.', en: 'Scan to keep your result. It holds no personal data.' },
  qrLabel: { ar: 'رمز النتيجة', en: 'Result QR code' },
  illustrativeRules: { ar: 'قواعد توضيحية غير معتمدة سريريًا', en: 'Illustrative rules, not clinically validated' },
  nextPilgrim: { ar: 'حاج جديد', en: 'Next pilgrim' },
  volunteerList: { ar: 'قائمة المرشد', en: 'Volunteer list' },
  markedAreas: { ar: 'المناطق المحددة', en: 'Marked areas' },
  noMarkedAreas: { ar: 'لا توجد مناطق ضغط مرتفع', en: 'No high-pressure areas' },
  footMapLabel: { ar: 'خريطة ضغط القدمين', en: 'Foot pressure map' },
  legendNormal: { ar: 'طبيعي', en: 'Normal' },
  legendRaised: { ar: 'ضغط مرتفع', en: 'Raised pressure' },
  legendHigh: { ar: 'ضغط مرتفع جدًا', en: 'High pressure' },

  todaysScreenings: { ar: 'فحوصات اليوم', en: "Today's screenings" },
  screened: { ar: 'تم فحصهم', en: 'screened' },
  highRisk: { ar: 'خطر مرتفع', en: 'high risk' },
  referred: { ar: 'تم تحويلهم', en: 'referred' },
  colTime: { ar: 'الوقت', en: 'Time' },
  colScreening: { ar: 'رقم الفحص', en: 'Screening' },
  colLanguage: { ar: 'لغة الحاج', en: 'Language' },
  colResult: { ar: 'النتيجة', en: 'Result' },
  colAreas: { ar: 'المناطق المحددة', en: 'Marked areas' },
  colReferral: { ar: 'تحويل', en: 'Referral' },
  thisScreening: { ar: 'هذا الفحص', en: 'This screening' },
  leftFoot: { ar: 'القدم اليسرى', en: 'Left foot' },
  rightFoot: { ar: 'القدم اليمنى', en: 'Right foot' },
  leftShort: { ar: 'يسار', en: 'Left' },
  rightShort: { ar: 'يمين', en: 'Right' },
} as const satisfies Record<string, Bilingual>;

export interface QuestionCopy {
  readonly question: Bilingual;
  readonly short: Bilingual;
  readonly why: Bilingual;
}

export const QUESTIONS: Readonly<Record<AnswerKey, QuestionCopy>> = {
  diabetes: {
    question: { ar: 'هل لديك مرض السكري؟', en: 'Do you have diabetes?' },
    short: { ar: 'السكري', en: 'Diabetes' },
    why: { ar: 'السكري يقلل الإحساس في القدم ويبطئ التئام الجروح.', en: 'Diabetes reduces feeling in the feet and slows wound healing.' },
  },
  previousFootInjury: {
    question: { ar: 'هل أُصبت في قدمك من قبل؟', en: 'Have you injured your foot before?' },
    short: { ar: 'إصابة سابقة', en: 'Past injury' },
    why: { ar: 'الإصابة السابقة تزيد احتمال تكرارها مع المشي الطويل.', en: 'A past injury is more likely to return with long walking.' },
  },
  currentPain: {
    question: { ar: 'هل تشعر بألم في قدمك الآن؟', en: 'Do you feel foot pain right now?' },
    short: { ar: 'ألم حالي', en: 'Pain now' },
    why: { ar: 'الألم قد يكون أول علامة على بثرة أو التهاب.', en: 'Pain can be the first sign of a blister or inflammation.' },
  },
  numbness: {
    question: { ar: 'هل تشعر بتنميل في قدميك؟', en: 'Do your feet feel numb?' },
    short: { ar: 'تنميل', en: 'Numbness' },
    why: { ar: 'مع التنميل قد لا يشعر الحاج بالجرح عند حدوثه.', en: 'With numbness, a wound can go unnoticed.' },
  },
  currentWound: {
    question: { ar: 'هل يوجد جرح في قدمك الآن؟', en: 'Is there a wound on your foot now?' },
    short: { ar: 'جرح حالي', en: 'Wound now' },
    why: { ar: 'أي جرح مفتوح يحتاج تقييمًا طبيًا قبل مواصلة المشي.', en: 'Any open wound needs a medical check before more walking.' },
  },
  unusualFootwear: {
    question: { ar: 'هل تلبس حذاءً جديدًا أو غير معتاد؟', en: 'Are you wearing new or unusual shoes?' },
    short: { ar: 'حذاء غير معتاد', en: 'Unusual shoes' },
    why: { ar: 'الحذاء الجديد أو الضيق يسبب الاحتكاك والبثور.', en: 'New or tight shoes cause friction and blisters.' },
  },
};

export const ZONE_NAMES: Readonly<Record<Zone, Bilingual>> = {
  hallux: { ar: 'إبهام القدم', en: 'Big toe' },
  medialForefoot: { ar: 'مقدمة القدم الداخلية', en: 'Inner forefoot' },
  lateralForefoot: { ar: 'مقدمة القدم الخارجية', en: 'Outer forefoot' },
  heel: { ar: 'الكعب', en: 'Heel' },
};

export const FLAG_REASONS: Readonly<Record<FlagReason, Bilingual>> = {
  highLoad: { ar: 'ضغط مرتفع جدًا', en: 'high pressure' },
  asymmetry: { ar: 'فرق كبير بين القدمين', en: 'big left/right gap' },
};

export const RISK_LEVELS: Readonly<Record<RiskLevel, { readonly title: Bilingual; readonly summary: Bilingual }>> = {
  low: {
    title: { ar: 'خطر منخفض', en: 'Low risk' },
    summary: { ar: 'قدماك بحالة جيدة. حافظ على العناية اليومية.', en: 'Your feet look fine. Keep up daily care.' },
  },
  moderate: {
    title: { ar: 'خطر متوسط', en: 'Moderate risk' },
    summary: { ar: 'توجد علامات تحتاج انتباهًا. اتبع التوصيات التالية.', en: 'Some signs need attention. Follow the advice below.' },
  },
  high: {
    title: { ar: 'خطر مرتفع', en: 'High risk' },
    summary: { ar: 'يُنصح بمراجعة الفريق الطبي اليوم.', en: 'We recommend seeing the medical team today.' },
  },
};

export const RECOMMENDATIONS: Readonly<Record<RecommendationKey, Bilingual>> = {
  seeMedical: { ar: 'توجّه إلى أقرب نقطة طبية اليوم.', en: 'Visit the nearest medical point today.' },
  offload: { ar: 'احمِ المنطقة المحددة ببطانة أو ضمادة واقية.', en: 'Protect the marked area with a cushioned insole or pad.' },
  footwear: { ar: 'البس حذاءً مريحًا مجرّبًا مع جوارب قطنية نظيفة.', en: 'Wear comfortable, broken-in shoes with clean cotton socks.' },
  dailyCheck: { ar: 'افحص قدميك كل مساء، وبين الأصابع أيضًا.', en: 'Check your feet every evening, including between the toes.' },
  rest: { ar: 'استرح وارفع قدميك بين المناسك.', en: 'Rest and raise your feet between rituals.' },
  hotGround: { ar: 'لا تمشِ حافيًا، فالأرض قد تصل حرارتها إلى 50–70°C.', en: 'Never walk barefoot: the ground can reach 50–70°C.' },
};

export const PILGRIM_LANGUAGES: Readonly<Record<PilgrimLanguage, Bilingual>> = {
  ar: { ar: 'العربية', en: 'Arabic' },
  en: { ar: 'الإنجليزية', en: 'English' },
  ur: { ar: 'الأردية', en: 'Urdu' },
  id: { ar: 'الإندونيسية', en: 'Indonesian' },
  tr: { ar: 'التركية', en: 'Turkish' },
  bn: { ar: 'البنغالية', en: 'Bengali' },
  ha: { ar: 'الهوسا', en: 'Hausa' },
  fa: { ar: 'الفارسية', en: 'Persian' },
  ms: { ar: 'الملايوية', en: 'Malay' },
};
