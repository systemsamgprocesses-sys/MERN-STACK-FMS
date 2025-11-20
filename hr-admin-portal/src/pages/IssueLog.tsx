import { useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { toast } from 'react-toastify';
import { Archive, Package, Settings, TrendingUp, TrendingDown } from 'lucide-react';

interface RequestItem {
  item: {
    _id: string;
    name: string;
    category: string;
  } | null;
  quantity: number;
}

interface StationeryRequest {
  _id: string;
  requestNumber: string;
  demandType: string;
  status: string;
  items: RequestItem[];
  requestedBy: { username: string; email: string };
  approvedBy?: { username: string };
  hrRemarks?: string;
  userRemarks?: string;
  createdAt: string;
  approvedAt?: string;
  receivedAt?: string;
}

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

const IssueLog: React.FC = () => {
  const [requests, setRequests] = useState<StationeryRequest[]>([]);
  const [adjustmentLogs, setAdjustmentLogs] = useState<AdjustmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustmentSearchTerm, setAdjustmentSearchTerm] = useState('');

  useEffect(() => {
    const fetchAllRequests = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('hr_token');
        const { data } = await axios.get(`${address}/api/stationery/hr/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter only received items
        const receivedRequests = data.filter((r: StationeryRequest) => r.status === 'Received');
        setRequests(receivedRequests);
      } catch (error) {
        toast.error('Failed to load issue log.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAdjustmentLogs = async () => {
      setIsLoadingAdjustments(true);
      try {
        const token = localStorage.getItem('hr_token');
        const { data } = await axios.get(`${address}/api/stationery/hr/adjustment-logs`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 }
        });
        setAdjustmentLogs(data.logs || []);
      } catch (error) {
        toast.error('Failed to load adjustment logs.');
      } finally {
        setIsLoadingAdjustments(false);
      }
    };

    fetchAllRequests();
    fetchAdjustmentLogs();
  }, []);

  const filteredRequests = requests.filter(
    (req) =>
      req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items.some((item) => item.item && item.item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAdjustmentLogs = adjustmentLogs.filter(
    (log) =>
      log.itemName.toLowerCase().includes(adjustmentSearchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(adjustmentSearchTerm.toLowerCase()) ||
      log.adjustedByUsername.toLowerCase().includes(adjustmentSearchTerm.toLowerCase())
  );

  const getTotalQuantity = (req: StationeryRequest) => {
    return req.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Issue Log & Adjustment Log</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Log Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Archive className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Issue Log</h2>
            </div>
            <div className="text-sm text-gray-600">
              <strong>{requests.length}</strong> requests
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search issue log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading...</p>
            </div>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Archive className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {searchTerm ? 'No matching requests found.' : 'No completed requests yet.'}
              </p>
            </div>
          )}

          {!isLoading && filteredRequests.length > 0 && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Received
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-blue-600 text-sm">{req.requestNumber}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2">
                              {req.requestedBy.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{req.requestedBy.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {req.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-medium">
                                  {item.item ? item.item.name : '[Deleted]'}
                                </span>
                                <span className="text-gray-500"> × {item.quantity}</span>
                              </div>
                            ))}
                            {req.items.length > 2 && (
                              <div className="text-xs text-gray-500">+{req.items.length - 2} more</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-900 text-sm">{getTotalQuantity(req)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-900">
                            {req.receivedAt
                              ? new Date(req.receivedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Adjustment Log Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-800">Adjustment Log</h2>
            </div>
            <div className="text-sm text-gray-600">
              <strong>{adjustmentLogs.length}</strong> adjustments
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search adjustment log..."
              value={adjustmentSearchTerm}
              onChange={(e) => setAdjustmentSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {isLoadingAdjustments && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading...</p>
            </div>
          )}

          {!isLoadingAdjustments && filteredAdjustmentLogs.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {adjustmentSearchTerm ? 'No matching adjustments found.' : 'No adjustments recorded yet.'}
              </p>
            </div>
          )}

          {!isLoadingAdjustments && filteredAdjustmentLogs.length > 0 && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        By
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdjustmentLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="w-4 h-4 text-gray-400 mr-1" />
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{log.itemName}</div>
                              <div className="text-xs text-gray-500">{log.itemCategory}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {log.difference > 0 ? (
                              <TrendingUp className="w-3 h-3 text-green-600" />
                            ) : log.difference < 0 ? (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            ) : null}
                            <div>
                              <div className="text-xs">
                                <span className="text-gray-500">{log.oldQuantity}</span>
                                <span className="text-gray-400 mx-1">→</span>
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
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="text-xs text-gray-900 line-clamp-2">{log.reason}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs mr-2">
                              {log.adjustedByUsername.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-medium text-gray-900 text-sm">{log.adjustedByUsername}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">
                              {new Date(log.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-gray-500">
                              {new Date(log.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueLog;

