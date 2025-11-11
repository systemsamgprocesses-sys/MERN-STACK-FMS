
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Users, TrendingUp, Phone, MapPin, Calendar, Target, Award, Activity } from 'lucide-react';

const SalesDashboard: React.FC = () => {
  const { theme } = useTheme();

  // ⚠️ TEST DATA - This is only test data for demonstration (Real Estate POV)
  const salesMetrics = {
    totalLeads: 234,
    qualifiedLeads: 89,
    hotLeads: 34,
    coldLeads: 111,
    activeChannels: 7,
    closedDeals: 12,
    inNegotiation: 23,
    siteVisitsScheduled: 15,
    conversionRate: '15.2%',
    avgResponseTime: '2.3 hours'
  };

  const channelPerformance = [
    { channel: 'Website', leads: 78, qualified: 34, conversion: '43.6%', color: 'bg-blue-500' },
    { channel: 'Facebook Ads', leads: 56, qualified: 21, conversion: '37.5%', color: 'bg-indigo-500' },
    { channel: 'Instagram', leads: 42, qualified: 15, conversion: '35.7%', color: 'bg-pink-500' },
    { channel: 'Direct Walk-in', leads: 28, qualified: 12, conversion: '42.9%', color: 'bg-green-500' },
    { channel: 'Referrals', leads: 18, qualified: 5, conversion: '27.8%', color: 'bg-purple-500' },
    { channel: 'Google Ads', leads: 8, qualified: 2, conversion: '25.0%', color: 'bg-orange-500' },
    { channel: 'Other', leads: 4, qualified: 0, conversion: '0%', color: 'bg-gray-500' },
  ];

  const recentLeads = [
    { id: 'L-001', name: 'Rajesh Kumar', phone: '+91 98765 43210', source: 'Website', status: 'Hot', property: '3 BHK Apartment', date: '2025-01-11' },
    { id: 'L-002', name: 'Priya Sharma', phone: '+91 98765 43211', source: 'Facebook Ads', status: 'Qualified', property: '2 BHK Flat', date: '2025-01-10' },
    { id: 'L-003', name: 'Amit Patel', phone: '+91 98765 43212', source: 'Referrals', status: 'Cold', property: 'Villa', date: '2025-01-09' },
    { id: 'L-004', name: 'Sneha Reddy', phone: '+91 98765 43213', source: 'Instagram', status: 'Hot', property: 'Penthouse', date: '2025-01-08' },
    { id: 'L-005', name: 'Vikram Singh', phone: '+91 98765 43214', source: 'Direct Walk-in', status: 'Qualified', property: 'Plot', date: '2025-01-07' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hot': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'qualified': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'cold': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={32} className="text-[var(--color-primary)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Sales Dashboard</h1>
          </div>
          <p className="text-[var(--color-textSecondary)] text-sm">
            ⚠️ <strong>TEST DATA ONLY</strong> - This dashboard displays sample real estate sales data for demonstration purposes
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <Activity className="text-green-500" size={20} />
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.totalLeads}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Total Leads</p>
          </div>

          {/* Qualified Leads */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.qualifiedLeads}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Qualified Leads</p>
          </div>

          {/* Hot Leads */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Award className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.hotLeads}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Hot Leads</p>
          </div>

          {/* Cold Leads */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Phone className="text-cyan-600 dark:text-cyan-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.coldLeads}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Cold Leads</p>
          </div>

          {/* Active Channels */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.activeChannels}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Active Channels</p>
          </div>

          {/* Closed Deals */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Award className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.closedDeals}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Closed Deals</p>
          </div>

          {/* In Negotiation */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Calendar className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.inNegotiation}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">In Negotiation</p>
          </div>

          {/* Site Visits Scheduled */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <MapPin className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{salesMetrics.siteVisitsScheduled}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Site Visits Scheduled</p>
          </div>
        </div>

        {/* Channel Performance */}
        <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">Channel Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Channel</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Total Leads</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Qualified</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Conversion</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Performance</th>
                </tr>
              </thead>
              <tbody>
                {channelPerformance.map((channel) => (
                  <tr key={channel.channel} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                    <td className="py-3 px-2 text-sm font-medium text-[var(--color-text)]">{channel.channel}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{channel.leads}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{channel.qualified}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{channel.conversion}</td>
                    <td className="py-3 px-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`${channel.color} h-2 rounded-full`}
                          style={{ width: channel.conversion }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">Recent Leads</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Lead ID</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Name</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Phone</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Source</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Property Interest</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                    <td className="py-3 px-2 text-sm font-medium text-[var(--color-text)]">{lead.id}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{lead.name}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{lead.phone}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{lead.source}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{lead.property}</td>
                    <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{lead.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
