import { useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { toast } from 'react-toastify';
import { Settings, Calendar, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface AdjustmentLog {
  _id: string;
  item: {
    _id: string;
    name: string;
    category: string;
    unit: string;
  } | null;
  itemName: string;
  itemCategory: string;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
  unit: string;
  reason: string;
  adjustedBy: {
    username: string;
    email: string;
  };
  adjustedByUsername: string;
  createdAt: string;
}

const AdjustmentLog: React.FC = () => {
  const [logs, setLogs] = useState<AdjustmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAdjustmentLogs = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('hr_token');
        const { data } = await axios.get(`${address}/api/stationery/hr/adjustment-logs`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchTerm, limit: 100 }
        });
        setLogs(data.logs || []);
      } catch (error) {
        toast.error('Failed to load adjustment logs.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdjustmentLogs();
  }, [searchTerm]);

  const filteredLogs = logs.filter(
    (log) =>
      log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adjustedByUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-800">Adjustment Log</h1>
        </div>
        <div className="text-sm text-gray-600">
          <strong>{logs.length}</strong> adjustments recorded
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by item name, reason, or adjusted by..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading adjustment logs...</p>
        </div>
      )}

      {!isLoading && filteredLogs.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'No matching adjustments found.' : 'No adjustments recorded yet.'}
          </p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Change
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adjusted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-semibold text-gray-900">{log.itemName}</div>
                      <div className="text-xs text-gray-500">{log.itemCategory}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {log.difference > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : log.difference < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : null}
                    <div>
                      <div className="text-sm">
                        <span className="text-gray-500">From: </span>
                        <span className="font-medium">{log.oldQuantity}</span>
                        <span className="text-gray-500"> → </span>
                        <span className="font-medium">{log.newQuantity}</span>
                        <span className="text-gray-500 ml-1">{log.unit}</span>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          log.difference > 0
                            ? 'text-green-600'
                            : log.difference < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {log.difference > 0 ? '+' : ''}
                        {log.difference} {log.unit}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <p className="text-sm text-gray-900">{log.reason}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                      {log.adjustedByUsername.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{log.adjustedByUsername}</div>
                      {log.adjustedBy?.email && (
                        <div className="text-xs text-gray-500">{log.adjustedBy.email}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {new Date(log.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdjustmentLog;

