# Paytm & Delhivery Integration Guide

This guide will help you set up Paytm Payment Gateway and Delhivery Shipping API integration.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Phase 2: Paytm Payment Integration](#phase-2-paytm-payment-integration)
- [Phase 3: Delhivery Shipping Integration](#phase-3-delhivery-shipping-integration)
- [Email & SMS Notifications](#email--sms-notifications)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** database
3. **Paytm Merchant Account** (for payment gateway)
4. **Delhivery Account** (for shipping)
5. **Email SMTP** (Gmail, SendGrid, or similar)
6. **Twilio Account** (for SMS notifications)

---

## Phase 2: Paytm Payment Integration

### Step 1: Create Paytm Merchant Account

1. Visit [Paytm Dashboard](https://dashboard.paytm.com/next/)
2. Sign up for a merchant account
3. Complete KYC verification
4. Navigate to **API Keys** section

### Step 2: Get Paytm Credentials

From your Paytm dashboard, obtain:
- **Merchant ID (MID)**
- **Merchant Key**
- **Website Name** (WEBSTAGING for staging, DEFAULT for production)

### Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Paytm Configuration
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_WEBSITE=WEBSTAGING
PAYTM_CHANNEL_ID=WEB
PAYTM_INDUSTRY_TYPE_ID=Retail
PAYTM_CALLBACK_URL=http://localhost:3000/api/payment/callback
PAYTM_TRANSACTION_URL=https://securegw-stage.paytm.in/order/process
PAYTM_TRANSACTION_STATUS_URL=https://securegw-stage.paytm.in/order/status
```

### Step 4: Test Payment Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Add items to cart and proceed to checkout
3. Complete address selection
4. Click "Proceed to Payment"
5. Use Paytm test cards for staging:
   - Card Number: `4111111111111111`
   - Expiry: Any future date
   - CVV: `123`

### Step 5: Verify Payment Success

After successful payment:
- Check order status → should be "confirmed"
- Check payment status → should be "paid"
- Product stock should be reduced
- Order confirmation email should be sent
- Shipment should be created automatically

---

## Phase 3: Delhivery Shipping Integration

### Step 1: Create Delhivery Account

1. Visit [Delhivery](https://www.delhivery.com/)
2. Sign up for a business account
3. Request API access (contact support for staging credentials)

### Step 2: Get Delhivery API Key

From Delhivery dashboard:
1. Navigate to **API Settings**
2. Generate API Token
3. Note down your API key

### Step 3: Configure Warehouse Details

Add the following to your `.env.local` file:

```env
# Delhivery Configuration
DELHIVERY_API_KEY=your_delhivery_api_key
DELHIVERY_BASE_URL=https://staging-express.delhivery.com
DELHIVERY_RETURN_PINCODE=400001
DELHIVERY_RETURN_ADDRESS=Your Warehouse Address, Area Name
DELHIVERY_RETURN_CITY=Mumbai
DELHIVERY_RETURN_STATE=Maharashtra
DELHIVERY_RETURN_COUNTRY=India
DELHIVERY_RETURN_NAME=Tapti Spices
DELHIVERY_RETURN_PHONE=9876543210
DELHIVERY_WEBHOOK_SECRET=generate-random-secure-string
```

### Step 4: Test Shipment Creation

1. Complete a test order with payment
2. Shipment should be created automatically
3. Check order details page for tracking number
4. Click "View Tracking" to see shipment timeline

### Step 5: Set Up Delhivery Webhook (Optional)

For production, configure webhook to receive real-time status updates:

1. In Delhivery dashboard, add webhook URL:
   ```
   https://yourdomain.com/api/shipping/webhook
   ```

2. Set webhook secret in environment variables

3. Webhook will receive shipment status updates automatically

---

## Email & SMS Notifications

### Email Setup (Gmail Example)

1. Create a Gmail account for sending emails
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Go to Google Account → Security → App Passwords
   - Create password for "Mail"
4. Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=Tapti Spices <noreply@taptispices.com>
```

### SMS Setup (Twilio)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get a phone number
3. Find credentials in dashboard:
   - Account SID
   - Auth Token
   - Phone Number
4. Add to `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Testing

### Test Payment Flow

1. **Successful Payment:**
   - Use test card: 4111111111111111
   - Verify order status changes to "confirmed"
   - Verify stock is reduced
   - Check email/SMS notifications

2. **Failed Payment:**
   - Use invalid CVV
   - Verify order stays "pending"
   - Verify stock is NOT reduced

3. **Order Cancellation:**
   - Cancel a confirmed order
   - Verify stock is restored
   - Verify refund transaction is created

### Test Shipping Flow

1. **Serviceability Check:**
   - Enter different PIN codes during checkout
   - Verify serviceable/non-serviceable messages

2. **Shipment Creation:**
   - Complete payment successfully
   - Verify shipment is created automatically
   - Check waybill number is generated

3. **Tracking:**
   - Open order details page
   - Click "View Tracking"
   - Verify tracking timeline is displayed

---

## Production Deployment

### Pre-Production Checklist

- [ ] Switch Paytm to production URLs
- [ ] Update `PAYTM_WEBSITE` to `DEFAULT`
- [ ] Switch Delhivery to production URL
- [ ] Configure production callback/webhook URLs
- [ ] Set up production SMTP credentials
- [ ] Set up production Twilio credentials
- [ ] Configure production domain in `NEXT_PUBLIC_APP_URL`
- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS on your domain
- [ ] Test complete flow in staging environment

### Production Environment Variables

Update `.env.production`:

```env
# Paytm Production
PAYTM_WEBSITE=DEFAULT
PAYTM_CALLBACK_URL=https://yourdomain.com/api/payment/callback
PAYTM_TRANSACTION_URL=https://securegw.paytm.in/order/process
PAYTM_TRANSACTION_STATUS_URL=https://securegw.paytm.in/order/status

# Delhivery Production
DELHIVERY_BASE_URL=https://track.delhivery.com

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Deployment Steps

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform (Vercel, Railway, etc.)

3. Set environment variables in deployment platform

4. Test payment and shipping in production

5. Monitor logs for any errors

---

## Troubleshooting

### Payment Issues

**Problem:** Checksum verification failed
- **Solution:** Verify `PAYTM_MERCHANT_KEY` is correct
- Check that all parameters are sent correctly

**Problem:** Payment succeeds but order not updated
- **Solution:** Check callback URL is accessible
- Verify callback route is handling POST requests

### Shipping Issues

**Problem:** PIN code not serviceable
- **Solution:** Verify PIN code is valid
- Check Delhivery API credentials

**Problem:** Shipment creation fails
- **Solution:** Verify all return address details are correct
- Check product weights are set
- Ensure order is paid before shipment creation

### Notification Issues

**Problem:** Emails not sending
- **Solution:** Verify SMTP credentials
- Check email server allows less secure apps (if using Gmail)
- Use App Password instead of regular password

**Problem:** SMS not sending
- **Solution:** Verify Twilio credentials
- Check phone number format (+91 for India)
- Ensure Twilio account has balance

---

## API Documentation

### Payment APIs

#### Initiate Payment
```
POST /api/payment/initiate
Body: { orderId: string }
Response: { paytmParams, checksum, paytmUrl }
```

#### Payment Callback
```
POST /api/payment/callback
Body: Paytm callback parameters
Response: HTML redirect to order page
```

### Shipping APIs

#### Create Shipment
```
POST /api/shipping/create
Body: { orderId: string, isAutomatic?: boolean }
Response: { shipment, waybill }
```

#### Track Shipment
```
GET /api/shipping/track?waybill=XXX
Response: { tracking data with scans }
```

#### Check Serviceability
```
GET /api/shipping/check-serviceability?pincode=110001
Response: { serviceable: boolean, estimatedDays: number }
```

### Order APIs

#### Cancel Order
```
POST /api/orders/[orderId]/cancel
Body: { reason?: string }
Response: { success, refundAmount }
```

---

## Support

For issues or questions:
1. Check logs in `/api` routes
2. Verify environment variables
3. Test with Paytm/Delhivery staging environments first
4. Contact Paytm/Delhivery support for API-specific issues

---

## License

This integration is part of the Tapti Spices e-commerce platform.
