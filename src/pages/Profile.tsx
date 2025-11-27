import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { address } from '../../utils/ipAddress';
import {
  Camera,
  Shield,
  User as UserIcon,
  Save,
  Loader2,
  Phone,
  Mail,
  Lock,
  Activity,
  Users
} from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/dateFormat';

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  profilePicture?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AdjustmentLog {
  _id: string;
  adjustmentType: string;
  description: string;
  timestamp: string;
  adjustedBy?: { username: string };
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [formState, setFormState] = useState({ username: '', email: '', phoneNumber: '' });
  const [roleState, setRoleState] = useState('');
  const [statusState, setStatusState] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [usersList, setUsersList] = useState<ProfileUser[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [logs, setLogs] = useState<AdjustmentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const actingOnSelf = useMemo(() => selectedUserId === user?.id, [selectedUserId, user]);

  const buildAvatarUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${address}${normalized}`;
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsersList();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedUserId || user?.id) {
      fetchProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    if (user && !selectedUserId) {
      setSelectedUserId(user.id);
    }
  }, [user, selectedUserId]);

  const fetchUsersList = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      const normalized = (response.data || []).map((u: any) => ({
        id: u._id || u.id,
        username: u.username,
        email: u.email,
        role: u.role
      }));
      setUsersList(normalized);
    } catch (error) {
      console.error('Error fetching users list:', error);
    }
  };

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      setLoadingProfile(true);
      setStatusMessage(null);
      const endpoint =
        selectedUserId && user?.id && selectedUserId !== user.id
          ? `${address}/api/users/profile/${selectedUserId}`
          : `${address}/api/users/profile`;
      const response = await axios.get(endpoint);
      const profileUser: ProfileUser = response.data.user || response.data;
      const normalizedProfile: ProfileUser = {
        ...profileUser,
        id: profileUser.id || (profileUser as any)?._id || selectedUserId || user?.id || ''
      };
      setProfile(normalizedProfile);
      setFormState({
        username: normalizedProfile.username || '',
        email: normalizedProfile.email || '',
        phoneNumber: normalizedProfile.phoneNumber || ''
      });
      setRoleState(normalizedProfile.role);
      setStatusState(normalizedProfile.isActive !== false);
      setAvatarPreview(normalizedProfile.profilePicture ? `${address}${normalizedProfile.profilePicture}` : null);
      fetchLogs(normalizedProfile.id);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setStatusMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load profile.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchLogs = async (targetId?: string) => {
    if (!targetId) return;
    try {
      setLogsLoading(true);
      const response = await axios.get(`${address}/api/adjustment-logs/user/${targetId}?limit=10`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching adjustment logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async () => {
    if (!profile) return;
    try {
      setSavingProfile(true);
      setStatusMessage(null);
      const formData = new FormData();
      formData.append('username', formState.username);
      formData.append('email', formState.email);
      formData.append('phoneNumber', formState.phoneNumber || '');
      if (isSuperAdmin) {
        formData.append('isActive', statusState ? 'true' : 'false');
        if (!actingOnSelf) {
          formData.append('role', roleState);
        }
      }
      if (avatarFile) {
        formData.append('profilePicture', avatarFile);
      }

      const endpoint =
        selectedUserId && !actingOnSelf
          ? `${address}/api/users/profile/${selectedUserId}`
          : `${address}/api/users/profile`;

      const response = await axios.put(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedProfile: ProfileUser = response.data.user;
      const normalizedUpdated: ProfileUser = {
        ...updatedProfile,
        id: updatedProfile.id || (updatedProfile as any)?._id || selectedUserId
      };
      setProfile(normalizedUpdated);
      setFormState({
        username: normalizedUpdated.username || '',
        email: normalizedUpdated.email || '',
        phoneNumber: normalizedUpdated.phoneNumber || ''
      });
      setRoleState(normalizedUpdated.role);
      setStatusState(normalizedUpdated.isActive !== false);
      setAvatarFile(null);
      setAvatarPreview(normalizedUpdated.profilePicture ? `${address}${normalizedUpdated.profilePicture}` : null);
      setStatusMessage({ type: 'success', text: 'Profile updated successfully.' });
      fetchLogs(normalizedUpdated.id);

      if (actingOnSelf) {
        updateUser({
          username: normalizedUpdated.username,
          email: normalizedUpdated.email,
          phoneNumber: normalizedUpdated.phoneNumber,
          profilePicture: normalizedUpdated.profilePicture,
          role: normalizedUpdated.role
        });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setStatusMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    try {
      setChangingPassword(true);
      setPasswordStatus(null);
      await axios.put(`${address}/api/users/${selectedUserId}/password`, {
        password: passwordForm.newPassword
      });
      setPasswordStatus({ type: 'success', text: 'Password updated successfully.' });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      fetchLogs(selectedUserId);
    } catch (error: any) {
      console.error('Password update error:', error);
      setPasswordStatus({ type: 'error', text: error.response?.data?.message || 'Failed to update password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const fullAvatar = avatarPreview || buildAvatarUrl(profile?.profilePicture);

  const renderAvatar = () => {
    if (fullAvatar) {
      return <img src={fullAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />;
    }
    const fallbackInitial = profile?.username?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?';
    return (
      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow">
        {fallbackInitial}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--color-background]">
        <Loader2 className="animate-spin text-[--color-primary]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <UserIcon className="text-[--color-primary]" />
              Profile & Preferences
            </h1>
            <p className="text-[--color-textSecondary] mt-1">
              Manage your personal information, security settings, and account activity.
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[--color-textSecondary] flex items-center gap-2">
                <Users size={14} />
                Acting on behalf of
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-surface] text-[--color-text]"
              >
                {(usersList.length
                  ? usersList
                  : user
                    ? [{ id: user.id, username: user.username, role: user.role }]
                    : []
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[--color-surface] rounded-2xl border border-[--color-border] p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {renderAvatar()}
                  <label className="absolute bottom-0 right-0 bg-[--color-primary] text-white rounded-full p-2 cursor-pointer shadow">
                    <Camera size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>
                <h2 className="text-xl font-semibold text-[--color-text] mt-4">{profile?.username}</h2>
                <p className="text-sm text-[--color-textSecondary] capitalize">{profile?.role}</p>
                <p className="text-sm text-[--color-textSecondary] mt-2">{profile?.email}</p>
                {profile?.phoneNumber && (
                  <p className="text-sm text-[--color-textSecondary]">{profile.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="bg-[--color-surface] rounded-2xl border border-[--color-border] p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="text-[--color-primary]" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[--color-text]">Role</p>
                  <p className="text-xs text-[--color-textSecondary] capitalize">{profile?.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="text-[--color-primary]" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[--color-text]">Status</p>
                  <p className="text-xs text-[--color-textSecondary]">{profile?.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
              {profile?.createdAt && (
                <div className="text-xs text-[--color-textSecondary]">
                  Member since {formatDate(profile.createdAt)}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[--color-surface] rounded-2xl border border-[--color-border] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[--color-text]">Personal Information</h3>
                  <p className="text-sm text-[--color-textSecondary]">
                    Update your basic information and contact details.
                  </p>
                </div>
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile || loadingProfile}
                  className="px-4 py-2 rounded-lg bg-[--color-primary] text-white font-semibold hover:bg-[--color-primary-dark] disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>

              {loadingProfile ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-[--color-primary]" size={28} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[--color-text] mb-1 flex items-center gap-2">
                      <UserIcon size={14} />
                      Username
                    </label>
                    <input
                      type="text"
                      value={formState.username}
                      onChange={(e) => setFormState((prev) => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[--color-text] mb-1 flex items-center gap-2">
                      <Mail size={14} />
                      Email
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[--color-text] mb-1 flex items-center gap-2">
                      <Phone size={14} />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formState.phoneNumber}
                      onChange={(e) => setFormState((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                    />
                  </div>
                  {isSuperAdmin && !actingOnSelf && (
                    <div>
                      <label className="text-sm font-medium text-[--color-text] mb-1">Role</label>
                      <select
                        value={roleState}
                        onChange={(e) => setRoleState(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                      >
                        {['superadmin', 'admin', 'manager', 'pc', 'employee'].map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {roleOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isSuperAdmin && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[--color-text]">Account Status</span>
                      <button
                        type="button"
                        onClick={() => setStatusState((prev) => !prev)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusState ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {statusState ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[--color-surface] rounded-2xl border border-[--color-border] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[--color-text]">Security</h3>
                  <p className="text-sm text-[--color-textSecondary]">Update the password associated with this account.</p>
                </div>
                <Lock className="text-[--color-primary]" />
              </div>
              {passwordStatus && (
                <div
                  className={`p-3 rounded-lg text-sm ${passwordStatus.type === 'success'
                    ? 'bg-green-50 border border-green-100 text-green-700'
                    : 'bg-red-50 border border-red-100 text-red-700'
                    }`}
                >
                  {passwordStatus.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[--color-text] mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[--color-text] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-[--color-border] bg-[--color-background]"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !passwordForm.newPassword}
                className="px-4 py-2 rounded-lg bg-[--color-primary] text-white font-semibold hover:bg-[--color-primary-dark] disabled:opacity-50 flex items-center gap-2 w-fit"
              >
                {changingPassword ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Update Password
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[--color-surface] rounded-2xl border border-[--color-border] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[--color-text]">Recent Profile Activity</h3>
            <span className="text-xs text-[--color-textSecondary]">
              Changes are logged with timestamps for accountability.
            </span>
          </div>
          {logsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-[--color-primary]" size={24} />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[--color-textSecondary]">No recent adjustments recorded.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="p-3 rounded-lg border border-[--color-border] bg-[--color-background]">
                  <p className="text-sm text-[--color-text]">{log.description}</p>
                  <div className="text-xs text-[--color-textSecondary] flex items-center justify-between mt-1">
                    <span>{formatDateTime(log.timestamp)}</span>
                    <span>By {log.adjustedBy?.username || 'System'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

