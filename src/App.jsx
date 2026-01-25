import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import AnatomyPage from './pages/AnatomyPage';
import AnatomyViewerPage from './features/anatomy/pages/AnatomyViewerPage';
import CaseList from './features/cases/components/CaseList';
import CaseDetail from './features/cases/components/CaseDetail';
import InstructorLayout from './features/instructor/layouts/InstructorLayout';
import CaseManagerPage from './features/instructor/pages/CaseManagerPage';
import UserManagementPage from './features/instructor/pages/UserManagementPage';
import ManageAnatomyPage from './features/instructor/pages/anatomy/ManageAnatomyPage';
import EditAnatomyPage from './features/instructor/pages/anatomy/EditAnatomyPage';
import InstructorDashboard from './features/instructor/pages/InstructorDashboard';
import AnalyticsDashboard from './features/instructor/pages/AnalyticsDashboard';
import ManageMaterialsPage from './features/instructor/pages/ManageMaterialsPage';
import ReportTrainingDashboard from './features/report-training/pages/ReportTrainingDashboard';
import ReportWorkspace from './features/report-training/pages/ReportWorkspace';
import SupportMaterialPage from './features/support-material/pages/SupportMaterialPage';

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

              <Route path="report-training" element={<ReportTrainingDashboard />} />
              <Route path="report-training/:caseId" element={<ReportWorkspace />} />

              <Route path="support-material" element={<SupportMaterialPage />} />

              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>

            <Route path="/instructor" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InstructorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<InstructorDashboard />} />
              <Route path="cases" element={<CaseManagerPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="anatomy" element={<ManageAnatomyPage />} />
              <Route path="anatomy/create" element={<EditAnatomyPage />} />
              <Route path="anatomy/edit/:moduleId" element={<EditAnatomyPage />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="materials" element={<ManageMaterialsPage />} />
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
