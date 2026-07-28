import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

interface ManualSection {
  id: string;
  icon: string;
  title: string;
  titleAr: string;
  category: string;
  categoryAr: string;
  description: string;
  descriptionAr: string;
  steps?: { title: string; titleAr: string; detail: string; detailAr: string }[];
  tips?: { en: string; ar: string }[];
  routeLink?: { path: string; label: string; labelAr: string };
}

const SECTIONS: ManualSection[] = [
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard Overview',
    titleAr: 'نظرة عامة على الشاشة الرئيسية',
    category: 'Getting Started',
    categoryAr: 'البداية والاستخدام',
    description:
      'Your main home base in the HRMS application. View live metrics, daily shift status, leave balances, card points, and compensation summary at a glance.',
    descriptionAr:
      'بوابتك الرئيسية في نظام الموارد البشرية. استعرض إحصائياتك المباشرة، حالة الدوام اليومية، رصيد الإجازات، نقاط البطاقات، وملخص المستحقات المالية.',
    steps: [
      {
        title: 'Shift Status & Live Timer',
        titleAr: 'حالة الدوام والمؤقت المباشر',
        detail:
          'See if you are currently clocked in or offline. View your elapsed shift time and today’s active task.',
        detailAr:
          'معرفة ما إذا كنت مسجلاً للدوام حالياً أو غير متصل، ومتابعة عداد ساعات الدوام والمهام.',
      },
      {
        title: 'Leave & Absence Balances',
        titleAr: 'رصيد الإجازات والمغادرات',
        detail:
          'Monitor your remaining Sick Days (out of 14), Vacation Days (out of 14), and accumulated Early Leave minutes.',
        detailAr:
          'متابعة رصيد إجازاتك المرضية والسنوية المتبقية ودقائق المغادرات المبكرة.',
      },
      {
        title: 'Net Card Points',
        titleAr: 'نقاط البطاقات',
        detail:
          'Track your monthly performance points accumulated from Gold, Blue, Green, Yellow, and Red cards.',
        detailAr:
          'متابعة نقاط الأداء الشهرية المكتسبة من بطاقات التقدير الذهبية والزرقاء والخضراء أو الخصومات.',
      },
    ],
    tips: [
      { en: 'Use the quick links at the top of the dashboard to jump straight to Clock-In or Schedule.', ar: 'استخدم الروابط السريعة أعلى الشاشة للوصول المباشر لتسجيل الدخول أو الجدول.' },
    ],
    routeLink: { path: '/dashboard', label: 'Go to Dashboard', labelAr: 'الانتقال للرئيسية' },
  },
  {
    id: 'attendance',
    icon: '⏱️',
    title: 'Attendance & Time Clock',
    titleAr: 'تسجيل الدخول والدوام',
    category: 'Daily Operations',
    categoryAr: 'العمليات اليومية',
    description:
      'How to clock in for your daily shift, report your intended tasks, record completed outputs, and view your complete attendance history.',
    descriptionAr:
      'طريقة تسجيل بدء الدوام اليومي، كتابة المهمة المخطط لها، تسجيل نتائج الدوام عند الخروج، ومراجعة سجل الحضور السابق.',
    steps: [
      {
        title: 'Step 1: Clocking In (Morning)',
        titleAr: 'الخطوة 1: تسجيل بدء الدوام (صباحاً)',
        detail:
          'Navigate to the Attendance page. Enter your Intended Task (what you plan to work on today) and select your Work Location (Office or Home), then click "Clock In".',
        detailAr:
          'افتح صفحة الدوام، ادخل المهمة المخطط لها اليوم، حدد مكان العمل (من المكتب أو من المنزل)، ثم اضغط "تسجيل بداية الدوام".',
      },
      {
        title: 'Step 2: Clocking Out (End of Shift)',
        titleAr: 'الخطوة 2: تسجيل نهاية الدوام (مساءً)',
        detail:
          'Click "Clock Out". Enter your Completed Task Count (number of items/tasks completed) and a brief Results Explanation summarizing your work.',
        detailAr:
          'اضغط "تسجيل نهاية الدوام"، ادخل عدد المهام المنجزة، واكتب ملخصاً سريعا لنتائج إنجازك اليومي.',
      },
    ],
    tips: [
      { en: 'Always enter a descriptive intended task when clocking in to keep your manager informed.', ar: 'اكتب دائماً وصفاً واضحاً للمهمة المخططة عند بدء الدوام لإبقاء المسؤول على علم بنشاطك.' },
    ],
    routeLink: { path: '/dashboard/attendance', label: 'Open Attendance Page', labelAr: 'فتح صفحة الدوام' },
  },
  {
    id: 'schedule',
    icon: '📅',
    title: 'Work Location Schedule & Meetings',
    titleAr: 'الجدول والاجتماعات',
    category: 'Planning & Collaboration',
    categoryAr: 'التخطيط والاجتماعات',
    description:
      'Check your required daily work location (Office vs. Home), view your weekly roster, and attend scheduled company meetings.',
    descriptionAr:
      'معرفة متطلب الحضور اليومي (المكتب أو المنزل)، استعراض الجدول الأسبوعي، والمشاركة في اجتماعات الشركة.',
    steps: [
      {
        title: 'My Schedule Requirement',
        titleAr: 'متطلب الجدول اليومي',
        detail:
          'View today’s requirement: "Scheduled Office Day" or "Scheduled Home Day" on your schedule dashboard.',
        detailAr:
          'استعراض متطلبك اليومي ما إذا كان مطلوباً منك الحضور للمكتب 🏢 أو العمل عن بُعد 🏠.',
      },
      {
        title: 'Joining Video Calls',
        titleAr: 'الانضمام للمكالمات المرئية',
        detail:
          'For online meetings, click the "🔗 Join Video Call" button directly from your meetings list.',
        detailAr:
          'للاجتماعات الأونلاين، اضغط على زر "الانضمام للمكالمة المرئية" مباشرة من قائمة اجتماعاتك.',
      },
    ],
    tips: [
      { en: 'Check your weekly schedule every Saturday morning to know which days require office attendance.', ar: 'تفقّد جدولك الأسبوعي بداية كل أسبوع لمعرفة أيام الحضور المطلوبة للمكتب.' },
    ],
    routeLink: { path: '/dashboard/schedule', label: 'Open Schedule & Meetings', labelAr: 'فتح الجدول والاجتماعات' },
  },
  {
    id: 'absence',
    icon: '🏖️',
    title: 'Leave & Absence Requests',
    titleAr: 'الإجازات والمغادرات',
    category: 'Leaves & Off-Days',
    categoryAr: 'الإجازات والمغادرات',
    description:
      'Submit requests for time off, attach medical certificates for sick leaves, track request status, and view remaining leave balances.',
    descriptionAr:
      'تقديم طلبات الإجازة، إرفاق التقارير الطبية للإجازات المرضية، متابعة حالة الطلب، واستعراض الرصيد المتبقي.',
    steps: [
      {
        title: 'Submit Leave Request',
        titleAr: 'تقديم طلب إجازة',
        detail:
          'Select the date and leave type (Sick, Vacation, Regular, Hourly Off, Early Leave), specify your reason, and attach supporting docs if needed.',
        detailAr:
          'حدد التاريخ ونوع الإجازة (مرضية، سنوية، مغادرة ساعية، مغادرة مبكرة)، اكتب السبب، وأرفق التقارير عند الحاجة.',
      },
      {
        title: 'Track Approval Status',
        titleAr: 'متابعة حالة الطلب',
        detail:
          'Track your request state: Pending ⏳, Approved ✅, or Rejected ❌.',
        detailAr:
          'متابعة حالة طلبك: قيد الانتظار ⏳، مقبول ✅، أو مرفوض ❌.',
      },
    ],
    tips: [
      { en: 'Sick Leave requests require uploading a valid doctor report certificate.', ar: 'طلبات الإجازة المرضية تتطلب إرفاق عذر أو تقرير طبي معتمد.' },
    ],
    routeLink: { path: '/dashboard/absence', label: 'Open Absence & Leaves', labelAr: 'فتح صفحة الإجازات' },
  },
  {
    id: 'salary-advances',
    icon: '💳',
    title: 'Salary Advances & Loans',
    titleAr: 'سُلف الراتب والقروض المباشرة',
    category: 'Financial & Payroll',
    categoryAr: 'المالية ومسير الرواتب',
    description:
      'Setup and manage employee salary advances (loans). Monthly repayment installments are automatically deducted during payroll processing until full balance repayment.',
    descriptionAr:
      'إعادة وتنسيق سُلف الموظفين والقروض المباشرة. يتم خصم الأقساط الشهرية تلقائياً أثناء معالجة مسير الرواتب حتى اكتمال سداد المبلغ كاملاً.',
    steps: [
      {
        title: 'Step 1: Setup Advance (HR/Admin)',
        titleAr: 'الخطوة 1: إصدار السُلفة (HR/Admin)',
        detail:
          'Go to Payroll Processing, click "💳 Salary Advances", select employee, enter total loan amount (e.g., 200 JOD), monthly installment (e.g., 50 JOD/mo), and start month.',
        detailAr:
          'افتح صفحة مسير الرواتب، اضغط "سُلف الراتب"، اختر الموظف، أدخل إجمالي السُلفة (مثلاً 200 دينار)، القسط الشهري (50 دينار)، وشهر البدء.',
      },
      {
        title: 'Step 2: Automated Payroll Deduction',
        titleAr: 'الخطوة 2: الخصم الشهري التلقائي',
        detail:
          'During monthly payroll processing, the active monthly installment is automatically populated as a deduction. Once fully paid, deductions automatically stop.',
        detailAr:
          'عند معالجة مسير الرواتب شهرياً، يتم إدراج القسط تلقائياً ضمن الخصومات، ويتوقف الخصم تلقائياً بمجرد اكتمال سداد السُلفة.',
      },
      {
        title: 'Step 3: Employee Loan Progress Tracking',
        titleAr: 'الخطوة 3: متابعة الموظف لسُلفته',
        detail:
          'Employees can view their active loan progress bar, paid amount, and remaining balance directly on their Profile page.',
        detailAr:
          'يمكن للموظف متابعة شريط تقدم سداد سُلفته، المبلغ المسدد، والمتبقي مباشرة من صفحته الشخصية.',
      },
    ],
    tips: [
      { en: 'HR can review completed or cancelled advances anytime using status filter tabs.', ar: 'يمكن لقسم HR مراجعة السُلف المكتملة أو الملغاة في أي وقت من تبويبات تصفية الحالة.' },
    ],
    routeLink: { path: '/dashboard/payroll', label: 'Open Payroll & Advances', labelAr: 'فتح مسير الرواتب والسُلف' },
  },
  {
    id: 'overtime-limits',
    icon: '🚨',
    title: 'Daily Hours Limits & 15H Auto Clock-Out',
    titleAr: 'ساعات العمل اليومية والإغلاق التلقائي (15 ساعة)',
    category: 'Daily Operations',
    categoryAr: 'العمليات اليومية',
    description:
      'Configurable daily work hour limits per employee (default 12 hours) and automatic safety clock-out after 15 continuous hours to prevent runaway open shifts.',
    descriptionAr:
      'تحديد الحد الأقصى لساعات العمل اليومية لكل موظف (الافتراضي 12 ساعة) والإغلاق التلقائي الأمني بعد 15 ساعة متواصلة لمنع الدوام المنسي.',
    steps: [
      {
        title: 'Per-Employee Daily Work Hours Limit',
        titleAr: 'حد ساعات العمل اليومي لكل موظف',
        detail:
          'HR/Admin can set a custom daily work hours limit (e.g. 8, 10, or 12 hours) in the employee profile. Crossing this limit requires entering an authorizing manager name.',
        detailAr:
          'يمكن لـ HR تحديد حد يومي مخصص (مثلاً 8 أو 10 أو 12 ساعة) في ملف الموظف. وتجاوز هذا الحد يتطلب إدخال اسم المدير المرخّص للعمل الإضافي.',
      },
      {
        title: '15-Hour Safety Auto Clock-Out',
        titleAr: 'الإغلاق التلقائي الأمني عند 15 ساعة',
        detail:
          'If an employee forgets to clock out, the system automatically closes the shift at 15 hours and flags it for HR review in the "15+ Hours Auto-Closed" tab.',
        detailAr:
          'إذا نسي الموظف تسجيل الخروج، يغلق النظام الدوام تلقائياً عند 15 ساعة ويحيله لمراجعة HR في تبويب "تلقائي 15+ ساعة".',
      },
    ],
    tips: [
      { en: 'Auto-closed 15h shifts require HR approval before hours count towards payroll.', ar: 'الورديات المغلقة تلقائياً بعد 15 ساعة تتطلب موافقة HR قبل احتساب ساعاتها في الراتب.' },
    ],
    routeLink: { path: '/dashboard/attendance', label: 'Open Attendance Page', labelAr: 'فتح صفحة الدوام' },
  },
];

export default function InstructionsPage() {
  const { t, isRtl } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Getting Started', 'Daily Operations', 'Planning & Collaboration', 'Leaves & Off-Days'];

  const filteredSections = SECTIONS.filter((sec) => {
    const categoryName = isRtl ? sec.categoryAr : sec.category;
    const matchesCategory = selectedCategory === 'ALL' || categoryName === selectedCategory || sec.category === selectedCategory;
    const matchesSearch =
      (isRtl ? sec.titleAr : sec.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isRtl ? sec.descriptionAr : sec.description).toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === '';
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-slate-900 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              <span>📖 {t('inst_title')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {t('inst_title')}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {t('inst_subtitle')}
            </p>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl text-white shadow-2xl flex-shrink-0">
            📚
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <svg
              className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('inst_search_placeholder')}
              className={`input-field ${isRtl ? 'pr-10' : 'pl-10'} text-sm py-2.5 bg-slate-900/80 border-white/10`}
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Quick Feature Jump Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {SECTIONS.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="glass-card p-4 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all group flex flex-col justify-between hover:scale-[1.02] bg-slate-900/60 shadow-md"
          >
            <div className="space-y-2">
              <span className="text-2xl block">{sec.icon}</span>
              <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {isRtl ? sec.titleAr : sec.title}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block pt-2">
              {isRtl ? sec.categoryAr : sec.category} {isRtl ? '←' : '→'}
            </span>
          </a>
        ))}
      </div>

      {/* Instructions Sections List */}
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            id={sec.id}
            className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/70 space-y-6 shadow-xl relative"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  {sec.icon}
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block">
                    {isRtl ? sec.categoryAr : sec.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {isRtl ? sec.titleAr : sec.title}
                  </h2>
                </div>
              </div>

              {sec.routeLink && (
                <Link
                  to={sec.routeLink.path}
                  className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>{isRtl ? sec.routeLink.labelAr : sec.routeLink.label}</span>
                  <span>{isRtl ? '←' : '→'}</span>
                </Link>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {isRtl ? sec.descriptionAr : sec.description}
            </p>

            {/* Step-by-Step Breakdown */}
            {sec.steps && sec.steps.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'الخطوات والتوضيح' : 'How it Works & Steps'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {sec.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {isRtl ? step.titleAr : step.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-8">
                        {isRtl ? step.detailAr : step.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pro Tips */}
            {sec.tips && sec.tips.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span>💡 {isRtl ? 'نصيحة مهمة' : 'Pro Tip'}</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                  {sec.tips.map((tip, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {isRtl ? tip.ar : tip.en}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
