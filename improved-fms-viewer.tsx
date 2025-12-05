import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, ChevronUp, Eye, Printer, Edit, X, Check, Filter, Search, Calendar, User, Clock, List } from 'lucide-react';

// Mock data for demonstration
const mockFMSList = [
  {
    _id: '1',
    fmsId: 'FMS-001',
    fmsName: 'Software Development Lifecycle',
    category: 'Development',
    stepCount: 5,
    createdBy: 'John Doe',
    createdOn: '2024-01-15',
    totalTimeFormatted: '45 days',
    status: 'active',
    steps: [
      { stepNo: 1, what: 'Requirements Gathering', who: [{ username: 'analyst1' }], how: 'Stakeholder meetings', when: 5, whenUnit: 'days', whenType: 'fixed', whenDays: 5, whenHours: 0 },
      { stepNo: 2, what: 'Design Phase', who: [{ username: 'designer1' }], how: 'Create mockups', when: 10, whenUnit: 'days', whenType: 'fixed', whenDays: 10, whenHours: 0 },
      { stepNo: 3, what: 'Development', who: [{ username: 'dev1' }, { username: 'dev2' }], how: 'Code implementation', when: 20, whenUnit: 'days', whenType: 'fixed', whenDays: 20, whenHours: 0 },
      { stepNo: 4, what: 'Testing', who: [{ username: 'qa1' }], how: 'QA testing', when: 7, whenUnit: 'days', whenType: 'dependent', whenDays: 7, whenHours: 0 },
      { stepNo: 5, what: 'Deployment', who: [{ username: 'devops1' }], how: 'Deploy to production', whenType: 'ask-on-completion' }
    ]
  },
  {
    _id: '2',
    fmsId: 'FMS-002',
    fmsName: 'Client Onboarding Process',
    category: 'Sales',
    stepCount: 4,
    createdBy: 'Jane Smith',
    createdOn: '2024-02-20',
    totalTimeFormatted: '15 days',
    status: 'active',
    steps: [
      { stepNo: 1, what: 'Initial Contact', who: [{ username: 'sales1' }], how: 'Email introduction', when: 2, whenUnit: 'days', whenType: 'fixed', whenDays: 2, whenHours: 0 },
      { stepNo: 2, what: 'Demo & Presentation', who: [{ username: 'sales1' }], how: 'Live demo', when: 3, whenUnit: 'days', whenType: 'fixed', whenDays: 3, whenHours: 0 },
      { stepNo: 3, what: 'Contract Negotiation', who: [{ username: 'legal1' }], how: 'Legal review', when: 7, whenUnit: 'days', whenType: 'fixed', whenDays: 7, whenHours: 0 },
      { stepNo: 4, what: 'Account Setup', who: [{ username: 'support1' }], how: 'Configure account', when: 3, whenUnit: 'days', whenType: 'dependent', whenDays: 3, whenHours: 0 }
    ]
  },
  {
    _id: '3',
    fmsId: 'FMS-003',
    fmsName: 'Product Launch Campaign',
    category: 'Marketing',
    stepCount: 6,
    createdBy: 'Mike Johnson',
    createdOn: '2024-03-10',
    totalTimeFormatted: '60 days',
    status: 'active',
    steps: [
      { stepNo: 1, what: 'Market Research', who: [{ username: 'research1' }], how: 'Surveys and analysis', when: 10, whenUnit: 'days', whenType: 'fixed', whenDays: 10, whenHours: 0 },
      { stepNo: 2, what: 'Strategy Planning', who: [{ username: 'marketing1' }], how: 'Campaign strategy', when: 7, whenUnit: 'days', whenType: 'fixed', whenDays: 7, whenHours: 0 },
      { stepNo: 3, what: 'Content Creation', who: [{ username: 'content1' }], how: 'Marketing materials', when: 15, whenUnit: 'days', whenType: 'fixed', whenDays: 15, whenHours: 0 },
      { stepNo: 4, what: 'Review & Approval', who: [{ username: 'manager1' }], how: 'Stakeholder review', when: 5, whenUnit: 'days', whenType: 'dependent', whenDays: 5, whenHours: 0 },
      { stepNo: 5, what: 'Campaign Launch', who: [{ username: 'marketing1' }], how: 'Multi-channel launch', when: 3, whenUnit: 'days', whenType: 'fixed', whenDays: 3, whenHours: 0 },
      { stepNo: 6, what: 'Performance Monitoring', who: [{ username: 'analytics1' }], how: 'Track metrics', when: 20, whenUnit: 'days', whenType: 'fixed', whenDays: 20, whenHours: 0 }
    ]
  }
];

const mockCategories = [
  { name: 'Development', count: 1 },
  { name: 'Sales', count: 1 },
  { name: 'Marketing', count: 1 }
];

const FMSTemplateViewer = () => {
  const [fmsList, setFmsList] = useState(mockFMSList);
  const [categories, setCategories] = useState(mockCategories);
  const [expandedFMS, setExpandedFMS] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [userRole] = useState('superadmin'); // Mock user role

  // Format assignee names
  const formatAssignees = useCallback((who) => {
    if (!Array.isArray(who)) return 'N/A';
    const names = who
      .map(w => w?.username || w?.name || w?.email || (typeof w === 'string' ? w : ''))
      .filter(Boolean);
    return names.length ? names.join(', ') : 'N/A';
  }, []);

  // Get step duration text
  const getStepDuration = useCallback((step) => {
    if (step.whenType === 'ask-on-completion') return 'Ask on completion';
    if (step.whenUnit === 'days+hours') return `${step.whenDays || 0}d ${step.whenHours || 0}h`;
    return `${step.when || 0} ${step.whenUnit || 'days'}`;
  }, []);

  // Filter and search FMS templates
  const filteredFMS = useMemo(() => {
    return fmsList.filter(fms => {
      const matchesCategory = selectedCategory === 'all' || fms.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        fms.fmsName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fms.fmsId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fms.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [fmsList, selectedCategory, searchQuery]);

  // Group by category
  const groupedFMS = useMemo(() => {
    const groups = {};
    filteredFMS.forEach(fms => {
      const cat = fms.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fms);
    });
    return groups;
  }, [filteredFMS]);

  // Print FMS
  const handlePrint = useCallback((fms) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const stepsHTML = fms.steps.map((step) => `
      <div style="page-break-inside: avoid; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px; border-radius: 8px; background: #f9fafb;">
        <h4 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
          Step ${step.stepNo}: ${step.what}
        </h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px; color: #4b5563;">
          <div><strong style="color: #1f2937;">Who:</strong> ${formatAssignees(step.who)}</div>
          <div><strong style="color: #1f2937;">How:</strong> ${step.how}</div>
          <div><strong style="color: #1f2937;">Duration:</strong> ${getStepDuration(step)}</div>
          <div><strong style="color: #1f2937;">Type:</strong> ${step.whenType === 'fixed' ? 'Fixed' : step.whenType === 'dependent' ? 'Dependent' : 'Ask On Completion'}</div>
        </div>
      </div>
    `).join('');

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fms.fmsName} - Print</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; background: white; color: #1f2937; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px; }
          .header h1 { color: #1f2937; font-size: 32px; margin-bottom: 8px; }
          .header .fms-id { color: #6b7280; font-size: 14px; font-family: monospace; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
          .info-card { background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; }
          .info-card label { display: block; font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-card value { display: block; font-size: 16px; color: #1f2937; font-weight: 600; }
          .section-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 32px 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
          @media print { 
            body { padding: 16px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${fms.fmsName}</h1>
          <div class="fms-id">${fms.fmsId}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-card">
            <label>Total Steps</label>
            <value>${fms.stepCount}</value>
          </div>
          <div class="info-card">
            <label>Total Duration</label>
            <value>${fms.totalTimeFormatted}</value>
          </div>
          <div class="info-card">
            <label>Created By</label>
            <value>${fms.createdBy}</value>
          </div>
          <div class="info-card">
            <label>Created On</label>
            <value>${new Date(fms.createdOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</value>
          </div>
        </div>

        <h2 class="section-title">Workflow Steps</h2>
        ${stepsHTML}

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }, [formatAssignees, getStepDuration]);

  // Handle category change
  const handleCategoryChange = useCallback((fmsId, newCategory) => {
    if (userRole !== 'superadmin') {
      alert('Only Super Admin can change categories');
      return;
    }
    
    setFmsList(prev => prev.map(fms => 
      fms._id === fmsId ? { ...fms, category: newCategory } : fms
    ));
    setEditingCategory(null);
  }, [userRole]);

  // Add new category
  const handleAddCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;
    
    const exists = categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (exists) {
      alert('Category already exists');
      return;
    }

    setCategories(prev => [...prev, { name: newCategoryName.trim(), count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategoryName('');
    setShowCategoryModal(false);
  }, [newCategoryName, categories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">FMS Templates</h1>
              <p className="text-gray-600">Manage and view your workflow templates</p>
            </div>
            
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold">
              <Plus size={20} />
              <span>Create New FMS</span>
            </button>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, ID, or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Category Filter */}
              <div className="sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="all">All Categories ({fmsList.length})</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Manage Categories (Admin) */}
              {userRole === 'superadmin' && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                >
                  <Filter size={18} />
                  <span>Manage</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredFMS.length} of {fmsList.length} templates
        </div>

        {/* FMS List */}
        {filteredFMS.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <List size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search terms' 
                : 'Get started by creating your first FMS template'}
            </p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              Create New Template
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedFMS).map(([categoryName, categoryFMS]) => (
              <div key={categoryName} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">{categoryName}</h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {categoryFMS.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryFMS.map((fms) => (
                    <div key={fms._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      {/* Card Header */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedFMS(expandedFMS === fms._id ? null : fms._id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-xl font-bold text-gray-900 truncate">{fms.fmsName}</h3>
                              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-mono rounded-full shrink-0">
                                {fms.fmsId}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <List size={16} className="text-gray-400" />
                                <span className="font-semibold text-gray-900">{fms.stepCount}</span> steps
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-gray-400" />
                                {fms.totalTimeFormatted}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User size={16} className="text-gray-400" />
                                {fms.createdBy}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar size={16} className="text-gray-400" />
                                {new Date(fms.createdOn).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {userRole === 'superadmin' && editingCategory === fms._id ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={fms.category}
                                  onChange={(e) => handleCategoryChange(fms._id, e.target.value)}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                >
                                  {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setEditingCategory(null)}
                                  className="p-1.5 hover:bg-gray-100 rounded"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                {userRole === 'superadmin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCategory(fms._id);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit Category"
                                  >
                                    <Edit size={18} className="text-gray-600" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPreview(fms);
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  Preview
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrint(fms);
                                  }}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                                >
                                  <Printer size={16} />
                                  Print
                                </button>
                                <button
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Start Project
                                </button>
                              </>
                            )}
                            
                            {expandedFMS === fms._id ? (
                              <ChevronUp size={24} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={24} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedFMS === fms._id && (
                        <div className="border-t border-gray-200 p-6 bg-gray-50">
                          <h4 className="text-lg font-bold text-gray-900 mb-4">Workflow Steps</h4>
                          <div className="space-y-3">
                            {fms.steps.map((step) => (
                              <div key={step.stepNo} className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between mb-3">
                                  <h5 className="text-base font-bold text-gray-900">
                                    Step {step.stepNo}: {step.what}
                                  </h5>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    step.whenType === 'fixed' ? 'bg-blue-100 text-blue-700' :
                                    step.whenType === 'dependent' ? 'bg-purple-100 text-purple-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {step.whenType === 'fixed' ? 'Fixed' : 
                                     step.whenType === 'dependent' ? 'Dependent' : 'On Completion'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="font-semibold text-gray-700">Who: </span>
                                    <span className="text-gray-600">{formatAssignees(step.who)}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-700">How: </span>
                                    <span className="text-gray-600">{step.how}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="font-semibold text-gray-700">Duration: </span>
                                    <span className="text-gray-600">{getStepDuration(step)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Manage Categories</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Add New Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check size={18} />
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Categories</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">{showPreview.fmsName}</h3>
                  <p className="text-blue-100 text-sm mt-1">{showPreview.fmsId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(showPreview)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPreview(null)}
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <X size={18} />
                    Close
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Steps:</span>
                      <p className="text-gray-900 font-bold text-lg">{showPreview.stepCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Duration:</span>
                      <p className="text-gray-900 font-bold text-lg">{showPreview.totalTimeFormatted}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Created By:</span>
                      <p className="text-gray-900 font-bold text-lg">{showPreview.createdBy}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Created:</span>
                      <p className="text-gray-900 font-bold text-lg">{new Date(showPreview.createdOn).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-gray-900 mb-4">Workflow Steps</h4>
                <div className="space-y-4">
                  {showPreview.steps.map((step, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {step.stepNo}
                          </div>
                          <h5 className="text-base font-bold text-gray-900">{step.what}</h5>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          step.whenType === 'fixed' ? 'bg-blue-100 text-blue-700' :
                          step.whenType === 'dependent' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {step.whenType === 'fixed' ? 'Fixed' : 
                           step.whenType === 'dependent' ? 'Dependent' : 'On Completion'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">Who: </span>
                          <span className="text-gray-600">{formatAssignees(step.who)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">How: </span>
                          <span className="text-gray-600">{step.how}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-semibold text-gray-700">Duration: </span>
                          <span className="text-gray-600">{getStepDuration(step)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FMSTemplateViewer;