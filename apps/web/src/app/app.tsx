import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardLayout from '../components/DashboardLayout';
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const DashboardHome = React.lazy(() => import('../pages/DashboardHome'));
const AttendancePage = React.lazy(() => import('../pages/AttendancePage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const EmployeesPage = React.lazy(() => import('../pages/EmployeesPage'));
const MyCardsPage = React.lazy(() => import('../pages/MyCardsPage'));
const CreateUserPage = React.lazy(() => import('../pages/CreateUserPage'));
const AllCardsPage = React.lazy(() => import('../pages/AllCardsPage'));
const IssueCardPage = React.lazy(() => import('../pages/IssueCardPage'));
const AbsencePage = React.lazy(() => import('../pages/AbsencePage'));
const ReportsPage = React.lazy(() => import('../pages/ReportsPage'));
const PresencePage = React.lazy(() => import('../pages/PresencePage'));
const TrackerPage = React.lazy(() => import('../pages/TrackerPage').then(m => ({ default: m.TrackerPage })));
const ChatPage = React.lazy(() => import('../pages/ChatPage'));
const PayrollManagementPage = React.lazy(() => import('../pages/PayrollManagementPage'));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-slate-950">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);
import { Role } from '@hrms/shared';
import { ChatProvider } from '../context/ChatContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
          {/* Public */}
          <Route path="/" element={<LoginPage />} />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="presence" element={<PresencePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="absence" element={<AbsencePage />} />
            <Route path="my-cards" element={<MyCardsPage />} />
            <Route path="chat" element={<ChatPage />} />

            {/* HR & ADMIN only */}
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <PayrollManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pc-tracker"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <TrackerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="issue-card"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <IssueCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="all-cards"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <AllCardsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-user"
              element={
                <ProtectedRoute allowedRoles={[Role.HR, Role.ADMIN]}>
                  <CreateUserPage />
                </ProtectedRoute>
              }
            />
          </Route>
          </Routes>
          </React.Suspense>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


