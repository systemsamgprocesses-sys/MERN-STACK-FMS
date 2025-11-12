import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Bell, Filter, Search, X, Eye, Archive, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface HelpTicket {
  _id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  createdBy: { _id: string; username: string };
  createdAt: string;
  updatedAt: string;
  assignedTo?: { _id: string; username: string };
  adminRemarks: Array<{ by: { username: string }; remark: string; at: string }>;
  isRead?: boolean;
  resolvedAt?: string;
  closedAt?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  soundEnabled: boolean;
}

const EnhancedHelpTickets: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpTicket | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    inAppNotifications: true,
    soundEnabled: true
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'technical'
  });
  const [replyData, setReplyData] = useState({
    remark: ''
  });
  const [filterState, setFilterState] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationSound = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    fetchTickets();
    fetchNotificationSettings();
    initializeNotificationSound();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, filterState]);

  useEffect(() => {
    const unreadTickets = tickets.filter(ticket => !ticket.isRead && ticket.status !== 'closed').length;
    setUnreadCount(unreadTickets);
  }, [tickets]);

  const initializeNotificationSound = () => {
    // Create a simple beep sound for notifications using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.value = 800;
      notificationSound.current = oscillator;
    } catch (error) {
      console.warn('Could not initialize notification sound:', error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/user-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.notifications) {
        setNotificationSettings(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${address}/api/user-settings`, 
        { notifications: settings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/help-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (error: any) {
      handleError(error, 'fetchTickets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = tickets.filter(ticket => {
      // Search filter
      if (filterState.search) {
        const searchLower = filterState.search.toLowerCase();
        const matchesSearch =
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.createdBy.username.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterState.status && ticket.status !== filterState.status) {
        return false;
      }

      // Priority filter
      if (filterState.priority && ticket.priority !== filterState.priority) {
        return false;
      }

      // Category filter
      if (filterState.category && ticket.category !== filterState.category) {
        return false;
      }

      // Date range filter
      if (filterState.dateFrom || filterState.dateTo) {
        const ticketDate = new Date(ticket.createdAt);
        if (filterState.dateFrom) {
          const fromDate = new Date(filterState.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (ticketDate < fromDate) return false;
        }
        if (filterState.dateTo) {
          const toDate = new Date(filterState.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (ticketDate > toDate) return false;
        }
      }

      return true;
    });

    setFilteredTickets(filtered);
    setCurrentPage(1);
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

      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'medium', category: 'technical' });
      fetchTickets();
      
      // Show success notification
      if (notificationSettings.soundEnabled && notificationSound.current) {
        try {
          notificationSound.current.start();
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      }
      
      alert('Ticket created successfully! Super administrators have been notified.');
    } catch (error: any) {
      handleError(error, 'createTicket');
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const updateData: any = { status };
      
      if (status === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closedAt = new Date().toISOString();
      }

      await axios.put(`${address}/api/help-tickets/${ticketId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      fetchTickets();
      
      // Send notification to ticket creator
      await sendNotificationToCreator(ticketId, status);
      
      if (notificationSettings.soundEnabled && notificationSound.current) {
        try {
          notificationSound.current.start();
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      }
      
    } catch (error: any) {
      handleError(error, 'updateTicketStatus');
    }
  };

  const addAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${address}/api/help-tickets/${selectedTicket._id}/reply`, {
        remark: replyData.remark,
        by: user?.id
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReplyData({ remark: '' });
      setShowDetailsModal(false);
      fetchTickets();
      
      // Send notification to ticket creator
      await sendNotificationToCreator(selectedTicket._id, 'replied');
      
      if (notificationSettings.soundEnabled && notificationSound.current) {
        try {
          notificationSound.current.start();
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      }
      
    } catch (error: any) {
      handleError(error, 'addAdminReply');
    }
  };

  const sendNotificationToCreator = async (ticketId: string, action: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${address}/api/notifications/help-ticket`, {
        ticketId,
        action,
        toUser: tickets.find(t => t._id === ticketId)?.createdBy._id
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    let errorCategory = 'general';

    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        errorCategory = 'authentication';
      } else if (error.response.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
        errorCategory = 'authorization';
      } else if (error.response.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
        errorCategory = 'rate_limit';
      } else if (error.response.status >= 500) {
        errorMessage = 'Server error. Please contact support.';
        errorCategory = 'server';
      } else {
        errorMessage = error.response.data?.error || 'Request failed';
        errorCategory = 'validation';
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your connection.';
      errorCategory = 'network';
    } else {
      errorMessage = error.message || 'Unknown error occurred';
      errorCategory = 'general';
    }

    // Log error to analytics/sentry if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'error', {
        error_category: errorCategory,
        error_message: errorMessage,
        context: context
      });
    }

    alert(errorMessage);
  };

  const markAsRead = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${address}/api/help-tickets/${ticketId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      setTickets(tickets.map(ticket => 
        ticket._id === ticketId ? { ...ticket, isRead: true } : ticket
      ));
    } catch (error) {
      console.error('Error marking ticket as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-red-200 text-red-900 border-red-300 animate-pulse';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'In Progress': return <AlertCircle size={16} />;
      case 'Resolved': return <CheckCircle size={16} />;
      case 'Closed': return <Archive size={16} />;
      default: return <HelpCircle size={16} />;
    }
  };

  const resetFilters = () => {
    setFilterState({
      status: '',
      priority: '',
      category: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <HelpCircle className="text-[--color-primary]" />
              Help Tickets
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-[--color-textSecondary] mt-1">
              Get help from administrators • {filteredTickets.length} total tickets
            </p>
          </div>
          <div className="flex items-center mt-4 sm:mt-0 gap-3">
            {/* Notification Settings */}
            <div className="relative">
              <Bell 
                size={20} 
                className="text-[--color-textSecondary] cursor-pointer hover:text-[--color-primary] transition-colors"
                onClick={() => {
                  // Toggle notification settings dropdown
                }}
              />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] hover:bg-[--color-border] rounded-lg transition-colors flex items-center"
            >
              <Filter size={16} className="inline mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Raise Ticket
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-[--color-surface] rounded-xl shadow-sm border border-[--color-border] p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-[--color-text] mb-2">
                  <Search size={14} className="inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search tickets, descriptions, users..."
                  value={filterState.search}
                  onChange={(e) => setFilterState({ ...filterState, search: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] bg-[--color-background] text-[--color-text]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-2">Status</label>
                <select
                  value={filterState.status}
                  onChange={(e) => setFilterState({ ...filterState, status: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-2">Priority</label>
                <select
                  value={filterState.priority}
                  onChange={(e) => setFilterState({ ...filterState, priority: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-medium text-[--color-text] bg-[--color-surface] hover:bg-[--color-border] rounded-lg transition-colors flex items-center"
                >
                  <X size={16} className="inline mr-1" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {currentTickets.length === 0 ? (
          <div className="text-center py-12 bg-[--color-surface] rounded-xl border border-[--color-border]">
            <HelpCircle size={48} className="mx-auto text-[--color-textSecondary] mb-4" />
            <p className="text-[--color-textSecondary] mb-4">
              {Object.values(filterState).some(value => value !== '') 
                ? 'No tickets match your filters' 
                : 'No help tickets yet'}
            </p>
            {Object.values(filterState).some(value => value !== '') && (
              <button
                onClick={resetFilters}
                className="text-[--color-primary] hover:text-[--color-primary-dark] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentTickets.map((ticket) => (
              <div
                key={ticket._id}
                className={`bg-[--color-surface] rounded-xl p-6 border transition-all hover:shadow-lg ${
                  ticket.isRead 
                    ? 'border-[--color-border]' 
                    : 'border-[--color-primary] bg-gradient-to-r from-[--color-surface] to-[--color-background]'
                } ${!ticket.isRead ? 'ring-1 ring-[--color-primary]/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[--color-text]">{ticket.title}</h3>
                      {!ticket.isRead && (
                        <div className="w-2 h-2 bg-[--color-primary] rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <p className="text-[--color-textSecondary] mb-3 line-clamp-2">{ticket.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[--color-background] text-[--color-textSecondary] border border-[--color-border]">
                        {ticket.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[--color-textSecondary]">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-[--color-textSecondary]">
                      by {ticket.createdBy.username}
                    </p>
                  </div>
                </div>

                {ticket.adminRemarks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[--color-border]">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={16} className="text-[--color-primary]" />
                      <span className="text-sm font-medium text-[--color-text]">
                        Latest Admin Response ({ticket.adminRemarks.length})
                      </span>
                    </div>
                    <div className="bg-[--color-background] p-3 rounded-lg">
                      <p className="text-sm text-[--color-text]">
                        {ticket.adminRemarks[ticket.adminRemarks.length - 1].remark}
                      </p>
                      <p className="text-xs text-[--color-textSecondary] mt-2">
                        by {ticket.adminRemarks[ticket.adminRemarks.length - 1].by.username} • {new Date(ticket.adminRemarks[ticket.adminRemarks.length - 1].at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowDetailsModal(true);
                        if (!ticket.isRead) {
                          markAsRead(ticket._id);
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-[--color-primary] bg-[--color-background] border border-[--color-border] rounded-lg hover:bg-[--color-surface] transition-colors flex items-center gap-1"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    
                    {user?.role === 'super_admin' && (
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket._id, e.target.value)}
                        className="px-3 py-2 text-sm border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary]"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    )}
                  </div>
                  
                  <div className="text-xs text-[--color-textSecondary]">
                    Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-[--color-primary] text-white'
                        : 'text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] hover:bg-[--color-border]'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[--color-surface] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-[--color-text] mb-6">Raise Help Ticket</h2>
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
                    className="w-full px-4 py-3 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary]"
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
                    className="w-full px-4 py-3 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Detailed description of the issue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[--color-text] mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[--color-text] mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary]"
                    >
                      <option value="technical">Technical Support</option>
                      <option value="system">System Issues</option>
                      <option value="connectivity">Connectivity</option>
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="network">Network</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Important:</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        For technical assistance (MIS, system errors, connectivity issues), submit through this help ticket system.
                        For task-related queries and workflow assistance, please raise objections in the task management interface.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] transition-colors"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[--color-surface] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[--color-text] mb-2">{selectedTicket.title}</h2>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-[--color-textSecondary] hover:text-[--color-text] text-2xl p-1"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Ticket Info */}
                <div className="bg-[--color-background] p-4 rounded-lg">
                  <h3 className="font-medium text-[--color-text] mb-2">Description</h3>
                  <p className="text-[--color-textSecondary]">{selectedTicket.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[--color-textSecondary]">Created by:</span>
                      <span className="ml-2 font-medium text-[--color-text]">{selectedTicket.createdBy.username}</span>
                    </div>
                    <div>
                      <span className="text-[--color-textSecondary]">Created on:</span>
                      <span className="ml-2 font-medium text-[--color-text]">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Remarks */}
                {selectedTicket.adminRemarks.length > 0 && (
                  <div>
                    <h3 className="font-medium text-[--color-text] mb-4">Admin Responses</h3>
                    <div className="space-y-4">
                      {selectedTicket.adminRemarks.map((remark, idx) => (
                        <div key={idx} className="bg-[--color-background] p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-[--color-text]">{remark.by.username}</span>
                            <span className="text-sm text-[--color-textSecondary]">
                              {new Date(remark.at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[--color-textSecondary]">{remark.remark}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Reply Form */}
                {user?.role === 'super_admin' && selectedTicket.status !== 'Closed' && (
                  <form onSubmit={addAdminReply} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[--color-text] mb-2">
                        Add Response
                      </label>
                      <textarea
                        value={replyData.remark}
                        onChange={(e) => setReplyData({ remark: e.target.value })}
                        required
                        rows={3}
                        className="w-full px-4 py-3 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary]"
                        placeholder="Type your response here..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] transition-colors"
                      >
                        Send Response
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedHelpTickets;