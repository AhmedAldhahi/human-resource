import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { trackerApi, usersApi } from '../api/client';
import { TrackerEmployeeDto, TrackerDailyReportDto, Role, UserResponseDto } from '@hrms/shared';

export const TrackerPage: React.FC = () => {
  const { user } = useAuth();
  const { isRtl } = useLanguage();

  const isHrOrAdmin = user?.role === Role.ADMIN || user?.role === Role.HR;

  // View Mode: 'NATIVE' | 'EMBED'
  const [viewMode, setViewMode] = useState<'NATIVE' | 'EMBED'>('NATIVE');

  // External Embed URL
  const [dashboardUrl, setDashboardUrl] = useState<string>(() => {
    return localStorage.getItem('hrms_tracker_dashboard_url') || import.meta.env.VITE_TRACKER_DASHBOARD_URL || 'http://localhost:5174';
  });
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(dashboardUrl);

  // Native Dashboard State
  const [employees, setEmployees] = useState<TrackerEmployeeDto[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [dailyReports, setDailyReports] = useState<TrackerDailyReportDto[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponseDto[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Fetch Employees List & Initial Data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isHrOrAdmin) {
        const [empData, userList] = await Promise.all([
          trackerApi.getEmployees().catch(() => []),
          usersApi.getAll().catch(() => []),
        ]);
        setEmployees(empData);
        setAllUsers(userList);

        if (empData.length > 0) {
          setSelectedEmployeeId(empData[0].id);
          fetchReportForTrackerUser(empData[0].id);
        } else {
          // If no tracker employees returned, fetch personal daily report fallback
          fetchMyReport();
        }
      } else {
        fetchMyReport();
      }
    } catch (err: any) {
      console.error('Failed to load PC Tracker data:', err);
      setError(isRtl ? 'تعذر الاتصال بـ خادم المتتبع (Tracker API Server).' : 'Failed to connect to Tracker API Server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReport = async () => {
    try {
      const reports = await trackerApi.getMyDailyReport();
      setDailyReports(reports);
    } catch (err: any) {
      console.error('Failed to fetch personal tracker report:', err);
      setDailyReports([]);
    }
  };

  const fetchReportForTrackerUser = async (trackerId: string) => {
    try {
      const reports = await trackerApi.getDailyReport(trackerId);
      setDailyReports(reports);
    } catch (err: any) {
      console.error('Failed to fetch report for tracker user:', err);
      setDailyReports([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectEmployee = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedEmployeeId(id);
    if (id) {
      fetchReportForTrackerUser(id);
    }
  };

  const handleSaveDashboardUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputUrl.trim();
    setDashboardUrl(cleaned);
    localStorage.setItem('hrms_tracker_dashboard_url', cleaned);
    setIsUrlModalOpen(false);
  };

  const selectedEmp = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
              <span>💻 {isRtl ? 'متابعة أجهزة الكمبيوتر والسيرفرات' : 'PC & Server Activity Tracker'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isRtl ? 'نشاط أجهزة أفراد الفريق وساعات السيرفر' : 'Team PC Activity & Server Hours Tracker'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isRtl
                ? 'متابعة حية ومباشرة لإنتاجية وساعات عمل الأجهزة والسيرفرات وأوقات الخمول.'
                : 'Live tracking of active PC desktop sessions, server hours, and idle duration.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-white/10 text-xs font-bold gap-1">
              <button
                onClick={() => setViewMode('NATIVE')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'NATIVE'
                    ? 'bg-purple-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? '💻 اللوحة التفاعلية' : '💻 Native Dashboard'}
              </button>
              <button
                onClick={() => setViewMode('EMBED')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'EMBED'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? '🌐 التطبيق الخارجي' : '🌐 External App'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: NATIVE HRMS DASHBOARD */}
      {viewMode === 'NATIVE' && (
        <div className="space-y-6">
          {/* Controls / Filter Bar for HR & Admin */}
          {isHrOrAdmin && (
            <div className="glass-card p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-extrabold text-slate-300 whitespace-nowrap">
                  👤 {isRtl ? 'اختر الموظف / جهاز السيرفر:' : 'Select Employee / PC:'}
                </span>
                <select
                  value={selectedEmployeeId}
                  onChange={handleSelectEmployee}
                  className="input-field py-2 text-xs bg-slate-950 font-bold text-white min-w-[220px]"
                >
                  {employees.length === 0 ? (
                    <option value="">{isRtl ? 'لا توجد أجهزة مرتبطة' : 'No tracked PCs found'}</option>
                  ) : (
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.windowsId}) - {emp.department || 'Staff'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={fetchData}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-2 transition-all"
              >
                <span>🔄</span>
                <span>{isRtl ? 'تحديث البيانات' : 'Refresh Data'}</span>
              </button>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-purple-500/20 bg-slate-900/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold">
                <span>⏱️ {isRtl ? 'إجمالي الوقت المسجل' : 'Total Logged Time'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <p className="text-2xl font-black text-white">
                {selectedEmp?.totalTime || dailyReports[0]?.totalTime || '0h 0m'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'شامل أوقات العمل والتوقف' : 'Combined active and idle time'}
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-slate-900/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold">
                <span>⚡ {isRtl ? 'وقت العمل الفعلي' : 'Active Work Time'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-2xl font-black text-emerald-400">
                {selectedEmp?.activeTime || dailyReports[0]?.activeTime || '0h 0m'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'تفاعل البرامج ولوحة المفاتيح' : 'Keyboard & app activity'}
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold">
                <span>🛋️ {isRtl ? 'وقت الخمول' : 'Idle / Away Duration'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-300">
                {selectedEmp?.idleTime || dailyReports[0]?.idleTime || '0h 0m'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'فترات التوقف دون مدخلات' : 'No input activity recorded'}
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-indigo-500/20 bg-slate-900/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold">
                <span>📍 {isRtl ? 'حالة الموقع والتنبيهات' : 'Location & Security'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                  selectedEmp?.inOfficeToday
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {selectedEmp?.inOfficeToday ? (isRtl ? '🏢 المكتب' : '🏢 In Office') : (isRtl ? '🏠 عن بُعد' : '🏠 Remote')}
                </span>

                {selectedEmp?.securityAlerts && selectedEmp.securityAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ⚠️ {selectedEmp.securityAlerts.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedEmp?.windowsId ? `Windows: ${selectedEmp.windowsId}` : (isRtl ? 'سجل السيرفر' : 'Server Agent')}
              </p>
            </div>
          </div>

          {/* Daily Activity Timeline Table */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/90 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl text-purple-400">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isRtl ? 'سجل نشاط السيرفر اليومي' : 'Daily Server Activity Breakdown'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl ? 'جدول تقرير الساعات اليومية المسجلة عبر خادم المتتبع.' : 'Daily active hours and idle time breakdown logged by the agent.'}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                {isRtl ? 'جاري تحميل سجلات السيرفر...' : 'Loading server activity records...'}
              </div>
            ) : dailyReports.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-white/5 max-w-md mx-auto">
                <span className="text-4xl block">🖥️</span>
                <h4 className="text-sm font-bold text-white">
                  {isRtl ? 'لا توجد سجلات نشاط مسجلة لهذا الجهاز حالياً' : 'No activity records found for this PC'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'تأكد من تشغيل تطبيق المتتبع (Tracker Desktop Agent) على الجهاز.' : 'Ensure the Tracker Desktop Agent is active on the workstation.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-white/10 text-indigo-400 font-extrabold uppercase">
                      <th className="p-3 text-left">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3">{isRtl ? 'إجمالي وقت التشغيل' : 'Total Time'}</th>
                      <th className="p-3">{isRtl ? 'وقت النشاط' : 'Active Time'}</th>
                      <th className="p-3">{isRtl ? 'وقت الخمول' : 'Idle Time'}</th>
                      <th className="p-3">{isRtl ? 'أطول فترة خمول' : 'Longest Idle'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dailyReports.map((report, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono font-bold text-white text-left">{report.date}</td>
                        <td className="p-3 font-bold text-slate-200">{report.totalTime}</td>
                        <td className="p-3 font-bold text-emerald-400">{report.activeTime}</td>
                        <td className="p-3 font-bold text-amber-300">{report.idleTime}</td>
                        <td className="p-3 font-mono text-slate-400">{report.longestIdle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: EXTERNAL WEB APP EMBED IFRAME */}
      {viewMode === 'EMBED' && (
        <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 bg-slate-900/90 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl text-indigo-400">
                🌐
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isRtl ? 'تطبيق المتتبع الخارجي (External Web App)' : 'External Tracker Dashboard Embed'}
                </h3>
                <p className="text-xs text-slate-400">
                  {dashboardUrl}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUrlModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              {isRtl ? 'تعديل رابط الخادم ⚙️' : 'Configure Server URL ⚙️'}
            </button>
          </div>

          <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-slate-950 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 z-10" />
            <iframe
              src={dashboardUrl}
              title="External Tracker Dashboard"
              className="w-full h-full border-none bg-slate-950"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      )}

      {/* CONFIGURE SERVER URL MODAL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-indigo-500/30 max-w-md w-full p-6 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white">
                {isRtl ? '⚙️ إعداد رابط خادم المتتبع' : '⚙️ Configure Tracker Dashboard URL'}
              </h3>
              <button onClick={() => setIsUrlModalOpen(false)} className="p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDashboardUrl} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isRtl ? 'رابط الخادم الخارجي (Dashboard URL)' : 'Dashboard Server URL'}
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="http://localhost:5174"
                  className="input-field py-2.5 text-xs bg-slate-950 text-white font-mono"
                  dir="ltr"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-bold shadow-md"
                >
                  {isRtl ? 'حفظ الرابط' : 'Save URL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
