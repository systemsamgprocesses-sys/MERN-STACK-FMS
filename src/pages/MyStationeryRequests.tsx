import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { toast, ToastContainer } from 'react-toastify';
import { ClipboardList, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

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
  approvedBy?: { username: string };
  rejectedBy?: { username: string };
  hrRemarks?: string;
  userRemarks?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
}

const MyStationeryRequests: React.FC = () => {
  const [requests, setRequests] = useState<StationeryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${address}/api/stationery/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load your requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      Approved: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      Received: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package },
      Rejected: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full border ${config.color}`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  const getDemandTypeBadge = (type: string) => {
    if (type === 'Urgent') {
      return <span className="text-xs font-semibold px-2 py-1 bg-red-500 text-white rounded-full">URGENT</span>;
    }
    return <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-700 rounded-full">Normal</span>;
  };

  return (
    <div className="container mx-auto p-6">
      <ToastContainer />
      
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">My Stationery Requests</h1>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="bg-white shadow-md rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">You have not made any stationery requests yet.</p>
          <a href="/stationery-request" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium">
            Create your first request →
          </a>
        </div>
      )}

      <div className="space-y-4">
        {requests.map(req => (
          <div key={req._id} className="bg-white shadow-md rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex flex-wrap justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-blue-600">{req.requestNumber}</h2>
                  {getDemandTypeBadge(req.demandType)}
                </div>
                <p className="text-sm text-gray-500">
                  Requested on {new Date(req.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                {getStatusBadge(req.status)}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items Requested:
              </h4>
              <div className="bg-gray-50 rounded-md p-3">
                <ul className="space-y-2">
                  {req.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <span className="text-gray-700">
                        <span className="font-medium">
                          {item.item ? item.item.name : '[Deleted Item]'}
                        </span>
                        {item.item && (
                          <span className="text-sm text-gray-500 ml-2">({item.item.category})</span>
                        )}
                      </span>
                      <span className="font-semibold text-gray-900">Qty: {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {req.userRemarks && (
              <div className="mb-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong className="text-gray-900">Your Remarks:</strong> {req.userRemarks}
                </p>
              </div>
            )}

            {req.hrRemarks && (
              <div className="mb-3 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong className="text-gray-900">HR Remarks:</strong> {req.hrRemarks}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              {req.approvedBy && (
                <p>
                  <strong>Approved by:</strong> {req.approvedBy.username}
                  {req.approvedAt && ` on ${new Date(req.approvedAt).toLocaleDateString()}`}
                </p>
              )}
              {req.rejectedBy && (
                <p>
                  <strong>Rejected by:</strong> {req.rejectedBy.username}
                  {req.rejectedAt && ` on ${new Date(req.rejectedAt).toLocaleDateString()}`}
                </p>
              )}
              {req.receivedAt && (
                <p>
                  <strong>Received on:</strong> {new Date(req.receivedAt).toLocaleDateString()}
                </p>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default MyStationeryRequests;

