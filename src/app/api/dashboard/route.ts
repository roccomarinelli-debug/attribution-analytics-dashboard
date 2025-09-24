import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Fetch overview metrics
    const overview = await getOverviewMetrics(startDate, endDate);

    // Fetch funnel data
    const funnel = await getFunnelData(startDate, endDate);

    // Fetch attribution data
    const attribution = await getAttributionData(startDate, endDate);

    // Fetch real-time data
    const realTime = await getRealTimeData();

    // Fetch performance data
    const performance = await getPerformanceData(startDate, endDate);

    // Generate timeline data (mock for now)
    const timeline = generateTimelineData(startDate, endDate);

    // Get recent sessions from database
    const recentSessions = await generateRecentSessions();

    const dashboardData = {
      overview,
      funnel,
      attribution,
      timeline,
      recentSessions,
      realTime,
      performance,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getOverviewMetrics(startDate: Date, endDate: Date) {
  // Get total sessions
  const totalSessions = await prisma.session.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get total conversions
  const totalConversions = await prisma.conversion.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get total revenue
  const revenueResult = await prisma.conversion.aggregate({
    _sum: {
      totalValue: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRevenue = revenueResult._sum.totalValue || 0;

  // Get today's metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sessionsToday = await prisma.session.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const conversionsToday = await prisma.conversion.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const revenueTodayResult = await prisma.conversion.aggregate({
    _sum: {
      totalValue: true,
    },
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const revenueToday = revenueTodayResult._sum.totalValue || 0;

  // Calculate derived metrics
  const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;
  const avgOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  // Calculate trends (mock data for now since we don't have historical comparison)
  const sessionsTrend = Math.random() > 0.5 ? 'up' : 'down';
  const conversionsTrend = Math.random() > 0.5 ? 'up' : 'down';
  const revenueTrend = Math.random() > 0.5 ? 'up' : 'down';

  const sessionsChange = Math.floor(Math.random() * 20) + 1;
  const conversionsChange = Math.floor(Math.random() * 15) + 1;
  const revenueChange = Math.floor(Math.random() * 25) + 1;

  // Get unique visitors (approximate from sessions for now)
  const uniqueVisitors = Math.floor(totalSessions * 0.8);

  return {
    totalSessions: {
      value: totalSessions,
      change: sessionsChange,
      trend: sessionsTrend
    },
    uniqueVisitors: {
      value: uniqueVisitors,
      change: sessionsChange - 2,
      trend: sessionsTrend
    },
    conversions: {
      value: totalConversions,
      change: conversionsChange,
      trend: conversionsTrend
    },
    revenue: {
      value: totalRevenue,
      change: revenueChange,
      trend: revenueTrend
    }
  };
}

async function getFunnelData(startDate: Date, endDate: Date) {
  // Define funnel steps
  const steps = [
    { name: 'Landing Page Views', eventPattern: 'page_view' },
    { name: 'Product Views', eventPattern: 'product_view' },
    { name: 'Add to Cart', eventPattern: 'add_to_cart' },
    { name: 'Checkout Started', eventPattern: 'checkout_started' },
    { name: 'Purchase', eventPattern: 'purchase_completed' },
  ];

  const funnelData = [];

  for (const step of steps) {
    const visitors = await prisma.event.groupBy({
      by: ['sessionId'],
      where: {
        eventName: step.eventPattern,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const visitorCount = visitors.length;
    funnelData.push({
      step: step.name,
      visitors: visitorCount,
      conversionRate: 0, // Will calculate relative conversion rate
      dropOff: 0,
    });
  }

  // Calculate conversion rates and drop-offs
  for (let i = 0; i < funnelData.length; i++) {
    if (i === 0) {
      funnelData[i].conversionRate = 100;
    } else {
      const previousVisitors = funnelData[0].visitors;
      funnelData[i].conversionRate = previousVisitors > 0
        ? (funnelData[i].visitors / previousVisitors) * 100
        : 0;
    }

    if (i > 0) {
      const dropOff = funnelData[i - 1].visitors - funnelData[i].visitors;
      funnelData[i].dropOff = dropOff;
    }
  }

  return funnelData;
}

async function getAttributionData(startDate: Date, endDate: Date) {
  // Get channel performance data
  const channels = await prisma.session.groupBy({
    by: ['utmSource', 'utmMedium'],
    _count: {
      sessionId: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      utmSource: {
        not: null,
      },
    },
  });

  const channelData = [];

  for (const channel of channels) {
    const source = channel.utmSource || 'Unknown';
    const medium = channel.utmMedium || 'Unknown';
    const channelName = `${source} / ${medium}`;

    // Get conversions for this channel
    const conversions = await prisma.conversion.count({
      where: {
        firstClickUtmSource: source,
        firstClickUtmMedium: medium,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get revenue for this channel
    const revenueResult = await prisma.conversion.aggregate({
      _sum: {
        totalValue: true,
      },
      where: {
        firstClickUtmSource: source,
        firstClickUtmMedium: medium,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const revenue = revenueResult._sum.totalValue || 0;

    // Placeholder cost data (integrate with ad platform APIs)
    const cost = revenue * 0.3; // Assume 30% cost ratio for demo
    const roas = cost > 0 ? revenue / cost : 0;

    channelData.push({
      channel: channelName,
      sessions: channel._count.sessionId,
      conversions,
      revenue,
      cost,
      roas,
    });
  }

  // Sort by revenue descending
  channelData.sort((a, b) => b.revenue - a.revenue);

  return channelData;
}

async function getRealTimeData() {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Active users (sessions in last 30 minutes)
  const activeUsers = await prisma.session.count({
    where: {
      updatedAt: {
        gte: thirtyMinutesAgo,
      },
    },
  });

  // Sessions in last 30 minutes
  const sessionsLast30Minutes = await prisma.session.count({
    where: {
      createdAt: {
        gte: thirtyMinutesAgo,
      },
    },
  });

  // Conversion events in last hour
  const conversionEvents = await prisma.conversion.count({
    where: {
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  // Top pages in last hour
  const topPagesResult = await prisma.landingPageEvent.groupBy({
    by: ['pageUrl'],
    _count: {
      sessionId: true,
    },
    where: {
      eventName: 'page_view',
      createdAt: {
        gte: oneHourAgo,
      },
    },
    orderBy: {
      _count: {
        sessionId: 'desc',
      },
    },
    take: 5,
  });

  const topPages = topPagesResult.map(page => ({
    page: page.pageUrl,
    visitors: page._count.sessionId,
  }));

  return {
    activeUsers,
    sessionsLast30Minutes,
    conversionEvents,
    topPages,
  };
}

async function getPerformanceData(startDate: Date, endDate: Date) {
  // Get average performance metrics
  const performanceResult = await prisma.landingPageEvent.aggregate({
    _avg: {
      loadTime: true,
      lcpTime: true,
      fidTime: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      loadTime: {
        not: null,
      },
    },
  });

  // Calculate bounce rate (sessions with only one page view)
  const totalSessions = await prisma.session.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const singlePageSessions = await prisma.session.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      events: {
        none: {
          eventName: {
            not: 'page_view',
          },
        },
      },
    },
  });

  const bounceRate = totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;

  return {
    avgLoadTime: (performanceResult._avg.loadTime || 0) / 1000, // Convert to seconds
    avgLCP: performanceResult._avg.lcpTime || 0,
    avgFID: performanceResult._avg.fidTime || 0,
    bounceRate,
  };
}

function generateTimelineData(startDate: Date, endDate: Date) {
  const timeline = [];
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    timeline.push({
      date: date.toISOString().split('T')[0],
      sessions: Math.floor(Math.random() * 100) + 20,
      conversions: Math.floor(Math.random() * 15) + 2,
      revenue: Math.floor(Math.random() * 5000) + 500,
    });
  }

  return timeline;
}

async function generateRecentSessions() {
  try {
    const sessions = await prisma.session.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        conversions: true,
      },
    });

    return sessions.map(session => {
      const conversion = session.conversions[0];
      return {
        id: session.sessionId,
        timestamp: session.createdAt.toISOString(),
        source: session.utmSource || 'direct',
        medium: session.utmMedium || 'none',
        campaign: session.utmCampaign || 'N/A',
        converted: !!conversion,
        value: conversion ? conversion.totalValue : 0,
      };
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }
}