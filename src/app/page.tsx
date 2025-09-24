'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MousePointer,
  ShoppingCart,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  overview: {
    totalSessions: { value: number; change: number; trend: 'up' | 'down' };
    uniqueVisitors: { value: number; change: number; trend: 'up' | 'down' };
    conversions: { value: number; change: number; trend: 'up' | 'down' };
    revenue: { value: number; change: number; trend: 'up' | 'down' };
  };
  funnel: Array<{
    step: string;
    visitors: number;
    conversionRate: number;
  }>;
  attribution: Array<{
    channel: string;
    sessions: number;
    conversions: number;
    revenue: number;
    roas: number;
  }>;
  timeline: Array<{
    date: string;
    sessions: number;
    conversions: number;
    revenue: number;
  }>;
  recentSessions: Array<{
    id: string;
    timestamp: string;
    source: string;
    medium: string;
    campaign: string;
    converted: boolean;
    value: number;
  }>;
}

const CHANNEL_COLORS = {
  facebook: '#1877f2',
  google: '#4285f4',
  email: '#7c3aed',
  organic: '#10b981',
  direct: '#6b7280',
  other: '#f59e0b'
};

const MetricCard = ({ title, value, change, trend, icon: Icon, prefix = '', suffix = '' }: {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ComponentType<any>;
  prefix?: string;
  suffix?: string;
}) => (
  <div className="metric-card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
      </div>
      <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100' : 'bg-red-100'}`}>
        <Icon className={`h-6 w-6 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
      </div>
    </div>
    <div className="mt-4 flex items-center">
      {trend === 'up' ? (
        <TrendingUp className="h-4 w-4 text-green-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      )}
      <span className={`ml-1 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {Math.abs(change)}%
      </span>
      <span className="ml-1 text-sm text-gray-500">vs last period</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchDashboardData = async () => {
    if (!loading) setRefreshing(true);

    try {
      const response = await fetch(`/api/dashboard?timeRange=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load dashboard data. Please try again.</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attribution Analytics</h1>
              <p className="text-sm text-gray-600">Complete funnel visibility and conversion tracking</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <button
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Sessions"
            value={data.overview.totalSessions.value}
            change={data.overview.totalSessions.change}
            trend={data.overview.totalSessions.trend}
            icon={Users}
          />
          <MetricCard
            title="Unique Visitors"
            value={data.overview.uniqueVisitors.value}
            change={data.overview.uniqueVisitors.change}
            trend={data.overview.uniqueVisitors.trend}
            icon={Eye}
          />
          <MetricCard
            title="Conversions"
            value={data.overview.conversions.value}
            change={data.overview.conversions.change}
            trend={data.overview.conversions.trend}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Revenue"
            value={data.overview.revenue.value}
            change={data.overview.revenue.change}
            trend={data.overview.revenue.trend}
            icon={DollarSign}
            prefix="$"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.funnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visitors" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attribution by Channel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.attribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, sessions }) => `${channel}: ${sessions}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sessions"
                >
                  {data.attribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHANNEL_COLORS[entry.channel.toLowerCase() as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.other}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
            <div className="space-y-4">
              {data.attribution.map((channel) => (
                <div key={channel.channel} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: CHANNEL_COLORS[channel.channel.toLowerCase() as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.other }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{channel.channel}</p>
                      <p className="text-sm text-gray-600">{channel.sessions} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${channel.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">ROAS: {channel.roas.toFixed(2)}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
            <span className="text-sm text-gray-500">Live updates</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Timestamp</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Campaign</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      {new Date(session.timestamp).toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <span className={`channel-badge channel-${session.source.toLowerCase()}`}>
                        {session.source}
                      </span>
                    </td>
                    <td className="table-cell">{session.campaign}</td>
                    <td className="table-cell">
                      <span className={`status-indicator ${session.converted ? 'status-online' : 'status-warning'}`}>
                        {session.converted ? 'Converted' : 'In Progress'}
                      </span>
                    </td>
                    <td className="table-cell">${session.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}