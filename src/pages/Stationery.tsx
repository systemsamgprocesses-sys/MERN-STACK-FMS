import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

const Stationery: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStationeryItems();
  }, []);

  const fetchStationeryItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/stationery`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching stationery items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-background] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <Package className="text-[--color-primary]" />
              Stationery Inventory
            </h1>
            <p className="text-[--color-textSecondary] mt-1">Manage stationery items and stock</p>
          </div>
          <button
            onClick={() => navigate('/stationery/add')}
            className="px-6 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary]/90 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Add Item
          </button>
        </div>

        {/* Search */}
        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--color-textSecondary]" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[--color-border] rounded-lg bg-[--color-surface] text-[--color-text]"
          />
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                className="bg-[--color-surface] rounded-xl border border-[--color-border] p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/stationery/${item._id}`)}
              >
                <h3 className="text-lg font-semibold text-[--color-text] mb-2">{item.name}</h3>
                <p className="text-sm text-[--color-textSecondary] mb-4">{item.category}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-[--color-textSecondary]">In Stock:</span>
                    <span className="text-sm font-semibold text-[--color-text]">{item.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[--color-textSecondary]">Unit:</span>
                    <span className="text-sm font-semibold text-[--color-text]">{item.unit}</span>
                  </div>
                  {item.minStock && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[--color-textSecondary]">Min Stock:</span>
                      <span className={`text-sm font-semibold ${
                        (item.quantity || 0) < item.minStock ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.minStock}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-[--color-textSecondary]">No stationery items found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stationery;
