import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Tag, Building } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  name: string;
  count: number;
}

interface CategoryManagementProps {
  type: 'fms' | 'checklist';
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ type }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
  }, [type]);

  const fetchCategories = async () => {
    try {
      const endpoint = type === 'fms' ? '/api/fms-categories/categories' : '/api/checklist-categories/categories';
      const response = await axios.get(`${address}${endpoint}`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      if (type === 'checklist') {
        const response = await axios.get(`${address}/api/checklist-categories/departments`);
        setDepartments(response.data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      showMessage('error', 'Category name cannot be empty');
      return;
    }

    if (user?.role !== 'superadmin') {
      showMessage('error', 'Only Super Admin can add categories');
      return;
    }

    try {
      const endpoint = type === 'fms' ? '/api/fms-categories/categories' : '/api/checklist-categories/categories';
      await axios.post(`${address}${endpoint}`, { name: newCategory, role: user.role });
      showMessage('success', 'Category added successfully');
      setNewCategory('');
      fetchCategories();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) {
      showMessage('error', 'Department name cannot be empty');
      return;
    }

    if (user?.role !== 'superadmin') {
      showMessage('error', 'Only Super Admin can add departments');
      return;
    }

    try {
      await axios.post(`${address}/api/checklist-categories/departments`, { name: newDepartment, role: user.role });
      showMessage('success', 'Department added successfully');
      setNewDepartment('');
      fetchDepartments();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to add department');
    }
  };

  const startEditCategory = (name: string) => {
    setEditingCategory(name);
    setEditValue(name);
  };

  const startEditDepartment = (name: string) => {
    setEditingDepartment(name);
    setEditValue(name);
  };

  const handleUpdateCategory = async (oldName: string) => {
    if (!editValue.trim()) {
      showMessage('error', 'Category name cannot be empty');
      return;
    }

    if (user?.role !== 'superadmin') {
      showMessage('error', 'Only Super Admin can update categories');
      return;
    }

    try {
      const endpoint = type === 'fms' ? '/api/fms-categories/categories/update' : '/api/checklist-categories/categories/update';
      await axios.put(`${address}${endpoint}`, { oldName, newName: editValue, role: user.role });
      showMessage('success', 'Category updated successfully');
      setEditingCategory(null);
      setEditValue('');
      fetchCategories();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to update category');
    }
  };

  const handleUpdateDepartment = async (oldName: string) => {
    if (!editValue.trim()) {
      showMessage('error', 'Department name cannot be empty');
      return;
    }

    if (user?.role !== 'superadmin') {
      showMessage('error', 'Only Super Admin can update departments');
      return;
    }

    try {
      await axios.put(`${address}/api/checklist-categories/departments/update`, { oldName, newName: editValue, role: user.role });
      showMessage('success', 'Department updated successfully');
      setEditingDepartment(null);
      setEditValue('');
      fetchDepartments();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to update department');
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message.text && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Categories Section */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-semibold flex items-center" style={{ color: 'var(--color-text)' }}>
            <Tag className="mr-2" size={20} style={{ color: 'var(--color-primary)' }} />
            Categories
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
            Manage {type === 'fms' ? 'FMS' : 'Checklist'} categories. Click on a category name to edit it.
          </p>
        </div>

        <div className="p-4">
          {/* Add New Category - Only for Superadmin */}
          {user?.role === 'superadmin' && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={18} />
                Add
              </button>
            </div>
          )}

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.length === 0 ? (
              <div className="col-span-full text-center py-8 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                No categories found. Add one to get started.
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.name}
                  className="p-3 rounded-lg border hover:shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
                >
                  {editingCategory === category.name ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all text-sm"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category.name)}
                      />
                      <button
                        onClick={() => handleUpdateCategory(category.name)}
                        className="p-1 rounded hover:bg-opacity-10"
                        style={{ color: 'var(--color-primary)' }}
                        title="Save"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setEditValue('');
                        }}
                        className="p-1 rounded hover:bg-opacity-10"
                        style={{ color: 'var(--color-textSecondary)' }}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div
                        className={user?.role === 'superadmin' ? "flex-1 cursor-pointer" : "flex-1"}
                        onClick={user?.role === 'superadmin' ? () => startEditCategory(category.name) : undefined}
                        title={user?.role === 'superadmin' ? "Click to edit" : undefined}
                      >
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                          {category.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                          {category.count} item{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {user?.role === 'superadmin' && (
                        <button
                          onClick={() => startEditCategory(category.name)}
                          className="p-1 rounded hover:bg-opacity-10 ml-2"
                          style={{ color: 'var(--color-primary)' }}
                          title="Edit category"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Departments Section - Only for checklists */}
      {type === 'checklist' && (
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-lg font-semibold flex items-center" style={{ color: 'var(--color-text)' }}>
              <Building className="mr-2" size={20} style={{ color: 'var(--color-primary)' }} />
              Departments
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
              Manage departments for checklist organization. Click on a department name to edit it.
            </p>
          </div>

          <div className="p-4">
            {/* Add New Department - Only for Superadmin */}
            {user?.role === 'superadmin' && (
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="New department name..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
                  style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                />
                <button
                  onClick={handleAddDepartment}
                  className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            )}

            {/* Departments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.length === 0 ? (
                <div className="col-span-full text-center py-8 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  No departments found. Add one to get started.
                </div>
              ) : (
                departments.map((department) => (
                  <div
                    key={department.name}
                    className="p-3 rounded-lg border hover:shadow-sm transition-all"
                    style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
                  >
                    {editingDepartment === department.name ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all text-sm"
                          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdateDepartment(department.name)}
                        />
                        <button
                          onClick={() => handleUpdateDepartment(department.name)}
                          className="p-1 rounded hover:bg-opacity-10"
                          style={{ color: 'var(--color-primary)' }}
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDepartment(null);
                            setEditValue('');
                          }}
                          className="p-1 rounded hover:bg-opacity-10"
                          style={{ color: 'var(--color-textSecondary)' }}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div
                          className={user?.role === 'superadmin' ? "flex-1 cursor-pointer" : "flex-1"}
                          onClick={user?.role === 'superadmin' ? () => startEditDepartment(department.name) : undefined}
                          title={user?.role === 'superadmin' ? "Click to edit" : undefined}
                        >
                          <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                            {department.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                            {department.count} item{department.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {user?.role === 'superadmin' && (
                          <button
                            onClick={() => startEditDepartment(department.name)}
                            className="p-1 rounded hover:bg-opacity-10 ml-2"
                            style={{ color: 'var(--color-primary)' }}
                            title="Edit department"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;

