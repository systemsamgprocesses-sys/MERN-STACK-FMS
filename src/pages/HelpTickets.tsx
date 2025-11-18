
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Plus, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface HelpTicket {
  _id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  raisedBy: { _id: string; username: string };
  createdBy: { _id: string; username: string };
  createdAt: string;
  adminRemarks: Array<{ by: { username: string }; remark: string; at: string }>;
  otp?: string;
  otpExpiresAt?: string;
}

const HelpTickets: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicketCode, setNewTicketCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        userId: user?.id || '',
        role: user?.role || ''
      });
      
      const response = await axios.get(`${address}/api/help-tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${address}/api/help-tickets`, {
        ...formData,
        raisedBy: user?.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Show the closure code to the user
      setNewTicketCode(response.data.otp);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const getClosureCode = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${address}/api/help-tickets/${ticketId}/get-closure-code`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Your Help Ticket Closing Code: ${response.data.otp}\n\n${response.data.message}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to get closure code');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved - Pending Verification': return 'bg-purple-100 text-purple-800';
      case 'Verified & Closed': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <HelpCircle className="text-[--color-primary]" />
              Help Tickets
            </h1>
            <p className="text-[--color-textSecondary] mt-1">Get help from administrators</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] flex items-center gap-2"
          >
            <Plus size={18} />
            Raise Ticket
          </button>
        </div>

        {/* Information Notice */}
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded text-blue-800">
          <p className="font-semibold">📌 When to use Help Tickets vs Objections:</p>
          <ul className="mt-2 text-sm space-y-1 ml-4 list-disc">
            <li><strong>Raise Help Ticket:</strong> Only for technical assistance related to the MIS system (software issues, feature requests, system errors)</li>
            <li><strong>Raise Objection:</strong> For assistance or disputes related to task assignments, deadlines, or task-specific issues</li>
          </ul>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 bg-[--color-surface] rounded-xl border border-[--color-border]">
            <HelpCircle size={48} className="mx-auto text-[--color-textSecondary] mb-4" />
            <p className="text-[--color-textSecondary]">No help tickets yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[--color-text] mb-2">{ticket.title}</h3>
                    <p className="text-[--color-textSecondary] mb-3">{ticket.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        Priority: {ticket.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        Status: {ticket.status}
                      </span>
                    </div>
                    <div className="text-xs text-[--color-textSecondary] mt-2">
                      Raised by: <strong>{ticket.raisedBy?.username || 'Unknown'}</strong>
                    </div>
                  </div>
                  <span className="text-sm text-[--color-textSecondary]">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {ticket.adminRemarks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[--color-border]">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={16} className="text-[--color-primary]" />
                      <span className="text-sm font-medium text-[--color-text]">Admin Remarks</span>
                    </div>
                    <div className="space-y-2">
                      {ticket.adminRemarks.map((remark, idx) => (
                        <div key={idx} className="bg-[--color-background] p-3 rounded-lg">
                          <p className="text-sm text-[--color-text]">{remark.remark}</p>
                          <p className="text-xs text-[--color-textSecondary] mt-1">
                            by {remark.by.username} • {new Date(remark.at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show closure code */}
                {ticket.status !== 'Verified & Closed' && (
                  <div className="mt-4 pt-4 border-t border-[--color-border]">
                    <button
                      onClick={() => getClosureCode(ticket._id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      📋 View My Closing Code
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Share this code with the admin when your issue is resolved
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Closure Code Success Modal */}
        {newTicketCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">✅ Ticket Created!</h2>
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ IMPORTANT - Save This Code!</p>
                <p className="text-xs text-yellow-800 mb-3">
                  You will need this code to close the ticket after it's resolved. Do not share this code with anyone unless your issue is resolved.
                </p>
                <div className="bg-white p-4 rounded-lg border-2 border-yellow-400">
                  <p className="text-xs text-gray-600 mb-1">Your Help Ticket Closing Code:</p>
                  <p className="text-3xl font-bold text-center text-gray-900 tracking-wider">{newTicketCode}</p>
                </div>
              </div>
              <button
                onClick={() => setNewTicketCode(null)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                I've Saved the Code
              </button>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[--color-surface] rounded-xl p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-[--color-text] mb-4">Raise Help Ticket</h2>
              <form onSubmit={createTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text] mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text] mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                    placeholder="Detailed description of the issue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text] mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark]"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpTickets;
