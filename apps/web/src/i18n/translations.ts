export type Language = 'en' | 'ar';

export interface Translations {
  // Navigation
  nav_dashboard: string;
  nav_instructions: string;
  nav_presence: string;
  nav_messages: string;
  nav_profile: string;
  nav_attendance: string;
  nav_schedule: string;
  nav_absence: string;
  nav_my_cards: string;
  nav_employees: string;
  nav_tracker: string;
  nav_reports: string;
  nav_payroll: string;
  nav_issue_card: string;
  nav_all_cards: string;
  nav_create_user: string;
  nav_audit: string;
  nav_signout: string;

  // Header & Brand
  brand_title: string;
  brand_subtitle: string;
  language: string;
  english: string;
  arabic: string;
  select_language: string;

  // Common UI Actions
  save: string;
  cancel: string;
  submit: string;
  edit: string;
  delete: string;
  close: string;
  back: string;
  loading: string;
  search: string;
  online: string;
  offline: string;
  on_leave: string;
  hours: string;
  minutes: string;
  days: string;
  points: string;

  // Login Page
  login_welcome: string;
  login_subtitle: string;
  email_address: string;
  password: string;
  sign_in: string;
  signing_in: string;
  invalid_credentials: string;

  // Dashboard Home
  dash_welcome: string;
  dash_clock_in: string;
  dash_clock_out: string;
  dash_shift_active: string;
  dash_shift_offline: string;
  dash_worked_hours: string;
  dash_worked_this_month: string;
  dash_leave_balances: string;
  dash_sick_days_left: string;
  dash_vacation_days_left: string;
  dash_card_points: string;
  dash_compensation_title: string;
  dash_base_pay: string;
  dash_hourly_rate: string;
  dash_allowance: string;
  dash_bonus: string;

  // Attendance Page
  att_title: string;
  att_subtitle: string;
  att_clock_in_btn: string;
  att_clock_out_btn: string;
  att_intended_task: string;
  att_work_location: string;
  att_office: string;
  att_home: string;
  att_completed_count: string;
  att_results_note: string;
  att_history_title: string;
  att_date: string;
  att_clock_in_time: string;
  att_clock_out_time: string;
  att_duration: string;
  att_output: string;
  att_status: string;

  // Schedule & Meetings Page
  sched_title: string;
  sched_subtitle: string;
  sched_my_tab: string;
  sched_roster_tab: string;
  sched_meetings_tab: string;
  sched_today_req: string;
  sched_office_day: string;
  sched_home_day: string;
  sched_join_meeting: string;
  sched_create_meeting: string;
  sched_attendees: string;
  sched_select_staff: string;
  sched_fixed_income: string;
  sched_per_hour: string;

  // My Profile Page
  prof_title: string;
  prof_subtitle: string;
  prof_personal_info: string;
  prof_full_name: string;
  prof_phone: string;
  prof_department: string;
  prof_bio: string;
  prof_photo_upload: string;
  prof_ts_username: string;
  prof_compensation: string;

  // Instructions Page
  inst_title: string;
  inst_subtitle: string;
  inst_search_placeholder: string;
  inst_all_guides: string;

  // Live Radar (Presence)
  presence_title: string;
  presence_subtitle: string;
  presence_filter_all: string;
  presence_filter_office: string;
  presence_filter_remote: string;
  presence_filter_leave: string;
  presence_set_status_btn: string;
  presence_status_modal_title: string;
  presence_custom_emoji: string;
  presence_status_message: string;

  // Messages & Chat
  chat_title: string;
  chat_contacts: string;
  chat_type_message: string;
  chat_send: string;
  chat_no_messages: string;
  chat_direct_messages: string;
  chat_channels: string;

  // Absence & Leaves
  abs_title: string;
  abs_subtitle: string;
  abs_request_btn: string;
  abs_type_sick: string;
  abs_type_vacation: string;
  abs_type_regular: string;
  abs_type_hourly: string;
  abs_type_early: string;
  abs_reason: string;
  abs_document_upload: string;
  abs_pending: string;
  abs_approved: string;
  abs_rejected: string;
  abs_history_title: string;

  // My Performance Cards
  cards_title: string;
  cards_subtitle: string;
  cards_gold: string;
  cards_blue: string;
  cards_green: string;
  cards_yellow: string;
  cards_red: string;
  cards_net_total: string;
  cards_issued_by: string;
  cards_reason: string;

  // HR & Admin Suite
  emp_title: string;
  emp_subtitle: string;
  emp_total_hours: string;
  emp_search_placeholder: string;
  emp_edit_wage: string;
  emp_issue_card: string;

  track_title: string;
  track_subtitle: string;
  track_active_sessions: string;
  track_idle_limit: string;

  rep_title: string;
  rep_subtitle: string;
  rep_export_pdf: string;
  rep_export_excel: string;

  pay_title: string;
  pay_subtitle: string;
  pay_process_batch: string;
  pay_net_payout: string;

  user_create_title: string;
  audit_title: string;
  audit_subtitle: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_instructions: 'Instructions',
    nav_presence: 'Live Radar (Online)',
    nav_messages: 'Messages',
    nav_profile: 'My Profile ($)',
    nav_attendance: 'Attendance',
    nav_schedule: 'Schedule & Meetings',
    nav_absence: 'Absence & Leaves',
    nav_my_cards: 'My Cards',
    nav_employees: 'Employees',
    nav_tracker: 'PC Tracker',
    nav_reports: 'Reports',
    nav_payroll: 'Payroll Processing',
    nav_issue_card: 'Issue Card',
    nav_all_cards: 'All Cards',
    nav_create_user: 'Create User',
    nav_audit: 'Audit Logs',
    nav_signout: 'Sign out',

    // Header & Brand
    brand_title: 'HRMS',
    brand_subtitle: 'Human Resource System',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    select_language: 'Select Language',

    // Common UI Actions
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
    loading: 'Loading...',
    search: 'Search...',
    online: 'Online',
    offline: 'Offline',
    on_leave: 'On Leave',
    hours: 'hrs',
    minutes: 'mins',
    days: 'days',
    points: 'pts',

    // Login Page
    login_welcome: 'Welcome Back',
    login_subtitle: 'Sign in to access your HRMS portal & workspace',
    email_address: 'Email Address',
    password: 'Password',
    sign_in: 'Sign In',
    signing_in: 'Signing in...',
    invalid_credentials: 'Invalid email or password',

    // Dashboard Home
    dash_welcome: 'Welcome back,',
    dash_clock_in: 'Clock In Now',
    dash_clock_out: 'Clock Out',
    dash_shift_active: 'Shift Active (Clocked In)',
    dash_shift_offline: 'Currently Offline',
    dash_worked_hours: 'Worked Hours',
    dash_worked_this_month: 'Worked This Month',
    dash_leave_balances: 'Leave Balances',
    dash_sick_days_left: 'Sick Days Left',
    dash_vacation_days_left: 'Vacation Days Left',
    dash_card_points: 'Net Card Points',
    dash_compensation_title: 'Compensation Overview',
    dash_base_pay: 'Base Salary',
    dash_hourly_rate: 'Hourly Rate',
    dash_allowance: 'Transport Allowance',
    dash_bonus: 'Recurring Bonus',

    // Attendance Page
    att_title: 'Daily Attendance & Time Clock',
    att_subtitle: 'Clock in for your shift, report tasks, and track worked hours',
    att_clock_in_btn: 'Clock In',
    att_clock_out_btn: 'Clock Out',
    att_intended_task: 'Intended Task / Morning Plan',
    att_work_location: 'Work Location',
    att_office: 'Office',
    att_home: 'Home / Remote',
    att_completed_count: 'Completed Tasks Count',
    att_results_note: 'Results Note & Summary',
    att_history_title: 'Shift & Attendance History',
    att_date: 'Date',
    att_clock_in_time: 'Clock In',
    att_clock_out_time: 'Clock Out',
    att_duration: 'Worked Time',
    att_output: 'Outputs',
    att_status: 'Status',

    // Schedule & Meetings Page
    sched_title: 'Company Schedule & Meetings',
    sched_subtitle: 'Track required office days, upcoming meetings, and office rosters',
    sched_my_tab: '👤 My Schedule',
    sched_roster_tab: '🏢 Office Roster',
    sched_meetings_tab: '📅 Meetings & Events',
    sched_today_req: 'Today\'s Office Requirement',
    sched_office_day: 'Office Attendance Required Today',
    sched_home_day: 'Work From Home Today',
    sched_join_meeting: 'Join Video Call',
    sched_create_meeting: 'Schedule New Meeting',
    sched_attendees: 'Invite Attendees',
    sched_select_staff: 'Assign Staff to Office',
    sched_fixed_income: 'Fixed Income',
    sched_per_hour: 'Per Hour',

    // My Profile Page
    prof_title: 'My Profile & Account Settings',
    prof_subtitle: 'Manage your contact information, profile picture, and view rates',
    prof_personal_info: 'Personal Information',
    prof_full_name: 'Full Name',
    prof_phone: 'Phone Number',
    prof_department: 'Department',
    prof_bio: 'Bio / Note',
    prof_photo_upload: 'Update Profile Photo',
    prof_ts_username: 'Windows / TS Username',
    prof_compensation: 'Compensation Breakdown',

    // Instructions Page
    inst_title: 'Application Guide & Instructions',
    inst_subtitle: 'Learn how to use all features available to you in the HRMS application',
    inst_search_placeholder: 'Search guide by feature or keyword...',
    inst_all_guides: '🌟 All Guides',

    // Live Radar (Presence)
    presence_title: 'Live Team Presence Radar',
    presence_subtitle: 'Real-time online status, office & remote work locations, and custom notes',
    presence_filter_all: 'All Teammates',
    presence_filter_office: '🏢 Office',
    presence_filter_remote: '🏠 Remote',
    presence_filter_leave: '🏖️ On Leave',
    presence_set_status_btn: '✏️ Set Custom Status',
    presence_status_modal_title: 'Update Your Custom Status',
    presence_custom_emoji: 'Status Emoji',
    presence_status_message: 'Custom Message / Note',

    // Messages & Chat
    chat_title: 'Messages & Team Chat',
    chat_contacts: 'Contacts & Conversations',
    chat_type_message: 'Type a message...',
    chat_send: 'Send',
    chat_no_messages: 'No messages yet. Start a conversation!',
    chat_direct_messages: 'Direct Messages',
    chat_channels: 'Group Channels',

    // Absence & Leaves
    abs_title: 'Absence & Leave Requests',
    abs_subtitle: 'Request time off, upload medical reports, and track approval status',
    abs_request_btn: '➕ Request Time Off',
    abs_type_sick: 'Sick Leave',
    abs_type_vacation: 'Vacation',
    abs_type_regular: 'Regular Off',
    abs_type_hourly: 'Hourly Off',
    abs_type_early: 'Early Leave',
    abs_reason: 'Reason for Request',
    abs_document_upload: 'Upload Medical Certificate / Report',
    abs_pending: 'Pending ⏳',
    abs_approved: 'Approved ✅',
    abs_rejected: 'Rejected ❌',
    abs_history_title: 'My Leave History & Status',

    // My Performance Cards
    cards_title: 'My Performance Cards & Recognition',
    cards_subtitle: 'View performance cards issued to you and their impact on net points',
    cards_gold: 'Gold Card (+50)',
    cards_blue: 'Blue Card (+30)',
    cards_green: 'Green Card (+10)',
    cards_yellow: 'Yellow Card (-10)',
    cards_red: 'Red Card (-30)',
    cards_net_total: 'Total Net Points',
    cards_issued_by: 'Issued by',
    cards_reason: 'Reason & Feedback',

    // HR & Admin Suite
    emp_title: 'Employees Directory',
    emp_subtitle: 'Manage company staff profiles, worked hours, and wage rates',
    emp_total_hours: 'Total Hours Worked',
    emp_search_placeholder: 'Search by name, department...',
    emp_edit_wage: 'Edit Wage Rates',
    emp_issue_card: 'Issue Performance Card',

    track_title: 'PC Desktop Activity Tracker',
    track_subtitle: 'Monitor active employee Windows PC sessions, idle limits, and security alerts',
    track_active_sessions: 'Active Devices Tracked',
    track_idle_limit: 'Idle Inactivity Threshold',

    rep_title: 'Company Reports & Analytics',
    rep_subtitle: 'Export comprehensive attendance trends and payroll summaries',
    rep_export_pdf: 'Export PDF Report',
    rep_export_excel: 'Export Excel Data',

    pay_title: 'Payroll Processing & Management',
    pay_subtitle: 'Calculate net payouts, bonus adjustments, and review saved payroll batches',
    pay_process_batch: 'Process Monthly Payroll Batch',
    pay_net_payout: 'Total Net Payout',

    user_create_title: 'Create New Employee Account',
    audit_title: 'System Security Audit Logs',
    audit_subtitle: 'View administrative actions, security logs, and system events',
  },
  ar: {
    // Navigation
    nav_dashboard: 'الرئيسية',
    nav_instructions: 'دليل الاستخدام',
    nav_presence: 'الرادار المباشر (المتصلون)',
    nav_messages: 'الرسائل',
    nav_profile: 'ملفي الشخصي ($)',
    nav_attendance: 'تسجيل الدخول والدوام',
    nav_schedule: 'الجدول والاجتماعات',
    nav_absence: 'الإجازات والمغادرات',
    nav_my_cards: 'بطاقاتي',
    nav_employees: 'الموظفون',
    nav_tracker: 'مراقب الأجهزة',
    nav_reports: 'التقارير',
    nav_payroll: 'معالجة الرواتب',
    nav_issue_card: 'إصدار بطاقة',
    nav_all_cards: 'سجل البطاقات',
    nav_create_user: 'إضافة موظف',
    nav_audit: 'سجل التدقيق',
    nav_signout: 'تسجيل الخروج',

    // Header & Brand
    brand_title: 'نظام الموارد البشرية',
    brand_subtitle: 'إدارة الموارد البشرية',
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    select_language: 'اختر اللغة',

    // Common UI Actions
    save: 'حفظ',
    cancel: 'إلغاء',
    submit: 'إرسال',
    edit: 'تعديل',
    delete: 'حذف',
    close: 'إغلاق',
    back: 'رجوع',
    loading: 'جاري التحميل...',
    search: 'بحث...',
    online: 'متصل',
    offline: 'غير متصل',
    on_leave: 'في إجازة',
    hours: 'ساعة',
    minutes: 'دقيقة',
    days: 'أيام',
    points: 'نقطة',

    // Login Page
    login_welcome: 'مرحباً بك مجدداً',
    login_subtitle: 'قم بتسجيل الدخول للوصول إلى بوابة نظام الموارد البشرية',
    email_address: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    sign_in: 'تسجيل الدخول',
    signing_in: 'جاري تسجيل الدخول...',
    invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',

    // Dashboard Home
    dash_welcome: 'أهلاً بك،',
    dash_clock_in: 'تسجيل الدخول الآن',
    dash_clock_out: 'تسجيل الخروج',
    dash_shift_active: 'الدوام نشط (مسجل دخول)',
    dash_shift_offline: 'غير متصل حالياً',
    dash_worked_hours: 'ساعات العمل',
    dash_worked_this_month: 'ساعات هذا الشهر',
    dash_leave_balances: 'رصيد الإجازات',
    dash_sick_days_left: 'إجازات مرصودة متبقية',
    dash_vacation_days_left: 'إجازات سنوية متبقية',
    dash_card_points: 'نقاط البطاقات',
    dash_compensation_title: 'ملخص الراتب والبدلات',
    dash_base_pay: 'الراتب الأساسي',
    dash_hourly_rate: 'أجر الساعة',
    dash_allowance: 'بدل المواصلات',
    dash_bonus: 'المكافأة الشهرية',

    // Attendance Page
    att_title: 'سجل الدخول اليومي والدوام',
    att_subtitle: 'قم بتسجيل الدخول لبداية الدوام، متابعة المهام، وعرض ساعات العمل',
    att_clock_in_btn: 'تسجيل بداية الدوام',
    att_clock_out_btn: 'تسجيل نهاية الدوام',
    att_intended_task: 'المهمة المخطط لها اليوم',
    att_work_location: 'مكان العمل',
    att_office: 'من المكتب',
    att_home: 'من المنزل (عن بُعد)',
    att_completed_count: 'عدد المهام المنجزة',
    att_results_note: 'ملخص الإنجاز والنتائج',
    att_history_title: 'سجل الحضور والدوام السابـق',
    att_date: 'التاريخ',
    att_clock_in_time: 'بداية الدوام',
    att_clock_out_time: 'نهاية الدوام',
    att_duration: 'ساعات العمل',
    att_output: 'الإنجازات',
    att_status: 'الحالة',

    // Schedule & Meetings Page
    sched_title: 'جدول الشركة والاجتماعات',
    sched_subtitle: 'متابعة أيام المكتب المطلوبة، الاجتماعات القادمة، وجدول الموظفين',
    sched_my_tab: '👤 جدولـي الشخصي',
    sched_roster_tab: '🏢 جدول المكتب',
    sched_meetings_tab: '📅 الاجتماعات والفعاليات',
    sched_today_req: 'متطلب حضور اليوم',
    sched_office_day: 'مطلوب الحضور للمكتب اليوم 🏢',
    sched_home_day: 'العمل من المنزل اليوم 🏠',
    sched_join_meeting: 'الانضمام للمكالمة المرئية',
    sched_create_meeting: 'جدولة اجتماع جديد',
    sched_attendees: 'دعوة الحضور',
    sched_select_staff: 'تعيين الموظفين للمكتب',
    sched_fixed_income: 'راتب ثابت',
    sched_per_hour: 'بالساعة',

    // My Profile Page
    prof_title: 'ملفي الشخصي وإعدادات الحساب',
    prof_subtitle: 'إدارة بيانات التواصل، الصورة الشخصية، ومراجعة الهيكل المالي',
    prof_personal_info: 'المعلومات الشخصية',
    prof_full_name: 'الاسم الكامل',
    prof_phone: 'رقم الهاتف',
    prof_department: 'القسم / الإدارة',
    prof_bio: 'نبذة شخصية',
    prof_photo_upload: 'تحديث الصورة الشخصية',
    prof_ts_username: 'اسم مستخدم Windows / TS',
    prof_compensation: 'تفاصيل المستحقات والراتب',

    // Instructions Page
    inst_title: 'دليل الاستخدام والتعليمات',
    inst_subtitle: 'تعرّف على كيفية استخدام جميع ميزات النظام المتاحة لك كموظف',
    inst_search_placeholder: 'ابحث في الدليل عن ميزة أو كلمة مفتاحية...',
    inst_all_guides: '🌟 جميع الأدلة',

    // Live Radar (Presence)
    presence_title: 'رادار المتصلين المباشر',
    presence_subtitle: 'متابعة حالة الاتصال المباشرة، مكان العمل (المكتب أو العمل عن بُعد)، والملاحظات',
    presence_filter_all: 'جميع الزملاء',
    presence_filter_office: '🏢 من المكتب',
    presence_filter_remote: '🏠 عن بُعد',
    presence_filter_leave: '🏖️ في إجازة',
    presence_set_status_btn: '✏️ تعيين حالة مخصصة',
    presence_status_modal_title: 'تحديث حالتك المخصصة',
    presence_custom_emoji: 'رمز الحالة (إيموجي)',
    presence_status_message: 'رسالة الحالة / ملاحظة',

    // Messages & Chat
    chat_title: 'الرسائل والمحادثات',
    chat_contacts: 'جهات الاتصال والمحادثات',
    chat_type_message: 'اكتب رسالتك هنا...',
    chat_send: 'إرسال',
    chat_no_messages: 'لا توجد رسائل سابقة. ابدأ المحادثة الآن!',
    chat_direct_messages: 'المحادثات المباشرة',
    chat_channels: 'القنوات الجماعية',

    // Absence & Leaves
    abs_title: 'طلب الإجازات والمغادرات',
    abs_subtitle: 'تقديم طلبات الإجازة، إرفاق الأعذار والتقارير الطبية، ومتابعة القبول',
    abs_request_btn: '➕ تقديم طلب إجازة',
    abs_type_sick: 'إجازة مرضية',
    abs_type_vacation: 'إجازة سنوية',
    abs_type_regular: 'إجازة اعتيادية',
    abs_type_hourly: 'مغادرة ساعية',
    abs_type_early: 'مغادرة مبكرة',
    abs_reason: 'سبب الطلب',
    abs_document_upload: 'إرفاق تقرير طبي / عذر مسبب',
    abs_pending: 'قيد الانتظار ⏳',
    abs_approved: 'مقبول ✅',
    abs_rejected: 'مرفوض ❌',
    abs_history_title: 'سجل الطلبات السابقة والحالة',

    // My Performance Cards
    cards_title: 'بطاقاتي وتقييم الأداء',
    cards_subtitle: 'عرض بطاقات التقدير الممنوحة لك وتأثيرها على صافي النقاط',
    cards_gold: 'البطاقة الذهبية (+50)',
    cards_blue: 'البطاقة الزرقاء (+30)',
    cards_green: 'البطاقة الخضراء (+10)',
    cards_yellow: 'البطاقة الصفراء (-10)',
    cards_red: 'البطاقة الحمراء (-30)',
    cards_net_total: 'مجموع النقاط الصافي',
    cards_issued_by: 'صادرة من',
    cards_reason: 'السبب والملاحظات',

    // HR & Admin Suite
    emp_title: 'دليل الموظفين',
    emp_subtitle: 'إدارة ملفات الموظفين، ساعات العمل، والهيكل المالي',
    emp_total_hours: 'إجمالي ساعات العمل',
    emp_search_placeholder: 'بحث بالاسم، القسم...',
    emp_edit_wage: 'تعديل الأجور والراتب',
    emp_issue_card: 'إصدار بطاقة تقدير',

    track_title: 'مراقب الأجهزة والأنشطة',
    track_subtitle: 'متابعة جلسات العمل المباشرة على الأجهزة، حدود الخمول، والتنبيهات',
    track_active_sessions: 'الأجهزة النشطة تحت المراقبة',
    track_idle_limit: 'حد الخمول وعدم النشاط',

    rep_title: 'تقارير الشركة والتحليلات',
    rep_subtitle: 'تصدير تقارير اتجاهات الحضور والدوام وملخص الرواتب',
    rep_export_pdf: 'تصدير تقرير PDF',
    rep_export_excel: 'تصدير بيانات Excel',

    pay_title: 'معالجة وإدارة الرواتب',
    pay_subtitle: 'احتساب صافي المستحقات، تعديلات النقاط والخصومات، وحفظ مسيرات الرواتب',
    pay_process_batch: 'معالجة مسير الرواتب الشهري',
    pay_net_payout: 'إجمالي المبالغ الصافية',

    user_create_title: 'إضافة حساب موظف جديد',
    audit_title: 'سجل الأمان والتدقيق',
    audit_subtitle: 'استعراض سجل العمليات الإدارية، تنبيهات الأمان، وأحداث النظام',
  },
};
