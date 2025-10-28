
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface FMSTemplate {
  _id: string;
  fmsId: string;
  fmsName: string;
  stepCount: number;
  totalTimeFormatted: string;
}

const StartProject: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fmsList, setFmsList] = useState<FMSTemplate[]>([]);
  const [selectedFMS, setSelectedFMS] = useState('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchFMSTemplates();
  }, []);

  const fetchFMSTemplates = async () => {
    try {
      const response = await axios.get(`${address}/api/fms`);
      if (response.data.success) {
        setFmsList(response.data.fmsList);
      }
    } catch (error) {
      console.error('Error fetching FMS templates:', error);
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!selectedFMS) {
      newErrors.fms = 'Please select an FMS template';
    }
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${address}/api/projects`, {
        fmsId: selectedFMS,
        projectName,
        startDate,
        createdBy: user?.id
      });
      
      if (response.data.success) {
        alert(`Project created successfully! Project ID: ${response.data.projectId}`);
        navigate('/fms-progress');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = fmsList.find(fms => fms._id === selectedFMS);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">Start New Project</h1>
          <p className="text-[var(--color-textSecondary)]">Create a project from an FMS template</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Select FMS Template *
                </label>
                <select
                  value={selectedFMS}
                  onChange={(e) => setSelectedFMS(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="">Choose an FMS template</option>
                  {fmsList.map((fms) => (
                    <option key={fms._id} value={fms._id}>
                      {fms.fmsName} ({fms.fmsId}) - {fms.stepCount} steps
                    </option>
                  ))}
                </select>
                {errors.fms && <p className="text-[var(--color-error)] text-sm mt-1">{errors.fms}</p>}
              </div>

              {selectedTemplate && (
                <div className="p-4 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                  <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Template Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--color-textSecondary)]">Steps:</span>
                      <span className="ml-2 text-[var(--color-text)] font-medium">{selectedTemplate.stepCount}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-textSecondary)]">Total Duration:</span>
                      <span className="ml-2 text-[var(--color-text)] font-medium">{selectedTemplate.totalTimeFormatted}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  placeholder="Enter project name"
                />
                {errors.projectName && <p className="text-[var(--color-error)] text-sm mt-1">{errors.projectName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Start Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} />
                </div>
                {errors.startDate && <p className="text-[var(--color-error)] text-sm mt-1">{errors.startDate}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/fms-templates')}
              className="px-6 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 flex items-center space-x-2 disabled:opacity-50"
            >
              <Play size={20} />
              <span>{loading ? 'Creating Project...' : 'Start Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartProject;
