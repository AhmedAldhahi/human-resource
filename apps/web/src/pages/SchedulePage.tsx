import React, { useEffect, useState, useRef } from 'react';
import { scheduleApi, usersApi } from '../api/client';
import type {
  MyScheduleSummaryDto,
  OfficeScheduleDto,
  MeetingDto,
  UserResponseDto,
  WorkLocation,
} from '@hrms/shared';
import { Role, EmployeeType } from '@hrms/shared';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const DAYS_OF_WEEK = [
  { key: 0, label: 'Sun', short: 'Sun' },
  { key: 1, label: 'Mon', short: 'Mon' },
  { key: 2, label: 'Tue', short: 'Tue' },
  { key: 3, label: 'Wed', short: 'Wed' },
  { key: 4, label: 'Thu', short: 'Thu' },
  { key: 5, label: 'Fri', short: 'Fri' },
  { key: 6, label: 'Sat', short: 'Sat' },
];

export default function SchedulePage() {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === Role.HR || user?.role === Role.ADMIN;

  const [activeTab, setActiveTab] = useState<'my' | 'roster' | 'meetings'>('my');

  // Employee My Schedule State
  const [mySchedule, setMySchedule] = useState<MyScheduleSummaryDto | null>(null);

  // HR Office Roster State
  const [employees, setEmployees] = useState<UserResponseDto[]>([]);
  const [rosterWeekStart, setRosterWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day); // Start at Sunday
    return d;
  });
  const [rosterMatrix, setRosterMatrix] = useState<Record<string, Record<string, 'OFFICE' | 'HOME'>>>({});
  const [savingRoster, setSavingRoster] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  // Day Assign Modal State for HR
  const [selectedDayForModal, setSelectedDayForModal] = useState<{ dateStr: string; dayLabel: string } | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSelectedUserIds, setModalSelectedUserIds] = useState<string[]>([]);

  // HR Meetings State
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingDto | null>(null);

  // Form State for Create/Edit Meeting
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingStartTime, setMeetingStartTime] = useState('10:00');
  const [meetingEndTime, setMeetingEndTime] = useState('11:00');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  // Global Status & Errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const exportTableRef = useRef<HTMLDivElement>(null);

  // Helper to format Date as YYYY-MM-DD
  const formatYmd = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get array of 7 Date objects for current week (Sun - Sat)
  const getWeekDates = (startSun: Date): Date[] => {
    return DAYS_OF_WEEK.map((_, i) => {
      const d = new Date(startSun);
      d.setDate(startSun.getDate() + i);
      return d;
    });
  };

  const currentWeekDates = getWeekDates(rosterWeekStart);
  const weekStartStr = formatYmd(currentWeekDates[0]);
  const weekEndStr = formatYmd(currentWeekDates[6]);

  // Load My Schedule
  const fetchMySchedule = async () => {
    try {
      const data = await scheduleApi.getMySchedule();
      setMySchedule(data);
    } catch (err: any) {
      console.error('Failed to fetch my schedule:', err);
    }
  };

  // Load HR Roster Matrix
  const fetchRoster = async () => {
    try {
      const [usersData, rosterData] = await Promise.all([
        usersApi.getAll(),
        scheduleApi.getOfficeRoster(weekStartStr, weekEndStr),
      ]);

      const activeUsers = usersData.filter((u) => u.isActive);
      setEmployees(activeUsers);

      // Default Logic:
      // FIXED income employees default to 'OFFICE'
      // PER_HOUR employees default to 'HOME'
      const matrix: Record<string, Record<string, 'OFFICE' | 'HOME'>> = {};
      activeUsers.forEach((emp) => {
        matrix[emp.id] = {};
        const isFixed = emp.employeeType === EmployeeType.FIXED;
        const defaultLoc: 'OFFICE' | 'HOME' = isFixed ? 'OFFICE' : 'HOME';

        currentWeekDates.forEach((d) => {
          const dateKey = formatYmd(d);
          matrix[emp.id][dateKey] = defaultLoc;
        });
      });

      rosterData.forEach((r) => {
        if (matrix[r.userId]) {
          matrix[r.userId][r.date] = r.workLocation as 'OFFICE' | 'HOME';
        }
      });

      setRosterMatrix(matrix);
    } catch (err: any) {
      console.error('Failed to fetch office roster:', err);
    }
  };

  // Load HR Meetings
  const fetchMeetings = async () => {
    try {
      const data = await scheduleApi.getMeetings();
      setMeetings(data);
    } catch (err: any) {
      console.error('Failed to fetch meetings:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      await fetchMySchedule();
      if (isHrOrAdmin) {
        await Promise.all([fetchRoster(), fetchMeetings()]);
      }
    } catch (err: any) {
      setError('Failed to load schedule data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user, rosterWeekStart]);

  // Open Assign Modal for a specific Day
  const openAssignModalForDay = (dateStr: string, dayLabel: string) => {
    const currentlyInOffice = employees
      .filter((emp) => rosterMatrix[emp.id]?.[dateStr] === 'OFFICE')
      .map((emp) => emp.id);

    setSelectedDayForModal({ dateStr, dayLabel });
    setModalSearch('');
    setModalSelectedUserIds(currentlyInOffice);
  };

  // Save Modal Assignments for Day
  const applyModalAssignments = () => {
    if (!selectedDayForModal) return;
    const { dateStr } = selectedDayForModal;

    setRosterMatrix((prev) => {
      const updated = { ...prev };
      employees.forEach((emp) => {
        if (!updated[emp.id]) updated[emp.id] = {};
        const isSelected = modalSelectedUserIds.includes(emp.id);
        updated[emp.id][dateStr] = isSelected ? 'OFFICE' : 'HOME';
      });
      return updated;
    });

    setSelectedDayForModal(null);
  };

  // Remove single employee from day's Office list
  const removeUserFromDayOffice = (userId: string, dateStr: string) => {
    setRosterMatrix((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [dateStr]: 'HOME',
      },
    }));
  };

  // Save Roster Matrix to Database
  const handleSaveRoster = async () => {
    setSavingRoster(true);
    setError('');
    setSuccessMsg('');
    try {
      const itemsToSave: { userId: string; date: string; workLocation: any }[] = [];
      Object.keys(rosterMatrix).forEach((uId) => {
        Object.keys(rosterMatrix[uId]).forEach((dStr) => {
          itemsToSave.push({
            userId: uId,
            date: dStr,
            workLocation: rosterMatrix[uId][dStr],
          });
        });
      });

      await scheduleApi.setOfficeRoster({ schedules: itemsToSave });
      setSuccessMsg('✅ Weekly Office Roster saved and published successfully!');
      await fetchMySchedule();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save roster.');
    } finally {
      setSavingRoster(false);
    }
  };

  // 📸 1-Click High-Res Schedule PNG Image Exporter tailored for Slack
  const handleExportImage = async () => {
    setExportingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const colWidth = 190;
      const startX = 40;
      canvas.width = startX * 2 + colWidth * 7;

      const dailyData = currentWeekDates.map((d, idx) => {
        const dateStr = formatYmd(d);
        const officeEmps = employees.filter((emp) => rosterMatrix[emp.id]?.[dateStr] === 'OFFICE');
        const dayMeetings = meetings.filter((m) => formatYmd(new Date(m.startTime)) === dateStr);

        return {
          dayLabel: DAYS_OF_WEEK[idx].short,
          dateDisplay: `${d.getDate()}/${d.getMonth() + 1}`,
          officeEmps,
          dayMeetings,
        };
      });

      const maxOfficeCount = Math.max(...dailyData.map((d) => d.officeEmps.length), 1);
      const maxMeetingsCount = Math.max(...dailyData.map((d) => d.dayMeetings.length), 1);

      const headerHeight = 130;
      const dayHeaderHeight = 50;
      const officeSectionHeight = 40 + maxOfficeCount * 28 + 15;
      const meetingSectionHeight = 40 + maxMeetingsCount * 45 + 20;
      const footerHeight = 60;

      canvas.height = headerHeight + dayHeaderHeight + officeSectionHeight + meetingSectionHeight + footerHeight;

      // Draw Deep Royal Navy Background Gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0a192f');
      grad.addColorStop(1, '#020c1b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Banner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(startX, 25, canvas.width - startX * 2, 85);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 25, canvas.width - startX * 2, 85);

      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText('🏢 VOADERA — WEEKLY OFFICE ROSTER & MEETINGS', startX + 25, 62);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`Week of ${weekStartStr} to ${weekEndStr} | Office Attendance & Scheduled Meetings`, startX + 25, 88);

      // Day Column Headers
      let currentY = headerHeight;
      dailyData.forEach((d, i) => {
        const colX = startX + i * colWidth;

        ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.fillRect(colX + 2, currentY, colWidth - 4, 42);
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(colX + 2, currentY, colWidth - 4, 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${d.dayLabel} (${d.dateDisplay})`, colX + colWidth / 2, currentY + 26);
      });

      // Section 1: Office Attendees List
      currentY += dayHeaderHeight;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00ff9d';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('🏢 OFFICE ATTENDEES (ON-SITE)', startX + 5, currentY + 18);

      currentY += 28;

      dailyData.forEach((d, i) => {
        const colX = startX + i * colWidth;
        let empY = currentY;

        if (d.officeEmps.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No office attendees', colX + colWidth / 2, empY + 18);
        } else {
          d.officeEmps.forEach((emp) => {
            ctx.fillStyle = 'rgba(0, 255, 157, 0.15)';
            ctx.fillRect(colX + 6, empY, colWidth - 12, 24);
            ctx.strokeStyle = 'rgba(0, 255, 157, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(colX + 6, empY, colWidth - 12, 24);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            const shortName = emp.name.length > 18 ? emp.name.substring(0, 16) + '…' : emp.name;
            ctx.fillText(`• ${shortName}`, colX + colWidth / 2, empY + 16);

            empY += 28;
          });
        }
      });

      // Section 2: Meetings List
      currentY += maxOfficeCount * 28 + 25;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('📹 SCHEDULED MEETINGS & TIMES', startX + 5, currentY + 18);

      currentY += 28;

      dailyData.forEach((d, i) => {
        const colX = startX + i * colWidth;
        let mY = currentY;

        if (d.dayMeetings.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No meetings', colX + colWidth / 2, mY + 18);
        } else {
          d.dayMeetings.forEach((m) => {
            const startObj = new Date(m.startTime);
            const endObj = new Date(m.endTime);
            const timeStr = `${startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
            ctx.fillRect(colX + 6, mY, colWidth - 12, 40);
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(colX + 6, mY, colWidth - 12, 40);

            ctx.fillStyle = '#e9d5ff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(timeStr, colX + colWidth / 2, mY + 14);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Inter, sans-serif';
            const shortTitle = m.title.length > 18 ? m.title.substring(0, 16) + '…' : m.title;
            ctx.fillText(shortTitle, colX + colWidth / 2, mY + 30);

            mY += 45;
          });
        }
      });

      // Footer
      currentY += maxMeetingsCount * 45 + 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Voadera HRMS Schedule Exporter | Share with team on Slack / Teams', startX + 10, currentY);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `Voadera_Office_Schedule_&_Meetings_${weekStartStr}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        setSuccessMsg('📸 High-res schedule image generated and downloaded! Ready to paste into Slack/Teams.');
      });
    } catch (err) {
      console.error('Export image error:', err);
      setError('Could not export schedule image.');
    } finally {
      setExportingImage(false);
    }
  };

  // Create / Edit Meeting Submit
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate || !meetingStartTime || !meetingEndTime) {
      setError('Please fill in title, date, start time, and end time.');
      return;
    }

    const startIso = new Date(`${meetingDate}T${meetingStartTime}:00`).toISOString();
    const endIso = new Date(`${meetingDate}T${meetingEndTime}:00`).toISOString();

    setSubmittingMeeting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingMeeting) {
        await scheduleApi.updateMeeting(editingMeeting.id, {
          title: meetingTitle,
          description: meetingDesc,
          startTime: startIso,
          endTime: endIso,
          locationOrLink: meetingLocation,
          attendeeIds: selectedAttendeeIds,
        });
        setSuccessMsg('✅ Meeting updated successfully!');
      } else {
        await scheduleApi.createMeeting({
          title: meetingTitle,
          description: meetingDesc,
          startTime: startIso,
          endTime: endIso,
          locationOrLink: meetingLocation,
          attendeeIds: selectedAttendeeIds,
        });
        setSuccessMsg('✅ Meeting scheduled successfully!');
      }

      setIsMeetingModalOpen(false);
      resetMeetingForm();
      await fetchMeetings();
      await fetchMySchedule();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save meeting.');
    } finally {
      setSubmittingMeeting(false);
    }
  };

  // Delete Meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to cancel and delete this meeting?')) return;
    try {
      await scheduleApi.deleteMeeting(meetingId);
      setSuccessMsg('Meeting cancelled successfully.');
      await fetchMeetings();
      await fetchMySchedule();
    } catch (err: any) {
      setError('Failed to delete meeting.');
    }
  };

  const resetMeetingForm = () => {
    setEditingMeeting(null);
    setMeetingTitle('');
    setMeetingDesc('');
    setMeetingDate('');
    setMeetingStartTime('10:00');
    setMeetingEndTime('11:00');
    setMeetingLocation('');
    setSelectedAttendeeIds([]);
  };

  const openCreateMeetingModal = () => {
    resetMeetingForm();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMeetingDate(formatYmd(tomorrow));
    setSelectedAttendeeIds(employees.map((e) => e.id));
    setIsMeetingModalOpen(true);
  };

  const openEditMeetingModal = (m: MeetingDto) => {
    setEditingMeeting(m);
    setMeetingTitle(m.title);
    setMeetingDesc(m.description || '');
    const startDateObj = new Date(m.startTime);
    setMeetingDate(formatYmd(startDateObj));
    setMeetingStartTime(startDateObj.toTimeString().substring(0, 5));
    setMeetingEndTime(new Date(m.endTime).toTimeString().substring(0, 5));
    setMeetingLocation(m.locationOrLink || '');
    setSelectedAttendeeIds(m.attendees.map((a) => a.userId));
    setIsMeetingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const userEmployeeType = user?.employeeType || EmployeeType.PER_HOUR;
  const isFixedIncomeUser = userEmployeeType === EmployeeType.FIXED;
  const todayLocation = mySchedule?.todayScheduledLocation || (isFixedIncomeUser ? 'OFFICE' : 'HOME');
  const isTodayOffice = todayLocation === 'OFFICE';

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>📅 Company Schedule & Meetings</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your required office days, upcoming meetings, and view team rosters
          </p>
        </div>

        {/* HR Tab Switcher */}
        {isHrOrAdmin && (
          <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-white/10 text-xs font-bold shadow-lg">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 My Schedule
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'roster'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏢 Office Roster Manager
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'meetings'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📹 Meetings & Events ({meetings.length})
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3 animate-fadeIn">
          <span className="text-xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-fadeIn">
          <span className="text-xl">✨</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: MY SCHEDULE (EMPLOYEE VIEW) */}
      {activeTab === 'my' && (
        <div className="space-y-8">
          {/* Today's Scheduled Location Banner */}
          <div className={`glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden border ${
            isTodayOffice
              ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/40'
              : 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border ${
                  isTodayOffice
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 ring-4 ring-cyan-500/10'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 ring-4 ring-indigo-500/10'
                }`}>
                  {isTodayOffice ? '🏢' : '🏠'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/10 text-white border border-white/15">
                      Today's Requirement
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    {isTodayOffice ? 'Scheduled Office Day (On-site)' : 'Scheduled Home / Remote Day'}
                  </h2>
                  <p className="text-slate-300 text-xs mt-1">
                    {isTodayOffice
                      ? 'Please make sure to clock in at the Office workspace today.'
                      : (isFixedIncomeUser
                          ? 'You are approved to work remotely from home today.'
                          : 'You are working remotely from home today (Default for Hour-based).')}
                  </p>
                </div>
              </div>

              {/* ROUTE FIX: /dashboard/attendance */}
              <Link
                to="/dashboard/attendance"
                className="gradient-btn px-6 py-3.5 text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-xl whitespace-nowrap self-start md:self-auto hover:scale-105 transition-transform"
              >
                <span>⏱️ Open Attendance & Clock In</span>
              </Link>
            </div>
          </div>

          {/* Weekly Location Roster (7 Days) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📅 Your Scheduled Work Days This Week</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {currentWeekDates.map((d, i) => {
                const dateStr = formatYmd(d);
                const isToday = dateStr === formatYmd(new Date());
                const sched = mySchedule?.weeklyRoster.find((r) => r.date === dateStr);
                const loc = sched?.workLocation || (isFixedIncomeUser ? 'OFFICE' : 'HOME');
                const isOffice = loc === 'OFFICE';

                return (
                  <div
                    key={dateStr}
                    className={`glass-card p-4 rounded-xl space-y-3 transition-all ${
                      isToday
                        ? 'border-2 border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 scale-[1.02]'
                        : 'bg-slate-900/60 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {DAYS_OF_WEEK[i].label}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-400 text-slate-950">
                          TODAY
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-extrabold text-white">
                      {d.getDate()} {d.toLocaleDateString('en-US', { month: 'short' })}
                    </div>

                    <div className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-2 border ${
                      isOffice
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}>
                      <span>{isOffice ? '🏢 Office' : '🏠 Home'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invited Meetings & Events Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📹 Your Invited Meetings & Events</span>
            </h3>

            {(!mySchedule?.upcomingMeetings || mySchedule.upcomingMeetings.length === 0) ? (
              <div className="glass-card p-8 text-center text-slate-400 space-y-2">
                <span className="text-4xl block">🎉</span>
                <p className="text-base font-semibold text-white">No upcoming meetings scheduled!</p>
                <p className="text-xs text-slate-400">Enjoy your uninterrupted focused work time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySchedule.upcomingMeetings.map((m) => {
                  const startDate = new Date(m.startTime);
                  const endDate = new Date(m.endTime);
                  const isLink = m.locationOrLink && (m.locationOrLink.startsWith('http://') || m.locationOrLink.startsWith('https://'));

                  return (
                    <div key={m.id} className="glass-card p-6 space-y-4 border border-white/10 hover:border-purple-500/40 transition-all rounded-2xl bg-slate-900/80 shadow-lg">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                            Meeting
                          </span>
                          <h4 className="text-base font-bold text-white mt-1">{m.title}</h4>
                        </div>
                        <span className="text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                          📅 {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                          "{m.description}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-white/10">
                        <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>⏰</span>
                          <span>
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {m.locationOrLink && (
                          isLink ? (
                            <a
                              href={m.locationOrLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 shadow-md transition-colors"
                            >
                              <span>🔗 Join Video Call</span>
                            </a>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 font-semibold">
                              📍 {m.locationOrLink}
                            </span>
                          )
                        )}
                      </div>

                      {/* Attendees Avatars */}
                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Organized by {m.creatorName || 'HR'}</span>
                        <div className="flex items-center -space-x-2">
                          {m.attendees.map((att) => (
                            <div
                              key={att.id}
                              title={att.userName || att.userEmail}
                              className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow"
                            >
                              {(att.userName || att.userEmail || 'U').charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HR OFFICE ROSTER MANAGER (HIGH CONTRAST THEME STYLING) */}
      {activeTab === 'roster' && isHrOrAdmin && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const d = new Date(rosterWeekStart);
                  d.setDate(d.getDate() - 7);
                  setRosterWeekStart(d);
                }}
                className="btn-secondary px-3.5 py-2 text-xs font-bold"
              >
                ← Previous Week
              </button>
              <div className="text-sm font-extrabold text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                Week of {weekStartStr} to {weekEndStr}
              </div>
              <button
                onClick={() => {
                  const d = new Date(rosterWeekStart);
                  d.setDate(d.getDate() + 7);
                  setRosterWeekStart(d);
                }}
                className="btn-secondary px-3.5 py-2 text-xs font-bold"
              >
                Next Week →
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* 📸 1-Click PNG Image Exporter */}
              <button
                onClick={handleExportImage}
                disabled={exportingImage}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2 shadow-lg hover:scale-105"
              >
                {exportingImage ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>📸 Export Slack Schedule Image (PNG)</span>
                )}
              </button>

              <button
                onClick={handleSaveRoster}
                disabled={savingRoster}
                className="gradient-btn px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
              >
                {savingRoster ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>💾 Publish & Save Roster</span>
                )}
              </button>
            </div>
          </div>

          {/* 7 DAY CARDS GRID (HIGH CONTRAST & READABLE EVERYWHERE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4" ref={exportTableRef}>
            {currentWeekDates.map((d, idx) => {
              const dateStr = formatYmd(d);
              const dayLabel = `${DAYS_OF_WEEK[idx].label} ${d.getDate()}/${d.getMonth() + 1}`;
              const isToday = dateStr === formatYmd(new Date());

              // Employees coming to Office on this day
              const officeEmployees = employees.filter(
                (emp) => rosterMatrix[emp.id]?.[dateStr] === 'OFFICE'
              );

              return (
                <div
                  key={dateStr}
                  className={`glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 border transition-all ${
                    isToday
                      ? 'border-2 border-cyan-400 bg-cyan-950/40 shadow-lg ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/90 border-white/15'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Day Title & Date */}
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <div>
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
                          {DAYS_OF_WEEK[idx].label}
                        </span>
                        <span className="text-sm font-extrabold text-white">
                          {d.getDate()}/{d.getMonth() + 1}
                        </span>
                      </div>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-400 text-slate-950">
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Attendance Count */}
                    <div className="text-[11px] font-extrabold text-slate-300 flex items-center justify-between">
                      <span>Office Attendees:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">
                        {officeEmployees.length}
                      </span>
                    </div>

                    {/* List of Office Employees */}
                    <div className="space-y-1.5 pt-2 min-h-[140px] max-h-[220px] overflow-y-auto">
                      {officeEmployees.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-slate-400 italic">
                          No employees assigned to office
                        </div>
                      ) : (
                        officeEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-extrabold group hover:bg-emerald-500/30 transition-colors shadow-sm"
                          >
                            <span className="truncate pr-1">• {emp.name}</span>
                            <button
                              onClick={() => removeUserFromDayOffice(emp.id, dateStr)}
                              className="text-emerald-300 hover:text-red-400 font-black px-1 transition-colors"
                              title="Remove from Office list"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assign Button (SOLID INDIGO + BRIGHT WHITE TEXT) */}
                  <button
                    onClick={() => openAssignModalForDay(dateStr, dayLabel)}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-105"
                  >
                    <span>➕ Choose Office Employees</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HR DAY ASSIGNMENT MODAL WITH SEARCH & MULTI-SELECT */}
      {selectedDayForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-white/20 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-white">
                  Assign Office Employees
                </h3>
                <p className="text-xs text-cyan-400 font-semibold mt-0.5">
                  Selecting for {selectedDayForModal.dayLabel}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayForModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search employee by name or email..."
                className="input-field text-xs pl-9 py-2.5 text-white"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                Selected: <strong className="text-emerald-400 font-black">{modalSelectedUserIds.length}</strong> employees
              </span>
              <div className="space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    const fixedIds = employees.filter((e) => e.employeeType === EmployeeType.FIXED).map((e) => e.id);
                    setModalSelectedUserIds(Array.from(new Set([...modalSelectedUserIds, ...fixedIds])));
                  }}
                  className="text-indigo-400 hover:underline font-bold"
                >
                  Select All Fixed Income
                </button>
                <button
                  type="button"
                  onClick={() => setModalSelectedUserIds([])}
                  className="text-slate-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Employee Checkboxes */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 bg-slate-950 p-4 rounded-xl border border-white/10">
              {employees
                .filter(
                  (emp) =>
                    !modalSearch.trim() ||
                    emp.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                    emp.email.toLowerCase().includes(modalSearch.toLowerCase())
                )
                .map((emp) => {
                  const isChecked = modalSelectedUserIds.includes(emp.id);
                  const isFixed = emp.employeeType === EmployeeType.FIXED;

                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-white font-extrabold'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModalSelectedUserIds([...modalSelectedUserIds, emp.id]);
                            } else {
                              setModalSelectedUserIds(modalSelectedUserIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 w-4 h-4 text-indigo-600"
                        />
                        <span>{emp.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isFixed
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isFixed ? 'Fixed Income' : 'Per Hour'}
                      </span>
                    </label>
                  );
                })}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDayForModal(null)}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyModalAssignments}
                className="gradient-btn flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Apply to {selectedDayForModal.dayLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HR MEETINGS & EVENTS MANAGER */}
      {activeTab === 'meetings' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Company Meetings & Scheduled Events</h3>
            <button
              onClick={openCreateMeetingModal}
              className="gradient-btn px-5 py-2.5 text-xs flex items-center gap-2 shadow-xl"
            >
              <span>➕ Schedule New Meeting</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((m) => {
              const startDate = new Date(m.startTime);
              const endDate = new Date(m.endTime);

              return (
                <div key={m.id} className="glass-card p-6 space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="text-base font-bold text-white">{m.title}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditMeetingModal(m)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                        title="Edit Meeting"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(m.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20"
                        title="Delete Meeting"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                      {m.description}
                    </p>
                  )}

                  <div className="space-y-1 text-xs text-slate-400">
                    <div>📅 Date: <strong className="text-white">{startDate.toLocaleDateString()}</strong></div>
                    <div>⏰ Time: <strong className="text-white">{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    {m.locationOrLink && <div>📍 Location/Link: <strong className="text-indigo-400">{m.locationOrLink}</strong></div>}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>{m.attendees.length} Attendee(s)</span>
                    <div className="flex -space-x-2">
                      {m.attendees.map((att) => (
                        <div
                          key={att.id}
                          title={att.userName || att.userEmail}
                          className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-white"
                        >
                          {(att.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MEETING MODAL */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-white/20 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}
              </h3>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMeetingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Q3 Sprint Planning"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Agenda
                </label>
                <textarea
                  rows={2}
                  value={meetingDesc}
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  placeholder="Meeting goals and agenda..."
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={meetingStartTime}
                    onChange={(e) => setMeetingStartTime(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={meetingEndTime}
                    onChange={(e) => setMeetingEndTime(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Location / Video Link
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="e.g. Conference Room A or https://meet.google.com/xyz"
                  className="input-field"
                />
              </div>

              {/* Attendee Picker */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Invite Attendees ({selectedAttendeeIds.length})
                  </label>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedAttendeeIds(employees.map((e) => e.id))}
                      className="text-indigo-400 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAttendeeIds([])}
                      className="text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950 p-3 rounded-xl border border-white/10">
                  {employees.map((emp) => {
                    const isChecked = selectedAttendeeIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttendeeIds([...selectedAttendeeIds, emp.id]);
                            } else {
                              setSelectedAttendeeIds(selectedAttendeeIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900"
                        />
                        <span>{emp.name} ({emp.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMeeting}
                  className="gradient-btn flex-1 py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  {submittingMeeting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{editingMeeting ? 'Save Changes' : 'Create Meeting'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
