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
import { Role } from '@hrms/shared';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="profile" element={<ProfilePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="absence" element={<AbsencePage />} />
            <Route path="my-cards" element={<MyCardsPage />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

