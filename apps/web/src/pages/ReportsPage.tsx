import React, { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { EmployeeType } from '@hrms/shared';
import type { OverviewReportDto, AttendanceReportDto, PayrollItemDto } from '@hrms/shared';
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
      'Monthly Salary ($)',
      'Hourly Wage ($)',
      'Total Hours Worked',
      'Late Penalty Minutes',
      'Unpaid Absence Days',
      'Net Card Points',
      'Calculated Compensation ($)',
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
        label: '🏢 Office Clock-Ins',
        data: trend.map((t) => t.officeCount),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 6,
      },
      {
        label: '🏠 Home Clock-Ins',
        data: trend.map((t) => t.homeCount),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 6,
      },
      {
        label: '⚠️ Late Arrivals (>9 AM)',
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
    labels: ['Fixed Income', 'Per-Hour Wage'],
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">HR Analytics & Reports</h1>
          <p className="text-slate-400 mt-1">Deep-dive into workforce attendance, location breakdown, absences, and payroll calculations</p>
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
            📊 Analytics Charts
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            💰 Payroll Summary Table
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
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workforce</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">{overview.totalEmployees}</span>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                    {overview.fixedIncomeCount} Fixed / {overview.perHourCount} Hourly
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-emerald-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Clock-Ins</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">{overview.todayClockedIn}</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {overview.todayOfficeCount} Office / {overview.todayHomeCount} Home
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-red-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Late Arrivals Today</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">{overview.todayLateCount}</span>
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
                    After 9 AM (-45m)
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-purple-500 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absences This Month</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">{overview.totalAbsencesThisMonth}</span>
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
                    Sick & Regular
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
                    <h3 className="text-lg font-bold text-white">Attendance & Location Breakdown</h3>
                    <p className="text-xs text-slate-400">Daily comparison of Office vs. Home attendance and late arrivals</p>
                  </div>
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="input-field py-1.5 px-3 text-xs w-auto bg-white/5 border-white/10 text-slate-300"
                  >
                    <option value={7}>Past 7 Days</option>
                    <option value={14}>Past 14 Days</option>
                    <option value={30}>Past 30 Days</option>
                  </select>
                </div>
                <div className="h-80 w-full pt-4">
                  <Bar data={trendChartData} options={trendChartOptions} />
                </div>
              </div>

              {/* Employee Type Doughnut */}
              <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Workforce Structure</h3>
                  <p className="text-xs text-slate-400">Fixed income vs. Per-hour wage distribution</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <Doughnut data={empTypeDoughnutData} options={doughnutOptions} />
                </div>
                <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
                  Fixed income employees receive a standard monthly salary adjusted for unpaid absences and card points.
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card overflow-hidden space-y-4">
              <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Monthly Payroll & Compensation Summary</h3>
                  <p className="text-xs text-slate-400">
                    Auto-calculated accounting for 45m office late penalties, unpaid absence deductions, worked hours, and net performance card points ($1/point).
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="gradient-btn px-5 py-2.5 text-xs flex items-center gap-2 font-bold shadow-lg shrink-0"
                >
                  <span>📥</span>
                  Export to CSV
                </button>
              </div>

              {payroll.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No payroll data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Type & Base Rate
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Hours Worked
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Late Penalties
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Unpaid Absences
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Net Points
                        </th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Total Compensation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payroll.map((item) => (
                        <tr key={item.userId} className="hover:bg-white/5 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold mr-2 ${
                              item.employeeType === EmployeeType.FIXED
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            }`}>
                              {item.employeeType === EmployeeType.FIXED ? 'Fixed Salary' : 'Per-Hour'}
                            </span>
                            <span className="text-slate-300 text-xs">
                              {item.employeeType === EmployeeType.FIXED
                                ? `$${item.monthlySalary}/mo`
                                : `$${item.hourlyWage}/hr`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-300">
                            {item.totalHoursWorked} hrs
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.penaltyMinutesTotal > 0 ? (
                              <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">
                                -{item.penaltyMinutesTotal} mins
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">0 mins</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.unpaidAbsenceDays > 0 ? (
                              <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-1 rounded">
                                -{item.unpaidAbsenceDays} day(s)
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">0 days</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-bold text-xs px-2 py-1 rounded ${
                              item.netCardPoints > 0
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : item.netCardPoints < 0
                                ? 'bg-red-500/20 text-red-400'
                                : 'text-slate-400'
                            }`}>
                              {item.netCardPoints > 0 ? `+${item.netCardPoints}` : item.netCardPoints} pts ($)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-lg font-extrabold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20">
                              ${item.calculatedCompensation}
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
