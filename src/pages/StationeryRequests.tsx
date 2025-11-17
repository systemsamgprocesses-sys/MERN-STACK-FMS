import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Check, Trash2 } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

const StationeryRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/stationery-requests`, {
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
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${address}/api/stationery-requests/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${address}/api/stationery-requests/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
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
        <h1 className="text-3xl font-bold text-[--color-text] mb-8 flex items-center gap-2">
          <PackagePlus className="text-[--color-primary]" />
          Stationery Requests
        </h1>

        <div className="bg-[--color-surface] rounded-xl border border-[--color-border] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-background]">
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Item</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Quantity</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Requested By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request._id} className="border-b border-[--color-border] hover:bg-[--color-background]">
                    <td className="px-6 py-4 text-[--color-text]">{request.item?.name}</td>
                    <td className="px-6 py-4 text-[--color-textSecondary]">{request.quantity}</td>
                    <td className="px-6 py-4 text-[--color-textSecondary]">{request.requestedBy?.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1"
                            title="Reject"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[--color-textSecondary]">
                    No requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StationeryRequests;
