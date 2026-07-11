import React, { useEffect, useState } from 'react';
import type { UserResponseDto } from '@hrms/shared';
import { Role } from '@hrms/shared';
import { usersApi } from '../api/client';
import IssueCardModal from '../components/IssueCardModal';

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return 'bg-red-500/20 text-red-400';
    case Role.HR:
      return 'bg-purple-500/20 text-purple-400';
    case Role.EMPLOYEE:
      return 'bg-emerald-500/20 text-emerald-400';
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
      e.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleIssueCard = (emp: UserResponseDto) => {
    setSelectedEmp({ id: emp.id, name: emp.name });
    setModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Employees</h1>
          <p className="text-slate-400 mt-1">
            Manage your workforce ({employees.length} total)
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
            placeholder="Search by name, email, or role…"
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
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Role
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{emp.email}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${roleBadgeClasses(emp.role)}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-semibold ${
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleIssueCard(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all duration-200"
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
    </div>
  );
}
