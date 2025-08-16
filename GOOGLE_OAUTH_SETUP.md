# Google OAuth Setup Guide

This guide will help you configure Google OAuth with better-auth in your Next.js application.

## Prerequisites

- Google Cloud Console account
- Your application running locally on `http://localhost:3000` (server) and `http://localhost:3001` (web)

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also enable "Google People API" for user profile access

3. **Create OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" for user type
   - Fill in the required information:
     - App name: Your app name
     - User support email: Your email
     - Developer contact information: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed

4. **Create OAuth Client ID**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
   - Save the **Client ID** and **Client Secret**

## Step 2: Environment Variables

Create the following environment variables in your project:

### Root `.env` file:
```env
# Database Configuration
DATABASE_URL="your-postgresql-connection-string"

# Better Auth Configuration  
BETTER_AUTH_SECRET="your-random-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# CORS Configuration
CORS_ORIGIN="http://localhost:3001"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server Configuration
NEXT_PUBLIC_SERVER_URL="http://localhost:3000"
```

### `apps/server/.env`:
```env
# Database Configuration
DATABASE_URL="your-postgresql-connection-string"

# Better Auth Configuration  
BETTER_AUTH_SECRET="your-random-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# CORS Configuration
CORS_ORIGIN="http://localhost:3001"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### `apps/web/.env`:
```env
# Server Configuration
NEXT_PUBLIC_SERVER_URL="http://localhost:3000"
```

## Step 3: Generate Secret Key

Generate a secure random secret for `BETTER_AUTH_SECRET`:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using bun
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Database Migration

Since Google OAuth requires additional fields in the account table, make sure your database schema is up to date:

```bash
# From the server directory
cd apps/server
bun run db:generate
bun run db:migrate
```

## Step 5: Test the Integration

1. **Start both applications:**
   ```bash
   # Terminal 1 - Start server
   cd apps/server
   bun run dev

   # Terminal 2 - Start web app
   cd apps/web  
   bun run dev
   ```

2. **Test Google OAuth:**
   - Navigate to `http://localhost:3001/login`
   - Click "Continue with Google"
   - Complete the OAuth flow
   - You should be redirected to the dashboard

## Step 6: Production Setup

For production deployment:

1. **Update OAuth Redirect URIs** in Google Cloud Console:
   - Add your production domain: `https://yourdomain.com/api/auth/callback/google`

2. **Update Environment Variables:**
   - `BETTER_AUTH_URL="https://your-server-domain.com"`
   - `CORS_ORIGIN="https://your-web-domain.com"`
   - `NEXT_PUBLIC_SERVER_URL="https://your-server-domain.com"`

3. **OAuth Consent Screen:**
   - Submit for verification if needed
   - Publish the app for public use

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" Error**
   - Ensure the redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google`
   - Check for trailing slashes and protocol (http vs https)

2. **"invalid_client" Error**
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
   - Ensure no extra spaces in environment variables

3. **CORS Errors**
   - Verify `CORS_ORIGIN` matches your web app URL
   - Check that both apps are running on correct ports

4. **Database Errors**
   - Ensure database is running and accessible
   - Run migrations: `bun run db:migrate`

### Debug Steps:

1. **Check Environment Variables:**
   ```bash
   # In server directory
   bun -e "console.log(process.env.GOOGLE_CLIENT_ID)"
   ```

2. **Check API Endpoint:**
   - Visit: `http://localhost:3000/api/auth`
   - Should return better-auth API response

3. **Check Console Logs:**
   - Browser developer tools for client-side errors
   - Server terminal for backend errors

## Security Notes

- Never commit `.env` files to version control
- Use different OAuth credentials for development and production
- Regularly rotate your `BETTER_AUTH_SECRET`
- Monitor OAuth usage in Google Cloud Console
- Set up proper CORS policies for production

## Additional Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
