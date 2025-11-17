import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

const AdminComplaints: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const fetchAllComplaints = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/complaints/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(response.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
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
          <AlertCircle className="text-[--color-primary]" />
          Manage Complaints
        </h1>

        <div className="bg-[--color-surface] rounded-xl border border-[--color-border] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-background]">
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Submitted By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[--color-text]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length > 0 ? (
                complaints.map((complaint) => (
                  <tr key={complaint._id} className="border-b border-[--color-border] hover:bg-[--color-background]">
                    <td className="px-6 py-4 text-[--color-text]">{complaint.title}</td>
                    <td className="px-6 py-4 text-[--color-textSecondary]">{complaint.submittedBy?.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/complaints/${complaint._id}`)}
                        className="text-[--color-primary] hover:underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[--color-textSecondary]">
                    No complaints
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

export default AdminComplaints;
