import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PendingTasks from './pages/PendingTasks';
import PendingRecurringTasks from './pages/PendingRecurringTasks';
import MasterTasks from './pages/MasterTasks';
import MasterRecurringTasks from './pages/MasterRecurringTasks';
import AssignTask from './pages/AssignTask';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Performance from './pages/Performance';
import CreateFMS from './pages/CreateFMS';
import ViewAllFMS from './pages/ViewAllFMS';
import StartProject from './pages/StartProject';
import ViewFMSProgress from './pages/ViewFMSProgress';
import AssignedByMe from './pages/AssignedByMe';
import AuditLogs from './pages/AuditLogs';
import ScoreLogs from './pages/ScoreLogs';
import AdminTasks from './pages/AdminTasks';
import ObjectionApprovals from './pages/ObjectionApprovals';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                  <Route path="pending-tasks" element={<PendingTasks />} />
                  <Route path="pending-recurring" element={<PendingRecurringTasks />} />
                  <Route path="master-tasks" element={<MasterTasks />} />
                  <Route path="master-recurring" element={<MasterRecurringTasks />} />
                  <Route path="assign-task" element={<AssignTask />} />
                  <Route path="fms-templates" element={<ProtectedRoute><ViewAllFMS /></ProtectedRoute>} />
                  <Route path="create-fms" element={<ProtectedRoute><CreateFMS /></ProtectedRoute>} />
                  <Route path="start-project" element={<ProtectedRoute><StartProject /></ProtectedRoute>} />
                  <Route path="fms-progress" element={<ProtectedRoute><ViewFMSProgress /></ProtectedRoute>} />
                  <Route path="assigned-by-me" element={<ProtectedRoute><AssignedByMe /></ProtectedRoute>} />
                  <Route path="audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                  <Route path="score-logs" element={<ProtectedRoute><ScoreLogs /></ProtectedRoute>} />
                  <Route path="objection-approvals" element={<ProtectedRoute><ObjectionApprovals /></ProtectedRoute>} />
                  <Route path="admin-tasks" element={<ProtectedRoute requireAdmin><AdminTasks /></ProtectedRoute>} />
                  <Route path="admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
                </Route>
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;