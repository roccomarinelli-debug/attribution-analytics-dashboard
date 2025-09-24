import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, session_data, heatmap_data } = body;

    // Process each event
    const processedEvents = [];

    for (const event of events) {
      // Ensure session exists
      const session = await prisma.session.upsert({
        where: { sessionId: event.session_id },
        update: {
          updatedAt: new Date(),
        },
        create: {
          sessionId: event.session_id,
          visitorId: event.visitor_id,
          userAgent: session_data?.user_agent,
          deviceType: session_data?.device_type,
          browser: session_data?.browser,
          timezone: session_data?.timezone,
          language: session_data?.language,
          utmSource: session_data?.utm_data?.utm_source,
          utmMedium: session_data?.utm_data?.utm_medium,
          utmCampaign: session_data?.utm_data?.utm_campaign,
          utmTerm: session_data?.utm_data?.utm_term,
          utmContent: session_data?.utm_data?.utm_content,
          referrer: session_data?.referrer,
          landingPage: session_data?.page_url,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Create landing page event
      const landingPageEvent = await prisma.landingPageEvent.create({
        data: {
          sessionId: event.session_id,
          visitorId: event.visitor_id,
          eventName: event.event_name,
          pageUrl: event.page_url,
          pageTitle: session_data?.page_title,
          referrer: session_data?.referrer,
          elementId: event.element_id,
          elementClass: event.element_class,
          elementText: event.element_text,
          clickX: event.click_x,
          clickY: event.click_y,
          scrollDepth: event.scroll_depth,
          timeOnPage: event.seconds_on_page,
          loadTime: event.load_time,
          lcpTime: event.lcp_time,
          fidTime: event.fid_time,
          customData: event.custom_data || {},
        },
      });

      // Create generic event record
      const genericEvent = await prisma.event.create({
        data: {
          sessionId: event.session_id,
          eventName: event.event_name,
          pageUrl: event.page_url,
          eventData: event,
          timestamp: new Date(event.timestamp),
        },
      });

      processedEvents.push({ landingPageEvent, genericEvent });
    }

    // Process heatmap data if present
    if (heatmap_data) {
      // Store heatmap data (could be in a separate table or aggregated)
      // For now, we'll store it as custom data in events
      if (heatmap_data.clicks && heatmap_data.clicks.length > 0) {
        for (const click of heatmap_data.clicks) {
          await prisma.event.create({
            data: {
              sessionId: session_data?.session_id,
              eventName: 'heatmap_click',
              pageUrl: session_data?.page_url,
              eventData: click,
              timestamp: new Date(click.timestamp),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedEvents.length,
      message: 'Events processed successfully',
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');

    let whereClause: any = {};

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (eventType) {
      whereClause.eventName = eventType;
    }

    const events = await prisma.landingPageEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent large responses
    });

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}