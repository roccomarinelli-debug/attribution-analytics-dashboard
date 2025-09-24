import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';

    const daysAgo = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const events = await prisma.event.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const conversions = await prisma.conversion.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const revenue = await prisma.conversion.aggregate({
      where: {
        createdAt: { gte: startDate }
      },
      _sum: {
        totalValue: true
      }
    });

    const productViews = events.filter(e => e.eventName === 'product_view').length;
    const addToCarts = events.filter(e => e.eventName === 'add_to_cart' || e.eventName === 'add_to_cart_click').length;
    const checkouts = events.filter(e => e.eventName === 'checkout_started').length;

    const scrollEvents = events.filter(e => e.eventName === 'scroll_depth');
    const avgScrollDepth = scrollEvents.length > 0
      ? scrollEvents.reduce((sum, e) => {
          const data = JSON.parse(e.eventData || '{}');
          return sum + (data.depth || 0);
        }, 0) / scrollEvents.length
      : 0;

    const productViewEvents = events.filter(e => e.eventName === 'product_view');
    const productMap: { [key: string]: { name: string; views: number; addToCarts: number } } = {};

    productViewEvents.forEach(event => {
      const data = JSON.parse(event.eventData || '{}');
      const productName = data.productName || 'Unknown Product';

      if (!productMap[productName]) {
        productMap[productName] = { name: productName, views: 0, addToCarts: 0 };
      }
      productMap[productName].views++;
    });

    const addToCartEvents = events.filter(e => e.eventName === 'add_to_cart');
    addToCartEvents.forEach(event => {
      const data = JSON.parse(event.eventData || '{}');
      const url = data.pageUrl || '';
      const urlMatch = url.match(/\/products\/([^/?]+)/);
      if (urlMatch && urlMatch[1]) {
        const productSlug = urlMatch[1].replace(/-/g, ' ');
        const matchingProduct = Object.keys(productMap).find(name =>
          name.toLowerCase().includes(productSlug.toLowerCase())
        );
        if (matchingProduct) {
          productMap[matchingProduct].addToCarts++;
        }
      }
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      productViews,
      addToCarts,
      checkouts,
      sales: conversions,
      revenue: revenue._sum.totalValue || 0,
      avgScrollDepth,
      topProducts
    });

  } catch (error) {
    console.error('Shopify analytics error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Shopify analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}