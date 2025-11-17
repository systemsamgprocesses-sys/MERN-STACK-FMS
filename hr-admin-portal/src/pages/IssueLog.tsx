import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { toast } from 'react-toastify';
import { Archive, Package, Calendar, User } from 'lucide-react';

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

const IssueLog: React.FC = () => {
  const [requests, setRequests] = useState<StationeryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

    fetchAllRequests();
  }, []);

  const filteredRequests = requests.filter(
    (req) =>
      req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items.some((item) => item.item && item.item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTotalQuantity = (req: StationeryRequest) => {
    return req.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Issue Log</h1>
        </div>
        <div className="text-sm text-gray-600">
          <strong>{requests.length}</strong> completed requests
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by request number, employee name, or item name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading issue log...</p>
        </div>
      )}

      {!isLoading && filteredRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'No matching requests found.' : 'No completed requests yet.'}
          </p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approved By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received On
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRequests.map((req) => (
              <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-semibold text-blue-600">{req.requestNumber}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                      {req.requestedBy.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{req.requestedBy.username}</div>
                      <div className="text-xs text-gray-500">{req.requestedBy.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {req.items.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">
                          {item.item ? item.item.name : '[Deleted Item]'}
                        </span>
                        <span className="text-gray-500"> × {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-bold text-gray-900">{getTotalQuantity(req)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {req.approvedBy ? (
                      <>
                        <div className="font-medium text-gray-900">{req.approvedBy.username}</div>
                        {req.approvedAt && (
                          <div className="text-xs text-gray-500">
                            {new Date(req.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {req.receivedAt
                        ? new Date(req.receivedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && filteredRequests.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Package size={18} />
            <span className="font-medium">
              Total Items Issued: {filteredRequests.reduce((sum, req) => sum + getTotalQuantity(req), 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueLog;

