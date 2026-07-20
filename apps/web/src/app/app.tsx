import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardLayout from '../components/DashboardLayout';
import LoginPage from '../pages/LoginPage';
import DashboardHome from '../pages/DashboardHome';
import AttendancePage from '../pages/AttendancePage';
import ProfilePage from '../pages/ProfilePage';
import EmployeesPage from '../pages/EmployeesPage';
import MyCardsPage from '../pages/MyCardsPage';
import CreateUserPage from '../pages/CreateUserPage';
import AllCardsPage from '../pages/AllCardsPage';
import IssueCardPage from '../pages/IssueCardPage';
import AbsencePage from '../pages/AbsencePage';
import ReportsPage from '../pages/ReportsPage';
import PresencePage from '../pages/PresencePage';
import { TrackerPage } from '../pages/TrackerPage';
import ChatPage from '../pages/ChatPage';
import PayrollManagementPage from '../pages/PayrollManagementPage';
import { Role } from '@hrms/shared';
import { ChatProvider } from '../context/ChatContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
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
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


