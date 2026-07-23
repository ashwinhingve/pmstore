# Google OAuth Setup Guide

Complete guide to set up Google OAuth authentication for Tapti Spices e-commerce platform.

## Prerequisites

- Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project details:
   - **Project Name:** `Tapti Spices`
   - **Organization:** (optional)
5. Click **"Create"**

---

## Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Navigate to **"APIs & Services"** → **"Library"**
3. Search for **"Google+ API"**
4. Click on **"Google+ API"**
5. Click **"Enable"**

---

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type (for public access)
3. Click **"Create"**

### Fill in the OAuth Consent Screen:

**App Information:**
- **App name:** `Tapti Spices`
- **User support email:** Your email address
- **App logo:** Upload your logo (optional)

**App domain:**
- **Application home page:** `http://localhost:3000` (development) or `https://yourdomain.com` (production)
- **Privacy policy:** `http://localhost:3000/privacy` (update with your URL)
- **Terms of service:** `http://localhost:3000/terms` (update with your URL)

**Authorized domains:**
- Add: `localhost` (for development)
- Add: `yourdomain.com` (for production)

**Developer contact information:**
- **Email addresses:** Your email address

4. Click **"Save and Continue"**

### Scopes:

1. Click **"Add or Remove Scopes"**
2. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
3. Click **"Update"**
4. Click **"Save and Continue"**

### Test Users (for development):

1. Click **"Add Users"**
2. Add your test email addresses
3. Click **"Save and Continue"**

4. Review and click **"Back to Dashboard"**

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**

### Configure OAuth Client:

**Application type:** `Web application`

**Name:** `Tapti Spices Web Client`

**Authorized JavaScript origins:**
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

**Authorized redirect URIs:**
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://yourdomain.com/api/auth/callback/google`

3. Click **"Create"**

### Save Credentials:

You'll see a dialog with:
- **Client ID:** `xxxxx.apps.googleusercontent.com`
- **Client Secret:** `xxxxx`

**⚠️ IMPORTANT:** Copy these values immediately!

---

## Step 5: Add to Environment Variables

Open your `.env.local` file and add:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Replace with your actual Client ID and Client Secret.

---

## Step 6: Test the Integration

### Start Development Server:

```bash
npm run dev
```

### Test Sign In:

1. Navigate to `http://localhost:3000/login`
2. Click **"Sign in with Google"**
3. You should be redirected to Google's consent screen
4. Select your Google account
5. Grant permissions
6. You should be redirected back to your application

### Verify in Database:

Check MongoDB to verify user was created:

```javascript
// In MongoDB Compass or CLI
db.users.find({ provider: 'google' })
```

You should see a user document with:
- `email`
- `name`
- `googleId`
- `role: 'client'`
- `emailVerified: true`

---

## Step 7: Production Setup

When deploying to production:

### 1. Update OAuth Consent Screen:

- Change app domain to production URL
- Update privacy policy and terms URLs
- Verify authorized domains

### 2. Update OAuth Client:

- Add production redirect URI: `https://yourdomain.com/api/auth/callback/google`
- Add production JavaScript origin: `https://yourdomain.com`

### 3. Update Environment Variables:

```env
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
```

### 4. Publish OAuth App:

1. Go to **"OAuth consent screen"**
2. Click **"Publish App"**
3. Confirm publication

**Note:** Google may require verification for apps that request sensitive scopes or have many users.

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Solution:**
- Verify redirect URI in Google Console matches exactly
- Check for trailing slashes
- Ensure protocol (http/https) matches

### Error: "Access blocked: This app's request is invalid"

**Solution:**
- Ensure OAuth consent screen is configured
- Add your email as a test user (if app is not published)
- Verify all required fields are filled

### Error: "idpiframe_initialization_failed"

**Solution:**
- Clear browser cookies
- Check if third-party cookies are enabled
- Try incognito mode

### User not created in database

**Solution:**
- Check MongoDB connection in `.env.local`
- Verify User model schema
- Check server logs for errors
- Ensure database is running

### Session not persisting

**Solution:**
- Verify `NEXTAUTH_SECRET` is set
- Check if cookies are being set (browser dev tools)
- Ensure `NEXTAUTH_URL` matches your domain

---

## Security Best Practices

### Development:

1. **Never commit credentials to git**
   - Add `.env.local` to `.gitignore`
   - Use `.env.example` for templates

2. **Use different credentials for dev/prod**
   - Create separate OAuth clients
   - Use test accounts in development

### Production:

1. **Generate strong secrets**
   ```bash
   openssl rand -base64 32
   ```

2. **Enable HTTPS only**
   - Set `useSecureCookies: true` in production
   - Configure SSL certificate

3. **Restrict authorized domains**
   - Only add necessary domains
   - Remove localhost from production

4. **Monitor OAuth usage**
   - Check Google Cloud Console quotas
   - Set up alerts for unusual activity

5. **Regular security audits**
   - Review authorized apps
   - Rotate secrets periodically
   - Update dependencies

---

## API Quotas

Google OAuth has daily quotas:

- **Queries per day:** 10,000 (default)
- **Queries per 100 seconds:** 100

For higher limits, you may need to:
1. Enable billing on Google Cloud
2. Request quota increase
3. Verify your app

---

## Support

### Official Documentation:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)

### Common Issues:
- Check [NextAuth.js GitHub Issues](https://github.com/nextauthjs/next-auth/issues)
- Search [Stack Overflow](https://stackoverflow.com/questions/tagged/next-auth)

### Need Help?
- Review application logs
- Check browser console for errors
- Verify all environment variables are set
- Test with Google's OAuth Playground

---

## Checklist

### Development Setup:
- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added credentials to `.env.local`
- [ ] Added localhost redirect URI
- [ ] Tested sign in flow
- [ ] Verified user creation in database

### Production Deployment:
- [ ] Updated OAuth consent screen with production URLs
- [ ] Added production redirect URI
- [ ] Updated environment variables
- [ ] Published OAuth app (if required)
- [ ] Tested sign in on production
- [ ] Enabled HTTPS
- [ ] Restricted authorized domains
- [ ] Set up monitoring

---

## Example .env.local

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/tapti-spices

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
```

---

## Next Steps

After setting up Google OAuth:

1. **Test thoroughly** in development
2. **Add error handling** for edge cases
3. **Implement user profile** page
4. **Add account linking** for multiple providers
5. **Set up email notifications** for new signups
6. **Create admin dashboard** for user management
7. **Implement role-based access** control
8. **Add session management** features
9. **Set up logging** and monitoring
10. **Deploy to production** and test

---

## License

This setup guide is part of the Tapti Spices e-commerce platform.
