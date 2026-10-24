import type { ExamGroup } from '../models/questions';
import type { ActionCategory, ExamKey, Sex } from '../models/types';
import type { Bilingual } from './translate';

/*
 * Staff-facing copy: the card scan, the volunteer's exam, the clinical report and the volunteer list.
 * Staff read Arabic or English. Everything a pilgrim reads lives in i18n/locales in every pilgrim language.
 */

export const UI = {
  simulated: { ar: 'بيانات تجريبية', en: 'Simulated data' },
  liveSensors: { ar: 'مستشعرات حية', en: 'Live sensors' },
  staffLanguageNote: {
    ar: 'شاشات المتطوع والطبيب بالعربية أو الإنجليزية. يختار الحاج من {count} لغة عند استلام المحطة.',
    en: 'Volunteer and clinician screens are in Arabic or English. The pilgrim picks from {count} languages at handover.',
  },
  platformOffline: { ar: 'المنصة غير متصلة', en: 'Platform not connected' },

  identifyTitle: { ar: 'امسح بطاقة الحاج', en: "Scan the pilgrim's card" },
  identifyLede: {
    ar: 'مرّر باركود البطاقة أمام الماسح. يظهر الاسم والعمر والجنس والجنسية لهذا الفحص فقط، ولا يُحفظ شيء.',
    en: "Hold the card's barcode to the scanner. Name, age, sex and nationality show for this screening only; nothing is saved.",
  },
  cardField: { ar: 'رمز البطاقة', en: 'Card code' },
  cardPlaceholder: { ar: 'بانتظار الماسح…', en: 'Waiting for the scanner…' },
  lookUp: { ar: 'بحث', en: 'Look up' },
  sampleCards: { ar: 'بطاقات تجريبية', en: 'Sample cards' },
  noCard: { ar: 'متابعة بلا بطاقة', en: 'Continue without a card' },
  cardEmpty: { ar: 'لم يصل رمز من الماسح. امسح البطاقة مرة أخرى.', en: 'No code came from the scanner. Scan the card again.' },
  cardUnknown: {
    ar: 'لم نتعرف على هذه البطاقة. جرّب بطاقة تجريبية أو تابع بلا بطاقة.',
    en: "This card wasn't recognised. Try a sample card, or continue without one.",
  },
  prepHint: {
    ar: 'اطلب من الحاج خلع الحذاء والجوارب والجلوس قليلًا قبل الفحص.',
    en: 'Ask the pilgrim to take off shoes and socks and sit briefly before the exam.',
  },
  exploreStation: { ar: 'استكشف مكونات المحطة', en: 'Explore inside the station' },

  pilgrim: { ar: 'الحاج', en: 'Pilgrim' },
  age: { ar: 'العمر', en: 'Age' },
  sex: { ar: 'الجنس', en: 'Sex' },
  nationality: { ar: 'الجنسية', en: 'Nationality' },
  screenLanguage: { ar: 'لغة الشاشة', en: 'Screen language' },
  anonymous: { ar: 'بلا بطاقة', en: 'No card' },

  examTitle: { ar: 'افحص القدمين', en: 'Examine both feet' },
  examLede: {
    ar: 'الفحص أولًا ثم القياس. سجّل ما تجده، ويمكنك اختيار «غير متأكد».',
    en: 'Examine first, then measure. Record what you find; "Not sure" is allowed.',
  },
  examNote: {
    ar: 'قراءات الحرارة والضغط وحدها لا تستبعد اعتلال الأعصاب أو ضعف التروية.',
    en: 'Temperature and pressure alone cannot rule out nerve damage or poor circulation.',
  },
  examRemaining: { ar: 'بنود لم تُسجّل: {n}', en: 'Not recorded yet: {n}' },
  examDone: { ar: 'سُجّلت كل البنود', en: 'Every item recorded' },
  examContinue: { ar: 'سلّم المحطة للحاج', en: 'Hand over to the pilgrim' },
  examUrgent: { ar: 'عاجل: أوقف القياس وافتح التقرير', en: 'Urgent: stop testing, open the report' },
  whichFoot: { ar: 'أي قدم؟', en: 'Which foot?' },

  doctorTitle: { ar: 'التقرير السريري', en: 'Clinical report' },
  doctorLede: { ar: 'دعم قرار للفحص الوقائي، وليس تشخيصًا.', en: 'Decision support for preventive screening, not a diagnosis.' },
  provisional: {
    ar: 'فئات تعامل مقترحة من الفريق، تحتاج مراجعة سريرية وتحققًا مستقبليًا، ولا تمثل احتمالات إصابة.',
    en: 'Proposed action categories from the team sheet. They need clinical review and prospective validation, and are not injury probabilities.',
  },
  criteria: { ar: 'المعايير', en: 'Criteria' },
  actionRequired: { ar: 'الإجراء المطلوب', en: 'Action required' },
  whyThisCategory: { ar: 'سبب التصنيف', en: 'Why this category' },
  illustrativeRule: { ar: 'توضيحية', en: 'illustrative' },
  examFindings: { ar: 'نتائج الفحص', en: 'Exam findings' },
  pilgrimAnswers: { ar: 'إجابات الحاج', en: "Pilgrim's answers" },
  answeredIn: { ar: 'أجاب بلغة: {language}', en: 'Answered in {language}' },
  notRecorded: { ar: 'لم يُسجَّل', en: 'Not recorded' },
  nothingFound: { ar: 'لا توجد نتائج إيجابية', en: 'No positive findings' },
  dataSources: { ar: 'مصادر البيانات', en: 'Data sources' },
  sourcePreset: { ar: 'سيناريو جاهز · بيانات تجريبية', en: 'Preset scenario · simulated' },
  sourceFake: { ar: 'جهاز ESP32 تجريبي · بيانات تجريبية', en: 'Fake ESP32 · simulated' },
  sourceEsp32: { ar: 'منصة ESP32 · قراءة حية', en: 'ESP32 platform · live reading' },
  capturedAt: { ar: 'وقت القراءة {time}', en: 'Captured {time}' },
  testingStopped: { ar: 'أُوقف القياس بسبب علامة عاجلة', en: 'Device testing stopped for an urgent finding' },
  noReading: { ar: 'لا توجد قراءة ضغط', en: 'No pressure reading' },
  zoneLoads: { ar: 'الحمل النسبي لكل منطقة', en: 'Relative load by zone' },
  colZone: { ar: 'المنطقة', en: 'Zone' },
  colGap: { ar: 'الفرق', en: 'Gap' },
  loadNote: {
    ar: 'نسبة من ضغطة المعايرة لكل مستشعر، وليست قياس ضغط بالكيلوباسكال.',
    en: "Share of each sensor's calibration press, not a pressure measurement in kPa.",
  },

  todaysScreenings: { ar: 'فحوصات اليوم', en: "Today's screenings" },
  screened: { ar: 'تم فحصهم', en: 'screened' },
  highConcern: { ar: 'خطورة مرتفعة أو عاجلة', en: 'high or urgent' },
  referred: { ar: 'تم تحويلهم', en: 'referred' },
  colTime: { ar: 'الوقت', en: 'Time' },
  colScreening: { ar: 'رقم الفحص', en: 'Screening' },
  colLanguage: { ar: 'لغة الحاج', en: 'Language' },
  colResult: { ar: 'الفئة', en: 'Category' },
  colAreas: { ar: 'المناطق المحددة', en: 'Marked areas' },
  colReferral: { ar: 'تحويل', en: 'Referral' },
  thisScreening: { ar: 'هذا الفحص', en: 'This screening' },
} as const satisfies Record<string, Bilingual>;

export const SEX_NAMES: Readonly<Record<Sex, Bilingual>> = {
  male: { ar: 'ذكر', en: 'Male' },
  female: { ar: 'أنثى', en: 'Female' },
};

/** Names for the nationalities the station maps to a language (models/pilgrimCards.ts). */
export const NATIONALITY_NAMES: Readonly<Record<string, Bilingual>> = {
  SA: { ar: 'السعودية', en: 'Saudi Arabia' },
  EG: { ar: 'مصر', en: 'Egypt' },
  DZ: { ar: 'الجزائر', en: 'Algeria' },
  SD: { ar: 'السودان', en: 'Sudan' },
  IQ: { ar: 'العراق', en: 'Iraq' },
  MA: { ar: 'المغرب', en: 'Morocco' },
  ID: { ar: 'إندونيسيا', en: 'Indonesia' },
  PK: { ar: 'باكستان', en: 'Pakistan' },
  IN: { ar: 'الهند', en: 'India' },
  BD: { ar: 'بنغلاديش', en: 'Bangladesh' },
  NG: { ar: 'نيجيريا', en: 'Nigeria' },
  TR: { ar: 'تركيا', en: 'Türkiye' },
  MY: { ar: 'ماليزيا', en: 'Malaysia' },
  SN: { ar: 'السنغال', en: 'Senegal' },
  ML: { ar: 'مالي', en: 'Mali' },
  RU: { ar: 'روسيا', en: 'Russia' },
  UZ: { ar: 'أوزبكستان', en: 'Uzbekistan' },
  GB: { ar: 'المملكة المتحدة', en: 'United Kingdom' },
};

export const EXAM_GROUP_COPY: Readonly<Record<ExamGroup, { readonly title: Bilingual; readonly note: Bilingual }>> = {
  inspect: {
    title: { ar: 'افحص القدمين بالنظر', en: 'Inspect both feet' },
    note: { ar: 'الجروح والبثور والثفن والتشوه والاحمرار والتورم.', en: 'Wounds, blisters, callus, deformity, redness and swelling.' },
  },
  essential: {
    title: { ar: 'الإحساس والتروية', en: 'Sensation and circulation' },
    note: {
      ar: 'إلزامي: من دونهما يكون التقييم غير مكتمل. افحص بمزيد من الاختبارات عند الحاجة.',
      en: 'Required: without these the assessment is incomplete. Test further when indicated.',
    },
  },
  urgent: {
    title: { ar: 'علامات عاجلة', en: 'Urgent signs' },
    note: { ar: 'أي «نعم» توقف القياس وتحوّل الحاج فورًا.', en: 'Any "yes" stops device testing and refers the pilgrim now.' },
  },
};

export const EXAM_COPY: Readonly<Record<ExamKey, Bilingual>> = {
  openWound: { ar: 'جرح مفتوح أو قرحة أو آفة تتفاقم', en: 'Open wound, ulcer or worsening lesion' },
  blister: { ar: 'نفطة (بثرة)', en: 'Blister' },
  callus: { ar: 'ثفن (تصلّب الجلد)', en: 'Callus' },
  deformity: { ar: 'تشوّه (مثل الإبهام الأروح أو الأصابع المخلبية)', en: 'Deformity (e.g. bunion, claw toes)' },
  redness: { ar: 'احمرار', en: 'Redness' },
  swelling: { ar: 'تورّم', en: 'Swelling' },
  lossOfSensation: { ar: 'فقدان الإحساس الواقي (خيط 10 غرامات)', en: 'Loss of protective sensation (10-g monofilament)' },
  reducedPulses: { ar: 'ضعف نبض القدم أو غيابه، أو ضعف تروية معروف', en: 'Reduced or absent foot pulses, or known poor circulation' },
  spreadingInfection: { ar: 'عدوى منتشرة أو أعراض عامة', en: 'Spreading infection, or looks unwell' },
  hotSwollenFoot: { ar: 'قدم ساخنة وحمراء ومتورمة حديثًا', en: 'New hot, red, swollen foot' },
  coldPaleFoot: { ar: 'قدم باردة أو شاحبة فجأة', en: 'Sudden cold or pale foot' },
  majorTrauma: { ar: 'إصابة شديدة أو تعذّر تحمل الوزن', en: 'Significant injury, or cannot bear weight' },
};

export interface CategoryCopy {
  readonly title: Bilingual;
  readonly criteria: Bilingual;
  readonly action: Bilingual;
}

/** The team's action-category sheet (2026-10-09), English and Arabic editions. */
export const CATEGORY_COPY: Readonly<Record<ActionCategory, CategoryCopy>> = {
  low: {
    title: { ar: 'خطورة منخفضة', en: 'Low concern' },
    criteria: {
      ar: 'الجلد سليم، ولا توجد أعراض مقلقة؛ فُحص الإحساس الواقي والتروية وكانا طبيعيين؛ ولا يوجد تاريخ مرضي مهم للقدم؛ والحذاء مناسب والقراءات موثوقة.',
      en: 'Skin intact; no concerning symptoms; protective sensation and circulation assessed as normal; no significant prior foot disease; suitable footwear; reliable readings.',
    },
    action: {
      ar: 'التوعية بالعناية بالقدم، وارتداء حذاء مناسب، وتجنب المشي حافيًا، وفحص القدمين يوميًا.',
      en: 'Foot-care advice, suitable footwear, avoid barefoot walking, daily self-inspection.',
    },
  },
  moderate: {
    title: { ar: 'خطورة متوسطة', en: 'Moderate concern' },
    criteria: {
      ar: 'لا توجد علامات خطورة مرتفعة، لكن الحذاء يحتك بالجلد، أو زاد المشي كثيرًا، أو يوجد ثفن أو تشوه واضح، أو تهيج موضعي أو نفطة بسيطة، أو قراءة غير مفسرة تتكرر عند القياس.',
      en: 'No high-risk findings, but footwear rubbing, unusually heavy walking, substantial callus or deformity, minor localized irritation or uncomplicated blister, or a repeatable unexplained sensor finding.',
    },
    action: {
      ar: 'تخفيف الاحتكاك والضغط، وفحص الجلد وحمايته، وتعديل الحذاء، وإعادة التقييم إذا استمرت العلامات أو ساءت.',
      en: 'Reduce friction and loading; inspect and protect skin; adjust footwear; arrange reassessment if findings persist or worsen.',
    },
  },
  high: {
    title: { ar: 'خطورة مرتفعة - تقييم سريري قريب', en: 'High concern: priority clinical review' },
    criteria: {
      ar: 'فقدان الإحساس الواقي؛ أو ضعف تروية معروف أو مشتبه؛ أو قرحة سابقة أو بتر أو قدم شاركو؛ أو جرح مفتوح حالي، أو آفة تتفاقم، أو آفة في قدم معرضة للخطر.',
      en: 'Loss of protective sensation; known or suspected poor circulation; previous ulcer, amputation or Charcot disease; or current open wound, worsening lesion, or lesion on a vulnerable foot.',
    },
    action: {
      ar: 'تقييم سريري قريب؛ وتقييم في اليوم نفسه عند وجود جرح نشط أو آفة تتفاقم؛ ووضع خطة فردية لتخفيف الضغط والمشي.',
      en: 'Prompt clinician assessment. Same-day review for an active wound or worsening lesion; individualized offloading and walking plan.',
    },
  },
  urgent: {
    title: { ar: 'إحالة عاجلة تتجاوز التصنيف', en: 'Urgent override' },
    criteria: {
      ar: 'علامات عدوى منتشرة أو أعراض عامة؛ أو قدم ساخنة وحمراء ومتورمة لدى شخص لديه اعتلال أعصاب؛ أو قدم باردة وشاحبة فجأة؛ أو إصابة شديدة أو تعذر تحمل الوزن.',
      en: 'Spreading infection or systemic illness; new hot, red, swollen neuropathic foot; sudden cold or pale foot; significant trauma or inability to bear weight.',
    },
    action: {
      ar: 'إيقاف القياس الروتيني، وترتيب تقييم طبي عاجل أو إسعافي. عند الاشتباه بقدم شاركو، يلزم تثبيت القدم وتخفيف الضغط بتوجيه سريري.',
      en: 'Stop routine device testing; arrange urgent or emergency medical assessment. Suspected Charcot requires clinician-directed immobilization and offloading.',
    },
  },
  incomplete: {
    title: { ar: 'التقييم غير مكتمل', en: 'Incomplete assessment' },
    criteria: {
      ar: 'لم يُفحص الإحساس أو التروية فحصًا أساسيًا، أو كانت قراءات الحرارة أو الضغط غير موثوقة.',
      en: 'Essential sensation or circulation examination missing, or temperature or pressure data unreliable.',
    },
    action: {
      ar: 'إكمال التقييم أو إعادة القياس، وعدم تصنيف الشخص ضمن «الخطورة المنخفضة».',
      en: 'Complete or repeat the assessment; do not report "low concern".',
    },
  },
};

/** Plain-language names for the rules in models/rules.ts, shown in the clinical report. Keyed by rule id. */
export const RULE_COPY: Readonly<Record<string, Bilingual>> = {
  'spreading-infection': { ar: 'عدوى منتشرة أو أعراض عامة في الفحص', en: 'Spreading infection or systemic illness on exam' },
  'infection-with-fever': { ar: 'علامات التهاب في القدم مع حمى أو توعك', en: 'Foot infection signs with fever or feeling unwell' },
  'hot-swollen-neuropathic-foot': { ar: 'قدم ساخنة متورمة مع اعتلال أعصاب (اشتباه شاركو)', en: 'Hot, swollen neuropathic foot (suspected Charcot)' },
  'cold-pale-foot': { ar: 'قدم باردة أو شاحبة فجأة', en: 'Sudden cold or pale foot' },
  'cannot-bear-weight': { ar: 'إصابة شديدة أو تعذر تحمل الوزن', en: 'Significant injury or cannot bear weight' },
  'pain-stops-walking': { ar: 'ألم يمنع المشي', en: 'Pain stops walking' },
  'loss-of-sensation': { ar: 'فقدان الإحساس الواقي', en: 'Loss of protective sensation' },
  'poor-circulation': { ar: 'ضعف تروية معروف أو مشتبه (ضعف النبض)', en: 'Known or suspected poor circulation (reduced pulses)' },
  'ulcer-history': { ar: 'قرحة أو بتر أو قدم شاركو سابقًا', en: 'Previous ulcer, amputation or Charcot foot' },
  'open-wound': { ar: 'جرح مفتوح أو قرحة أو آفة تتفاقم في الفحص', en: 'Open wound, ulcer or worsening lesion on exam' },
  'local-infection-signs': { ar: 'احمرار أو تورم أو صديد جديد', en: 'New redness, swelling, warmth or discharge' },
  'lesion-on-vulnerable-foot': { ar: 'آفة جلدية في قدم معرضة للخطر', en: 'Skin lesion on a vulnerable foot' },
  'hot-swollen-foot': { ar: 'قدم ساخنة وحمراء ومتورمة', en: 'Hot, red, swollen foot' },
  'urgent-sign-unsure': { ar: 'علامة عاجلة لم تُستبعد', en: 'Urgent sign not ruled out' },
  'exam-not-finished': { ar: 'بنود فحص لم تُسجّل', en: 'Exam items not recorded' },
  'sensation-or-circulation-unclear': { ar: 'نتيجة الإحساس أو التروية غير واضحة', en: 'Sensation or circulation result unclear' },
  'no-pressure-reading': { ar: 'لا توجد قراءة ضغط', en: 'No pressure reading' },
  'pressure-unreliable': { ar: 'قراءة الضغط غير موثوقة (حساس ضعيف عند المعايرة)', en: 'Pressure reading unreliable (weak sensor at calibration)' },
  'footwear-rubbing': { ar: 'حذاء جديد أو يحتك', en: 'New or rubbing footwear' },
  'heavy-walking-or-exposure': { ar: 'مشي كثير أو حرارة أو رطوبة', en: 'Heavy walking, heat or wet feet' },
  'callus-or-deformity': { ar: 'ثفن أو تشوه', en: 'Callus or deformity' },
  'minor-skin-finding': { ar: 'نفطة أو تهيج موضعي بسيط', en: 'Blister or minor local irritation' },
  'pain-reported': { ar: 'ألم في القدم', en: 'Foot pain' },
  'numbness-reported': { ar: 'تنميل أبلغ عنه الحاج', en: 'Numbness reported by the pilgrim' },
  'minor-injury': { ar: 'إصابة حديثة مع قدرة على المشي', en: 'Recent injury, still walking' },
  'pressure-flag': { ar: 'منطقة ضغط مرتفع أو فرق بين القدمين (قراءة واحدة)', en: 'High-pressure zone or left/right gap (one scan)' },
  'inspection-unsure': { ar: 'نتيجة فحص بالنظر غير مؤكدة', en: 'Inspection finding unsure' },
  'cannot-self-inspect': { ar: 'لا يستطيع فحص قدميه يوميًا', en: 'Cannot check feet daily' },
  'baseline-care': { ar: 'إرشادات العناية الأساسية', en: 'Baseline care advice' },
};
