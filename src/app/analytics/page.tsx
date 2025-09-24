'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Clock,
  ExternalLink,
  Target,
  Megaphone,
  Users,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface MetaAdsData {
  summary: {
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    totalSpend: number;
    totalPurchases: number;
    totalRevenue: number;
    avgCTR: number;
    avgROAS: number;
  };
  ads: Array<{
    adName: string;
    campaignName: string;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    spend: number;
    purchases: number;
    revenue: number;
    roas: number;
  }>;
}

interface LandingPageData {
  sessions: number;
  bounceRate: number;
  avgTimeOnPage: number;
  exitIntent: number;
  buttonClicks: {
    [key: string]: number;
  };
  topButtons: Array<{
    name: string;
    location: string;
    clicks: number;
  }>;
}

interface ShopifyData {
  addToCarts: number;
  productViews: number;
  checkouts: number;
  sales: number;
  revenue: number;
  avgScrollDepth: number;
  topProducts: Array<{
    name: string;
    views: number;
    addToCarts: number;
  }>;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899'
};

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  prefix = '',
  suffix = ''
}: {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down';
  icon: React.ComponentType<any>;
  prefix?: string;
  suffix?: string;
}) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        {change !== undefined && trend && (
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full bg-${trend === 'up' ? 'green' : 'blue'}-100`}>
        <Icon className={`h-6 w-6 text-${trend === 'up' ? 'green' : 'blue'}-600`} />
      </div>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [metaData, setMetaData] = useState<MetaAdsData | null>(null);
  const [landingPageData, setLandingPageData] = useState<LandingPageData | null>(null);
  const [shopifyData, setShopifyData] = useState<ShopifyData | null>(null);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [metaRes, landingRes, shopifyRes] = await Promise.all([
        fetch(`/api/meta/ads?timeRange=${timeRange}`),
        fetch(`/api/analytics/landing-page?timeRange=${timeRange}`),
        fetch(`/api/analytics/shopify?timeRange=${timeRange}`)
      ]);

      if (metaRes.ok) setMetaData(await metaRes.json());
      if (landingRes.ok) setLandingPageData(await landingRes.json());
      if (shopifyRes.ok) setShopifyData(await shopifyRes.json());
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Attribution Analytics</h1>
        <p className="text-gray-600 mt-2">End-to-end performance tracking from ads to conversion</p>

        <div className="mt-4 flex gap-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Meta Ads Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Meta Ads Performance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Impressions"
            value={metaData?.summary.totalImpressions || 0}
            icon={Eye}
            trend="up"
          />
          <MetricCard
            title="Reach"
            value={metaData?.summary.totalReach || 0}
            icon={Users}
            trend="up"
          />
          <MetricCard
            title="Clicks"
            value={metaData?.summary.totalClicks || 0}
            icon={MousePointer}
            trend="up"
          />
          <MetricCard
            title="CTR"
            value={(metaData?.summary.avgCTR || 0).toFixed(2)}
            suffix="%"
            icon={Target}
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ad Performance</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {metaData?.ads.map((ad, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{ad.adName}</p>
                      <p className="text-sm text-gray-500">{ad.campaignName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${ad.spend.toFixed(2)}</p>
                      <p className="text-sm text-green-600">ROAS: {ad.roas.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">{ad.impressions.toLocaleString()}</p>
                      <p className="text-xs">Impressions</p>
                    </div>
                    <div>
                      <p className="font-medium">{ad.clicks.toLocaleString()}</p>
                      <p className="text-xs">Clicks</p>
                    </div>
                    <div>
                      <p className="font-medium">{ad.ctr.toFixed(2)}%</p>
                      <p className="text-xs">CTR</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Spend vs Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metaData?.ads || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="adName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="spend" fill={COLORS.danger} name="Spend" />
                <Bar dataKey="revenue" fill={COLORS.success} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Landing Page Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Landing Page Analytics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Sessions"
            value={landingPageData?.sessions || 0}
            icon={Users}
            trend="up"
          />
          <MetricCard
            title="Avg Time on Page"
            value={Math.floor((landingPageData?.avgTimeOnPage || 0) / 60)}
            suffix="m"
            icon={Clock}
            trend="up"
          />
          <MetricCard
            title="Bounce Rate"
            value={(landingPageData?.bounceRate || 0).toFixed(1)}
            suffix="%"
            icon={ExternalLink}
            trend="down"
          />
          <MetricCard
            title="Exit Intent"
            value={landingPageData?.exitIntent || 0}
            icon={Target}
            trend="down"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Button Clicks</h3>
          <div className="space-y-3">
            {landingPageData?.topButtons.map((button, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{button.name}</p>
                  <p className="text-sm text-gray-500">{button.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{button.clicks}</p>
                  <p className="text-xs text-gray-500">clicks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shopify Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Shopify Store Performance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Product Views"
            value={shopifyData?.productViews || 0}
            icon={Eye}
            trend="up"
          />
          <MetricCard
            title="Add to Carts"
            value={shopifyData?.addToCarts || 0}
            icon={ShoppingCart}
            trend="up"
          />
          <MetricCard
            title="Sales"
            value={shopifyData?.sales || 0}
            icon={DollarSign}
            trend="up"
          />
          <MetricCard
            title="Revenue"
            value={shopifyData?.revenue || 0}
            prefix="$"
            icon={DollarSign}
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Products</h3>
            <div className="space-y-4">
              {shopifyData?.topProducts.map((product, idx) => (
                <div key={idx} className="border-b pb-3 last:border-0">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <div className="flex gap-6 mt-2 text-sm text-gray-600">
                    <div>
                      <span className="font-semibold">{product.views}</span> views
                    </div>
                    <div>
                      <span className="font-semibold">{product.addToCarts}</span> add to carts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { step: 'Product Views', value: shopifyData?.productViews || 0 },
                { step: 'Add to Cart', value: shopifyData?.addToCarts || 0 },
                { step: 'Checkouts', value: shopifyData?.checkouts || 0 },
                { step: 'Sales', value: shopifyData?.sales || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}