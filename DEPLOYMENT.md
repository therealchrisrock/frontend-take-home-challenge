# Deployment Guide

This guide covers deploying the Checkers application to Vercel with SQLite/Turso database.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Turso Account**: Sign up at [turso.tech](https://turso.tech) for production database
3. **GitHub Repository**: Code should be pushed to GitHub

## Environment Variables

### Required for Production

Set these in your Vercel project settings:

```bash
# Database (Turso for production)
DATABASE_URL="libsql://[your-database-name]-[your-username].turso.io"
DATABASE_AUTH_TOKEN="your-turso-auth-token"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret"
NEXTAUTH_URL="https://your-app.vercel.app"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# AWS S3 / Tigris (for image uploads)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="auto"
AWS_S3_BUCKET="your-bucket-name"
AWS_S3_ENDPOINT="https://fly.storage.tigris.dev"
```

## Deployment Steps

### 1. Setup Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create production database
turso db create checkers-prod

# Get database URL and auth token
turso db show checkers-prod
turso db tokens create checkers-prod
```

### 2. Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

1. Connect your GitHub repository to Vercel
2. Import the project in Vercel dashboard
3. Set environment variables in project settings
4. Deploy automatically on every push to `main`

#### Option B: Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Database Migration

After deployment, run migrations:

```bash
# Using Vercel CLI with production database
vercel env pull .env.production
DATABASE_URL="your-turso-url" DATABASE_AUTH_TOKEN="your-token" npx prisma migrate deploy

# Or using Turso CLI directly
turso db shell checkers-prod < prisma/migrations/[migration-files]
```

### 4. GitHub Actions Setup (Optional)

Add these secrets to your GitHub repository:

- `VERCEL_TOKEN`: Your Vercel API token
- Other environment variables if needed for CI

## Post-Deployment Checklist

- [ ] Database is accessible and migrations are applied
- [ ] Authentication works with Discord OAuth
- [ ] Image uploads work with S3/Tigris
- [ ] Email sending works with Resend
- [ ] All game features function correctly
- [ ] Performance monitoring is setup

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection locally
turso db shell checkers-prod
```

### Build Failures

Check Vercel function logs and ensure all environment variables are set correctly.

### Performance Issues

- Monitor with Vercel Analytics
- Consider upgrading Turso plan for better performance
- Optimize database queries and indexes

## Environment-Specific Notes

### Development
- Uses local SQLite file (`file:./db.sqlite`)
- No auth token required

### Production
- Uses Turso (LibSQL) hosted database
- Requires `DATABASE_AUTH_TOKEN`
- Automatic backups and replication

## Security Considerations

- All environment variables are properly secured in Vercel
- Database access is authenticated via Turso tokens
- HTTPS is enforced for all traffic
- Security headers are configured in `vercel.json`

## Monitoring and Maintenance

- Set up Vercel Analytics for performance monitoring
- Configure alerts for deployment failures
- Regular database backups (automatic with Turso)
- Monitor error rates and performance metrics
