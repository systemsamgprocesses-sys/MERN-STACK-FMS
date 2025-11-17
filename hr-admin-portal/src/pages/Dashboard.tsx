import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Clock, Package, AlertTriangle } from 'lucide-react';

interface RequestItem {
  item: {
    _id: string;
    name: string;
    category: string;
    quantity: number;
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
  hrRemarks?: string;
  userRemarks?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: { username: string };
}

const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<StationeryRequest[]>([]);
  const [filter, setFilter] = useState('Pending');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('hr_token');
      const { data } = await axios.get(`${address}/api/stationery/hr/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    const remarks = prompt('Approval Remarks (Optional):');
    
    try {
      const token = localStorage.getItem('hr_token');
      await axios.post(
        `${address}/api/stationery/hr/approve/${id}`,
        { hrRemarks: remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Request Approved!');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve.');
    }
  };

  const handleReject = async (id: string) => {
    const remarks = prompt('Rejection Remarks (Required):');
    if (!remarks || remarks.trim() === '') {
      toast.warn('Rejection remarks are required.');
      return;
    }

    try {
      const token = localStorage.getItem('hr_token');
      await axios.post(
        `${address}/api/stationery/hr/reject/${id}`,
        { hrRemarks: remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Request Rejected!');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject.');
    }
  };

  const filteredRequests = requests.filter(r => (filter === 'All' ? true : r.status === filter));

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Approved: 'bg-green-100 text-green-800 border-green-300',
      Received: 'bg-blue-100 text-blue-800 border-blue-300',
      Rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return styles[status as keyof typeof styles] || styles.Pending;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Stationery Requests</h1>
        <div className="flex gap-2">
          {['Pending', 'Approved', 'Received', 'Rejected', 'All'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      )}

      {!isLoading && filteredRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No {filter.toLowerCase()} requests found.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredRequests.map((req) => (
          <div key={req._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-blue-600">{req.requestNumber}</h2>
                  {req.demandType === 'Urgent' && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      <AlertTriangle size={12} />
                      URGENT
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Requested by <strong>{req.requestedBy.username}</strong> ({req.requestedBy.email})
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(req.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadge(req.status)}`}>
                {req.status === 'Pending' && <Clock size={14} />}
                {req.status === 'Approved' && <CheckCircle size={14} />}
                {req.status === 'Rejected' && <XCircle size={14} />}
                {req.status}
              </span>
            </div>

            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Items Requested:</h4>
              <div className="space-y-2">
                {req.items.map((item, idx) => {
                  if (!item.item) {
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 rounded bg-gray-100">
                        <div>
                          <span className="font-medium text-gray-500">[Deleted Item]</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">Qty: {item.quantity}</div>
                        </div>
                      </div>
                    );
                  }
                  const hasStock = item.quantity <= item.item.quantity;
                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-3 rounded ${
                        !hasStock ? 'bg-red-50 border border-red-200' : 'bg-white'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{item.item.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.item.category})</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">Qty: {item.quantity}</div>
                        <div className={`text-sm ${hasStock ? 'text-green-600' : 'text-red-600'}`}>
                          Stock: {item.item.quantity}
                        </div>
                        {!hasStock && (
                          <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            INSUFFICIENT
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {req.userRemarks && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong className="text-gray-900">Employee Remarks:</strong> {req.userRemarks}
                </p>
              </div>
            )}

            {req.hrRemarks && (
              <div className="mb-3 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm">
                  <strong className="text-gray-900">HR Remarks:</strong> {req.hrRemarks}
                </p>
              </div>
            )}

            {req.status === 'Pending' && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleApprove(req._id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors shadow-md"
                >
                  <CheckCircle size={18} />
                  Approve Request
                </button>
                <button
                  onClick={() => handleReject(req._id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold transition-colors shadow-md"
                >
                  <XCircle size={18} />
                  Reject Request
                </button>
              </div>
            )}

            {req.approvedBy && (
              <div className="mt-3 text-sm text-gray-600">
                <strong>Approved by:</strong> {req.approvedBy.username}
                {req.approvedAt && ` on ${new Date(req.approvedAt).toLocaleDateString()}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

