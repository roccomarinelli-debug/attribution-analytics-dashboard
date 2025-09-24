-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "fbclid" TEXT,
    "gclid" TEXT,
    "ttclid" TEXT
);

-- CreateTable
CREATE TABLE "touchpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "touchpointId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "pageUrl" TEXT NOT NULL,
    "pageTitle" TEXT,
    "referrer" TEXT,
    "fbclid" TEXT,
    "gclid" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "timestamp" DATETIME NOT NULL,
    CONSTRAINT "touchpoints_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageUrl" TEXT,
    "eventData" TEXT,
    "timestamp" DATETIME NOT NULL,
    CONSTRAINT "events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "landing_page_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageUrl" TEXT NOT NULL,
    "pageTitle" TEXT,
    "referrer" TEXT,
    "elementId" TEXT,
    "elementClass" TEXT,
    "elementText" TEXT,
    "clickX" INTEGER,
    "clickY" INTEGER,
    "scrollDepth" INTEGER,
    "timeOnPage" INTEGER,
    "loadTime" INTEGER,
    "lcpTime" REAL,
    "fidTime" REAL,
    "customData" TEXT
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "conversionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "totalValue" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemCount" INTEGER,
    "customerId" TEXT,
    "email" TEXT,
    "firstClickUtmSource" TEXT,
    "firstClickUtmMedium" TEXT,
    "firstClickUtmCampaign" TEXT,
    "lastClickUtmSource" TEXT,
    "lastClickUtmMedium" TEXT,
    "lastClickUtmCampaign" TEXT,
    "attributionModel" TEXT,
    "attributionData" TEXT,
    "touchpointCount" INTEGER,
    "daysToPurchase" INTEGER,
    "sessionsToConversion" INTEGER,
    CONSTRAINT "conversions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversion_line_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversionId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sku" TEXT,
    "productName" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "conversion_line_items_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "conversions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "budget" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "spend" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "conversionRate" REAL,
    "cpa" REAL,
    "roas" REAL
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" REAL,
    "avgSessionDuration" REAL,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "avgOrderValue" REAL,
    "organicSessions" INTEGER NOT NULL DEFAULT 0,
    "paidSessions" INTEGER NOT NULL DEFAULT 0,
    "socialSessions" INTEGER NOT NULL DEFAULT 0,
    "emailSessions" INTEGER NOT NULL DEFAULT 0,
    "referralSessions" INTEGER NOT NULL DEFAULT 0,
    "directSessions" INTEGER NOT NULL DEFAULT 0,
    "avgPageLoadTime" REAL,
    "avgLCP" REAL,
    "avgFID" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "funnel_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "eventPattern" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "dropoffRate" REAL,
    "avgTimeToComplete" REAL
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    CONSTRAINT "alert_events_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "touchpoints_touchpointId_key" ON "touchpoints"("touchpointId");

-- CreateIndex
CREATE UNIQUE INDEX "conversions_conversionId_key" ON "conversions"("conversionId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_source_medium_campaign_key" ON "campaigns"("source", "medium", "campaign");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_key" ON "daily_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_steps_name_stepOrder_key" ON "funnel_steps"("name", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
