import { NextRequest, NextResponse } from 'next/server';

const META_API_VERSION = 'v18.0';
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '597303946485375';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

export async function GET(request: NextRequest) {
  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Meta access token not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';

    const datePreset = timeRange === '24h' ? 'today' :
                       timeRange === '7d' ? 'last_7d' :
                       timeRange === '30d' ? 'last_30d' : 'last_7d';

    const fields = [
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',
      'impressions',
      'reach',
      'clicks',
      'ctr',
      'spend',
      'actions',
      'action_values',
      'cost_per_action_type'
    ].join(',');

    const url = `https://graph.facebook.com/${META_API_VERSION}/act_${AD_ACCOUNT_ID}/insights?` +
      `fields=${fields}&` +
      `date_preset=${datePreset}&` +
      `level=ad&` +
      `access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      console.error('Meta API error:', error);
      return NextResponse.json({
        error: 'Failed to fetch Meta ads data',
        details: error
      }, { status: response.status });
    }

    const data = await response.json();

    const adsData = data.data?.map((ad: any) => {
      const purchases = ad.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const purchaseValue = ad.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const cpa = ad.cost_per_action_type?.find((a: any) => a.action_type === 'purchase')?.value || 0;

      return {
        campaignId: ad.campaign_id,
        campaignName: ad.campaign_name,
        adsetId: ad.adset_id,
        adsetName: ad.adset_name,
        adId: ad.ad_id,
        adName: ad.ad_name,
        impressions: parseInt(ad.impressions || 0),
        reach: parseInt(ad.reach || 0),
        clicks: parseInt(ad.clicks || 0),
        ctr: parseFloat(ad.ctr || 0),
        spend: parseFloat(ad.spend || 0),
        purchases: parseInt(purchases),
        revenue: parseFloat(purchaseValue),
        cpa: parseFloat(cpa),
        roas: parseFloat(ad.spend) > 0 ? parseFloat(purchaseValue) / parseFloat(ad.spend) : 0
      };
    }) || [];

    const summary = {
      totalImpressions: adsData.reduce((sum: number, ad: any) => sum + ad.impressions, 0),
      totalReach: adsData.reduce((sum: number, ad: any) => sum + ad.reach, 0),
      totalClicks: adsData.reduce((sum: number, ad: any) => sum + ad.clicks, 0),
      totalSpend: adsData.reduce((sum: number, ad: any) => sum + ad.spend, 0),
      totalPurchases: adsData.reduce((sum: number, ad: any) => sum + ad.purchases, 0),
      totalRevenue: adsData.reduce((sum: number, ad: any) => sum + ad.revenue, 0),
      avgCTR: adsData.length > 0 ? adsData.reduce((sum: number, ad: any) => sum + ad.ctr, 0) / adsData.length : 0,
      avgROAS: adsData.length > 0 ? adsData.reduce((sum: number, ad: any) => sum + ad.roas, 0) / adsData.length : 0
    };

    return NextResponse.json({
      success: true,
      summary,
      ads: adsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Meta ads API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Meta ads data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}