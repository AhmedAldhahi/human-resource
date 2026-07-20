import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi, attendanceApi } from '../api/client';
import {
  UserResponseDto,
  AttendanceResponseDto,
  AttendanceStatus,
  EmployeeType,
} from '@hrms/shared';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Contact Info Editing state
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [contactForm, setContactForm] = useState<{
    phone: string;
    department: string;
    bio: string;
  }>({ phone: '', department: '', bio: '' });
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Photo Upload state
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // Interactive Calculator state
  const [simulatedHours, setSimulatedHours] = useState<number>(160);

  const fetchProfileData = async () => {
    if (!authUser) return;
    setLoading(true);
    setError('');
    try {
      const [userData, attendanceData] = await Promise.all([
        usersApi.getMe(),
        attendanceApi.getMyAttendance(),
      ]);
      setUser(userData);
      setAttendance(attendanceData);
      setContactForm({
        phone: userData.phone || '',
        department: userData.department || '',
        bio: userData.bio || '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [authUser]);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const updated = await usersApi.updateProfile(user.id, {
        phone: contactForm.phone,
        department: contactForm.department,
        bio: contactForm.bio,
      });
      setUser(updated);
      setIsEditingContact(false);
      setSuccessMsg('Your contact and profile information has been updated cleanly!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update contact info.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!user || !photoFile) return;
    setUploadingPhoto(true);
    setError('');
    try {
      await usersApi.uploadPhoto(user.id, photoFile);
      setSuccessMsg('Your profile photo has been uploaded successfully!');
      setPhotoFile(undefined);
      await fetchProfileData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading profile & compensation data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-card p-12 text-center border border-red-500/20">
        <p className="text-red-400">Failed to load user profile.</p>
      </div>
    );
  }

  // Compute real worked hours
  let totalMinutesWorked = 0;
  let activeShifts = 0;
  attendance.forEach((rec) => {
    if (rec.clockOutTime && rec.status === AttendanceStatus.CLOCKED_OUT) {
      activeShifts++;
      const start = new Date(rec.clockInTime).getTime();
      const end = new Date(rec.clockOutTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        totalMinutesWorked += Math.floor((end - start) / (1000 * 60));
      }
    }
  });

  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const remainingMinutes = totalMinutesWorked % 60;
  const exactHoursDecimal = totalMinutesWorked / 60;

  // Compute Base Earned Pay
  const hourlyWage = user.hourlyWage ?? 0;
  const monthlySalary = user.monthlySalary ?? 0;
  const transportationAllowance = user.transportationAllowance ?? 0;
  const recurringBonus = user.recurringBonus ?? 0;
  const isFixed = user.employeeType === EmployeeType.FIXED;

  const baseEarnedPay = isFixed
    ? (monthlySalary / 160) * exactHoursDecimal
    : exactHoursDecimal * hourlyWage;

  // Performance points impact ($1 per point bonus/deduction illustration)
  const pointsImpact = user.netCardPoints * 1;
  const totalEarnedCompensation = baseEarnedPay + transportationAllowance + recurringBonus + pointsImpact;

  // Simulated earnings
  const simulatedEarnings = isFixed
    ? (simulatedHours / 160) * monthlySalary + transportationAllowance + recurringBonus + pointsImpact
    : simulatedHours * hourlyWage + recurringBonus + pointsImpact;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Profile & Compensation</h1>
          <p className="text-slate-400 text-sm mt-1">
            View your official compensation model, photo avatar, earned salary breakdown, and personal details
          </p>
        </div>
        {!isEditingContact && (
          <button
            onClick={() => setIsEditingContact(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Contact Details
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-sm text-red-400 flex items-center justify-between shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 font-bold px-2">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 text-sm text-emerald-400 flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 font-bold px-2">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Avatar & Header */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
              <div className="relative mb-4">
                {user.photoUrl ? (
                  <img
                    src={getAssetUrl(user.photoUrl)}
                    alt={user.name}
                    className="w-28 h-28 rounded-3xl object-cover border-4 border-indigo-500 shadow-xl ring-4 ring-white/10"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-5xl font-extrabold text-white shadow-xl shadow-indigo-500/30 ring-4 ring-white/10">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-white">{user.name}</h2>
              <p className="text-sm font-medium text-slate-400 mt-0.5">{user.email}</p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-extrabold">
                  {user.role}
                </span>
                {user.department && (
                  <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold">
                    {user.department}
                  </span>
                )}
                <span className={`badge px-3 py-1 rounded-full text-xs font-bold ${
                  isFixed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                }`}>
                  {isFixed ? '👔 Fixed Income' : '⏱️ Per-Hour'}
                </span>
              </div>

              {/* Photo Upload Box */}
              <div className="mt-5 pt-4 border-t border-white/10 w-full text-left space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Change Profile Photo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => setPhotoFile(e.target.files?.[0])}
                    className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white cursor-pointer"
                  />
                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shrink-0 shadow-md"
                    >
                      {uploadingPhoto ? '...' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information & Bio */}
            {isEditingContact ? (
              <form onSubmit={handleSaveContact} className="pt-6 space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Editing Contact Details</h3>
                
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Department / Team</label>
                  <input
                    type="text"
                    value={contactForm.department}
                    onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                    placeholder="e.g. Engineering, Design, Sales"
                    className="input-field py-2 text-sm bg-slate-900 border-white/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="e.g. +1 (555) 123-4567"
                    className="input-field py-2 text-sm bg-slate-900 border-white/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Personal Bio / Notes</label>
                  <textarea
                    rows={3}
                    value={contactForm.bio}
                    onChange={(e) => setContactForm({ ...contactForm, bio: e.target.value })}
                    placeholder="A brief bio about your role, skills, or working hours..."
                    className="input-field py-2 text-sm bg-slate-900 border-white/10 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    {saveLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-6 space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{user.department || <span className="text-slate-500 italic">Not assigned yet</span>}</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Phone</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{user.phone || <span className="text-slate-500 italic">No phone provided</span>}</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joined Date</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personal Bio</p>
                  <p className="text-xs leading-relaxed text-slate-300 mt-1 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                    {user.bio || <span className="text-slate-500 italic">No bio written yet. Click Edit Contact Details above to add one!</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hourly Wages & Live Salary Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Wage Banner Card */}
          <div className="glass-card p-6 sm:p-8 border border-emerald-500/30 shadow-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div>
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                  {isFixed ? 'Official Fixed Monthly Pay' : 'Official Per-Hour Pay Rate'}
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mt-1">
                  {isFixed ? (
                    <>
                      {monthlySalary.toFixed(2)} <span className="text-lg font-bold text-emerald-400 uppercase">JOD / month</span>
                    </>
                  ) : (
                    <>
                      {hourlyWage.toFixed(2)} <span className="text-lg font-bold text-emerald-400 uppercase">JOD / hour</span>
                    </>
                  )}
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-lg leading-relaxed">
                  {isFixed
                    ? 'You are enrolled in the Fixed Income salaried model. Your salary is guaranteed each month subject to standard absence and attendance policies.'
                    : 'Your hourly compensation rate is certified by HR. All clocked attendance hours automatically multiply by this rate.'}
                </p>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-white/10 bg-slate-950/60 text-center min-w-[160px] shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Card Points</p>
                <p className={`text-3xl font-black mt-1 ${user.netCardPoints > 0 ? 'text-emerald-400' : user.netCardPoints < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {user.netCardPoints > 0 ? `+${user.netCardPoints}` : user.netCardPoints}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Impact: {pointsImpact >= 0 ? `+${pointsImpact.toFixed(2)} JOD` : `${pointsImpact.toFixed(2)} JOD`}</p>
              </div>
            </div>
          </div>

          {/* Real-Time Earned Salary Card */}
          <div className="glass-card p-6 sm:p-8 border border-white/10 shadow-2xl bg-white/[0.02]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              Real-Time Earned Compensation Breakdown
            </h3>

            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Total Worked Hours</p>
                <p className="text-2xl font-extrabold text-white">
                  {totalHoursWorked}h <span className="text-base font-normal text-slate-400">{remainingMinutes}m</span>
                </p>
                <p className="text-[11px] text-slate-500">Across {activeShifts} completed shifts</p>
              </div>

              <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Base Earned Pay</p>
                <p className="text-2xl font-extrabold text-indigo-400">
                  {baseEarnedPay.toFixed(2)} JOD
                </p>
                <p className="text-[11px] text-slate-500">
                  {isFixed ? `(Pro-rated for ${exactHoursDecimal.toFixed(1)}h)` : `(${exactHoursDecimal.toFixed(1)}h × ${hourlyWage.toFixed(2)} JOD)`}
                </p>
              </div>

              {transportationAllowance > 0 && (
                <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Transportation</p>
                  <p className="text-2xl font-extrabold text-teal-400">
                    +{transportationAllowance.toFixed(2)} JOD
                  </p>
                  <p className="text-[11px] text-slate-500">Fixed monthly allowance</p>
                </div>
              )}

              {recurringBonus > 0 && (
                <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Recurring Bonus</p>
                  <p className="text-2xl font-extrabold text-pink-400">
                    +{recurringBonus.toFixed(2)} JOD
                  </p>
                  <p className="text-[11px] text-slate-500">Permanent monthly addition</p>
                </div>
              )}

              <div className="flex-[2] min-w-[250px] p-5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 space-y-1 shadow-inner">
                <p className="text-xs font-bold text-indigo-300 uppercase">Net Estimated Pay</p>
                <p className="text-3xl font-black text-emerald-400">
                  {totalEarnedCompensation.toFixed(2)} JOD
                </p>
                <p className="text-[11px] text-indigo-300/80">Includes card point adjustments</p>
              </div>
            </div>

            {/* Interactive Pay Simulator */}
            <div className="pt-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-base font-bold text-white">Monthly Pay Simulator</h4>
                  <p className="text-xs text-slate-400">Estimate your gross earnings by adjusting projected monthly hours</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-xs font-bold text-slate-400">Hours:</span>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={simulatedHours}
                    onChange={(e) => setSimulatedHours(Number(e.target.value) || 0)}
                    className="w-16 bg-transparent text-white font-black text-base text-right focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">hrs/mo</span>
                </div>
              </div>

              {/* Simulation Result Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Simulated Monthly Earnings</p>
                  <p className="text-sm text-slate-300">
                    If you work <strong className="text-white font-bold">{simulatedHours} hours</strong> ({isFixed ? `Fixed ${monthlySalary} JOD/mo` : `Hourly ${hourlyWage.toFixed(2)} JOD/hr`})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl font-black text-white tracking-tight">
                    {simulatedEarnings.toFixed(2)} <span className="text-xs font-semibold text-slate-400">JOD</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
