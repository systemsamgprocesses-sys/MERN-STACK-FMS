import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PendingTasks from './pages/PendingTasks';
import UpcomingTasks from './pages/UpcomingTasks';
import PendingRecurringTasks from './pages/PendingRecurringTasks';
import MasterTasks from './pages/MasterTasks';
import MasterRecurringTasks from './pages/MasterRecurringTasks';
import AssignTask from './pages/AssignTask';
import AdminPanel from './pages/AdminPanel';
import AdminHRPanel from './pages/AdminHRPanel';
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
import ObjectionsHub from './pages/ObjectionsHub';
import ErrorBoundary from './components/ErrorBoundary';
import Checklists from './pages/Checklists';
import CreateChecklist from './pages/CreateChecklist';
import ChecklistDetail from './pages/ChecklistDetail';
import ChecklistDashboard from './pages/ChecklistDashboard';
import HelpTickets from './pages/HelpTickets';
import AdminHelpTickets from './pages/AdminHelpTickets';
import Complaints from './pages/Complaints';
import ComplaintsDashboard from './pages/ComplaintsDashboard';
import AdminComplaints from './pages/AdminComplaints';
import PurchaseDashboard from './pages/PurchaseDashboard';
import SalesDashboard from './pages/SalesDashboard';
import StationeryRequestForm from './pages/StationeryRequestForm';
import MyStationeryRequests from './pages/MyStationeryRequests';
import CategoryManagement from './pages/CategoryManagement';
import ChecklistCalendar from './pages/ChecklistCalendar';
import ChecklistTemplateForm from './pages/ChecklistTemplateForm';
import ChecklistOccurrenceDetail from './pages/ChecklistOccurrenceDetail';
import PendingChecklists from './pages/PendingChecklists';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                  <Route path="pending-tasks" element={<PendingTasks />} />
                  <Route path="upcoming-tasks" element={<UpcomingTasks />} />
                  <Route path="pending-recurring" element={<PendingRecurringTasks />} />
                  <Route path="master-tasks" element={<MasterTasks />} />
                  <Route path="master-recurring" element={<MasterRecurringTasks />} />
                  <Route path="assign-task" element={<AssignTask />} />
                  <Route path="fms-templates" element={<ProtectedRoute><ViewAllFMS /></ProtectedRoute>} />
                  <Route path="create-fms" element={<ProtectedRoute><CreateFMS /></ProtectedRoute>} />
                  <Route path="start-project" element={<ProtectedRoute><StartProject /></ProtectedRoute>} />
                  <Route path="fms-progress" element={<ProtectedRoute><ViewFMSProgress /></ProtectedRoute>} />
                  <Route path="/checklists" element={<ProtectedRoute><Checklists /></ProtectedRoute>} />
                  <Route path="/checklists/create" element={<ProtectedRoute><CreateChecklist /></ProtectedRoute>} />
                  <Route path="/checklists/:id" element={<ProtectedRoute><ChecklistDetail /></ProtectedRoute>} />
                  <Route path="/checklist-dashboard" element={<ProtectedRoute><ChecklistDashboard /></ProtectedRoute>} />
                  <Route path="/checklist-calendar" element={<ProtectedRoute><ChecklistCalendar /></ProtectedRoute>} />
                  <Route path="/checklist-template/create" element={<ProtectedRoute><ChecklistTemplateForm /></ProtectedRoute>} />
                  <Route path="/checklist-occurrence/:id" element={<ProtectedRoute><ChecklistOccurrenceDetail /></ProtectedRoute>} />
                  <Route path="/pending-checklists" element={<ProtectedRoute><PendingChecklists /></ProtectedRoute>} />
                  <Route path="/help-tickets" element={<ProtectedRoute><HelpTickets /></ProtectedRoute>} />
                  <Route path="/admin-help-tickets" element={<ProtectedRoute><AdminHelpTickets /></ProtectedRoute>} />
                  <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
                  <Route path="/complaints-dashboard" element={<ProtectedRoute><ComplaintsDashboard /></ProtectedRoute>} />
                  <Route path="/purchase-dashboard" element={<ProtectedRoute><PurchaseDashboard /></ProtectedRoute>} />
                  <Route path="/sales-dashboard" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
                  <Route path="/stationery-request" element={<ProtectedRoute><StationeryRequestForm /></ProtectedRoute>} />
                  <Route path="/my-stationery-requests" element={<ProtectedRoute><MyStationeryRequests /></ProtectedRoute>} />
                  <Route path="assigned-by-me" element={<ProtectedRoute><AssignedByMe /></ProtectedRoute>} />
                  <Route path="audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                  <Route path="score-logs" element={<ProtectedRoute><ScoreLogs /></ProtectedRoute>} />
                  <Route path="objection-approvals" element={<ProtectedRoute><ObjectionApprovals /></ProtectedRoute>} />
                  <Route path="objections" element={<ProtectedRoute><ObjectionsHub /></ProtectedRoute>} />
                  <Route path="admin-tasks" element={<ProtectedRoute requireAdmin><AdminTasks /></ProtectedRoute>} />
                  <Route path="admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
                  <Route path="admin-hr-panel" element={<ProtectedRoute requireAdmin><AdminHRPanel /></ProtectedRoute>} />
                  <Route path="fms-categories" element={<ProtectedRoute requireAdmin><CategoryManagement type="fms" /></ProtectedRoute>} />
                  <Route path="checklist-categories" element={<ProtectedRoute requireAdmin><CategoryManagement type="checklist" /></ProtectedRoute>} />
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