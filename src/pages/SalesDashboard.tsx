
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Users, TrendingUp, Phone, Mail, MapPin, CheckCircle, Clock, XCircle } from 'lucide-react';

const SalesDashboard: React.FC = () => {
  const { theme } = useTheme();

  // TEST DATA - This is only test data for demonstration (Real Estate POV)
  const salesMetrics = {
    totalLeads: 234,
    qualifiedLeads: 89,
    hotLeads: 34,
    coldLeads: 111,
    activeChannels: 7,
    closedDeals: 12,
    inNegotiation: 23,
    siteVisitsScheduled: 15
  };

  const channelPerformance = [
    { channel: 'Website', leads: 78, qualified: 34, conversion: '43.6%' },
    { channel: 'Facebook Ads', leads: 56, qualified: 21, conversion: '37.5%' },
    { channel: 'Instagram', leads: 42, qualified: 15, conversion: '35.7%' },
    { channel: 'Direct Walk-in', leads: 28, qualified: 12, conversion: '42.9%' },
    { channel: 'Referrals', leads: 18, qualified: 5, conversion: '27.8%' },
    { channel: 'Google Ads', leads: 8, qualified: 2, conversion: '25.0%' },
    { channel: 'Other', leads: 4, qualified: 0, conversion: '0%' },
  ];

  const recentLeads = [
    { id: 'L-001', name: 'Rajesh Kumar', phone: '+91 98765 43210', source: 'Website', status: 'Hot', property: '3 BHK Apartment', date: '2025-01-11' },
    { id: 'L-002', name: 'Priya Sharma', phone: '+91 98765 43211', source: 'Facebook Ads', status: 'Qualified', property: '2 BHK Flat', date: '2025-01-10' },
    { id: 'L-003', name: 'Amit Patel', phone: '+91 98765 43212', source: 'Referrals', status: 'Cold', property: 'Villa', date: '2025-01-09' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hot': return 'text-red-600 bg-red-100';
      case 'qualified': return 'text-green-600 bg-green-100';
      case 'cold': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Sales Dashboard (Real Estate)
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-error)' }}>
              ⚠️ This is only test data for demonstration purposes
            </p>
          </div>
        </div>

        {/* Lead Metrics */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Lead Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Users size={24} style={{ color: 'var(--color-primary)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.totalLeads}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Total Leads</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.qualifiedLeads}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Qualified Leads</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={24} style={{ color: 'var(--color-error)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.hotLeads}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Hot Leads</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Phone size={24} style={{ color: 'var(--color-accent)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.activeChannels}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Active Channels</p>
            </div>
          </div>
        </div>

        {/* Deal Metrics */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Deal Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.closedDeals}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Closed Deals</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.inNegotiation}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>In Negotiation</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <MapPin size={24} style={{ color: 'var(--color-primary)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{salesMetrics.siteVisitsScheduled}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Site Visits Scheduled</p>
            </div>
          </div>
        </div>

        {/* Channel Performance */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Channel Performance
          </h2>
          <div className="overflow-x-auto rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <table className="w-full">
              <thead className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Channel</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Total Leads</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Qualified</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {channelPerformance.map((channel) => (
                  <tr key={channel.channel} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text)' }}>{channel.channel}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{channel.leads}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{channel.qualified}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                        {channel.conversion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Leads */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Recent Leads
          </h2>
          <div className="overflow-x-auto rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <table className="w-full">
              <thead className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Lead ID</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Name</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Phone</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Source</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Property Interest</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Status</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text)' }}>{lead.id}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{lead.name}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{lead.phone}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{lead.source}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{lead.property}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{lead.date}</td>
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
