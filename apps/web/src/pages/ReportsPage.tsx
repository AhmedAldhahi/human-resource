import React, { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { EmployeeType } from '@hrms/shared';
import type { OverviewReportDto, AttendanceReportDto, PayrollItemDto } from '@hrms/shared';
import { useLanguage } from '../context/LanguageContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsPage() {
  const { t, isRtl } = useLanguage();
  const [overview, setOverview] = useState<OverviewReportDto | null>(null);
  const [trend, setTrend] = useState<AttendanceReportDto[]>([]);
  const [payroll, setPayroll] = useState<PayrollItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<'charts' | 'payroll'>('charts');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [ovData, trData, pyData] = await Promise.all([
        reportsApi.getOverview(),
        reportsApi.getAttendanceTrend(days),
        reportsApi.getPayroll(),
      ]);
      setOverview(ovData);
      setTrend(trData);
      setPayroll(pyData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [days]);

  const handleExportCSV = () => {
    if (payroll.length === 0) return;

    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Employee Type',
      'Monthly Salary (JOD)',
      'Hourly Wage (JOD)',
      'Total Hours Worked',
      'Late Penalty Minutes',
      'Unpaid Absence Days',
      'Net Card Points',
      'Calculated Compensation (JOD)',
    ];

    const rows = payroll.map((item) => [
      `"${item.name}"`,
      `"${item.email}"`,
      `"${item.department || 'General'}"`,
      item.employeeType,
      item.monthlySalary,
      item.hourlyWage,
      item.totalHoursWorked,
      item.penaltyMinutesTotal,
      item.unpaidAbsenceDays,
      item.netCardPoints,
      item.calculatedCompensation,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hr_payroll_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart configs
  const trendChartData = {
    labels: trend.map((t) => t.date),
    datasets: [
      {
        label: isRtl ? '🏢 حضور المكتب' : '🏢 Office Clock-Ins',
        data: trend.map((t) => t.officeCount),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 6,
      },
      {
        label: isRtl ? '🏠 حضور المنزل' : '🏠 Home Clock-Ins',
        data: trend.map((t) => t.homeCount),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 6,
      },
      {
        label: isRtl ? '⚠️ التأخيرات عن 9 ص' : '⚠️ Late Arrivals (>9 AM)',
        data: trend.map((t) => t.lateCount),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 6,
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { family: 'Inter', weight: 600 } },
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true },
    },
  };

  const empTypeDoughnutData = {
    labels: isRtl ? ['راتب ثابت', 'أجر بالساعة'] : ['Fixed Income', 'Per-Hour Wage'],
    datasets: [
      {
        data: overview ? [overview.fixedIncomeCount, overview.perHourCount] : [1, 1],
        backgroundColor: ['rgba(99, 102, 241, 0.9)', 'rgba(236, 72, 153, 0.9)'],
        borderColor: ['#1e1b4b', '#500724'],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { family: 'Inter', weight: 600 } },
      },
    },
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{isRtl ? 'تحليلات وتقارير الموارد البشرية' : 'HR Analytics & Reports'}</h1>
          <p className="text-slate-400 mt-1">
            {isRtl ? 'تحليل تفصيلي لحضور فريق العمل، مواقع الدوام، الغيابات، وحسابات الراتب' : 'Deep-dive into workforce attendance, location breakdown, absences, and payroll calculations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'charts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {isRtl ? '📊 الرسوم البيانية والتحليلات' : '📊 Analytics Charts'}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {isRtl ? '💰 جدول ملخص الراتب والمستحقات' : '💰 Payroll Summary Table'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          {overview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="glass-card p-6 border-l-4 border-l-indigo-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'إجمالي الكادر الوظيفي' : 'Total Workforce'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white" dir="ltr">{overview.totalEmployees}</span>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                    {isRtl ? `${overview.fixedIncomeCount} ثابت / ${overview.perHourCount} بالساعة` : `${overview.fixedIncomeCount} Fixed / ${overview.perHourCount} Hourly`}
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-emerald-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'تسجيلات الحضور اليوم' : "Today's Clock-Ins"}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white" dir="ltr">{overview.todayClockedIn}</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {isRtl ? `${overview.todayOfficeCount} مكتب / ${overview.todayHomeCount} منزل` : `${overview.todayOfficeCount} Office / ${overview.todayHomeCount} Home`}
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-red-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'التأخيرات عن 9:00 صباحاً اليوم' : 'Late Arrivals Today'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white" dir="ltr">{overview.todayLateCount}</span>
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
                    {isRtl ? 'بعد 9:00 ص (-45 د)' : 'After 9 AM (-45m)'}
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-purple-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'الغيابات هذا الشهر' : 'Absences This Month'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white" dir="ltr">{overview.totalAbsencesThisMonth}</span>
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
                    {isRtl ? 'مرضية واعتيادية' : 'Sick & Regular'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Chart */}
              <div className="glass-card p-6 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{isRtl ? 'تفاصيل الحضور ومواقع العمل' : 'Attendance & Location Breakdown'}</h3>
                    <p className="text-xs text-slate-400">{isRtl ? 'مقارنة يومية للحضور في المكتب مقابل المنزل والتأخيرات' : 'Daily comparison of Office vs. Home attendance and late arrivals'}</p>
                  </div>
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="input-field py-1.5 px-3 text-xs w-auto bg-white/5 border-white/10 text-slate-300"
                  >
                    <option value={7}>{isRtl ? 'آخر 7 أيام' : 'Past 7 Days'}</option>
                    <option value={14}>{isRtl ? 'آخر 14 يوماً' : 'Past 14 Days'}</option>
                    <option value={30}>{isRtl ? 'آخر 30 يوماً' : 'Past 30 Days'}</option>
                  </select>
                </div>
                <div className="h-80 w-full pt-4">
                  <Bar data={trendChartData} options={trendChartOptions} />
                </div>
              </div>

              {/* Employee Type Doughnut */}
              <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{isRtl ? 'هيكل الكادر الوظيفي' : 'Workforce Structure'}</h3>
                  <p className="text-xs text-slate-400">{isRtl ? 'توزيع موظفي الراتب الثابت مقابل أجر الساعة' : 'Fixed income vs. Per-hour wage distribution'}</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <Doughnut data={empTypeDoughnutData} options={doughnutOptions} />
                </div>
                <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
                  {isRtl ? 'يتلقى موظفو الراتب الثابت راتباً شهرياً بعد تعديل الغيابات وتأثير نقاط البطاقات.' : 'Fixed income employees receive a standard monthly salary adjusted for unpaid absences and card points.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card overflow-hidden space-y-4">
              <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{isRtl ? 'ملخص مسير الراتب والمستحقات الشهرية' : 'Monthly Payroll & Compensation Summary'}</h3>
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? 'احتساب تلقائي لخصم تأخير 45 د، خصم غيابات بدون أجر، ساعات العمل، وتأثير نقاط البطاقات (1 دينار/نقطة).'
                      : 'Auto-calculated accounting for 45m office late penalties, unpaid absence deductions, worked hours, and net performance card points (1 JOD/point).'}
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="gradient-btn px-5 py-2.5 text-xs flex items-center gap-2 font-bold shadow-lg shrink-0"
                >
                  <span>📥</span>
                  {isRtl ? 'تصدير ملف CSV' : 'Export to CSV'}
                </button>
              </div>

              {payroll.length === 0 ? (
                <div className="p-12 text-center text-slate-400">{isRtl ? 'لا توجد بيانات رواتب متاحة.' : 'No payroll data available.'}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'الموظف' : 'Employee'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'النوع والأجر الأساسي' : 'Type & Base Rate'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'ساعات العمل' : 'Hours Worked'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'خصومات التأخير' : 'Late Penalties'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'الغيابات بدون أجر' : 'Unpaid Absences'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                          {isRtl ? 'صافي النقاط' : 'Net Points'}
                        </th>
                        <th className={`px-6 py-4 text-xs font-semibold text-emerald-400 uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>
                          {isRtl ? 'إجمالي المستحقات' : 'Total Compensation'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payroll.map((item) => (
                        <tr key={item.userId} className="hover:bg-white/5 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="text-xs text-slate-400" dir="ltr">{item.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isRtl ? 'ml-2' : 'mr-2'} ${
                              item.employeeType === EmployeeType.FIXED
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            }`}>
                              {item.employeeType === EmployeeType.FIXED ? (isRtl ? 'راتب ثابت' : 'Fixed Salary') : (isRtl ? 'بالساعة' : 'Per-Hour')}
                            </span>
                            <span className="text-slate-300 text-xs" dir="ltr">
                              {item.employeeType === EmployeeType.FIXED
                                ? `${item.monthlySalary} ${isRtl ? 'دينار/شهر' : 'JOD/mo'}`
                                : `${item.hourlyWage} ${isRtl ? 'دينار/ساعة' : 'JOD/hr'}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-300" dir="ltr">
                            {item.totalHoursWorked} {isRtl ? 'ساعة' : 'hrs'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.penaltyMinutesTotal > 0 ? (
                              <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded" dir="ltr">
                                -{item.penaltyMinutesTotal} {isRtl ? 'دقيقة' : 'mins'}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">{isRtl ? '0 دقيقة' : '0 mins'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.unpaidAbsenceDays > 0 ? (
                              <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-1 rounded">
                                -{item.unpaidAbsenceDays} {isRtl ? 'يوم' : 'day(s)'}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">{isRtl ? '0 يوم' : '0 days'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-bold text-xs px-2 py-1 rounded ${
                              item.netCardPoints > 0
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : item.netCardPoints < 0
                                ? 'bg-red-500/20 text-red-400'
                                : 'text-slate-400'
                            }`} dir="ltr">
                              {item.netCardPoints > 0 ? `+${item.netCardPoints}` : item.netCardPoints} {isRtl ? 'نقطة (دينار)' : 'pts (JOD)'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                            <span className="text-lg font-extrabold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20" dir="ltr">
                              {item.calculatedCompensation} {isRtl ? 'دينار' : 'JOD'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
