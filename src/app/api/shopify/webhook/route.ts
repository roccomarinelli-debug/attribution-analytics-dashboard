import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');

    if (!verifyWebhook(body, hmacHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = JSON.parse(body);

    switch (topic) {
      case 'orders/create':
        return await handleOrderCreate(data);
      case 'orders/updated':
        return await handleOrderUpdate(data);
      case 'orders/paid':
        return await handleOrderPaid(data);
      case 'orders/cancelled':
        return await handleOrderCancelled(data);
      case 'checkouts/create':
        return await handleCheckoutCreate(data);
      case 'checkouts/update':
        return await handleCheckoutUpdate(data);
      default:
        console.log('Unhandled webhook topic:', topic);
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function verifyWebhook(body: string, hmacHeader: string | null): boolean {
  if (!hmacHeader || !process.env.SHOPIFY_WEBHOOK_SECRET) {
    return false;
  }

  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(calculatedHmac)
  );
}

async function handleOrderCreate(order: any) {
  console.log('Processing order creation:', order.id);

  // Extract session ID from landing page URL or customer note
  const sessionId = extractSessionId(order);

  if (!sessionId) {
    console.log('No session ID found for order:', order.id);
    // Still create conversion record but without session attribution
  }

  // Create conversion record
  const conversion = await prisma.conversion.create({
    data: {
      sessionId: sessionId || `shopify_${order.id}`,
      conversionId: `shopify_${order.id}`,
      orderId: order.id.toString(),
      orderNumber: order.order_number?.toString(),
      totalValue: parseFloat(order.total_price),
      currency: order.currency,
      itemCount: order.line_items?.length || 0,
      customerId: order.customer?.id?.toString(),
      email: order.customer?.email,
      createdAt: new Date(order.created_at),
    },
  });

  // Create line items
  if (order.line_items) {
    for (const item of order.line_items) {
      await prisma.conversionLineItem.create({
        data: {
          conversionId: conversion.id,
          productId: item.product_id?.toString(),
          variantId: item.variant_id?.toString(),
          sku: item.sku,
          productName: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        },
      });
    }
  }

  // Update session attribution if session exists
  if (sessionId) {
    await updateSessionAttribution(sessionId, order);
  }

  // Send conversion event to Meta Pixel
  await sendMetaConversionEvent(order, sessionId);

  return NextResponse.json({ success: true, conversionId: conversion.conversionId });
}

async function handleOrderUpdate(order: any) {
  console.log('Processing order update:', order.id);

  // Update existing conversion
  await prisma.conversion.updateMany({
    where: { orderId: order.id.toString() },
    data: {
      totalValue: parseFloat(order.total_price),
      itemCount: order.line_items?.length || 0,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

async function handleOrderPaid(order: any) {
  console.log('Processing order payment:', order.id);

  // Update conversion status
  await prisma.conversion.updateMany({
    where: { orderId: order.id.toString() },
    data: {
      updatedAt: new Date(),
    },
  });

  // Send purchase event to Meta Pixel
  const sessionId = extractSessionId(order);
  await sendMetaConversionEvent(order, sessionId, 'Purchase');

  return NextResponse.json({ success: true });
}

async function handleOrderCancelled(order: any) {
  console.log('Processing order cancellation:', order.id);

  // Mark conversion as cancelled (you might want to add a status field)
  await prisma.conversion.updateMany({
    where: { orderId: order.id.toString() },
    data: {
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

async function handleCheckoutCreate(checkout: any) {
  console.log('Processing checkout creation:', checkout.id);

  // Extract session ID
  const sessionId = extractSessionId(checkout);

  if (sessionId) {
    // Create checkout started event
    await prisma.event.create({
      data: {
        sessionId,
        eventName: 'checkout_started',
        eventData: JSON.stringify({
          checkoutId: checkout.id,
          totalPrice: checkout.total_price,
          lineItemsCount: checkout.line_items?.length || 0,
        }),
        timestamp: new Date(checkout.created_at),
        createdAt: new Date(),
      },
    });

    // Send to Meta Pixel
    await sendMetaEvent('InitiateCheckout', {
      value: parseFloat(checkout.total_price || '0'),
      currency: checkout.currency || 'USD',
      content_ids: checkout.line_items?.map((item: any) => item.product_id) || [],
      num_items: checkout.line_items?.length || 0,
    }, sessionId);
  }

  return NextResponse.json({ success: true });
}

async function handleCheckoutUpdate(checkout: any) {
  console.log('Processing checkout update:', checkout.id);
  // Similar to checkout create but for updates
  return NextResponse.json({ success: true });
}

function extractSessionId(order: any): string | null {
  // Try to extract session ID from various sources:

  // 1. From landing page URL in customer note
  if (order.note) {
    const sessionMatch = order.note.match(/session_id:([a-zA-Z0-9_-]+)/);
    if (sessionMatch) return sessionMatch[1];
  }

  // 2. From customer attributes
  if (order.customer?.note) {
    const sessionMatch = order.customer.note.match(/session_id:([a-zA-Z0-9_-]+)/);
    if (sessionMatch) return sessionMatch[1];
  }

  // 3. From order attributes
  if (order.attributes) {
    for (const attr of order.attributes) {
      if (attr.name === 'session_id') {
        return attr.value;
      }
    }
  }

  // 4. From referring site (if it contains session info)
  if (order.referring_site) {
    const sessionMatch = order.referring_site.match(/session=([a-zA-Z0-9_-]+)/);
    if (sessionMatch) return sessionMatch[1];
  }

  return null;
}

async function updateSessionAttribution(sessionId: string, order: any) {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (session) {
      // Calculate journey metrics
      const now = new Date();
      const sessionStart = new Date(session.createdAt);
      const daysToPurchase = Math.floor((now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24));

      // Update conversion with attribution data
      await prisma.conversion.updateMany({
        where: { orderId: order.id.toString() },
        data: {
          firstClickUtmSource: session.utmSource,
          firstClickUtmMedium: session.utmMedium,
          firstClickUtmCampaign: session.utmCampaign,
          lastClickUtmSource: session.utmSource,
          lastClickUtmMedium: session.utmMedium,
          lastClickUtmCampaign: session.utmCampaign,
          daysToPurchase,
          touchpointCount: 1, // For simplicity - you can make this more sophisticated
          sessionsToConversion: 1,
        },
      });
    }
  } catch (error) {
    console.error('Error updating session attribution:', error);
  }
}

async function sendMetaConversionEvent(order: any, sessionId: string | null, eventName = 'Purchase') {
  if (!process.env.META_PIXEL_ID || !process.env.META_ACCESS_TOKEN) {
    console.log('Meta Pixel not configured');
    return;
  }

  try {
    const eventData = {
      event_name: eventName,
      event_time: Math.floor(new Date(order.created_at).getTime() / 1000),
      event_source_url: order.landing_site || 'https://your-store.com',
      action_source: 'website',
      user_data: {
        em: order.customer?.email ? [hashEmail(order.customer.email)] : undefined,
        ph: order.customer?.phone ? [hashPhone(order.customer.phone)] : undefined,
        external_id: sessionId ? [sessionId] : undefined,
      },
      custom_data: {
        value: parseFloat(order.total_price),
        currency: order.currency,
        content_ids: order.line_items?.map((item: any) => item.product_id.toString()) || [],
        content_type: 'product',
        num_items: order.line_items?.length || 0,
      },
    };

    await sendMetaPixelEvent(eventData);
  } catch (error) {
    console.error('Error sending Meta conversion event:', error);
  }
}

async function sendMetaEvent(eventName: string, customData: any, sessionId: string | null) {
  if (!process.env.META_PIXEL_ID || !process.env.META_ACCESS_TOKEN) {
    return;
  }

  try {
    const eventData = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: {
        external_id: sessionId ? [sessionId] : undefined,
      },
      custom_data: customData,
    };

    await sendMetaPixelEvent(eventData);
  } catch (error) {
    console.error('Error sending Meta event:', error);
  }
}

async function sendMetaPixelEvent(eventData: any) {
  const url = `https://graph.facebook.com/v18.0/${process.env.META_PIXEL_ID}/events`;

  const payload = {
    data: [eventData],
    test_event_code: process.env.META_TEST_EVENT_CODE,
    access_token: process.env.META_ACCESS_TOKEN,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Meta Pixel API error:', error);
  }
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function hashPhone(phone: string): string {
  // Remove all non-digits and hash
  const cleanPhone = phone.replace(/\D/g, '');
  return crypto.createHash('sha256').update(cleanPhone).digest('hex');
}