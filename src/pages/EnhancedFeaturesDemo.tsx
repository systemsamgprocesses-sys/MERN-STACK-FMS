import React, { useState, useEffect } from 'react';
import { 
  Zap, Shield, Target, Users, CheckCircle, AlertTriangle,
  BarChart3, Clock, RefreshCw, Wifi, WifiOff, Activity,
  Database, Cpu, TrendingUp, Star, Award, Sparkles
} from 'lucide-react';

// Import all enhanced components
import EnhancedHelpTickets from './EnhancedHelpTickets';
import EnhancedChecklistDashboard from './EnhancedChecklistDashboard';
import EnhancedTaskTable from '../components/EnhancedTaskTable';
import EnhancedTaskActions from '../components/EnhancedTaskActions';
import ErrorBoundary from '../components/ErrorBoundary';
import PerformanceOptimizer, { PerformanceMonitor } from '../components/PerformanceOptimizer';
import EnhancedFormValidation, { EnhancedInput, EnhancedTextarea } from '../components/EnhancedFormValidation';

interface DemoTask {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: { _id: string; username: string; email: string };
  createdAt: string;
  dueDate?: string;
  progress?: number;
  attachments?: any[];
  completedAt?: string;
  revisionCount?: number;
  assignedBy?: { _id: string; username: string };
  taskType?: string;
  isActive?: boolean;
  category?: string;
  dueDate?: string;
}

const EnhancedFeaturesDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('overview');
  const [demoTasks, setDemoTasks] = useState<DemoTask[]>([]);
  const [users] = useState([
    { _id: '1', username: 'John Doe', email: 'john@example.com' },
    { _id: '2', username: 'Jane Smith', email: 'jane@example.com' },
    { _id: '3', username: 'Bob Wilson', email: 'bob@example.com' }
  ]);

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    cacheHitRate: 0,
    networkRequests: 0,
    memoryUsage: 0,
    renderTime: 0,
    bundleSize: 0
  });

  // Demo data provider for PerformanceOptimizer
  const taskDataProvider = {
    fetch: async (params?: any): Promise<DemoTask[]> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate demo tasks
      const tasks: DemoTask[] = [
        {
          _id: '1',
          title: 'Complete System Documentation',
          description: 'Write comprehensive documentation for the new task management system features',
          status: 'in-progress',
          priority: 'high',
          assignedTo: users[0],
          createdAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 65
        },
        {
          _id: '2',
          title: 'Database Optimization',
          description: 'Optimize database queries and implement caching for better performance',
          status: 'pending',
          priority: 'urgent',
          assignedTo: users[1],
          createdAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 20
        },
        {
          _id: '3',
          title: 'User Interface Testing',
          description: 'Conduct comprehensive UI/UX testing across all browsers and devices',
          status: 'completed',
          priority: 'medium',
          assignedTo: users[2],
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          progress: 100
        },
        {
          _id: '4',
          title: 'API Security Audit',
          description: 'Perform security audit of all API endpoints and implement necessary fixes',
          status: 'overdue',
          priority: 'high',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 45
        }
      ];
      
      setDemoTasks(tasks);
      return tasks;
    },
    search: async (query: string): Promise<DemoTask[]> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return demoTasks.filter(task => 
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.toLowerCase())
      );
    }
  };

  const demoSections = [
    {
      id: 'overview',
      title: 'System Overview',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'High-level view of all enhanced features'
    },
    {
      id: 'help-tickets',
      title: 'Enhanced Help Tickets',
      icon: <Shield className="h-5 w-5" />,
      description: 'Dual-notification system with real-time updates'
    },
    {
      id: 'checklist-dashboard',
      title: 'Checklist Dashboard',
      icon: <Target className="h-5 w-5" />,
      description: 'Multi-section task display with smart filtering'
    },
    {
      id: 'task-table',
      title: 'Enhanced Task Table',
      icon: <Database className="h-5 w-5" />,
      description: 'Advanced filtering, sorting, and bulk operations'
    },
    {
      id: 'task-actions',
      title: 'Task Actions',
      icon: <Zap className="h-5 w-5" />,
      description: 'Modern UI with gradient buttons and tooltips'
    },
    {
      id: 'form-validation',
      title: 'Form Validation',
      icon: <CheckCircle className="h-5 w-5" />,
      description: 'Real-time validation with user-friendly messages'
    },
    {
      id: 'performance',
      title: 'Performance Monitor',
      icon: <Activity className="h-5 w-5" />,
      description: 'Real-time performance metrics and caching'
    },
    {
      id: 'error-handling',
      title: 'Error Handling',
      icon: <AlertTriangle className="h-5 w-5" />,
      description: 'Robust error boundaries with recovery options'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* System Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoSections.slice(1).map((section) => (
          <div 
            key={section.id}
            onClick={() => setActiveDemo(section.id)}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
                {section.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            </div>
            <p className="text-gray-600 text-sm">{section.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Enhanced
              </span>
              <span className="text-xs text-blue-600 group-hover:text-blue-700">Click to demo →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          System Performance Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{performanceMetrics.loadTime.toFixed(0)}ms</div>
            <div className="text-sm text-gray-600">Load Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{performanceMetrics.cacheHitRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Cache Hit Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{performanceMetrics.networkRequests}</div>
            <div className="text-sm text-gray-600">Network Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
            </div>
            <div className="text-sm text-gray-600">Memory Usage</div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Key Enhancements Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🛡️ Help Ticket System</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Dual notifications to creators and super admins</li>
              <li>• Real-time status tracking with timestamps</li>
              <li>• Clear categorization (technical vs. task-related)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📊 Checklist Dashboard</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Multi-section display (Upcoming, Active, Overdue, Completed)</li>
              <li>• Intelligent filtering and sorting</li>
              <li>• Visual progress indicators and statistics</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔧 Performance Optimization</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Smart caching with configurable TTL</li>
              <li>• Real-time performance monitoring</li>
              <li>• Network status awareness and retry logic</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">✨ User Experience</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Modern gradient buttons with hover effects</li>
              <li>• Real-time form validation with helpful messages</li>
              <li>• Responsive design with loading states</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemo = () => {
    switch (activeDemo) {
      case 'help-tickets':
        return <EnhancedHelpTickets />;
      case 'checklist-dashboard':
        return <EnhancedChecklistDashboard />;
      case 'task-table':
        return (
          <PerformanceOptimizer
            dataProvider={taskDataProvider}
            config={{
              cacheConfig: { maxAge: 300000, maxSize: 50, autoCleanup: true },
              retryConfig: { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 },
              debounceDelay: 300,
              enableRealTimeUpdates: true,
              updateInterval: 30000
            }}
            onPerformanceUpdate={setPerformanceMetrics}
          >
            {({ data, loading, error, refetch, search, metrics, isOnline, connectionType, cacheStats }) => (
              <div className="space-y-4">
                {/* Performance Monitor */}
                <PerformanceMonitor metrics={metrics} />
                
                {/* Network Status */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  isOnline ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  <span className="text-sm">
                    {isOnline ? `Online (${connectionType})` : 'Offline - using cached data'}
                  </span>
                </div>

                {loading.isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error.message}</p>
                    <button
                      onClick={refetch}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <EnhancedTaskTable
                    tasks={data}
                    users={users}
                    loading={false}
                    userPermissions={{
                      canEditTasks: true,
                      canDeleteTasks: true,
                      canViewAllTeamTasks: true
                    }}
                    onRefresh={refetch}
                    showBulkActions={true}
                  />
                )}
              </div>
            )}
          </PerformanceOptimizer>
        );
      case 'task-actions':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {demoTasks.map((task) => (
              <div key={task._id} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                <p className="text-gray-600 mb-4">{task.description}</p>
                <EnhancedTaskActions
                  task={task}
                  onUpdateProgress={(id, progress) => {
                    console.log('Update progress:', id, progress);
                  }}
                  onMarkComplete={(id, remarks) => {
                    console.log('Mark complete:', id, remarks);
                  }}
                  onRequestExtension={(id, newDate, reason) => {
                    console.log('Request extension:', id, newDate, reason);
                  }}
                  onAddNotes={(id, notes) => {
                    console.log('Add notes:', id, notes);
                  }}
                  showQuickActions={true}
                  showAdvancedActions={true}
                />
              </div>
            ))}
          </div>
        );
      case 'form-validation':
        return (
          <div className="max-w-2xl mx-auto">
            <EnhancedFormValidation
              initialData={{
                title: '',
                description: '',
                email: '',
                phone: '',
                dueDate: ''
              }}
              schema={{
                title: { required: true, minLength: 5, maxLength: 100 },
                description: { required: true, minLength: 10, maxLength: 500 },
                email: { required: true, email: true },
                phone: { required: true, phone: true },
                dueDate: { required: true, futureDate: true }
              }}
              onSubmit={(data) => {
                console.log('Form submitted:', data);
                alert('Form submitted successfully!');
              }}
              showSuccessMessage={true}
            >
              <EnhancedInput
                name="title"
                label="Task Title"
                placeholder="Enter task title"
                required
                icon={<Target className="h-4 w-4" />}
              />
              <EnhancedTextarea
                name="description"
                label="Description"
                placeholder="Provide a detailed description"
                required
                rows={4}
                showCharCount
                maxLength={500}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EnhancedInput
                  name="email"
                  label="Email"
                  type="email"
                  placeholder="user@example.com"
                  required
                  icon={<Users className="h-4 w-4" />}
                />
                <EnhancedInput
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="+1234567890"
                  required
                  icon={<Users className="h-4 w-4" />}
                />
              </div>
              <EnhancedInput
                name="dueDate"
                label="Due Date"
                type="date"
                required
                icon={<Clock className="h-4 w-4" />}
              />
            </EnhancedFormValidation>
          </div>
        );
      case 'performance':
        return (
          <PerformanceOptimizer
            dataProvider={taskDataProvider}
            config={{
              cacheConfig: { maxAge: 300000, maxSize: 50, autoCleanup: true },
              retryConfig: { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 },
              debounceDelay: 300,
              enableRealTimeUpdates: true,
              updateInterval: 30000
            }}
            onPerformanceUpdate={setPerformanceMetrics}
          >
            {({ data, loading, error, refetch, search, metrics, isOnline, connectionType, cacheStats }) => (
              <div className="space-y-6">
                <PerformanceMonitor metrics={metrics} />
                
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance Optimization Features
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Cache Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Cache Size:</span>
                          <span>{cacheStats?.size || 0} / {cacheStats?.maxSize || 50}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hit Rate:</span>
                          <span>{cacheStats?.hitRate.toFixed(1) || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Hits:</span>
                          <span>{cacheStats?.totalHits || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Network Status</h4>
                      <div className="flex items-center gap-2">
                        {isOnline ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {isOnline ? `Connected (${connectionType})` : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={refetch}
                    disabled={loading.isLoading}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading.isLoading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </button>
                </div>
                
                {loading.isLoading && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">{loading.message}</p>
                  </div>
                )}
              </div>
            )}
          </PerformanceOptimizer>
        );
      case 'error-handling':
        return (
          <ErrorBoundary
            showDetails={true}
            onError={(error, metrics) => {
              console.error('Error caught by boundary:', error, metrics);
            }}
          >
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Error Handling System
              </h3>
              <p className="text-gray-600 mb-6">
                This component is wrapped in an Error Boundary that catches and handles
                any JavaScript errors that occur during rendering. The system provides:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Error Categories</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Network errors (connection refused, timeouts)</li>
                    <li>• Server errors (500 Internal Server Error)</li>
                    <li>• API endpoint failures</li>
                    <li>• Validation errors</li>
                    <li>• Database connection failures</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recovery Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automatic retry with exponential backoff</li>
                    <li>• Graceful degradation to cached data</li>
                    <li>• User-friendly error messages</li>
                    <li>• Performance metrics tracking</li>
                    <li>• Admin notifications</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Demo:</strong> This error boundary is actively monitoring for any
                  JavaScript errors. If an error occurs, it will be caught and displayed
                  with recovery options.
                </p>
              </div>
            </div>
          </ErrorBoundary>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-blue-600" />
                Enhanced Features Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive demonstration of all enhanced task management features
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Task Management System v2.0
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Features</h3>
              <nav className="space-y-2">
                {demoSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveDemo(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeDemo === section.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {section.icon}
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeDemo === 'overview' ? renderOverview() : (
              <ErrorBoundary showDetails={true}>
                {renderDemo()}
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFeaturesDemo;