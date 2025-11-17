import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { address } from '../../utils/ipAddress';
import { Plus, Trash2, Package } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface StationeryItem {
  _id: string;
  name: string;
  quantity: number;
  category: string;
}

interface RequestItem {
  item: string;
  quantity: number;
}

const StationeryRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<StationeryItem[]>([]);
  const [demandType, setDemandType] = useState<'Normal' | 'Urgent'>('Normal');
  const [requestItems, setRequestItems] = useState<RequestItem[]>([{ item: '', quantity: 1 }]);
  const [userRemarks, setUserRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${address}/api/stationery/items`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInventory(data);
      } catch (error) {
        toast.error('Failed to load stationery items.');
      }
    };
    fetchItems();
  }, []);

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...requestItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setRequestItems(updatedItems);
  };

  const addItemRow = () => {
    setRequestItems([...requestItems, { item: '', quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    if (requestItems.length > 1) {
      const updatedItems = requestItems.filter((_, i) => i !== index);
      setRequestItems(updatedItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const validItems = requestItems.filter(item => item.item && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error('Please add at least one valid item to your request.');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${address}/api/stationery/request`,
        { demandType, items: validItems, userRemarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Request submitted successfully! Request Number: ${response.data.requestNumber}`);
      setRequestItems([{ item: '', quantity: 1 }]);
      setDemandType('Normal');
      setUserRemarks('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableStock = (itemId: string) => {
    const item = inventory.find(i => i._id === itemId);
    return item ? item.quantity : 0;
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <ToastContainer />
      
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">New Stationery Request</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="demandType" className="block text-gray-700 font-medium mb-2">
              Demand Type <span className="text-red-500">*</span>
            </label>
            <select
              id="demandType"
              value={demandType}
              onChange={(e) => setDemandType(e.target.value as 'Normal' | 'Urgent')}
              className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <hr className="my-6 border-gray-300" />

        <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Request Items
        </h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search items by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {requestItems.map((reqItem, index) => (
          <div key={index} className="flex items-start gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-grow">
              <label className="text-sm text-gray-600 font-medium">Item</label>
              <select
                value={reqItem.item}
                onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md bg-white mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Select Item --</option>
                {filteredInventory.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} (Stock: {item.quantity})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-sm text-gray-600 font-medium">Quantity</label>
              <input
                type="number"
                min="1"
                max={getAvailableStock(reqItem.item)}
                value={reqItem.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                className="w-full p-3 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => removeItemRow(index)}
              className="mt-7 p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              disabled={requestItems.length <= 1}
              title={requestItems.length <= 1 ? "At least one item is required" : "Remove item"}
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItemRow}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
        >
          <Plus size={16} /> Add More Items
        </button>

        <hr className="my-6 border-gray-300" />

        <div>
          <label htmlFor="userRemarks" className="block text-gray-700 font-medium mb-2">
            Remarks (Optional)
          </label>
          <textarea
            id="userRemarks"
            rows={3}
            value={userRemarks}
            onChange={(e) => setUserRemarks(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special instructions or reason for urgency..."
          ></textarea>
        </div>

        <div className="text-right mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StationeryRequestForm;

