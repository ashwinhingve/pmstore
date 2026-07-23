# Quick Start Guide - Tapti E-Commerce

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables

Create `.env.local` file with **minimum required variables**:

```env
# MongoDB (Required)
MONGODB_URI=mongodb://localhost:27017/tapti-spices

# NextAuth (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Google OAuth (Required for login)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin Setup (Required for creating admin users)
ADMIN_SETUP_SECRET=<run: openssl rand -base64 32>

# Paytm (Optional - app works without it, payments just disabled)
# See .env.example for full Paytm configuration
```

**Generate Secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

### Step 3: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`

### Step 4: Run Development Server
```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## ✅ Verification Checklist

### Test These Features:

#### 1. Authentication ✅
- [ ] Click "Login" and sign in with Google
- [ ] You should be redirected back to home page
- [ ] Your name/avatar appears in header

#### 2. Shopping Flow ✅
- [ ] Browse products at `/products`
- [ ] Add products to cart
- [ ] View cart at `/cart`
- [ ] Proceed to checkout

#### 3. Protected Routes ✅
- [ ] Try accessing `/cart` while logged out
- [ ] Should redirect to `/login?redirect=/cart`
- [ ] After login, should return to `/cart`

#### 4. Admin Setup ✅
Create an admin user:
```bash
curl -X POST http://localhost:3000/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "name": "Admin User",
    "setupSecret": "your-admin-setup-secret-from-env"
  }'
```

Then login with that email and access: **http://localhost:3000/admin**

---

## 🔧 Troubleshooting

### App Won't Start

**Error:** "NEXTAUTH_SECRET is not set"
**Fix:** Add `NEXTAUTH_SECRET` to `.env.local`

**Error:** "Cannot connect to MongoDB"
**Fix:**
1. Check MongoDB is running: `mongod --version`
2. Verify `MONGODB_URI` in `.env.local`

### Login Issues

**Error:** "Google sign-in not working"
**Fix:**
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Verify redirect URI in Google Console matches exactly
3. Clear browser cookies and try again

**Error:** "Redirects to home instead of intended page"
**Fix:** This is now fixed! Make sure you have the latest code.

### Payment Issues

**Warning:** "Paytm payment gateway not configured"
**This is normal!** The app works without Paytm. To enable payments:
1. See `.env.example` for Paytm variables
2. Get staging credentials from [Paytm Developer](https://developer.paytm.com/)
3. Add to `.env.local` and restart server

---

## 📚 Full Documentation

- **`PAYMENT_TESTING_GUIDE.md`** - Complete payment testing procedures
- **`SECURITY_AUDIT_REPORT.md`** - Security analysis (Grade: A)
- **`BUG_FIXES_SUMMARY.md`** - All fixes and improvements
- **`.env.example`** - Full environment variable reference

---

## 🎯 Next Steps

### For Development:
1. ✅ App is running - start building features!
2. ⚠️ Optional: Set up Paytm staging for payment testing
3. ⚠️ Optional: Configure email/SMS for notifications

### For Production:
1. Complete Paytm merchant verification
2. Get production credentials
3. Set up production MongoDB (MongoDB Atlas)
4. Configure production environment variables
5. Enable HTTPS
6. Set up monitoring (Sentry, etc.)
7. Review `SECURITY_AUDIT_REPORT.md`

---

## 🆘 Quick Help

### Commands

```bash
# Development
npm run dev           # Start dev server

# Production
npm run build         # Build for production
npm start             # Run production server

# Database
mongosh mongodb://localhost:27017/tapti-spices  # Connect to DB

# Testing
npm run lint          # Check code quality
```

### Important URLs

- **Home:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Admin:** http://localhost:3000/admin
- **Products:** http://localhost:3000/products
- **Cart:** http://localhost:3000/cart
- **Orders:** http://localhost:3000/orders

### Environment Files

- `.env.local` - Your local configuration (never commit!)
- `.env.example` - Template with all available variables
- `.gitignore` - Already configured to ignore `.env.local`

---

## ✨ Features Available

### ✅ Working Without Additional Setup
- Google OAuth authentication
- Product browsing and search
- Shopping cart
- User accounts
- Order history
- Admin dashboard
- User management
- Order management

### ⚠️ Requires Additional Setup
- **Payment Processing:** Paytm credentials
- **Shipping:** Delhivery API key
- **Email Notifications:** SMTP configuration
- **SMS Notifications:** Twilio credentials

---

## 🎉 You're All Set!

The application is running and ready for development. All critical bugs have been fixed:
- ✅ Google OAuth redirect working correctly
- ✅ Payment gateway gracefully degrades when not configured
- ✅ No more route naming conflicts
- ✅ Security audit passed with Grade A

Happy coding! 🚀
