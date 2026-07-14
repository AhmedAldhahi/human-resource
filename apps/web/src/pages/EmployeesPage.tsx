import React, { useEffect, useState } from 'react';
import type { UserResponseDto } from '@hrms/shared';
import { Role, EmployeeType } from '@hrms/shared';
import { usersApi } from '../api/client';
import IssueCardModal from '../components/IssueCardModal';
import EmployeeHoursModal from '../components/EmployeeHoursModal';
import EmployeeWageModal from '../components/EmployeeWageModal';


function roleBadgeClasses(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case Role.HR:
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case Role.EMPLOYEE:
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  }
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Issue card modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Hours & history modal
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [selectedEmpForHours, setSelectedEmpForHours] = useState<{
    id: string;
    name: string;
    role: Role;
  } | null>(null);

  // Wage & profile modal
  const [wageModalOpen, setWageModalOpen] = useState(false);
  const [selectedEmpForWage, setSelectedEmpForWage] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchEmployees = async () => {
    try {
      const data = await usersApi.getAll();
      setEmployees(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
  );

  const handleIssueCard = (emp: UserResponseDto) => {
    setSelectedEmp({ id: emp.id, name: emp.name });
    setModalOpen(true);
  };

  const handleViewHours = (emp: UserResponseDto) => {
    setSelectedEmpForHours({ id: emp.id, name: emp.name, role: emp.role });
    setHoursModalOpen(true);
  };

  const handleWageProfile = (emp: UserResponseDto) => {
    setSelectedEmpForWage({ id: emp.id, name: emp.name });
    setWageModalOpen(true);
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Employees</h1>
          <p className="text-slate-400 mt-1">
            Manage your workforce ({employees.length} total) & compensation structures
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role or department…"
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400">
            {search ? 'No employees match your search.' : 'No employees found.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Name & Dept
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email & Role
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Comp. Type & Rate
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Absence Left
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Card Points
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {emp.photoUrl ? (
                          <img
                            src={`http://localhost:3000${emp.photoUrl}`}
                            alt={emp.name}
                            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shadow-md shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="text-white font-medium block">{emp.name}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{emp.department || 'Unassigned'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                      <div>{emp.email}</div>
                      <span className={`badge ${roleBadgeClasses(emp.role)} px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 inline-block`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          emp.employeeType === EmployeeType.FIXED
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        }`}>
                          {emp.employeeType === EmployeeType.FIXED ? '👔 Fixed Income' : '⏱️ Per-Hour'}
                        </span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {emp.employeeType === EmployeeType.FIXED
                            ? `$${emp.monthlySalary ?? 0} / mo`
                            : `$${(emp.hourlyWage ?? 0).toFixed(2)} / hr`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.employeeType === EmployeeType.PER_HOUR ? (
                        <span className="font-bold px-2.5 py-1 rounded-lg text-xs bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          Flexible Off Days
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 text-xs font-bold">
                          <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            🩺 Sick: {emp.sickDaysLeft ?? 14} / 14
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            🌴 Vac: {emp.vacationDaysLeft ?? 14} / 14
                          </span>
                          {(emp.earlyLeaveMinutesAccumulated ?? 0) > 0 && (
                            <span className="text-[10px] text-amber-400 font-semibold">
                              ⏳ Early: {emp.earlyLeaveMinutesAccumulated}m / 240m
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`font-extrabold text-sm ${
                          emp.netCardPoints > 0
                            ? 'text-emerald-400'
                            : emp.netCardPoints < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {emp.netCardPoints > 0 ? '+' : ''}
                        {emp.netCardPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleWageProfile(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200 shadow-sm"
                          title="Adjust Wage, Designation & Type"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Profile & Rate ($)
                        </button>
                        <button
                          onClick={() => handleViewHours(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Hours
                        </button>
                        <button
                          onClick={() => handleIssueCard(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all duration-200 shadow-sm"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                            />
                          </svg>
                          Issue Card
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Card Modal */}
      <IssueCardModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmp(null);
        }}
        employeeId={selectedEmp?.id}
        employeeName={selectedEmp?.name}
        onSuccess={fetchEmployees}
      />

      {/* Employee Hours & History Modal */}
      <EmployeeHoursModal
        isOpen={hoursModalOpen}
        onClose={() => {
          setHoursModalOpen(false);
          setSelectedEmpForHours(null);
        }}
        employeeId={selectedEmpForHours?.id}
        employeeName={selectedEmpForHours?.name}
        employeeRole={selectedEmpForHours?.role}
      />

      {/* Employee Wage & Profile Modal */}
      <EmployeeWageModal
        isOpen={wageModalOpen}
        onClose={() => {
          setWageModalOpen(false);
          setSelectedEmpForWage(null);
        }}
        employeeId={selectedEmpForWage?.id}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
