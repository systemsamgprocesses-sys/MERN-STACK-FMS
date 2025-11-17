import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Check, X, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface StationeryRequest {
  _id: string;
  requestedBy: {
    _id: string;
    username: string;
    email?: string;
  };
  items: Array<{
    _id: string;
    item: {
      _id: string;
      itemName: string;
      sku: string;
      currentStock: number;
    } | null;
    quantity: number;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'received';
  createdAt: string;
  purpose?: string;
  userRemarks?: string;
  hrRemarks?: string;
  approvedBy?: {
    username: string;
  };
  rejectedBy?: {
    username: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
}

const HRStationeryApproval: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<StationeryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/stationery/hr/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const remarks = prompt('Add any remarks for approval (optional):') || '';
    
    try {
      setActionLoading(id);
      const token = localStorage.getItem('token');
      await axios.post(`${address}/api/stationery/hr/approve/${id}`, { hrRemarks: remarks }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error approving request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const remarks = prompt('Please provide a reason for rejection:');
    if (!remarks) return;
    
    try {
      setActionLoading(id);
      const token = localStorage.getItem('token');
      await axios.post(`${address}/api/stationery/hr/reject/${id}`, { hrRemarks: remarks }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error rejecting request');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      fulfilled: { color: 'bg-blue-100 text-blue-700', label: 'Fulfilled' },
      received: { color: 'bg-purple-100 text-purple-700', label: 'Received' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
            <PackageCheck className="text-[--color-primary]" />
            HR Stationery Approval
          </h1>
          
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterType
                    ? 'bg-[--color-primary] text-white'
                    : 'bg-[--color-surface] text-[--color-text] hover:bg-[--color-primary] hover:text-white'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[--color-surface] p-6 rounded-xl border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Total Requests</p>
                <p className="text-2xl font-bold text-[--color-text]">{requests.length}</p>
              </div>
              <Clock className="text-[--color-textSecondary]" size={24} />
            </div>
          </div>
          
          <div className="bg-[--color-surface] p-6 rounded-xl border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="text-yellow-500" size={24} />
            </div>
          </div>
          
          <div className="bg-[--color-surface] p-6 rounded-xl border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <Check className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-[--color-surface] p-6 rounded-xl border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <X className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-[--color-surface] rounded-xl border border-[--color-border] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[--color-border] bg-[--color-background]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Requested By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Items</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Purpose</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request._id} className="border-b border-[--color-border] hover:bg-[--color-background]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <User className="text-[--color-textSecondary]" size={16} />
                          <div>
                            <p className="text-[--color-text] font-medium">{request.requestedBy?.username}</p>
                            {request.requestedBy?.email && (
                              <p className="text-[--color-textSecondary] text-sm">{request.requestedBy.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {request.items.map((item, index) => (
                            <div key={index} className="text-[--color-text]">
                              <span className="font-medium">
                                {item.item ? item.item.itemName : '[Deleted Item]'}
                              </span>
                              {item.item && item.item.currentStock < item.quantity && (
                                <span className="ml-2 text-red-500 text-xs">(Insufficient stock)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {request.items.map((item, index) => (
                            <div key={index} className="text-[--color-textSecondary]">
                              {item.quantity} 
                              {item.item && (
                                <span className="ml-1 text-xs">
                                  (Stock: {item.item.currentStock})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[--color-text] text-sm">{request.purpose || 'Not specified'}</p>
                        {request.userRemarks && (
                          <p className="text-[--color-textSecondary] text-xs mt-1">
                            "{request.userRemarks}"
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                        {request.hrRemarks && (
                          <p className="text-[--color-textSecondary] text-xs mt-1">
                            HR: "{request.hrRemarks}"
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[--color-textSecondary]" />
                          <div className="text-[--color-textSecondary] text-sm">
                            <div>{new Date(request.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs">
                              {new Date(request.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(request._id)}
                                disabled={actionLoading === request._id}
                                className="text-green-600 hover:text-green-700 flex items-center gap-1 p-2 rounded-lg hover:bg-green-50 transition-all disabled:opacity-50"
                                title="Approve"
                              >
                                <Check size={18} />
                                {actionLoading === request._id && '...'}
                              </button>
                              <button
                                onClick={() => handleReject(request._id)}
                                disabled={actionLoading === request._id}
                                className="text-red-600 hover:text-red-700 flex items-center gap-1 p-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          {request.status === 'approved' && request.approvedBy && (
                            <div className="text-[--color-textSecondary] text-xs">
                              By {request.approvedBy.username}
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejectedBy && (
                            <div className="text-[--color-textSecondary] text-xs">
                              By {request.rejectedBy.username}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[--color-textSecondary]">
                      No requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRStationeryApproval;