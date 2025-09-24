import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'session_start':
        return await handleSessionStart(data);
      case 'page_view':
        return await handlePageView(data);
      case 'interaction':
        return await handleInteraction(data);
      case 'conversion':
        return await handleConversion(data);
      default:
        return NextResponse.json({ success: false, error: 'Unknown event type' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

async function handleSessionStart(data: any) {
  const {
    sessionId,
    visitorId,
    userAgent,
    ipAddress,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    referrer,
    landingPage,
    fbclid,
    gclid,
    ttclid,
    deviceType,
    browser,
    os,
    country,
    timezone,
    language
  } = data;

  // Create or update session
  const session = await prisma.session.upsert({
    where: { sessionId },
    update: {
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    },
    create: {
      sessionId,
      visitorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      userAgent,
      ipAddress,
      deviceType,
      browser,
      os,
      country,
      timezone,
      language,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer,
      landingPage,
      fbclid,
      gclid,
      ttclid,
    },
  });

  return NextResponse.json({ success: true, sessionId: session.sessionId }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function handlePageView(data: any) {
  const {
    sessionId,
    visitorId,
    pageUrl,
    pageTitle,
    referrer,
    timestamp,
    loadTime,
    lcpTime,
    fidTime
  } = data;

  // Create page view event
  await prisma.landingPageEvent.create({
    data: {
      sessionId,
      visitorId,
      eventName: 'page_view',
      pageUrl,
      pageTitle,
      referrer,
      loadTime,
      lcpTime,
      fidTime,
      createdAt: new Date(timestamp),
    },
  });

  // Also create a general event
  await prisma.event.create({
    data: {
      sessionId,
      eventName: 'page_view',
      pageUrl,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ success: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function handleInteraction(data: any) {
  const {
    sessionId,
    eventName,
    pageUrl,
    elementId,
    elementClass,
    elementText,
    clickX,
    clickY,
    scrollDepth,
    timeOnPage,
    customData
  } = data;

  // Create interaction event
  await prisma.landingPageEvent.create({
    data: {
      sessionId,
      visitorId: data.visitorId,
      eventName,
      pageUrl,
      elementId,
      elementClass,
      elementText,
      clickX,
      clickY,
      scrollDepth,
      timeOnPage,
      customData: customData ? JSON.stringify(customData) : null,
      createdAt: new Date(),
    },
  });

  // Also create a general event
  try {
    await prisma.event.create({
      data: {
        sessionId,
        eventName,
        pageUrl,
        eventData: customData ? JSON.stringify(customData) : null,
        timestamp: new Date(),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`Could not create general event for '${eventName}'. This might be due to a race condition with session creation.`);
  }

  return NextResponse.json({ success: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function handleConversion(data: any) {
  const {
    sessionId,
    orderId,
    orderNumber,
    totalValue,
    currency,
    itemCount,
    customerId,
    email,
    lineItems,
    touchpointCount,
    daysToPurchase,
    sessionsToConversion
  } = data;

  // Get session for attribution data
  const session = await prisma.session.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Create conversion
  const conversion = await prisma.conversion.create({
    data: {
      sessionId,
      conversionId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      orderNumber,
      totalValue,
      currency: currency || 'USD',
      itemCount,
      customerId,
      email,
      firstClickUtmSource: session.utmSource,
      firstClickUtmMedium: session.utmMedium,
      firstClickUtmCampaign: session.utmCampaign,
      lastClickUtmSource: session.utmSource, // For simplicity, using same session
      lastClickUtmMedium: session.utmMedium,
      lastClickUtmCampaign: session.utmCampaign,
      touchpointCount,
      daysToPurchase,
      sessionsToConversion,
      createdAt: new Date(),
    },
  });

  // Create line items
  if (lineItems && Array.isArray(lineItems)) {
    for (const item of lineItems) {
      await prisma.conversionLineItem.create({
        data: {
          conversionId: conversion.id,
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
        },
      });
    }
  }

  return NextResponse.json({ success: true, conversionId: conversion.conversionId }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}