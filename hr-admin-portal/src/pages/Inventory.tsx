import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { toast } from 'react-toastify';
import { Plus, Edit2, X, Save, Trash2, Package, Upload, Download } from 'lucide-react';

interface StationeryItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const Inventory: React.FC = () => {
  const [items, setItems] = useState<StationeryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<StationeryItem>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Writing', 'Paper', 'Binding', 'Storage', 'General', 'Office Supplies'];

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('hr_token');
      const { data } = await axios.get(`${address}/api/stationery/hr/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(data);
    } catch (error) {
      toast.error('Failed to load inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenModal = (item?: StationeryItem) => {
    if (item) {
      setIsEditing(true);
      setCurrentItem(item);
    } else {
      setIsEditing(false);
      setCurrentItem({
        name: '',
        category: 'General',
        quantity: 0,
        unit: 'pieces',
        description: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentItem({});
  };

  const handleSave = async () => {
    if (!currentItem.name || currentItem.name.trim() === '') {
      toast.error('Item name is required');
      return;
    }

    try {
      const token = localStorage.getItem('hr_token');
      if (isEditing) {
        await axios.put(
          `${address}/api/stationery/hr/inventory/${currentItem._id}`,
          currentItem,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Item updated!');
      } else {
        await axios.post(
          `${address}/api/stationery/hr/inventory`,
          currentItem,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Item added!');
      }
      fetchInventory();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save item.');
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate "${name}"? It will no longer appear in new requests.`)) {
      try {
        const token = localStorage.getItem('hr_token');
        await axios.delete(`${address}/api/stationery/hr/inventory/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Item deactivated.');
        fetchInventory();
      } catch (error) {
        toast.error('Failed to deactivate item.');
      }
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const token = localStorage.getItem('hr_token');
      const response = await axios.post(
        `${address}/api/stationery/hr/inventory/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success(response.data.message || 'Items imported successfully!');
      if (response.data.details?.errors?.length > 0) {
        console.warn('Import errors:', response.data.details.errors);
      }
      fetchInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import CSV file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `name,category,quantity,unit,description
Blue Pen,Writing,100,pieces,Standard blue ballpoint pen
A4 Paper,Paper,500,reams,White A4 printing paper
Paper Clips,General,200,boxes,Standard metal paper clips
Sticky Notes,Office Supplies,50,packs,Yellow sticky notes`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stationery_inventory_sample.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Sample CSV downloaded!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inventory Master</h1>
        <div className="flex gap-3">
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-medium transition-colors shadow-md"
          >
            <Download size={18} />
            Sample CSV
          </button>
          <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md cursor-pointer">
            <Upload size={18} />
            {isImporting ? 'Importing...' : 'Import CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              disabled={isImporting}
            />
          </label>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md"
          >
            <Plus size={18} />
            Add New Item
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No items in inventory yet.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item._id} className={!item.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        item.quantity === 0
                          ? 'text-red-600'
                          : item.quantity < 10
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    {item.isActive && (
                      <button
                        onClick={() => handleDeactivate(item._id, item.name)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Blue Pen"
                    value={currentItem.name || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentItem.category || 'General'}
                    onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentItem.quantity || 0}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., pieces, boxes"
                    value={currentItem.unit || 'pieces'}
                    onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional details about this item..."
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={currentItem.isActive !== false}
                  onChange={(e) => setCurrentItem({ ...currentItem, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active (Available for requests)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <Save size={16} />
                {isEditing ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

