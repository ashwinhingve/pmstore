# Payment & Authentication Testing Guide

This guide will help you test the complete authentication and payment flow in the Tapti e-commerce application.

## Prerequisites

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000` (for development)
7. Copy Client ID and Client Secret to `.env.local`

### 2. Paytm Payment Gateway Setup

**For Testing (Staging Environment):**
1. Register for Paytm Test Merchant Account at [Paytm Developer](https://developer.paytm.com/)
2. Get staging credentials from the dashboard
3. Use staging URLs (already configured in .env.example)

**For Production:**
1. Complete KYC and merchant verification with Paytm
2. Get production credentials
3. Update URLs to production endpoints

### 3. Environment Variables

Create `.env.local` file with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/tapti-spices

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# Google OAuth (REQUIRED for login to work)
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# Admin Setup
ADMIN_SETUP_SECRET=<generate-with: openssl rand -base64 32>

# Paytm Payment Gateway (Optional - app will work without it but payments won't process)
PAYTM_MERCHANT_ID=your_test_merchant_id
PAYTM_MERCHANT_KEY=your_test_merchant_key
PAYTM_WEBSITE=WEBSTAGING
PAYTM_CHANNEL_ID=WEB
PAYTM_INDUSTRY_TYPE_ID=Retail
PAYTM_CALLBACK_URL=http://localhost:3000/api/payment/callback
PAYTM_TRANSACTION_URL=https://securegw-stage.paytm.in/order/process
PAYTM_TRANSACTION_STATUS_URL=https://securegw-stage.paytm.in/order/status

# Delhivery (Optional - for shipping integration)
DELHIVERY_API_KEY=your_api_key
DELHIVERY_BASE_URL=https://staging-express.delhivery.com
# ... (see .env.example for full list)
```

## Testing Authentication Flow

### 1. Test Google Login

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Click "Continue with Google"

4. You should be redirected to Google's OAuth consent screen

5. After authentication, you should be redirected back to the home page (if no redirect parameter was set)

### 2. Test Protected Route Redirect

1. While logged out, try to access http://localhost:3000/cart

2. You should be redirected to `/login?redirect=/cart`

3. After logging in with Google, you should be redirected back to `/cart`

### 3. Test Admin Access

1. Create an admin user using the setup endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/setup-admin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "name": "Admin User",
       "setupSecret": "your-admin-setup-secret"
     }'
   ```

2. Login with the admin email via Google OAuth

3. Try to access http://localhost:3000/admin/dashboard

4. You should see the admin dashboard (not redirected)

5. Try logging in with a non-admin user and accessing `/admin` - you should be redirected to home with an error

## Testing Payment Flow

### 1. Without Paytm Configured (Graceful Degradation)

If Paytm environment variables are not set:

1. Add products to cart
2. Proceed to checkout
3. Select/add shipping address
4. Click "Continue to Payment"
5. Click "Proceed to Payment"
6. You should see an error message: "Paytm payment gateway is not configured. Please check your environment variables."

**This is expected behavior** - the app won't crash, but payments won't work.

### 2. With Paytm Configured (Full Flow)

1. **Add Products to Cart**
   - Browse products at http://localhost:3000/products
   - Click "Add to Cart" on any product
   - Verify cart count updates in header

2. **Proceed to Checkout**
   - Click cart icon or go to http://localhost:3000/cart
   - Click "Proceed to Checkout"
   - If not logged in, you'll be redirected to login first

3. **Select Shipping Address**
   - Add a new address or select existing
   - Click "Continue to Payment"
   - An order will be created with status "pending"

4. **Initiate Payment**
   - Review order summary
   - Click "Proceed to Payment"
   - You'll be redirected to Paytm's payment gateway (staging)

5. **Complete Payment (Paytm Staging)**
   - Use Paytm test credentials:
     - Card Number: 4111 1111 1111 1111
     - CVV: Any 3 digits
     - Expiry: Any future date
     - OTP: 489871 (for staging)

6. **Payment Callback**
   - After successful payment, Paytm redirects to `/api/payment/callback`
   - Callback API verifies the transaction
   - Order status updates to "confirmed"
   - Payment status updates to "success"
   - You'll be redirected to the order confirmation page

7. **Verify Order**
   - Go to http://localhost:3000/orders
   - Find your order
   - Status should be "confirmed" or "processing"
   - Payment status should be "success"

## Testing Scenarios

### Success Scenarios

- ✅ Login with Google and redirect to intended page
- ✅ Access protected routes after authentication
- ✅ Admin accessing admin dashboard
- ✅ Complete payment with valid card
- ✅ Order created and payment captured
- ✅ View order details after purchase

### Failure Scenarios

- ❌ Access protected route without login → Redirect to `/login?redirect=<original-path>`
- ❌ Non-admin accessing admin route → Redirect to home with error
- ❌ Payment with invalid card → Paytm shows error, order stays "pending"
- ❌ Payment timeout → User can retry payment from orders page
- ❌ Duplicate payment attempt → Error: "Payment already completed for this order"

## Security Checks

### 1. Session Security

```bash
# Check session cookies are httpOnly and secure (in production)
# Open browser DevTools → Application → Cookies
# Verify: next-auth.session-token has HttpOnly and Secure flags (in production)
```

### 2. Admin Route Protection

```bash
# Try accessing admin route without token
curl http://localhost:3000/admin/dashboard
# Should redirect to /login

# Try with non-admin user
# Should redirect to / with error parameter
```

### 3. Payment Validation

```bash
# Try to initiate payment for someone else's order
curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<user1-token>" \
  -d '{"orderId": "<user2-order-id>"}'
# Should return 403 Forbidden
```

### 4. Callback Verification

```bash
# Try to fake a payment callback without valid checksum
curl -X POST http://localhost:3000/api/payment/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ORDERID": "ORD-123456",
    "STATUS": "TXN_SUCCESS",
    "TXNAMOUNT": "1000",
    "CHECKSUMHASH": "fake-checksum"
  }'
# Should fail checksum verification and reject the payment
```

## Common Issues & Solutions

### Issue: "Google sign-in not working"

**Solution:**
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
2. Verify redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google`
3. Check browser console for errors

### Issue: "Redirects to home instead of intended page"

**Solution:**
1. Check the URL has `?redirect=/intended-path` parameter
2. Verify the redirect callback in `src/lib/auth.ts` is working
3. Clear cookies and try again

### Issue: "Paytm payment gateway is not configured"

**Solution:**
1. Verify all Paytm env variables are set in `.env.local`
2. Restart the development server after adding env variables
3. Check server console for Paytm initialization messages:
   - ✅ "Paytm payment gateway configured successfully" (good)
   - ⚠️ "Paytm payment gateway not configured" (missing variables)

### Issue: "Payment callback not working"

**Solution:**
1. Check callback URL matches: `http://localhost:3000/api/payment/callback`
2. Ensure callback URL is whitelisted in Paytm dashboard
3. Check server logs for callback errors
4. For local testing, use ngrok or similar to expose localhost

### Issue: "Order created but payment failed"

**Solution:**
- This is normal - users can retry payment from the orders page
- Check order status in `/orders` - should show "pending"
- Verify payment status is "pending" or "failed"
- User can click "Retry Payment" to try again

## Environment-Specific Notes

### Development
- Uses staging Paytm URLs
- Test cards work
- Callback URL must be accessible (use ngrok for local testing)

### Production
- Update all URLs to production
- Use real Paytm merchant credentials
- Ensure `NODE_ENV=production`
- Enable `useSecureCookies: true` in NextAuth
- Use HTTPS for all URLs
- Set proper CORS policies

## Debugging Tips

1. **Enable NextAuth Debug Mode**
   ```env
   # Already enabled in development
   NEXTAUTH_DEBUG=true
   ```

2. **Check Server Logs**
   ```bash
   # Watch for authentication and payment logs
   npm run dev | grep -E "Sign in|Payment|Paytm|Checksum"
   ```

3. **Browser DevTools**
   - Network tab: Check API calls and responses
   - Console: Check for JavaScript errors
   - Application → Cookies: Verify session cookies

4. **Database Inspection**
   ```bash
   # Connect to MongoDB
   mongosh mongodb://localhost:27017/tapti-spices

   # Check orders
   db.orders.find().sort({createdAt: -1}).limit(5).pretty()

   # Check transactions
   db.transactions.find().sort({createdAt: -1}).limit(5).pretty()

   # Check users
   db.users.find().pretty()
   ```

## Security Best Practices

1. ✅ **Never commit** `.env.local` to git
2. ✅ **Use different secrets** for NEXTAUTH_SECRET and ADMIN_SETUP_SECRET
3. ✅ **Enable HTTPS** in production
4. ✅ **Verify checksums** in payment callbacks
5. ✅ **Validate user ownership** before processing payments
6. ✅ **Use rate limiting** on sensitive endpoints
7. ✅ **Log all** payment transactions for audit
8. ✅ **Implement idempotency** to prevent duplicate charges

## Next Steps

After successful testing:

1. Set up production Paytm account
2. Configure production environment variables
3. Set up proper logging and monitoring
4. Implement email notifications for orders
5. Set up SMS notifications via Twilio
6. Configure Delhivery shipping integration
7. Set up proper error tracking (Sentry)
8. Implement comprehensive logging
9. Add payment reconciliation system
10. Set up automated testing suite
