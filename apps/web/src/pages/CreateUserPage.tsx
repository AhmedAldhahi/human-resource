import React, { useState, type FormEvent } from 'react';
import { Role, EmployeeType } from '@hrms/shared';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CreateUserPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [department, setDepartment] = useState('');
  const [employeeType, setEmployeeType] = useState<EmployeeType>(EmployeeType.FIXED);
  const [monthlySalary, setMonthlySalary] = useState<number | string>(3000);
  const [hourlyWage, setHourlyWage] = useState<number | string>(20);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const user = await usersApi.create({ name, email, password, role });
      
      // Update employee type and compensation rates + department immediately
      await Promise.all([
        usersApi.updateEmployeeType(user.id, {
          employeeType,
          monthlySalary: Number(monthlySalary) || 0,
          hourlyWage: Number(hourlyWage) || 0,
        }),
        usersApi.updateWage(user.id, {
          hourlyWage: Number(hourlyWage) || 0,
          role,
          department,
        }),
      ]);

      setSuccess(`User "${user.name}" created and configured successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setRole(Role.EMPLOYEE);
      setEmployeeType(EmployeeType.FIXED);
      setMonthlySalary(3000);
      setHourlyWage(20);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to create user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Create Employee User</h1>
        <p className="text-slate-400 mt-1">Add a new workforce member and assign initial compensation structure</p>
      </div>

      <div className="glass-card p-6 sm:p-8 max-w-xl space-y-6">
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Department / Team
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-field"
                placeholder="Engineering, HR, Sales"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="john@company.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="input-field font-bold text-indigo-300"
              >
                <option value={Role.EMPLOYEE} className="bg-slate-900">
                  EMPLOYEE (Standard)
                </option>
                <option value={Role.HR} className="bg-slate-900">
                  HR (Human Resources)
                </option>
                {user?.role === Role.ADMIN && (
                  <option value={Role.ADMIN} className="bg-slate-900">
                    ADMIN (Superuser)
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Compensation Structure */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Initial Compensation Designation
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEmployeeType(EmployeeType.FIXED)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  employeeType === EmployeeType.FIXED
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-2 ring-indigo-500/40'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs">👔 Fixed Salary</span>
              </button>
              <button
                type="button"
                onClick={() => setEmployeeType(EmployeeType.PER_HOUR)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  employeeType === EmployeeType.PER_HOUR
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-2 ring-indigo-500/40'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs">⏱️ Per-Hour Wage</span>
              </button>
            </div>

            {employeeType === EmployeeType.FIXED ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Salary ($ / month)
                </label>
                <input
                  type="number"
                  step="any"
                  value={monthlySalary}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthlySalary(val === '' ? '' : Number(val));
                  }}
                  onBlur={() => {
                    if (monthlySalary === '' || Number(monthlySalary) < 0) {
                      setMonthlySalary(0);
                    }
                  }}
                  className="input-field font-bold text-emerald-400"
                  placeholder="3000"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hourly Wage ($ / hr)
                </label>
                <input
                  type="number"
                  step="any"
                  value={hourlyWage}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHourlyWage(val === '' ? '' : Number(val));
                  }}
                  onBlur={() => {
                    if (hourlyWage === '' || Number(hourlyWage) < 0) {
                      setHourlyWage(0);
                    }
                  }}
                  className="input-field font-bold text-emerald-400"
                  placeholder="20"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="gradient-btn w-full flex items-center justify-center gap-2 py-3.5 text-base shadow-xl"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating User…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create & Configure Employee
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
