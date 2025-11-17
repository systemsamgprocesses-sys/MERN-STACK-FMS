import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Upload, User as UserIcon } from 'lucide-react';

interface ComplaintUser {
  _id: string;
  username: string;
  email?: string;
}

interface ComplaintAttachment {
  filename: string;
  originalName: string;
  path: string;
}

interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  submittedBy: ComplaintUser;
  raisedBy?: ComplaintUser; // Backward compatibility
  againstUser?: ComplaintUser;
  taggedUsers?: ComplaintUser[];
  attachments: ComplaintAttachment[];
  createdAt: string;
  resolution?: string;
  resolvedBy?: ComplaintUser;
  resolvedAt?: string;
}

const Complaints: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'raise' | 'mine' | 'inbox' | 'all'>('raise');
  const [users, setUsers] = useState<ComplaintUser[]>([]);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    againstUserId: '',
    taggedUserIds: [] as string[],
  });

  const canViewAll = !!user && (user.role === 'superadmin' || user.permissions?.canViewAllComplaints);
  const canResolve =
    !!user &&
    (['admin', 'superadmin'].includes(user.role) || user.permissions?.canResolveComplaints);

  useEffect(() => {
    fetchUsers();
    fetchComplaints('raised');
    fetchComplaints('assigned');
    if (canViewAll) {
      fetchComplaints('all');
    }
  }, [canViewAll]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchComplaints = async (scope: 'raised' | 'assigned' | 'all') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/complaints?scope=${scope}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      // Server returns complaints directly as array, not wrapped
      const complaints = Array.isArray(response.data) ? response.data : (response.data?.complaints || []);
      if (scope === 'raised') setMyComplaints(complaints);
      if (scope === 'assigned') setAssignedComplaints(complaints);
      if (scope === 'all') setAllComplaints(complaints);
    } catch (error) {
      console.error(`Error fetching ${scope} complaints:`, error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagSelection = (userId: string) => {
    setFormData((prev) => {
      const alreadySelected = prev.taggedUserIds.includes(userId);
      return {
        ...prev,
        taggedUserIds: alreadySelected
          ? prev.taggedUserIds.filter((id) => id !== userId)
          : [...prev.taggedUserIds, userId]
      };
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      againstUserId: '',
      taggedUserIds: []
    });
    setAttachments(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please provide both title and description.');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('title', formData.title.trim());
      payload.append('description', formData.description.trim());
      payload.append('category', formData.category);
      payload.append('priority', formData.priority);
      if (formData.againstUserId) payload.append('againstUserId', formData.againstUserId);
      if (formData.taggedUserIds.length > 0) {
        payload.append('taggedUserIds', JSON.stringify(formData.taggedUserIds));
      }
      if (attachments) {
        Array.from(attachments).forEach((file) => payload.append('attachments', file));
      }
      const token = localStorage.getItem('token');
      await axios.post(`${address}/api/complaints`, payload, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Complaint raised successfully');
      resetForm();
      fetchComplaints('raised');
    } catch (error) {
      console.error('Error creating complaint:', error);
      alert(error instanceof Error ? error.message : 'Failed to raise complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (complaintId: string, status: 'resolved' | 'rejected') => {
    const remarks = resolutionRemarks[complaintId] || '';
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${address}/api/complaints/${complaintId}/status`,
        { status, resolutionRemarks: remarks },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      fetchComplaints('assigned');
      if (canViewAll) fetchComplaints('all');
      alert(`Complaint ${status}`);
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('Failed to update complaint status');
    } finally {
      setLoading(false);
    }
  };

  const renderComplaintCard = (complaint: Complaint) => {
    const canAct =
      canResolve ||
      complaint.againstUser?._id === user?.id ||
      complaint.taggedUsers?.some((tagged) => tagged._id === user?.id);

    // Use submittedBy or fallback to raisedBy for backward compatibility
    const submitter = complaint.submittedBy || complaint.raisedBy;

    return (
      <div key={complaint._id} className="bg-[--color-surface] rounded-xl p-4 border border-[--color-border] space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-[--color-text]">{complaint.title}</h3>
            <p className="text-sm text-[--color-textSecondary]">{complaint.category} • {complaint.priority}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-[--color-border] text-[--color-textSecondary] uppercase">
            {complaint.status}
          </span>
        </div>
        <p className="text-sm text-[--color-textSecondary]">{complaint.description}</p>
        <div className="text-sm text-[--color-textSecondary] space-y-1">
          <div className="flex items-center gap-2">
            <UserIcon size={14} />
            Raised by {submitter?.username || 'Unknown'} on {new Date(complaint.createdAt).toLocaleDateString()}
          </div>
          {complaint.againstUser && (
            <div>Tagged User: {complaint.againstUser.username}</div>
          )}
          {complaint.taggedUsers && complaint.taggedUsers.length > 0 && (
            <div>
              CC: {complaint.taggedUsers.map((u) => u.username).join(', ')}
            </div>
          )}
        </div>
        {complaint.attachments?.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-[--color-text]">Attachments:</span>
            <ul className="list-disc ml-5 text-[--color-textSecondary]">
              {complaint.attachments.map((file) => (
                <li key={file.filename}>
                  <a
                    href={`${address}${file.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[--color-primary] underline"
                  >
                    {file.originalName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {complaint.resolution && (
          <div className="text-sm text-[--color-textSecondary]">
            Resolution Remarks: {complaint.resolution}
          </div>
        )}
        {complaint.resolvedBy && (
          <div className="text-sm text-[--color-textSecondary]">
            Resolved by {complaint.resolvedBy.username}{' '}
            {complaint.resolvedAt && `on ${new Date(complaint.resolvedAt).toLocaleDateString()}`}
          </div>
        )}
        {canAct && complaint.status === 'open' && (
          <div className="space-y-2">
            <textarea
              value={resolutionRemarks[complaint._id] || ''}
              onChange={(e) =>
                setResolutionRemarks((prev) => ({
                  ...prev,
                  [complaint._id]: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              placeholder="Add resolution remarks"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(complaint._id, 'resolved')}
                className="flex-1 px-4 py-2 bg-[--color-success] text-white rounded-lg"
                disabled={loading}
              >
                Resolve
              </button>
              <button
                onClick={() => handleStatusChange(complaint._id, 'rejected')}
                className="flex-1 px-4 py-2 bg-[--color-error] text-white rounded-lg"
                disabled={loading}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderList = (items: Complaint[]) => {
    if (!items.length) {
      return (
        <div className="text-center py-12 text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-xl">
          No complaints to show
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map(renderComplaintCard)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <MessageSquare className="text-[--color-primary]" />
              Complaints
            </h1>
            <p className="text-[--color-textSecondary]">Raise and track complaints across the organization</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('raise')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'raise' ? 'bg-[--color-primary] text-white' : 'bg-[--color-surface] text-[--color-text]'}`}
            >
              Raise
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'mine' ? 'bg-[--color-primary] text-white' : 'bg-[--color-surface] text-[--color-text]'}`}
            >
              My Complaints
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'inbox' ? 'bg-[--color-primary] text-white' : 'bg-[--color-surface] text-[--color-text]'}`}
            >
              Routed To Me
            </button>
            {canViewAll && (
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'all' ? 'bg-[--color-primary] text-white' : 'bg-[--color-surface] text-[--color-text]'}`}
              >
                All Complaints
              </button>
            )}
          </div>
        </div>

        {activeTab === 'raise' && (
          <form onSubmit={handleSubmit} className="bg-[--color-surface] rounded-xl border border-[--color-border] p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[--color-text] mb-1 block">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[--color-text] mb-1 block">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[--color-text] mb-1 block">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[--color-text] mb-1 block">Tag User</label>
                <select
                  name="againstUserId"
                  value={formData.againstUserId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="">Select user (optional)</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[--color-text] mb-1 block">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[--color-text] mb-1 block">CC Users</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-[--color-border] rounded-lg p-3">
                {users.map((u) => (
                  <label key={u._id} className="flex items-center gap-2 text-sm text-[--color-text]">
                    <input
                      type="checkbox"
                      checked={formData.taggedUserIds.includes(u._id)}
                      onChange={() => handleTagSelection(u._id)}
                    />
                    {u.username}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[--color-text] mb-1 block flex items-center gap-2">
                <Upload size={16} />
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setAttachments(e.target.files)}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Raise Complaint'}
            </button>
          </form>
        )}

        {activeTab === 'mine' && renderList(myComplaints)}
        {activeTab === 'inbox' && renderList(assignedComplaints)}
        {activeTab === 'all' && canViewAll && renderList(allComplaints)}
      </div>
    </div>
  );
};

export default Complaints;

