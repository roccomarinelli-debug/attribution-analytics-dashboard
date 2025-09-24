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

    const sessions = await prisma.session.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const events = await prisma.event.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const timeOnPageEvents = events.filter(e => e.eventName === 'time_on_page');
    const avgTimeOnPage = timeOnPageEvents.length > 0
      ? timeOnPageEvents.reduce((sum, e) => {
          const data = JSON.parse(e.eventData || '{}');
          return sum + (data.timeOnPage || 0);
        }, 0) / timeOnPageEvents.length
      : 0;

    const exitIntentCount = events.filter(e => e.eventName === 'exit_intent').length;

    const pageExits = events.filter(e => e.eventName === 'page_exit');
    const bounceCount = pageExits.filter(e => {
      const data = JSON.parse(e.eventData || '{}');
      return (data.timeOnPage || 0) < 10;
    }).length;
    const bounceRate = sessions > 0 ? (bounceCount / sessions) * 100 : 0;

    const buttonClicks = events.filter(e => e.eventName === 'button_click');
    const buttonClickMap: { [key: string]: number } = {};
    const topButtonsMap: { [key: string]: { name: string; location: string; clicks: number } } = {};

    buttonClicks.forEach(event => {
      const data = JSON.parse(event.eventData || '{}');
      const key = `${data.buttonName}-${data.buttonLocation}`;
      buttonClickMap[key] = (buttonClickMap[key] || 0) + 1;

      if (!topButtonsMap[key]) {
        topButtonsMap[key] = {
          name: data.buttonName || 'Unknown',
          location: data.buttonLocation || 'Unknown',
          clicks: 0
        };
      }
      topButtonsMap[key].clicks++;
    });

    const topButtons = Object.values(topButtonsMap)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      sessions,
      bounceRate,
      avgTimeOnPage,
      exitIntent: exitIntentCount,
      buttonClicks: buttonClickMap,
      topButtons
    });

  } catch (error) {
    console.error('Landing page analytics error:', error);
    return NextResponse.json({
      error: 'Failed to fetch landing page analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}