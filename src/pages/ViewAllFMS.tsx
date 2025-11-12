import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronUp, Eye, Printer, Edit } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';
import MermaidDiagram from '../components/MermaidDiagram';

interface FMSTemplate {
  _id: string;
  fmsId: string;
  fmsName: string;
  category: string;
  stepCount: number;
  createdBy: string;
  createdOn: string;
  totalTimeFormatted: string;
  steps: any[];
}

interface Category {
  name: string;
  count: number;
}

const ViewAllFMS: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fmsList, setFmsList] = useState<FMSTemplate[]>([]);
  const [expandedFMS, setExpandedFMS] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMermaid, setShowMermaid] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryEdit, setShowCategoryEdit] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingFMS, setEditingFMS] = useState<string | null>(null);
  const [usersCache, setUsersCache] = useState<any[]>([]);

  useEffect(() => {
    fetchFMSTemplates();
    fetchUsers();
  }, [user, selectedCategory]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsersCache(response.data.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFMSTemplates = async () => {
    try {
      const params = {
        userId: user?.id,
        isAdmin: (user?.role === 'admin' || user?.role === 'superadmin') ? 'true' : 'false',
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      };
      const response = await axios.get(`${address}/api/fms`, { params });
      if (response.data.success) {
        setFmsList(response.data.fmsList);
        
        // Calculate categories from FMS list
        const categoryMap = response.data.fmsList.reduce((acc: { [key: string]: number }, fms: FMSTemplate) => {
          const category = fms.category || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        
        const categoriesList = Object.entries(categoryMap).map(([name, count]) => ({
          name,
          count: count as number
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCategories(categoriesList);
      }
    } catch (error) {
      console.error('Error fetching FMS templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (fmsId: string, newCategory: string) => {
    try {
      await axios.put(`${address}/api/fms/${fmsId}/category`, {
        category: newCategory
      });
      setEditingFMS(null);
      await fetchFMSTemplates();
    } catch (error) {
      console.error('Error updating FMS category:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      await axios.post(`${address}/api/fms/categories`, {
        name: newCategory.trim()
      });
      setNewCategory('');
      setShowCategoryEdit(false);
      await fetchFMSTemplates();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const toggleExpand = (fmsId: string) => {
    setExpandedFMS(expandedFMS === fmsId ? null : fmsId);
  };

  const printFMS = (fms: FMSTemplate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const usersMap = new Map();
    usersCache.forEach(user => {
      if (user._id || user.id) {
        usersMap.set(user._id || user.id, user);
      }
    });
    
    const formatAssignee = (who: any): string => {
      if (Array.isArray(who)) {
        return who.map((w: any) => {
          if (typeof w === 'object' && w !== null) {
            if (w.username) return w.username;
            if (w.name) return w.name;
            if (w._id && usersMap.has(w._id)) return usersMap.get(w._id).username || usersMap.get(w._id).name;
            return w._id ? w._id.toString().substring(0, 8) : 'Unknown User';
          } else if (typeof w === 'string') {
            if (usersMap.has(w)) return usersMap.get(w).username || usersMap.get(w).name;
            return w.substring(0, 8) + '...';
          }
          return 'Unknown User';
        }).filter(name => name !== 'Unknown User').join(', ');
      }
      return 'N/A';
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FMS Template: ${fms.fmsName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .fms-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .step { border: 1px solid #ddd; margin-bottom: 15px; border-radius: 5px; padding: 15px; }
          .step-header { font-weight: bold; margin-bottom: 10px; }
          .detail-row { margin-bottom: 8px; }
          .label { font-weight: bold; display: inline-block; width: 80px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FMS Template: ${fms.fmsName}</h1>
          <p>FMS ID: ${fms.fmsId}</p>
        </div>
        
        <div class="fms-info">
          <p><strong>Created by:</strong> ${fms.createdBy}</p>
          <p><strong>Created:</strong> ${new Date(fms.createdOn).toLocaleDateString()}</p>
          <p><strong>Steps:</strong> ${fms.stepCount}</p>
          <p><strong>Total Time:</strong> ${fms.totalTimeFormatted}</p>
        </div>
        
        <h2>Workflow Steps</h2>
        ${fms.steps.map(step => `
          <div class="step">
            <div class="step-header">Step ${step.stepNo}: ${step.what || 'Task Description'}</div>
            <div class="detail-row"><span class="label">WHO:</span> ${formatAssignee(step.who)}</div>
            <div class="detail-row"><span class="label">HOW:</span> ${step.how || 'Method not specified'}</div>
            <div class="detail-row"><span class="label">WHEN:</span> ${step.whenType === 'ask-on-completion' ? 'Ask on completion' : `${step.when || 0} ${step.whenUnit || 'days'}`}</div>
          </div>
        `).join('')}
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const generateMermaidDiagram = (steps: any[], usersCache?: any[]) => {
    let diagram = 'graph TD\n';
    const usersMap = new Map();
    
    // Create a cache of users for faster lookup
    if (usersCache && Array.isArray(usersCache)) {
      usersCache.forEach(user => {
        if (user._id || user.id) {
          usersMap.set(user._id || user.id, user);
        }
      });
    }
    
    steps.forEach((step, index) => {
      const stepId = `S${step.stepNo}`;
      const nextStepId = index < steps.length - 1 ? `S${steps[index + 1].stepNo}` : null;
      
      // Enhanced assignee resolution
      let assignees = 'N/A';
      if (Array.isArray(step.who)) {
        assignees = step.who.map((w: any): string => {
          if (typeof w === 'object' && w !== null) {
            // Handle populated user objects
            if (w.username) return w.username;
            if (w.name) return w.name;
            if (w._id && usersMap.has(w._id)) return usersMap.get(w._id).username || usersMap.get(w._id).name;
            // Fallback for object IDs
            return w._id ? w._id.toString().substring(0, 8) : 'Unknown User';
          } else if (typeof w === 'string') {
            // Handle string IDs
            if (usersMap.has(w)) return usersMap.get(w).username || usersMap.get(w).name;
            return w.substring(0, 8) + '...'; // Truncate for display
          }
          return 'Unknown User';
        }).filter((name: string) => name !== 'Unknown User').join(', ');
        
        if (!assignees) assignees = 'N/A';
      }
      
      const duration = step.whenUnit === 'days+hours'
        ? `${step.whenDays || 0}d ${step.whenHours || 0}h`
        : step.whenType === 'ask-on-completion'
          ? 'Ask on completion'
          : `${step.when || 0} ${step.whenUnit || 'days'}`;
      
      // Create a well-formatted step description
      const stepDescription = step.what || `Step ${step.stepNo}`;
      const howDescription = step.how || 'Method not specified';
      
      diagram += `    ${stepId}["<b>Step ${step.stepNo}</b><br/><br/><b>WHAT:</b> ${stepDescription}<br/><br/><b>WHO:</b> ${assignees}<br/><br/><b>HOW:</b> ${howDescription}<br/><br/><b>WHEN:</b> ${duration}"]\n`;
      
      if (nextStepId) {
        diagram += `    ${stepId} --> ${nextStepId}\n`;
      }
    });
    
    return diagram;
  };

  // Helper function to format assignee names in the details view
  const formatAssigneeForDetails = (who: any): string => {
    if (Array.isArray(who)) {
      return who.map((w: any) => {
        if (typeof w === 'object' && w !== null) {
          return w.username || w.name || 'Unknown User';
        }
        return w || 'Unknown User';
      }).join(', ');
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--color-text)]">Loading FMS templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">FMS Templates</h1>
            <p className="text-[var(--color-textSecondary)]">View and manage workflow templates</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Management for Admin/Superadmin */}
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <div className="relative">
                <button
                  onClick={() => setShowCategoryEdit(true)}
                  className="px-4 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  Manage Categories
                </button>

                {showCategoryEdit && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg z-50 p-4"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category name"
                        className="px-3 py-2 rounded border text-sm"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                      <button
                        onClick={handleAddCategory}
                        className="px-3 py-2 rounded bg-blue-500 text-white text-sm hover:bg-blue-600"
                      >
                        Add Category
                      </button>
                      <button
                        onClick={() => setShowCategoryEdit(false)}
                        className="px-3 py-2 rounded border text-sm"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/15 flex items-center gap-2 print:hidden"
            >
              <Printer size={18} />
              <span>Print</span>
            </button>

            <button
              onClick={() => navigate('/create-fms')}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Create New FMS</span>
            </button>
          </div>
        </div>

        {fmsList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-textSecondary)] mb-4">No FMS templates found</p>
            <button
              onClick={() => navigate('/create-fms')}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
            >
              Create Your First FMS Template
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories
              .filter(category => selectedCategory === 'all' || category.name === selectedCategory)
              .map(category => {
                const categoryFMS = fmsList.filter(fms => 
                  (fms.category || 'Uncategorized') === category.name
                );
                
                if (categoryFMS.length === 0) return null;
                
                return (
                  <div key={category.name} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-[var(--color-text)]">
                        {category.name} ({categoryFMS.length})
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {categoryFMS.map((fms) => (
                        <div
                          key={fms._id}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
                        >
                          <div
                            className="p-6 cursor-pointer hover:bg-[var(--color-background)] transition-colors"
                            onClick={() => toggleExpand(fms.fmsId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-xl font-bold text-[var(--color-text)]">{fms.fmsName}</h3>
                                  <span className="px-3 py-1 bg-[var(--color-primary)] text-white text-xs rounded-full">
                                    {fms.fmsId}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-6 text-sm text-[var(--color-textSecondary)]">
                                  <span>{fms.stepCount} Steps</span>
                                  <span>Total Time: {fms.totalTimeFormatted}</span>
                                  <span>Created by: {fms.createdBy}</span>
                                  <span>Created: {new Date(fms.createdOn).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                  <div className="relative">
                                    {editingFMS === fms._id ? (
                                      <div className="flex items-center space-x-2">
                                        <select
                                          value={fms.category || 'Uncategorized'}
                                          onChange={(e) => handleCategoryChange(fms._id, e.target.value)}
                                          className="px-2 py-1 rounded border text-sm"
                                          style={{
                                            backgroundColor: 'var(--color-surface)',
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-text)'
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {categories.map(cat => (
                                            <option key={cat.name} value={cat.name}>
                                              {cat.name}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingFMS(null);
                                          }}
                                          className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingFMS(fms._id);
                                        }}
                                        className="p-2 hover:bg-[var(--color-background)] rounded-full"
                                      >
                                        <Edit size={16} className="text-[var(--color-textSecondary)]" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMermaid(showMermaid === fms.fmsId ? null : fms.fmsId);
                                  }}
                                  className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 flex items-center space-x-2"
                                >
                                  <Eye size={16} />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/start-project?fmsId=${fms._id}`);
                                  }}
                                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                                >
                                  Start Project
                                </button>
                                {expandedFMS === fms.fmsId ? (
                                  <ChevronUp size={24} className="text-[var(--color-text)]" />
                                ) : (
                                  <ChevronDown size={24} className="text-[var(--color-text)]" />
                                )}
                              </div>
                            </div>
                          </div>

                          {showMermaid === fms.fmsId && (
                            <div className="px-6 pb-4 border-t border-[var(--color-border)]">
                              <div className="flex items-center justify-between mb-3 mt-4">
                                <h4 className="text-lg font-bold text-[var(--color-text)]">
                                  Workflow Preview
                                </h4>
                                <button
                                  onClick={() => printFMS(fms)}
                                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2 print:hidden"
                                >
                                  <Printer size={16} />
                                  Print This FMS
                                </button>
                              </div>
                              <div className="bg-white p-6 rounded-lg overflow-auto">
                                <MermaidDiagram chart={generateMermaidDiagram(fms.steps, usersCache)} />
                              </div>
                            </div>
                          )}

                          {expandedFMS === fms.fmsId && (
                            <div className="px-6 pb-6 border-t border-[var(--color-border)]">
                              <h4 className="text-lg font-bold text-[var(--color-text)] mb-4 mt-4">
                                Steps Details
                              </h4>
                              <div className="space-y-4">
                                {fms.steps.map((step, index) => (
                                  <div
                                    key={index}
                                    className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <h5 className="text-lg font-bold text-[var(--color-text)]">Step {step.stepNo}</h5>
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs ${
                                          step.whenType === 'fixed'
                                            ? 'bg-blue-100 text-blue-800'
                                            : step.whenType === 'dependent'
                                              ? 'bg-purple-100 text-purple-800'
                                              : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {step.whenType === 'fixed'
                                          ? 'Fixed Duration'
                                          : step.whenType === 'dependent'
                                            ? 'Dependent'
                                            : 'Ask On Completion'}
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">What</p>
                                        <p className="text-[var(--color-text)]">{step.what}</p>
                                      </div>
                                      
                                      <div>
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">Who</p>
                                        <p className="text-[var(--color-text)]">{formatAssigneeForDetails(step.who)}</p>
                                      </div>
                                      
                                      <div>
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">How</p>
                                        <p className="text-[var(--color-text)]">{step.how}</p>
                                      </div>
                                      
                                      <div>
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">Duration</p>
                                        <p className="text-[var(--color-text)]">
                                          {step.whenUnit === 'days+hours' 
                                            ? `${step.whenDays || 0} days, ${step.whenHours || 0} hours`
                                            : step.whenType === 'ask-on-completion'
                                              ? 'Ask on completion'
                                              : `${step.when} ${step.whenUnit}`}
                                        </p>
                                      </div>
                                    </div>

                                    {step.requiresChecklist && step.checklistItems?.length > 0 && (
                                      <div className="mt-4">
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-2">Checklist</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {step.checklistItems.map((item: any, idx: number) => (
                                            <li key={idx} className="text-[var(--color-text)] text-sm">{item.text}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {step.attachments?.length > 0 && (
                                      <div className="mt-4">
                                        <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                                          Attachments ({step.attachments.length})
                                        </p>
                                        <ul className="space-y-1">
                                          {step.attachments.map((attachment: any, idx: number) => (
                                            <li key={idx} className="text-[var(--color-text)] text-sm">
                                              {attachment.originalName}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllFMS;