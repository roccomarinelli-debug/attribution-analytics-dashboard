# Deployment Guide - Vercel

## Quick Deploy

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd /Users/roccomarinelli/Documents/Projects/attribution-analytics-system/dashboard
vercel
```

## Environment Variables

After deployment, add these environment variables in Vercel dashboard:

```env
# Database (use Vercel Postgres or Neon.tech)
DATABASE_URL="postgresql://user:pass@host/db"

# Meta Pixel
META_PIXEL_ID="2934112323436194"
META_ACCESS_TOKEN="EACOPoSamSu8BPqjhrNuNjvLO4qEH8ZCqUB6jmHkJnofHO8JlZAxcxaya6TuqNKXUWtnw7HOW4XQlaaZCPJT74BqcdsotvrUa73ZCEbtYTS0HI5S4ma7pq15stqlicHx7ZCSNc5ZAUILYqjInRfTXuYH9bfOYbuJaPBIDZCPHNpazEbRNuFMusDNYFcb3gVv5Sw9CN57RWYVJA5xbVHMO3iTpOAn2bGKE446QyK8XqUxG1x01z3XzSUDdpFZBtgInJgZDZD"

# Shopify
SHOPIFY_DOMAIN="your-store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxx"
SHOPIFY_WEBHOOK_SECRET="your_webhook_secret"
```

## Database Setup

### Option 1: Vercel Postgres (Recommended)
1. In Vercel dashboard → Storage → Create Database → Postgres
2. Copy connection string
3. Add as `DATABASE_URL` environment variable
4. Run migrations: `npx prisma migrate deploy`

### Option 2: Neon.tech (Free)
1. Go to https://neon.tech
2. Create free PostgreSQL database
3. Copy connection string
4. Add as `DATABASE_URL` environment variable
5. Run migrations: `npx prisma migrate deploy`

## After Deployment

1. Get your production URL (e.g., `https://your-dashboard.vercel.app`)
2. Update Shopify webhooks with production URL
3. Update landing page API endpoint