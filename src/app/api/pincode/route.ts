import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for pincode lookups (5 min TTL)
const pincodeCache = new Map<string, { data: any; expiry: number }>();

export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get('pincode');

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: 'Invalid pincode. Must be 6 digits.' },
      { status: 400 }
    );
  }

  // Check cache
  const cached = pincodeCache.get(pincode);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`,
      { next: { revalidate: 86400 } } // Cache for 24h at edge
    );

    const result = await response.json();

    if (
      !result ||
      !Array.isArray(result) ||
      result[0]?.Status !== 'Success' ||
      !result[0]?.PostOffice?.length
    ) {
      return NextResponse.json(
        { error: 'Pincode not found' },
        { status: 404 }
      );
    }

    const postOffices = result[0].PostOffice;
    const first = postOffices[0];

    const data = {
      pincode,
      city: first.District,
      state: first.State,
      country: first.Country,
      areas: postOffices.map((po: any) => po.Name),
    };

    // Cache for 5 minutes
    pincodeCache.set(pincode, { data, expiry: Date.now() + 5 * 60 * 1000 });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Pincode lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup pincode' },
      { status: 500 }
    );
  }
}
