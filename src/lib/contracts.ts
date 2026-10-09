import type {
  CollateralCode,
  ContractCode,
  FundingCode,
  NeedCode,
  RepaymentMode,
  Segment,
} from "./types";

export interface ContractDef {
  code: ContractCode;
  name: string;
  short: string;
  legalBasis: string;
  structure: string;
  usage: string;
  baseRate: number;
  spreadMin: number;
  spreadMax: number;
  ceiling: number;
  repaymentModes: RepaymentMode[];
  tenorRange: [number, number];
  risks: string[];
  mitigation: string[];
  profitFormula: string;
}

export const CONTRACTS: Record<ContractCode, ContractDef> = {
  mosharekat_madani: {
    code: "mosharekat_madani",
    name: "مشارکت مدنی",
    short: "مشارکت مدنی",
    legalBasis: "ماده ۱۴ قانون عملیات بانکی بدون ربا (۱۳۶۲)",
    structure:
      "بانک درصدی از سرمایهٔ طرح را تأمین می‌کند و سهم منافع علی‌الحساب با نرخ قرارداد قید می‌شود؛ در سررسید، سهم واقعی منافع تعدیل و تسویه می‌گردد.",
    usage: "تامین سرمایه در گردش مشاغل خدماتی، بازرگانی، تولیدی و کشاورزی",
    baseRate: 23,
    spreadMin: 0,
    spreadMax: 0,
    ceiling: 23,
    repaymentModes: ["bullet", "interest_only", "annuity"],
    tenorRange: [3, 18],
    risks: [
      "صفر شدن سود طرح برای مشتری و ناتوانی در بازپرداخت سهم منافع",
      "انحراف از مصرف سرمایه در گردش و تبدیل به دارایی ثابت",
      "ریسک تجدید سالانه (roll-over) و ایجاد شکاف نقدینگی ساختاری",
    ],
    mitigation: [
      "پوشش حداقل سهم منافع قراردادی و تعیین کف بازده برای بانک",
      "پایش گردش حساب و تطبیق واریزی‌ها با گردش طرح",
      "سقف تمدید حداکثر ۲ دوره و تبدیل تدریجی به فروش اقساطی",
    ],
    profitFormula: "سهم منافع = سرمایه بانک × نرخ علی‌الحساب × (مدت ÷ ۱۲ ماه)",
  },
  mosharekat_hoghoghi: {
    code: "mosharekat_hoghoghi",
    name: "مشارکت حقوقی",
    short: "مشارکت حقوقی",
    legalBasis: "ماده ۱۵ قانون عملیات بانکی بدون ربا + دستورالعمل مشارکت حقوقی",
    structure:
      "بانک در منافع حاصل از طرح سرمایه‌گذاری اشخاص حقوقی شریک می‌شود؛ حداقل نرخ بازده مصوب برای بانک تضمین و مازاد آن قابل مذاکره است.",
    usage: "طرح‌های سرمایه‌گذاری بزرگ، پروژه‌های سندیکایی و مشارکت چند بانک",
    baseRate: 23,
    spreadMin: 0,
    spreadMax: 5,
    ceiling: 28,
    repaymentModes: ["bullet", "annuity", "interest_only"],
    tenorRange: [12, 84],
    risks: [
      "ریسک تکمیل نشدن طرح و طولانی‌شدن دوره ساخت",
      "عدم تحقق بازده برآوردی و کاهش سهم منافع بانک",
      "تمرکز اعتباری روی یک شخص حقوقی بزرگ",
    ],
    mitigation: [
      "پرداخت مرحله‌ای منوط به گزارش پیشرفت فیزیکی و صورت‌وضعیت",
      "تعیین حداقل نرخ بازده قطعی در قرارداد + مکانیزم تعدیل",
      "سندیکا و سقف تمرکز اعتباری؛ وثیقه ملکی با پوشش بالای ۱۳۰٪",
    ],
    profitFormula: "سهم بانک = max(حداقل بازده مصوب، نسبت مشارکت × سود واقعی طرح)",
  },
  forush_aghsati: {
    code: "forush_aghsati",
    name: "فروش اقساطی",
    short: "فروش اقساطی",
    legalBasis: "ماده ۶ قانون عملیات بانکی بدون ربا + آیین‌نامه فروش اقساطی",
    structure:
      "بانک کالا را می‌خرد و به قیمت نهایی (بهای تمام‌شده + سود) به اقساط می‌فروشد؛ مالکیت عین تا تسویه آخرین قسط در رهن بانک می‌ماند.",
    usage: "خرید کالا، خودرو، مسکن، تجهیزات و ماشین‌آلات برای اشخاص حقیقی و حقوقی",
    baseRate: 23,
    spreadMin: 4,
    spreadMax: 8,
    ceiling: 23,
    repaymentModes: ["annuity", "flat", "stepped", "declining"],
    tenorRange: [6, 144],
    risks: [
      "واگرایی نرخ اسمی و نرخ مؤثر در روش خطی (سرد) و شفافیت‌نبودن برای مشتری",
      "کاهش ارزش وثیقه (استهلاک کالا/خودرو) سریع‌تر از استهلاک بدهی",
      "ریسک پیش‌فروش و عدم تحویل کالا توسط فروشنده",
    ],
    mitigation: [
      "ارائه هم‌زمان نرخ اسمی و نرخ مؤثر در قرارداد و پیش‌فاکتور",
      "بیمه بدنه/کالا با ذی‌نفعی بانک و پوشش وثیقه حداقل ۱۲۰٪",
      "پرداخت مستقیم به فروشنده و اخذ فاکتور رسمی و گواهی تحویل",
    ],
    profitFormula:
      "قسط = [P + (P × r × t)] ÷ n  (خطی)  |  A = P × i(1+i)^n ÷ [(1+i)^n − 1]  (مساوی)",
  },
  ejareh_tamlik: {
    code: "ejareh_tamlik",
    name: "اجاره به شرط تملیک",
    short: "اجاره به شرط تملیک",
    legalBasis: "ماده ۴ قانون عملیات بانکی بدون ربا + قانون اجاره به شرط تملیک (۱۳۷۶)",
    structure:
      "بانک مالک عین است و آن را به اجارهٔ مشتری می‌دهد؛ اجاره‌بها شامل اصل + سود است و در پایان مدت با عقد دوم، مالکیت منتقل می‌شود.",
    usage: "خودرو، تجهیزات، مسکن، تجهیزات پزشکی و دندان‌پزشکی",
    baseRate: 23,
    spreadMin: 4,
    spreadMax: 8,
    ceiling: 23,
    repaymentModes: ["annuity", "stepped", "declining", "flat"],
    tenorRange: [6, 120],
    risks: [
      "مالکیت بانک و مسئولیت نگهداری/بیمه عین تا زمان تملیک",
      "امکان سوءاستفاده یا نقل‌وانتقال غیرمجاز عین توسط مستأجر",
      "ریسک باقیمانده (residual value) در قراردادهای با اقساط صعودی",
    ],
    mitigation: [
      "بیمه کامل عین با ذی‌نفعی بانک و الزام به تمدید سالانه",
      "ثبت شرط عدم انتقال، پلاک‌گذاری/قبض رهنی و بازرسی دوره‌ای",
      "سقف رشد اقساط صعودی ۵٪ و محاسبه ارزش فعلی با نرخ قرارداد",
    ],
    profitFormula: "اجاره‌بها = قسط اصل + سود دوره؛ انتقال مالکیت با عقد دوم در پایان مدت",
  },
  salaf: {
    code: "salaf",
    name: "سلف (خرید پیش‌فروش)",
    short: "سلف",
    legalBasis: "ماده ۷ قانون عملیات بانکی بدون ربا",
    structure:
      "بانک محصول را پیش‌خرید می‌کند (نقد) و با تخفیف نسبت به قیمت روز، تحویل در سررسید مقرر می‌گیرد؛ سپس از طریق قرارداد دوم واگذار می‌کند.",
    usage: "تامین مواد اولیه تولید و محصولات کشاورزی و کالاهای استاندارد",
    baseRate: 20,
    spreadMin: 0,
    spreadMax: 0,
    ceiling: 20,
    repaymentModes: ["bullet"],
    tenorRange: [3, 18],
    risks: [
      "ریسک تحویل نگرفتن کالا یا افت کیفیت در سررسید",
      "نوسان قیمت بازار کالا و کاهش صرفه قرارداد دوم",
      "ریسک فصلی محصولات کشاورزی (خشکسالی/آفت)",
    ],
    mitigation: [
      "تعیین دقیق مشخصات کمی و کیفی کالا + بیمه محصول",
      "اخذ اختیار فروش با قرارداد دوم و کف قیمت تضمینی",
      "تنوع بخشی جغرافیایی و سبدی‌سازی خرید",
    ],
    profitFormula: "سود = (قیمت روز سررسید − بهای پیش‌خرید) × مقدار کالا",
  },
  joaleh: {
    code: "joaleh",
    name: "جعاله",
    short: "جعاله",
    legalBasis: "ماده ۸ قانون عملیات بانکی بدون ربا",
    structure:
      "بانک انجام کار معین را به مشتری یا پیمانکار سفارش می‌دهد و «جُعل» را به‌صورت مبلغ مقطوع یا درصدی از بهای تمام‌شده می‌پردازد/دریافت می‌کند.",
    usage: "پروژه‌های خدماتی، ساخت‌وساز، تعمیرات، پیمانکاری و بازسازی",
    baseRate: 23,
    spreadMin: 0,
    spreadMax: 4,
    ceiling: 23,
    repaymentModes: ["annuity", "flat", "stepped"],
    tenorRange: [6, 60],
    risks: [
      "ریسک عدم تکمیل کار یا توقف پروژه در میانه راه",
      "ابهام در تعریف «عمل» و دشواری اثبات تحقق آن",
      "تورم بهای تمام‌شده ساخت نسبت به جعل اولیه",
    ],
    mitigation: [
      "تعریف دقیق عمل، صورت‌وضعیت مرحله‌ای و ناظر مستقل",
      "پرداخت makee به‌صورت مرحله‌ای متناسب با پیشرفت",
      "ضمانت‌نامه حسن انجام کار و بیمه تمام‌خطر پیمانکاری",
    ],
    profitFormula: "جُعل = بهای تمام‌شده عمل × (۱ + نرخ)؛ پرداخت مرحله‌ای بر اساس پیشرفت",
  },
  estena: {
    code: "estena",
    name: "استصناع",
    short: "استصناع",
    legalBasis: "ماده ۹ قانون عملیات بانکی بدون ربا",
    structure:
      "بانک ساخت کالا را با مشخصات معین سفارش می‌دهد و بهای آن را مرحله‌ای در طول ساخت می‌پردازد؛ تحویل در سررسید مقرر.",
    usage: "سفارش ساخت و تولید کالا، ماشین‌آلات سفارشی، انبوه‌سازی مسکن",
    baseRate: 23,
    spreadMin: 0,
    spreadMax: 4,
    ceiling: 23,
    repaymentModes: ["annuity", "bullet", "flat"],
    tenorRange: [12, 84],
    risks: [
      "ریسک سازنده (تأخیر/ورشکستگی) و عدم تحویل کالای منطبق",
      "تغییر مشخصات فنی و افزایش بهای تمام‌شده",
      "ریسک بازار فروش کالای ساخته‌شده",
    ],
    mitigation: [
      "پیش‌فروش بخشی از محصول و تضمین خرید (off-take)",
      "ضمانت‌نامه پیش‌پرداخت و حسن انجام تعهدات سازنده",
      "بازنگری مشخصات فنی با الحاقیه و کنترل مرحله‌ای پرداخت",
    ],
    profitFormula: "بهای استصناع = بهای تمام‌شده ساخت + سود بانک؛ پرداخت مرحله‌ای",
  },
  qarzolhasaneh: {
    code: "qarzolhasaneh",
    name: "قرض‌الحسنه",
    short: "قرض‌الحسنه",
    legalBasis: "ماده ۱ و ۲ قانون عملیات بانکی بدون ربا + دستورالعمل کارمزد خدمات بانکی",
    structure:
      "پرداخت وام بدون سود؛ تنها کارمزد مصوب دریافت می‌شود. انواع: ضروری، عادی، ازدواج و اورژانسی.",
    usage: "نیازهای ضروری کم‌درآمدان، وام ازدواج، مسئولیت اجتماعی و جذب سپرده قرض‌الحسنه",
    baseRate: 0,
    spreadMin: 0,
    spreadMax: 0,
    ceiling: 0,
    repaymentModes: ["annuity", "flat"],
    tenorRange: [6, 60],
    risks: [
      "سودآوری منفی در صورت بالاتر بودن هزینه تامین مالی از کارمزد",
      "ریسک اعتباری بالاتر به دلیل نبود انگیزه سود برای مشتری",
      "ریسک انطباق در صورت دریافت کارمزد بیش از سقف مصوب",
    ],
    mitigation: [
      "تامین مالی صرفاً از محل سپرده قرض‌الحسنه با هزینه صفر",
      "کارمزد حداکثر ۲٪ و صرفاً طبق دستورالعمل بانک مرکزی",
      "کسر از حقوق، ضامن معتبر یا وثیقه سبک و امتیازدهی رفتار سپرده",
    ],
    profitFormula: "سود = ۰؛ کارمزد = اصل × نرخ کارمزد مصوب (یکجا یا سرشکن)",
  },
  kharid_din: {
    code: "kharid_din",
    name: "خرید دین / تنزیل اسناد",
    short: "خرید دین",
    legalBasis: "ماده ۵ قانون عملیات بانکی بدون ربا",
    structure:
      "بانک اسناد تجاری مدت‌دار (چک، برات، صورت‌حساب فروش اقساطی) را با کسر کارمزد تنزیل، نقد خریداری می‌کند.",
    usage: "تامین نقدینگی کوتاه‌مدت مبتنی بر اسناد تجاری و زنجیره تأمین",
    baseRate: 20,
    spreadMin: 0,
    spreadMax: 3,
    ceiling: 23,
    repaymentModes: ["bullet"],
    tenorRange: [1, 9],
    risks: [
      "ریسک صحت و اصالت سند/چک و برگشت خوردن آن",
      "ریسک اعتباری صادرکننده و مدیون سند",
      "ریسک حقوقی وصول و طولانی‌شدن فرایند اجرایی",
    ],
    mitigation: [
      "استعلام از سامانه صیاد و تطبیق اصالت سند",
      "تنزیل با سقف نسبت به مبلغ سند و اخذ ظهرنویسی ضامن",
      "تمرکز بر اسناد با سررسید زیر ۶ ماه و مشتریان رتبه‌بالا",
    ],
    profitFormula: "بهای خرید = ارزش اسمی سند × (۱ − نرخ تنزیل × مدت ÷ ۱۲)",
  },
  mozareeh: {
    code: "mozareeh",
    name: "مزارعه",
    short: "مزارعه",
    legalBasis: "ماده ۱۰ قانون عملیات بانکی بدون ربا",
    structure:
      "تامین مالی زمین زراعی با تقسیم محصول حاصل بین بانک و مشتری به نسبت قرارداد؛ مساقات شکل باغداری آن است.",
    usage: "تامین مالی کشاورزی، باغداری و زراعت فصلی",
    baseRate: 20,
    spreadMin: 0,
    spreadMax: 3,
    ceiling: 23,
    repaymentModes: ["bullet"],
    tenorRange: [6, 24],
    risks: [
      "ریسک تولید (آفت، خشکسالی، سرمازدگی) و صفر شدن محصول",
      "ریسک قیمت محصول در زمان برداشت",
      "دشواری ارزیابی و کنترل سهم محصول بانک",
    ],
    mitigation: [
      "بیمه محصولات کشاورزی با ذی‌نفعی بانک",
      "تعیین نسبت سهم به‌گونه‌ای که کف بازده بانک پوشش یابد",
      "تحویل محصول به انبار/بازار معرفی‌شده و تسویه نقدی",
    ],
    profitFormula: "سهم بانک = نسبت قراردادی × محصول تحقق‌یافته (با کف تضمینی)",
  },
  mozarabeh: {
    code: "mozarabeh",
    name: "مضاربه",
    short: "مضاربه",
    legalBasis: "ماده ۱۱ قانون عملیات بانکی بدون ربا",
    structure: "بانک سرمایه را تأمین و مشتری تجارت می‌کند؛ سود به نسبت توافق‌شده تقسیم می‌شود.",
    usage: "تامین سرمایه در گردش تجاری کوتاه‌مدت با گردش مالی شفاف",
    baseRate: 23,
    spreadMin: 0,
    spreadMax: 3,
    ceiling: 23,
    repaymentModes: ["bullet", "interest_only"],
    tenorRange: [3, 12],
    risks: [
      "زیان تجاری و از بین رفتن اصل سرمایه (بدون تقصیر مضارب)",
      "عدم شفافیت در محاسبه سود واقعی تجارت",
      "کوتاه بودن دوره و فشار تمدید مکرر",
    ],
    mitigation: [
      "اخذ تضمین برای پوشش سوءاستفاده/تقصیر و حسابرسی گردش تجارت",
      "واریز و برداشت صرفاً از حساب معرفی‌شده نزد بانک",
      "سقف دوره ۶ ماه و تطبیق با چرخه تجاری مشتری",
    ],
    profitFormula: "سود بانک = نسبت مضاربه × سود تحقق‌یافته تجارت",
  },
};

export const CONTRACT_LIST = Object.values(CONTRACTS);

/** بخش ۲.۳ — جدول نرخ‌های مصوب (پیش‌فرض، قابل به‌روزرسانی) */
export const RATE_TABLE: { label: string; rate: string; note: string }[] = [
  { label: "مشارکت مدنی", rate: "۲۳٪", note: "سهم منافع علی‌الحساب، تسویه یکجا" },
  { label: "مشارکت حقوقی", rate: "۲۳٪ تا ۲۸٪", note: "حداقل بازده مصوب، مازاد قابل مذاکره" },
  { label: "فروش اقساطی", rate: "۲۳٪ (+ مابه‌التفاوت ۴ تا ۸٪)", note: "مابه‌التفاوت صرفاً در قالب کارمزد/خدمات مجاز" },
  { label: "اجاره به شرط تملیک", rate: "۲۳٪ (+ مابه‌التفاوت ۴ تا ۸٪)", note: "قابل ساختاردهی لایه‌ای اجاره‌بها" },
  { label: "سلف", rate: "۲۰٪", note: "نرخ مصوب پایین‌تر از سایر عقود" },
  { label: "جعاله", rate: "۲۳٪ (حداکثر ۴٪ مازاد)", note: "جعل مقطوع یا درصدی" },
  { label: "استصناع", rate: "۲۳٪", note: "پرداخت مرحله‌ای در طول ساخت" },
  { label: "قرض‌الحسنه", rate: "۰٪ + کارمزد مصوب", note: "حداکثر ۲٪ طبق دستورالعمل کارمزد" },
  { label: "خرید دین / تنزیل", rate: "۲۰٪ تا ۲۳٪", note: "کسر کارمزد از ارزش اسمی سند" },
  { label: "سپرده جاری / قرض‌الحسنه", rate: "۰٪", note: "منبع اصلی تسهیلات قرض‌الحسنه" },
  { label: "سپرده کوتاه‌مدت", rate: "۱۲٫۵٪", note: "با قید و بدون قید" },
  { label: "سپرده ۱ ساله", rate: "۱۷٫۵٪", note: "—" },
  { label: "سپرده ۲ ساله", rate: "۱۸٪", note: "—" },
  { label: "سپرده ۳ ساله", rate: "۲۰٪", note: "کف سودآوری محصولات بلندمدت" },
];

/** بخش ۴ گام ۱ — ماتریس انطباق نیاز با عقد */
export const NEED_MATRIX: Record<
  NeedCode,
  { label: string; primary: ContractCode; alternatives: ContractCode[]; reasons: string[] }
> = {
  working_capital: {
    label: "سرمایه در گردش",
    primary: "mosharekat_madani",
    alternatives: ["mosharekat_hoghoghi", "salaf", "mozarabeh"],
    reasons: [
      "چرخه سرمایه در گردش کوتاه است و با سررسید یک‌سالهٔ مشارکت مدنی تطبیق طبیعی دارد",
      "سهم منافع علی‌الحساب امکان تسویه یکجا در پایان دوره گردش کالا را می‌دهد",
      "بدون نیاز به خرید عین کالا، فرایند پرداخت سریع‌تر از فروش اقساطی است",
    ],
  },
  goods_purchase: {
    label: "خرید کالا",
    primary: "forush_aghsati",
    alternatives: ["ejareh_tamlik", "salaf"],
    reasons: [
      "عقد مستقیم برای خرید عین کالا با مالکیت بانک تا تسویه آخرین قسط",
      "امکان رهن عین خریداری‌شده به‌عنوان وثیقه طبیعی، بدون وثیقه مضاعف",
      "قابلیت محاسبه شفاف قسط و انطباق کامل با آیین‌نامه فروش اقساطی",
    ],
  },
  vehicle: {
    label: "خرید خودرو",
    primary: "forush_aghsati",
    alternatives: ["ejareh_tamlik", "qarzolhasaneh"],
    reasons: [
      "خودرو وثیقهٔ منقول با نقدشوندگی بالا و امکان رهن رسمی سند",
      "دوره بازپرداخت ۱۲ تا ۶۰ ماهه با اقساط مساوی برای مشتری خرد قابل تحمل است",
      "اجاره به شرط تملیک جایگزین مناسب برای اقساط صعودی متناسب با رشد درآمد",
    ],
  },
  housing: {
    label: "مسکن",
    primary: "forush_aghsati",
    alternatives: ["ejareh_tamlik", "estena"],
    reasons: [
      "بلندمدت بودن نیاز مسکن با سقف ۱۲۰ ماههٔ فروش اقساطی سازگار است",
      "رهن ملک خریداری‌شده پوشش وثیقه‌ای بالای ۱۵۰٪ ایجاد می‌کند",
      "برای انبوه‌سازی، استصناع با پرداخت مرحله‌ای ساختار بهینه‌تری است",
    ],
  },
  equipment: {
    label: "تجهیزات و ماشین‌آلات",
    primary: "forush_aghsati",
    alternatives: ["ejareh_tamlik", "estena"],
    reasons: [
      "تجهیزات عین مشخص با فاکتور رسمی و قابلیت رهن با قبض رهنی است",
      "جریان نقدی حاصل از تجهیز، بازپرداخت اقساط را پوشش می‌دهد",
      "اجاره به شرط تملیک امکان بیمه تمام‌خطر با ذی‌نفعی بانک را می‌دهد",
    ],
  },
  raw_material: {
    label: "مواد اولیه تولید",
    primary: "salaf",
    alternatives: ["estena", "mosharekat_madani"],
    reasons: [
      "سلف با پیش‌خرید نقدی و تخفیف از قیمت روز، نرخ موثر پایین‌تری برای تولیدکننده می‌سازد",
      "سررسید کوتاه (۳ تا ۱۲ ماه) با چرخه تبدیل مواد به محصول منطبق است",
      "نرخ مصوب سلف (۲۰٪) از سایر عقود پایین‌تر و مزیت رقابتی محسوب می‌شود",
    ],
  },
  agriculture: {
    label: "کشاورزی و باغداری",
    primary: "mozareeh",
    alternatives: ["salaf", "mosharekat_madani"],
    reasons: [
      "مزارعه ریسک تولید را بین بانک و کشاورز تقسیم می‌کند و عادلانه‌تر است",
      "بازپرداخت یکجا در فصل برداشت با جریان نقدی کشاورز تطبیق دارد",
      "سلف برای محصولات استاندارد با بازار فروش تضمینی جایگزین کم‌ریسک‌تری است",
    ],
  },
  construction_project: {
    label: "پروژه ساخت‌وساز",
    primary: "joaleh",
    alternatives: ["estena", "mosharekat_hoghoghi"],
    reasons: [
      "جعاله با پرداخت مرحله‌ای بر اساس صورت‌وضعیت، ریسک تکمیل را کنترل می‌کند",
      "جعل مقطوع، شفافیت قیمت‌گذاری برای پیمانکار ایجاد می‌کند",
      "برای پروژه‌های بزرگ، مشارکت حقوقی/سندیکا ساختار سرمایه‌ای مناسب‌تری است",
    ],
  },
  services_project: {
    label: "پروژه خدماتی و پیمانکاری",
    primary: "joaleh",
    alternatives: ["mosharekat_hoghoghi", "kharid_din"],
    reasons: [
      "ماهیت «انجام کار» در پروژه‌های خدماتی دقیقاً موضوع جعاله است",
      "امکان وثیقه‌سازی قراردادهای بالادستی و اسناد دریافتنی",
      "خرید دین برای تأمین نقدینگی بین صورت‌وضعیت‌ها مکمل مناسبی است",
    ],
  },
  essential_need: {
    label: "نیاز ضروری کم‌درآمدان",
    primary: "qarzolhasaneh",
    alternatives: ["forush_aghsati"],
    reasons: [
      "ابزار مسئولیت اجتماعی با نرخ صفر و صرفاً کارمزد مصوب",
      "تامین از محل سپرده قرض‌الحسنه، هزینه تامین مالی را صفر می‌کند",
      "جذب و ماندگاری سپرده قرض‌الحسنه ارزان برای بانک ایجاد می‌کند",
    ],
  },
  marriage: {
    label: "وام ازدواج",
    primary: "qarzolhasaneh",
    alternatives: ["forush_aghsati"],
    reasons: [
      "تکلیف قانونی و بودجه‌های ردیفی با نرخ صفر و کارمزد مصوب",
      "وثیقه سبک (ضامن/سفته) و فرایند تمام‌دیجیتال برای مشتری جوان",
      "ایجاد پایگاه مشتری بلندمدت و فروش متقاطع محصولات دیگر",
    ],
  },
  large_investment: {
    label: "طرح سرمایه‌گذاری بزرگ",
    primary: "mosharekat_hoghoghi",
    alternatives: ["estena", "mozarabeh"],
    reasons: [
      "ساختار سهام‌دار شدن بانک در منافع طرح با دوره ساخت و بهره‌برداری بلند",
      "امکان سندیکا و توزیع ریسک بین چند بانک",
      "حداقل بازده مصوب، کف سودآوری بانک را تضمین می‌کند",
    ],
  },
  receivables: {
    label: "اسناد مدت‌دار و دریافتنی‌ها",
    primary: "kharid_din",
    alternatives: ["mozarabeh"],
    reasons: [
      "تنزیل چک/برات نقدینگی فوری با ریسک کوتاه‌مدت ایجاد می‌کند",
      "بدون نیاز به وثیقه مضاعف، خود سند وثیقه است",
      "دوره زیر ۹ ماه، شکاف نقدینگی ایجاد نمی‌کند",
    ],
  },
  medical: {
    label: "تجهیزات پزشکی و دندان‌پزشکی",
    primary: "ejareh_tamlik",
    alternatives: ["forush_aghsati", "joaleh"],
    reasons: [
      "اجاره به شرط تملیک مالکیت تجهیزات را تا تسویه نزد بانک نگه می‌دارد",
      "جریان نقدی مطب امکان اقساط صعودی از ماه ششم را می‌دهد",
      "وثیقه طبیعی (خود تجهیز) با قبض رهنی و بیمه، پوشش مناسب ایجاد می‌کند",
    ],
  },
};

export const SEGMENTS: Record<
  Segment,
  { label: string; pd: number; processDays: number; amountRange: [number, number]; desc: string }
> = {
  retail: {
    label: "حقیقی خرد",
    pd: 2.2,
    processDays: 7,
    amountRange: [50_000_000, 800_000_000],
    desc: "کارمند، حقوق‌بگیر و مشتری خرد با فرایند تمام‌دیجیتال",
  },
  professional: {
    label: "مشاغل حرفه‌ای (پزشک/وکیل/مهندس)",
    pd: 1.4,
    processDays: 10,
    amountRange: [500_000_000, 5_000_000_000],
    desc: "پزشکان، دندان‌پزشکان، وکلا و اعضای سازمان‌های نظام‌مهندسی",
  },
  micro_business: {
    label: "کسب‌وکارهای کوچک",
    pd: 3.4,
    processDays: 14,
    amountRange: [200_000_000, 3_000_000_000],
    desc: "اصناف، فروشگاه‌ها و کارگاه‌های زیر ۱۰ نفر",
  },
  sme: {
    label: "بنگاه متوسط (SME)",
    pd: 4.1,
    processDays: 21,
    amountRange: [2_000_000_000, 30_000_000_000],
    desc: "شرکت‌های تولیدی و بازرگانی با صورت مالی حسابرسی‌شده",
  },
  corporate: {
    label: "شرکتی و بزرگ",
    pd: 3.0,
    processDays: 35,
    amountRange: [20_000_000_000, 500_000_000_000],
    desc: "هلدینگ‌ها، طرح‌های ملی و قراردادهای سندیکایی",
  },
};

export const COLLATERALS: Record<
  CollateralCode,
  { label: string; heaviness: number; haircut: number; processDays: number; suggestedCoverage: number; note: string }
> = {
  real_estate: {
    label: "رهن ملک",
    heaviness: 95,
    haircut: 25,
    processDays: 14,
    suggestedCoverage: 150,
    note: "بالاترین کیفیت وثیقه، اما سنگین‌ترین فرایند ارزیابی و ثبت",
  },
  blocked_deposit: {
    label: "سپرده مسدودی",
    heaviness: 40,
    haircut: 2,
    processDays: 1,
    suggestedCoverage: 110,
    note: "نقدشونده‌ترین وثیقه؛ کاهش ریسک اما حذف نقدینگی مشتری",
  },
  bank_guarantee: {
    label: "ضمانت‌نامه بانکی",
    heaviness: 55,
    haircut: 3,
    processDays: 5,
    suggestedCoverage: 120,
    note: "مناسب پیمانکاران و مشتریان شرکتی با خط ضمانت‌نامه",
  },
  credit_insurance: {
    label: "بیمه ضمانت‌نامه اعتباری",
    heaviness: 35,
    haircut: 10,
    processDays: 4,
    suggestedCoverage: 100,
    note: "جایگزین وثیقه فیزیکی؛ حق بیمه به هزینه عملیاتی اضافه می‌شود",
  },
  guarantor: {
    label: "ضامن معتبر (کسر از حقوق)",
    heaviness: 50,
    haircut: 30,
    processDays: 6,
    suggestedCoverage: 120,
    note: "رایج‌ترین وثیقه در بخش خرد؛ کیفیت به درآمد ضامن وابسته است",
  },
  salary_deduction: {
    label: "گواهی کسر از حقوق",
    heaviness: 30,
    haircut: 35,
    processDays: 3,
    suggestedCoverage: 100,
    note: "سبک و سریع؛ مناسب حقوق‌بگیران سازمان‌های طرف قرارداد",
  },
  check: {
    label: "چک صیادی",
    heaviness: 25,
    haircut: 45,
    processDays: 2,
    suggestedCoverage: 130,
    note: "سبک برای مشتری، اجرای سریع از طریق سامانه صیاد",
  },
  promissory_note: {
    label: "سفته",
    heaviness: 20,
    haircut: 60,
    processDays: 2,
    suggestedCoverage: 150,
    note: "سبک‌ترین وثیقه اما با نرخ بازیافت پایین در نکول",
  },
  movable_pledge: {
    label: "اموال منقول با قبض رهنی",
    heaviness: 45,
    haircut: 30,
    processDays: 7,
    suggestedCoverage: 130,
    note: "خودرو، تجهیزات و موجودی انبار با قبض رهنی رسمی",
  },
};

export const DEPOSIT_TYPES = {
  current: { code: "current", name: "حساب جاری", rate: 0, tenorMonths: 0.5, rollover: 0.92, stableCore: 0.75 },
  qarz: { code: "qarz", name: "سپرده قرض‌الحسنه", rate: 0, tenorMonths: 6, rollover: 0.9, stableCore: 0.7 },
  shortTerm: { code: "shortTerm", name: "سپرده سرمایه‌گذاری کوتاه‌مدت", rate: 12.5, tenorMonths: 2, rollover: 0.78, stableCore: 0.6 },
  oneYear: { code: "oneYear", name: "سپرده بلندمدت یک‌ساله", rate: 17.5, tenorMonths: 12, rollover: 0.72, stableCore: 0.65 },
  twoYear: { code: "twoYear", name: "سپرده بلندمدت دوساله", rate: 18, tenorMonths: 24, rollover: 0.75, stableCore: 0.7 },
  threeYear: { code: "threeYear", name: "سپرده بلندمدت سه‌ساله", rate: 20, tenorMonths: 36, rollover: 0.8, stableCore: 0.8 },
  interbank: { code: "interbank", name: "بازار بین‌بانکی / خط اعتباری پشتیبان", rate: 23, tenorMonths: 1, rollover: 0.5, stableCore: 0.3 },
} as const;

export type DepositCode = keyof typeof DEPOSIT_TYPES;

export const FUNDING_STRUCTURES: Record<
  FundingCode,
  { label: string; desc: string; mix: [DepositCode, number][]; almFit: string }
> = {
  matched_long: {
    label: "سپرده بلندمدت منطبق با سررسید",
    desc: "تامین عمدتاً از سپرده‌های بلندمدت هم‌سررسید با دارایی",
    mix: [
      ["threeYear", 0.55],
      ["twoYear", 0.25],
      ["oneYear", 0.12],
      ["shortTerm", 0.08],
    ],
    almFit: "بهترین تطبیق سررسید؛ کمترین شکاف نقدینگی",
  },
  short_term: {
    label: "تامین کوتاه‌مدت (جاری و کوتاه‌مدت)",
    desc: "اتکا به منابع ارزان و بی‌نام با سررسید کوتاه",
    mix: [
      ["current", 0.3],
      ["qarz", 0.15],
      ["shortTerm", 0.4],
      ["oneYear", 0.15],
    ],
    almFit: "هزینه پایین اما ریسک تمدید و شکاف نقدینگی بالا",
  },
  mixed: {
    label: "سبد ترکیبی بهینه",
    desc: "ترکیب منابع ارزان با سپرده‌های پایدار هم‌سررسید",
    mix: [
      ["current", 0.15],
      ["qarz", 0.1],
      ["shortTerm", 0.15],
      ["oneYear", 0.2],
      ["twoYear", 0.2],
      ["threeYear", 0.2],
    ],
    almFit: "تعادل هزینه و پایداری؛ پیشنهاد پیش‌فرض موتور",
  },
  qarz_deposit: {
    label: "سپرده قرض‌الحسنه (منبع رایگان)",
    desc: "تامین انحصاری از محل سپرده‌های قرض‌الحسنه و جاری",
    mix: [
      ["qarz", 0.6],
      ["current", 0.4],
    ],
    almFit: "هزینه تامین صفر؛ الزام‌آور برای تسهیلات قرض‌الحسنه",
  },
  interbank_backstop: {
    label: "خط اعتباری پشتیبان بین‌بانکی",
    desc: "لایه پشتیبان برای پوشش شکاف نقدینگی سناریوهای استرس",
    mix: [
      ["oneYear", 0.3],
      ["twoYear", 0.2],
      ["threeYear", 0.2],
      ["shortTerm", 0.15],
      ["interbank", 0.15],
    ],
    almFit: "نقدشوندگی بالا در بحران با هزینه بالاتر",
  },
};

export const REPAYMENT_MODES: Record<RepaymentMode, { label: string; desc: string; formula: string }> = {
  annuity: {
    label: "اقساط ماهانه مساوی",
    desc: "قسط ثابت؛ سهم سود کاهشی و سهم اصل افزایشی",
    formula: "A = P × i(1+i)^n ÷ [(1+i)^n − 1]",
  },
  flat: {
    label: "سود خطی (سُرد)",
    desc: "سود روی کل اصل محاسبه و سرشکن می‌شود؛ نرخ مؤثر بالاتر از اسمی",
    formula: "قسط = [P + (P × r × t)] ÷ n",
  },
  bullet: {
    label: "تسویه یکجا در سررسید",
    desc: "پرداخت اصل و سود به‌صورت یکجا در پایان دوره",
    formula: "مبلغ تسویه = P × (1 + r × t)",
  },
  stepped: {
    label: "اقساط صعودی (لایه‌ای)",
    desc: "اقساط با نرخ رشد مشخص افزایش می‌یابد؛ مناسب درآمد رو به رشد",
    formula: "قسط k = A × (1+g)^(k−1) به‌گونه‌ای که PV اقساط = P",
  },
  declining: {
    label: "اقساط نزولی",
    desc: "بار بازپرداخت در ابتدای دوره سنگین‌تر و رو به کاهش",
    formula: "قسط k = A × (1−g)^(k−1) با شرط PV = P",
  },
  interest_only: {
    label: "پرداخت سود، اصل در سررسید",
    desc: "اقساط دوره‌ای صرفاً سهم منافع؛ اصل در انتها تسویه می‌شود",
    formula: "قسط دوره = P × i ؛ تسویه نهایی = P + آخرین قسط",
  },
};

export const HORIZONS = [
  { code: "h0_1", label: "کمتر از ۱ ماه", from: 0, to: 1 },
  { code: "h1_3", label: "۱ تا ۳ ماه", from: 1, to: 3 },
  { code: "h3_6", label: "۳ تا ۶ ماه", from: 3, to: 6 },
  { code: "h6_12", label: "۶ تا ۱۲ ماه", from: 6, to: 12 },
  { code: "h12p", label: "بیش از ۱۲ ماه", from: 12, to: 10_000 },
] as const;
