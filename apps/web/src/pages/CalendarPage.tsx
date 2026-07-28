import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { scheduleApi } from '../api/client';
import { MeetingDto } from '@hrms/shared';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  color?: string; // 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose'
  description?: string;
}

export default function CalendarPage() {
  const { isRtl } = useLanguage();

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());

  // View Mode: 'HRMS' | 'GOOGLE'
  const [viewMode, setViewMode] = useState<'HRMS' | 'GOOGLE'>('HRMS');

  // Google Calendar Connection State
  const [googleCalUrl, setGoogleCalUrl] = useState<string>(() => {
    return localStorage.getItem('hrms_google_calendar_url') || '';
  });
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleInputUrl, setGoogleInputUrl] = useState(googleCalUrl);

  // Events & Meetings State
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('hrms_calendar_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Add Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('09:00');
  const [eventColor, setEventColor] = useState('indigo');
  const [eventDesc, setEventDesc] = useState('');

  // Fetch Meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const data = await scheduleApi.getMeetings();
        setMeetings(data);
      } catch (err) {
        console.error('Failed to load meetings for calendar:', err);
      }
    };
    fetchMeetings();
  }, []);

  // Save Local Events
  useEffect(() => {
    localStorage.setItem('hrms_calendar_events', JSON.stringify(events));
  }, [events]);

  // Save Google Calendar URL
  const handleSaveGoogleUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedUrl = googleInputUrl.trim();
    
    // Auto-convert standard Google Calendar sharing link to Embed URL if needed
    if (cleanedUrl && !cleanedUrl.includes('embed?')) {
      if (cleanedUrl.includes('calendar.google.com')) {
        const match = cleanedUrl.match(/src=([^&]+)/);
        if (match) {
          cleanedUrl = `https://calendar.google.com/calendar/embed?src=${match[1]}&ctz=Asia%2FAmman`;
        }
      }
    }

    setGoogleCalUrl(cleanedUrl);
    localStorage.setItem('hrms_google_calendar_url', cleanedUrl);
    setIsGoogleModalOpen(false);
    if (cleanedUrl) setViewMode('GOOGLE');
  };

  // Add New Custom Event
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEv: CalendarEvent = {
      id: Date.now().toString(),
      title: eventTitle.trim(),
      date: eventDate,
      time: eventTime,
      color: eventColor,
      description: eventDesc.trim(),
    };

    setEvents((prev) => [...prev, newEv]);
    setEventTitle('');
    setEventDesc('');
    setIsAddEventOpen(false);
  };

  // Delete Custom Event
  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  // Month Grid Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startingDayIndex = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const totalDays = lastDayOfMonth.getDate();

  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format Date string
  const formatDateStr = (d: number) => {
    const m = String(month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-slate-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              <span>📅 {isRtl ? 'التقويم والربط الذكي' : 'Calendar & Integrations'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isRtl ? 'تقويم الفعاليات و Google Calendar' : 'Calendar & Google Calendar Sync'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isRtl
                ? 'استعراض مواعيدك والفعاليات اليومية، مع إمكانية الربط المباشر مع تقويم Google لإبقاء جدولك محدثاً.'
                : 'Manage your appointments, shift events, and sync directly with Google Calendar.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-md transition-all flex items-center gap-2"
            >
              <span>🔗</span>
              <span>{isRtl ? 'ربط تقويم Google' : 'Connect Google Calendar'}</span>
            </button>

            <button
              onClick={() => setIsAddEventOpen(true)}
              className="gradient-btn px-4 py-2.5 text-xs font-extrabold shadow-lg flex items-center gap-2"
            >
              <span>+</span>
              <span>{isRtl ? 'إضافة حدث جديد' : 'Add New Event'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-white/10 text-xs font-bold gap-1">
          <button
            onClick={() => setViewMode('HRMS')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'HRMS'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? '📅 تقويم النظام التفاعلي' : '📅 HRMS Calendar'}
          </button>
          <button
            onClick={() => setViewMode('GOOGLE')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'GOOGLE'
                ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? '🌐 تقويم Google المباشر' : '🌐 Google Live Calendar'}
          </button>
        </div>

        {viewMode === 'HRMS' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-white/10 transition-colors"
            >
              {isRtl ? '➔' : '◀'}
            </button>
            <span className="text-sm font-extrabold text-white min-w-[140px] text-center">
              {isRtl ? `${monthNamesAr[month]} ${year}` : `${monthNamesEn[month]} ${year}`}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-white/10 transition-colors"
            >
              {isRtl ? '⬅' : '▶'}
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all"
            >
              {isRtl ? 'اليوم' : 'Today'}
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: HRMS INTERACTIVE CALENDAR GRID */}
      {viewMode === 'HRMS' && (
        <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/80 space-y-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center border-b border-white/10 pb-3">
            {(isRtl ? daysOfWeekAr : daysOfWeekEn).map((day, idx) => (
              <div key={idx} className="text-xs font-black uppercase text-indigo-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty Offset Days before month starts */}
            {Array.from({ length: startingDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-28 sm:h-32 rounded-2xl bg-slate-950/30 border border-white/5 opacity-30" />
            ))}

            {/* Actual Days of the Month */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = formatDateStr(dayNum);
              const isToday = dateStr === todayStr;

              // Filter events & meetings for this specific date
              const dayEvents = events.filter((ev) => ev.date === dateStr);
              const dayMeetings = meetings.filter((m) => {
                const mDate = new Date(m.startTime).toISOString().split('T')[0];
                return mDate === dateStr;
              });

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    setEventDate(dateStr);
                    setIsAddEventOpen(true);
                  }}
                  className={`h-28 sm:h-32 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                    isToday
                      ? 'bg-indigo-500/15 border-indigo-500 shadow-lg ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-white/5 hover:border-white/20 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-300 font-bold">
                      +
                    </span>
                  </div>

                  {/* Events & Meetings Badges inside Cell */}
                  <div className="space-y-1 overflow-y-auto max-h-20 scrollbar-none">
                    {dayMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="text-[10px] p-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold truncate flex items-center gap-1"
                      >
                        <span>📹</span>
                        <span className="truncate">{m.title}</span>
                      </div>
                    ))}

                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(isRtl ? `حذف الحدث "${ev.title}"؟` : `Delete event "${ev.title}"?`)) {
                            handleDeleteEvent(ev.id);
                          }
                        }}
                        className={`text-[10px] p-1 rounded-lg border font-bold truncate flex items-center justify-between group/ev ${
                          ev.color === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
                            : ev.color === 'amber'
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/30'
                            : ev.color === 'rose'
                            ? 'bg-rose-500/20 text-rose-200 border-rose-500/30'
                            : 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
                        }`}
                      >
                        <span className="truncate">{ev.title}</span>
                        <span className="opacity-0 group-hover/ev:opacity-100 text-red-400 font-bold">✕</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: LIVE GOOGLE CALENDAR EMBED */}
      {viewMode === 'GOOGLE' && (
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-slate-900/90 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
                🌐
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isRtl ? 'تقويم Google المباشر (Google Live Calendar)' : 'Live Synced Google Calendar'}
                </h2>
                <p className="text-xs text-slate-400">
                  {googleCalUrl
                    ? (isRtl ? 'يتم استعراض التقويم المربوط مباشرة من Google.' : 'Showing active connected Google Calendar embed.')
                    : (isRtl ? 'لم يتم ربط رابط تقويم Google بعد.' : 'No Google Calendar link connected yet.')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              {isRtl ? 'تعديل الرابط ⚙️' : 'Configure Link ⚙️'}
            </button>
          </div>

          {googleCalUrl ? (
            <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-white">
              <iframe
                src={googleCalUrl}
                style={{ border: 0 }}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                title="Google Calendar Embed"
              />
            </div>
          ) : (
            <div className="p-12 text-center space-y-4 bg-slate-950/60 rounded-2xl border border-white/5 max-w-lg mx-auto">
              <span className="text-5xl block">📅</span>
              <h3 className="text-lg font-bold text-white">
                {isRtl ? 'ربط حساب وتقويم Google الخاص بك' : 'Connect Your Google Calendar'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isRtl
                  ? 'قم بنسخ رابط تضمين تقويم Google الخاص بك (Embed URL) لربطه مباشرة وعرض فعالياتك في النظام.'
                  : 'Paste your public Google Calendar Embed URL to display your synced live events directly inside HRMS.'}
              </p>
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className="gradient-btn px-6 py-2.5 text-xs font-bold shadow-lg"
              >
                {isRtl ? 'إدخال رابط تقويم Google الان' : 'Enter Google Calendar Link Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONNECT GOOGLE CALENDAR MODAL */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-emerald-500/30 max-w-lg w-full p-6 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
                  🔗
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isRtl ? 'إعداد ربط تقويم Google' : 'Google Calendar Configuration'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl ? 'أدخل رابط التضمين الخاص بتقويم Google (Public Embed URL).' : 'Paste your Google Calendar iCal or Embed URL.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsGoogleModalOpen(false)} className="p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveGoogleUrl} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isRtl ? 'رابط تقويم Google (Embed/iCal URL)' : 'Google Calendar Share/Embed URL'}
                </label>
                <input
                  type="url"
                  value={googleInputUrl}
                  onChange={(e) => setGoogleInputUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/embed?src=your_email@gmail.com"
                  className="input-field py-2.5 text-xs bg-slate-950 font-mono"
                  dir="ltr"
                  required
                />
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                <p className="font-bold text-indigo-300">
                  💡 {isRtl ? 'كيف تجد رابط تقويم Google الخاص بك؟' : 'How to get your Google Calendar link:'}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>{isRtl ? 'افتح Google Calendar في المتصفح.' : 'Open Google Calendar on Desktop.'}</li>
                  <li>{isRtl ? 'افتح إعدادات التقويم الخاص بك (Settings & Sharing).' : 'Go to Settings and sharing for your calendar.'}</li>
                  <li>{isRtl ? 'انسخ رابط "تضمين السجل" (Embed code URL).' : 'Copy the "Embed code" src URL.'}</li>
                </ol>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-bold shadow-md"
                >
                  {isRtl ? 'حفظ والربط الآن' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW EVENT MODAL */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-indigo-500/30 max-w-md w-full p-6 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white">
                {isRtl ? '📝 إضافة حدث / تذكير جديد' : '📝 Add Calendar Event / Reminder'}
              </h3>
              <button onClick={() => setIsAddEventOpen(false)} className="p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'عنوان الحدث *' : 'Event Title *'}</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={isRtl ? 'مثال: اجتماع فريق، تسليم مشروع...' : 'e.g. Team sync, Project deadline...'}
                  className="input-field py-2 text-xs bg-slate-950 text-white"
                  dir="auto"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'التاريخ *' : 'Date *'}</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input-field py-2 text-xs bg-slate-950 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'الوقت' : 'Time'}</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="input-field py-2 text-xs bg-slate-950 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'لون الشارة' : 'Color Badge'}</label>
                <select
                  value={eventColor}
                  onChange={(e) => setEventColor(e.target.value)}
                  className="input-field py-2 text-xs bg-slate-950 text-white font-bold"
                >
                  <option value="indigo">🟣 Indigo (بنفسجي)</option>
                  <option value="emerald">🟢 Emerald (أخضر)</option>
                  <option value="amber">🟡 Amber (أصفر)</option>
                  <option value="rose">🔴 Rose (أحمر)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'الوصف / ملاحظات' : 'Description / Notes'}</label>
                <input
                  type="text"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder={isRtl ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  className="input-field py-2 text-xs bg-slate-950 text-white"
                  dir="auto"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-bold shadow-md"
                >
                  {isRtl ? 'إضافة الحدث' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
