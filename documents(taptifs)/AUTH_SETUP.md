# Authentication Setup Guide

This application uses **NextAuth.js** with **Google OAuth** for authentication and implements Role-Based Access Control (RBAC).

## Authentication System Overview

### Features
- ✅ Google OAuth sign-in only (no email/password)
- ✅ Automatic user profile creation on first sign-in
- ✅ Role-Based Access Control (RBAC) with two roles:
  - **client** (default role for all new users)
  - **admin** (fixed role, cannot be self-assigned)
- ✅ No duplicate users (checks by email and Google ID)
- ✅ Automatic email verification for Google users
- ✅ Session management with JWT tokens
- ✅ Protected routes with middleware

## Setup Instructions

### 1. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy your **Client ID** and **Client Secret**

### 2. Update Environment Variables

Update your `.env.local` file with the Google OAuth credentials:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/taptifs
```

### 3. Set Up Admin User

Since the **admin role is fixed** and cannot be assigned through the UI, you need to manually promote a user to admin:

#### Method 1: Using the Setup API (Recommended)

1. First, sign in to the application using Google OAuth
2. Note your email address
3. Use the following API endpoint to promote yourself to admin:

```bash
curl -X POST http://localhost:3000/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "taptiagrofood@gmail.com",
    "setupSecret": "7b75ce0bd2fdf7ec596758f6a59339e1d4cfe2ffd9d9024230f177ef5fb225ff"
  }'
```

Or use a tool like Postman:
- **URL**: `POST http://localhost:3000/api/setup-admin`
- **Body** (JSON):
  ```json
  {
    "email": "your-email@example.com",
    "setupSecret": "your-nextauth-secret-key"
  }
  ```

#### Method 2: Using MongoDB Directly

If you have direct access to MongoDB:

```javascript
// Connect to your MongoDB database
use taptifs

// Update the user's role to admin
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## User Roles

### Client (Default)
- Automatically assigned to all new users upon sign-in
- Can access:
  - Shopping pages
  - Product catalog
  - Cart and checkout
  - Profile and orders
  - Wishlist

### Admin
- Must be manually assigned (cannot self-assign)
- Can access:
  - All client features
  - Admin dashboard
  - User management
  - Product management
  - Order management

## How Authentication Works

### Sign-In Flow

1. User clicks "Continue with Google" on the login page
2. User is redirected to Google OAuth consent screen
3. User grants permission
4. Google redirects back to the app with an authorization code
5. NextAuth exchanges the code for user information
6. The app checks if the user exists in the database:
   - **New User**: Creates a new user with role "client" and sets emailVerified to true
   - **Existing User**: Updates Google ID and profile image if needed
7. User session is created with JWT token
8. User is redirected to the requested page or home

### No Duplicate Users

The system prevents duplicate users by checking both:
- Email address
- Google ID

If a user with the same email or Google ID already exists, it updates the existing record instead of creating a new one.

### Protected Routes

The following routes require authentication:
- `/account`
- `/orders`
- `/profile`
- `/wishlist`
- `/wholesale/dashboard`

Unauthenticated users are redirected to `/login` with a redirect parameter.

## Session Management

- **Strategy**: JWT (JSON Web Tokens)
- **Session Duration**: 30 days
- **Session Storage**: HTTP-only cookies
- **Session Data Includes**:
  - User ID
  - Email
  - Name
  - Profile image
  - Role (client or admin)

## Security Features

1. **CSRF Protection**: Built-in NextAuth CSRF protection
2. **Secure Cookies**: HTTP-only, secure cookies in production
3. **Email Verification**: Automatic for Google OAuth users
4. **No Password Storage**: No passwords to manage or leak
5. **Fixed Admin Role**: Admin role cannot be assigned through the UI

## Accessing User Session

### In Client Components

```tsx
'use client'
import { useSession } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    return <div>Please sign in</div>
  }

  return (
    <div>
      <p>Email: {session?.user?.email}</p>
      <p>Role: {session?.user?.role}</p>
    </div>
  )
}
```

### In Server Components

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function MyPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>Please sign in</div>
  }

  return (
    <div>
      <p>Email: {session.user.email}</p>
      <p>Role: {session.user.role}</p>
    </div>
  )
}
```

### In API Routes

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // Your logic here
}
```

## Troubleshooting

### Issue: "Sign in failed"
- Verify your Google OAuth credentials are correct
- Check that redirect URIs are configured in Google Cloud Console
- Ensure NEXTAUTH_URL matches your application URL

### Issue: "User not found" when setting up admin
- Make sure you've signed in at least once with Google
- Verify the email address is correct
- Check MongoDB connection

### Issue: Redirect loop after sign-in
- Clear your browser cookies
- Verify NEXTAUTH_SECRET is set correctly
- Check middleware configuration

### Issue: Session not persisting
- Verify cookies are enabled in your browser
- Check NEXTAUTH_URL is set correctly
- In production, ensure cookies are set with secure flag

## Development vs Production

### Development
- Use `http://localhost:3000` for NEXTAUTH_URL
- Cookies are not secure (no HTTPS required)
- Can use setup-admin endpoint freely

### Production
- Use your actual domain for NEXTAUTH_URL
- Ensure HTTPS is enabled
- Secure cookies are enforced
- Consider disabling or protecting the setup-admin endpoint
- Use strong NEXTAUTH_SECRET (generate with: `openssl rand -base64 32`)

## Migration from Old System

If you had users in the old authentication system:

1. Old user records will remain in the database
2. When they sign in with Google, the system will:
   - Link their Google ID to their existing account
   - Update their profile image
   - Set emailVerified to true
3. No data will be lost or duplicated

## Support

For issues or questions:
- Check the [NextAuth.js documentation](https://next-auth.js.org/)
- Review the authentication code in `/src/lib/auth.ts`
- Check middleware configuration in `/middleware.ts`
