import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import AnatomyPage from './pages/AnatomyPage';
import AnatomyViewerPage from './features/anatomy/pages/AnatomyViewerPage';
import CaseList from './features/cases/components/CaseList';
import CaseDetail from './features/cases/components/CaseDetail';
import InstructorLayout from './features/instructor/layouts/InstructorLayout';
import CreateCasePage from './features/instructor/pages/CreateCasePage';
import ManageCasesPage from './features/instructor/pages/ManageCasesPage';
import EditCasePage from './features/instructor/pages/EditCasePage';
import UserManagementPage from './features/instructor/pages/UserManagementPage';
import ManageAnatomyPage from './features/instructor/pages/anatomy/ManageAnatomyPage';
import EditAnatomyPage from './features/instructor/pages/anatomy/EditAnatomyPage';
import InstructorDashboard from './features/instructor/pages/InstructorDashboard';
import AnalyticsDashboard from './features/instructor/pages/AnalyticsDashboard';

import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import ActivityTracker from './components/ActivityTracker';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <BrowserRouter>
          <ActivityTracker />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<HomePage />} />
              <Route path="anatomy" element={<AnatomyPage />} />
              <Route path="anatomy/:moduleId" element={<AnatomyViewerPage />} />

              <Route path="cases" element={<CaseList />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />

              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>

            <Route path="/instructor" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InstructorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<InstructorDashboard />} />
              <Route path="cases" element={<ManageCasesPage />} />
              <Route path="cases/create" element={<CreateCasePage />} />
              <Route path="cases/edit/:caseId" element={<EditCasePage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="anatomy" element={<ManageAnatomyPage />} />
              <Route path="anatomy/create" element={<EditAnatomyPage />} />
              <Route path="anatomy/edit/:moduleId" element={<EditAnatomyPage />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}

export default App;
