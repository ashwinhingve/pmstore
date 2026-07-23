import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import '@/models/OrderItem';
import '@/models/Address';

/**
 * GET /api/orders/[orderId]/invoice
 * Generate and return invoice HTML for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Get session
    const session = await getSession();
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orderId } = await params;

    // Connect to database
    await connectDB();

    // orderId can be either MongoDB ObjectId or orderNumber
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
    const query: any = isObjectId ? { _id: orderId } : { orderNumber: orderId };
    if (session.user.role !== 'admin') {
      query.userId = session.user.id;
    }

    const order = await Order.findOne(query)
      .populate('userId', 'name email')
      .populate('shippingAddressId')
      .populate('items')
      .lean();

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(order);

    return new NextResponse(invoiceHTML, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate invoice:', error);
    return new NextResponse('Failed to generate invoice', { status: 500 });
  }
}

function formatINR(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateInvoiceHTML(order: any): string {
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #d97706;
    }

    .company-info h1 {
      font-size: 28px;
      background: linear-gradient(to right, #d97706, #dc2626);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 5px;
    }

    .company-info p {
      color: #666;
      font-size: 14px;
    }

    .invoice-details {
      text-align: right;
    }

    .invoice-details h2 {
      font-size: 24px;
      color: #111;
      margin-bottom: 10px;
    }

    .invoice-details p {
      font-size: 14px;
      color: #666;
      margin: 5px 0;
    }

    .addresses {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-bottom: 40px;
    }

    .address-block {
      flex: 1;
    }

    .address-block h3 {
      font-size: 16px;
      color: #111;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .address-block p {
      font-size: 14px;
      color: #666;
      margin: 3px 0;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table thead {
      background: linear-gradient(to right, #d97706, #dc2626);
      color: white;
    }

    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table tbody tr:last-child {
      border-bottom: 2px solid #d97706;
    }

    .items-table td {
      padding: 12px;
      font-size: 14px;
    }

    .summary {
      margin-left: auto;
      width: 300px;
      margin-bottom: 40px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-row.total {
      border-top: 2px solid #111;
      margin-top: 10px;
      padding-top: 10px;
      font-size: 18px;
      font-weight: bold;
      color: #d97706;
    }

    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      color: #666;
      font-size: 12px;
    }

    .payment-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 10px;
    }

    .payment-success {
      background: #dcfce7;
      color: #166534;
    }

    .payment-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .payment-failed {
      background: #fee2e2;
      color: #991b1b;
    }

    @media print {
      body {
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }

    .print-button {
      background: linear-gradient(to right, #d97706, #dc2626);
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .print-button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print Invoice</button>

  <div class="invoice-header">
    <div class="company-info">
      <h1>Tapti Food & Spices</h1>
      <p>Premium Quality Food Products</p>
      <p>Email: support@taptifs.com</p>
      <p>Phone: +91-93292 16544</p>
      <p>GST No: 23GGLPD7346M1ZZ</p>
    </div>
    <div class="invoice-details">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${order.orderNumber}</p>
      <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
      <p><strong>Order Date:</strong> ${orderDate}</p>
      <span class="payment-status payment-${order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'pending' ? 'pending' : 'failed'}">
        ${order.paymentStatus === 'paid' ? 'PAID' : order.paymentStatus === 'pending' ? 'PENDING' : 'FAILED'}
      </span>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Bill To:</h3>
      <p><strong>${order.shippingAddressId?.fullName || order.userId?.name || 'N/A'}</strong></p>
      <p>${order.userId?.email || 'N/A'}</p>
      <p>${order.shippingAddressId?.phoneNumber || 'N/A'}</p>
    </div>
    <div class="address-block">
      <h3>Ship To:</h3>
      <p><strong>${order.shippingAddressId?.fullName || 'N/A'}</strong></p>
      <p>${order.shippingAddressId?.addressLine1 || ''}</p>
      ${order.shippingAddressId?.addressLine2 ? `<p>${order.shippingAddressId.addressLine2}</p>` : ''}
      <p>${order.shippingAddressId?.city || ''}, ${order.shippingAddressId?.state || ''} ${order.shippingAddressId?.postalCode || ''}</p>
      <p>${order.shippingAddressId?.country || 'India'}</p>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th>GST%</th>
        <th>Qty</th>
        <th>Unit Price (Incl. GST)</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items
        ?.map((item: any) => {
          const price = item.priceAtPurchase || item.price || 0;
          const qty = item.quantity || 0;
          const gstRate = item.gstRate ?? 5;
          return `
        <tr>
          <td><strong>${item.productName || 'N/A'}</strong></td>
          <td>${item.productSku || item.sku || 'N/A'}</td>
          <td>${gstRate}%</td>
          <td>${qty}</td>
          <td>₹${formatINR(price)}</td>
          <td>₹${formatINR(price * qty)}</td>
        </tr>`;
        })
        .join('') || '<tr><td colspan="6">No items</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Taxable Value:</span>
      <span>₹${formatINR((order.subtotal || 0) - (order.taxAmount || 0))}</span>
    </div>
    ${(() => {
      const cgst = order.cgst || 0;
      const sgst = order.sgst || 0;
      const igst = order.igst || 0;
      const taxAmount = order.taxAmount || 0;
      if (order.isIntraState && (cgst > 0 || sgst > 0)) {
        return `
    <div class="summary-row">
      <span>CGST:</span>
      <span>₹${formatINR(cgst)}</span>
    </div>
    <div class="summary-row">
      <span>SGST:</span>
      <span>₹${formatINR(sgst)}</span>
    </div>`;
      } else if (!order.isIntraState && igst > 0) {
        return `
    <div class="summary-row">
      <span>IGST:</span>
      <span>₹${formatINR(igst)}</span>
    </div>`;
      } else if (taxAmount > 0) {
        return `
    <div class="summary-row">
      <span>GST:</span>
      <span>₹${formatINR(taxAmount)}</span>
    </div>`;
      }
      return '';
    })()}
    ${order.shippingCost ? `
    <div class="summary-row">
      <span>Shipping:</span>
      <span>₹${formatINR(order.shippingCost)}</span>
    </div>` : ''}
    ${order.discountAmount ? `
    <div class="summary-row">
      <span>Discount${order.discountCode ? ` (${order.discountCode})` : ''}:</span>
      <span>-₹${formatINR(order.discountAmount)}</span>
    </div>` : ''}
    <div class="summary-row total">
      <span>Total:</span>
      <span>₹${formatINR(order.totalAmount || 0)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
    <p>&copy; ${new Date().getFullYear()} Tapti Food & Spices. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
