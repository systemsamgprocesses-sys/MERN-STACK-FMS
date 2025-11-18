
import React, { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface HelpTicket {
  _id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  raisedBy: { _id: string; username: string };
  assignedTo?: { _id: string; username: string };
  createdAt: string;
  adminRemarks: Array<{ by: { username: string }; remark: string; at: string }>;
  otp?: string;
}

const AdminHelpTickets: React.FC = () => {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<string | null>(null);
  const [closingCode, setClosingCode] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${address}/api/help-tickets/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load help tickets';
      setError(errorMessage);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const addRemark = async (ticketId: string) => {
    if (!remark.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      if (!userId) {
        alert('User information not found. Please log in again.');
        return;
      }

      await axios.post(
        `${address}/api/help-tickets/${ticketId}/remark`,
        { remark, by: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRemark('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      console.error('Error adding remark:', error);
      alert(error.response?.data?.error || 'Failed to add remark');
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      // If trying to close, show modal to enter code
      if (status === 'Verified & Closed') {
        setTicketToClose(ticketId);
        setShowCloseModal(true);
        return;
      }

      const token = localStorage.getItem('token');
      // For other status changes
      await axios.patch(
        `${address}/api/help-tickets/${ticketId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const closeTicketWithCode = async () => {
    if (!ticketToClose || !closingCode.trim()) {
      alert('Please enter the closing code from the user');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${address}/api/help-tickets/${ticketToClose}/verify-otp`,
        { otp: closingCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Ticket closed successfully!');
      setShowCloseModal(false);
      setClosingCode('');
      setTicketToClose(null);
      fetchTickets();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to close ticket. Please verify the closing code with the user.');
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
            <HelpCircle className="text-[--color-primary]" />
            Manage Help Tickets
          </h1>
          <p className="text-[--color-textSecondary] mt-1">Review and respond to employee help requests</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium mb-2">Unable to Load Help Tickets</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={fetchTickets}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 bg-[--color-surface] rounded-xl border border-[--color-border]">
            <HelpCircle size={48} className="mx-auto text-[--color-textSecondary] mb-4" />
            <p className="text-[--color-textSecondary]">No help tickets</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[--color-text] mb-2">{ticket.title}</h3>
                    <p className="text-[--color-textSecondary] mb-3">{ticket.description}</p>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <select
                        value={ticket.status}
                        onChange={(e) => updateStatus(ticket._id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)} border-none`}
                        disabled={ticket.status === 'Verified & Closed'}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Verified & Closed">Close (Need User Code)</option>
                        {(ticket.status === 'Verified & Closed') && <option value="Verified & Closed">Verified & Closed</option>}
                      </select>
                      <span className="text-sm text-[--color-textSecondary]">
                        by {ticket.raisedBy.username}
                      </span>
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
                      <span className="text-sm font-medium text-[--color-text]">Remarks</span>
                    </div>
                    <div className="space-y-2">
                      {ticket.adminRemarks.map((r, idx) => (
                        <div key={idx} className="bg-[--color-background] p-3 rounded-lg">
                          <p className="text-sm text-[--color-text]">{r.remark}</p>
                          <p className="text-xs text-[--color-textSecondary] mt-1">
                            by {r.by.username} • {new Date(r.at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[--color-border]">
                  {selectedTicket === ticket._id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="Add a remark..."
                        className="flex-1 px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                      />
                      <button
                        onClick={() => addRemark(ticket._id)}
                        className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark]"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => { setSelectedTicket(null); setRemark(''); }}
                        className="px-4 py-2 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTicket(ticket._id)}
                      className="text-sm text-[--color-primary] hover:underline"
                    >
                      Add Remark
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Close Ticket Modal - Admin enters user's code */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Close Help Ticket</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 font-medium">
                  ⚠️ Ask the user for their 6-digit Help Ticket Closing Code
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  The user received this code when they created the ticket. They can view it in their ticket details.
                </p>
              </div>
              <input
                type="text"
                value={closingCode}
                onChange={(e) => setClosingCode(e.target.value)}
                placeholder="Enter user's 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-wider mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCloseModal(false);
                    setClosingCode('');
                    setTicketToClose(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={closeTicketWithCode}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHelpTickets;
