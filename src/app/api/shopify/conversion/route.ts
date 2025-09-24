import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, order_data, attribution, customer_journey, timestamp } = body;

    if (event === 'conversion' && order_data) {
      // Process the conversion with full attribution
      const conversion = await processConversion(order_data, attribution, customer_journey);

      return NextResponse.json({
        success: true,
        conversion_id: conversion.id,
        message: 'Conversion tracked successfully',
      });
    }

    // Handle other Shopify events
    if (event === 'checkout_step') {
      await processCheckoutStep(body);
    } else if (event === 'add_to_cart') {
      await processAddToCart(body);
    } else if (event === 'product_view') {
      await processProductView(body);
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify event processed successfully',
    });

  } catch (error) {
    console.error('Shopify conversion API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process Shopify conversion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processConversion(orderData: any, attribution: any, customerJourney: any[]) {
  try {
    // Calculate attribution models
    const attributionModels = calculateAttributionModels(customerJourney);

    // Create conversion record
    const conversion = await prisma.conversion.create({
      data: {
        sessionId: attribution?.session_id || `unknown_${Date.now()}`,
        conversionId: `conv_${orderData.order_id}_${Date.now()}`,
        orderId: orderData.order_id,
        orderNumber: orderData.order_number,
        totalValue: orderData.total_price,
        currency: orderData.currency || 'USD',
        itemCount: orderData.line_items?.length || 0,
        customerId: orderData.customer_id,
        email: orderData.email,

        // First-click attribution
        firstClickUtmSource: attributionModels.first_click?.utm_source,
        firstClickUtmMedium: attributionModels.first_click?.utm_medium,
        firstClickUtmCampaign: attributionModels.first_click?.utm_campaign,

        // Last-click attribution
        lastClickUtmSource: attributionModels.last_click?.utm_source,
        lastClickUtmMedium: attributionModels.last_click?.utm_medium,
        lastClickUtmCampaign: attributionModels.last_click?.utm_campaign,

        // Journey metrics
        touchpointCount: customerJourney?.length || 0,
        daysToPurchase: calculateDaysToPurchase(customerJourney),
        sessionsToConversion: calculateSessionsToConversion(customerJourney),

        // Store detailed attribution data
        attributionData: JSON.stringify({
          customer_journey: customerJourney,
          attribution_models: attributionModels,
          original_attribution: attribution,
        }),
      },
    });

    // Create line items
    if (orderData.line_items && orderData.line_items.length > 0) {
      const lineItems = orderData.line_items.map((item: any) => ({
        conversionId: conversion.id,
        productId: item.product_id?.toString(),
        variantId: item.variant_id?.toString(),
        sku: item.sku,
        productName: item.name || item.title,
        category: item.category,
        quantity: item.quantity || 1,
        price: item.price || 0,
      }));

      await prisma.conversionLineItem.createMany({
        data: lineItems,
      });
    }

    // Update campaign performance if we have attribution
    if (attribution?.utm_source && attribution?.utm_medium && attribution?.utm_campaign) {
      await updateCampaignPerformance(
        attribution.utm_source,
        attribution.utm_medium,
        attribution.utm_campaign,
        orderData.total_price
      );
    }

    // Update daily metrics
    await updateDailyMetrics(new Date(), {
      conversions: 1,
      revenue: orderData.total_price,
    });

    return conversion;

  } catch (error) {
    console.error('Error processing conversion:', error);
    throw error;
  }
}

async function processCheckoutStep(data: any) {
  await prisma.event.create({
    data: {
      sessionId: data.session_id || `unknown_${Date.now()}`,
      eventName: 'checkout_step',
      pageUrl: data.page_url || 'unknown',
      eventData: data,
      timestamp: new Date(data.timestamp || Date.now()),
    },
  });
}

async function processAddToCart(data: any) {
  await prisma.event.create({
    data: {
      sessionId: data.session_id || `unknown_${Date.now()}`,
      eventName: 'add_to_cart',
      pageUrl: data.page_url || 'unknown',
      eventData: data,
      timestamp: new Date(data.timestamp || Date.now()),
    },
  });
}

async function processProductView(data: any) {
  await prisma.event.create({
    data: {
      sessionId: data.session_id || `unknown_${Date.now()}`,
      eventName: 'product_view',
      pageUrl: data.page_url || 'unknown',
      eventData: data,
      timestamp: new Date(data.timestamp || Date.now()),
    },
  });
}

function calculateAttributionModels(customerJourney: any[]) {
  if (!customerJourney || customerJourney.length === 0) {
    return {
      first_click: null,
      last_click: null,
      linear: [],
      time_decay: [],
      position_based: []
    };
  }

  const firstClick = customerJourney[0];
  const lastClick = customerJourney[customerJourney.length - 1];

  // Linear attribution (equal weight)
  const linearWeight = 1.0 / customerJourney.length;
  const linear = customerJourney.map(tp => ({
    ...tp,
    attribution_weight: linearWeight,
  }));

  // Time decay attribution
  const now = Date.now();
  const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days
  const timeDecayWeights = customerJourney.map(tp => {
    const timeDiff = now - tp.timestamp;
    return Math.pow(2, -timeDiff / halfLife);
  });
  const totalTimeDecayWeight = timeDecayWeights.reduce((sum, weight) => sum + weight, 0);
  const timeDecay = customerJourney.map((tp, index) => ({
    ...tp,
    attribution_weight: timeDecayWeights[index] / totalTimeDecayWeight,
  }));

  // Position-based attribution (40% first, 40% last, 20% middle)
  const positionBased = customerJourney.map((tp, index) => {
    let weight = 0;
    if (customerJourney.length === 1) {
      weight = 1.0;
    } else if (index === 0) {
      weight = 0.4;
    } else if (index === customerJourney.length - 1) {
      weight = 0.4;
    } else {
      weight = 0.2 / Math.max(1, customerJourney.length - 2);
    }
    return { ...tp, attribution_weight: weight };
  });

  return {
    first_click: firstClick,
    last_click: lastClick,
    linear,
    time_decay: timeDecay,
    position_based: positionBased,
  };
}

function calculateDaysToPurchase(customerJourney: any[]): number | null {
  if (!customerJourney || customerJourney.length === 0) return null;

  const firstTouch = new Date(customerJourney[0].timestamp);
  const lastTouch = new Date(customerJourney[customerJourney.length - 1].timestamp);

  return Math.round((lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateSessionsToConversion(customerJourney: any[]): number {
  if (!customerJourney || customerJourney.length === 0) return 0;

  const uniqueSessionIds = new Set(customerJourney.map(tp => tp.session_id));
  return uniqueSessionIds.size;
}

async function updateCampaignPerformance(source: string, medium: string, campaign: string, revenue: number) {
  try {
    await prisma.campaign.upsert({
      where: {
        source_medium_campaign: {
          source,
          medium,
          campaign,
        },
      },
      update: {
        conversions: { increment: 1 },
        revenue: { increment: revenue },
        updatedAt: new Date(),
      },
      create: {
        name: campaign,
        source,
        medium,
        campaign,
        conversions: 1,
        revenue,
      },
    });
  } catch (error) {
    console.error('Error updating campaign performance:', error);
  }
}

async function updateDailyMetrics(date: Date, metrics: { conversions?: number; revenue?: number; sessions?: number }) {
  try {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    await prisma.dailyMetrics.upsert({
      where: { date: dateOnly },
      update: {
        conversions: metrics.conversions ? { increment: metrics.conversions } : undefined,
        revenue: metrics.revenue ? { increment: metrics.revenue } : undefined,
        sessions: metrics.sessions ? { increment: metrics.sessions } : undefined,
        updatedAt: new Date(),
      },
      create: {
        date: dateOnly,
        conversions: metrics.conversions || 0,
        revenue: metrics.revenue || 0,
        sessions: metrics.sessions || 0,
      },
    });
  } catch (error) {
    console.error('Error updating daily metrics:', error);
  }
}