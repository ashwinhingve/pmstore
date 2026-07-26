import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for pincode lookups (5 min TTL)
const pincodeCache = new Map<string, { data: unknown; expiry: number }>();

// How long to wait on the free third-party postal API before giving up.
const LOOKUP_TIMEOUT_MS = 5000;

/**
 * A soft failure: the lookup didn't work, but the user can still type city and
 * state by hand. Returned as 200 so it never surfaces as a console error on the
 * checkout page — the form reads `error` and shows it as a hint, not a crash.
 */
function unavailable(message: string) {
  return NextResponse.json({ error: message, unavailable: true }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get('pincode');

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: 'Enter a valid 6-digit PIN code.' },
      { status: 400 }
    );
  }

  // Serve from cache when fresh.
  const cached = pincodeCache.get(pincode);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // The upstream postal API is a free service with no SLA. Cap the wait so a
  // slow, blocked, or down response never hangs checkout, and treat every
  // failure as a soft "enter it manually" rather than a 500.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`,
      { signal: controller.signal, next: { revalidate: 86400 } } // cache 24h at edge
    );

    if (!response.ok) {
      return unavailable('Could not look up this PIN code. Enter your city and state.');
    }

    const result = await response.json();

    if (
      !result ||
      !Array.isArray(result) ||
      result[0]?.Status !== 'Success' ||
      !result[0]?.PostOffice?.length
    ) {
      return unavailable('PIN code not found. Enter your city and state.');
    }

    const postOffices = result[0].PostOffice;
    const first = postOffices[0];

    const data = {
      pincode,
      city: first.District,
      state: first.State,
      country: first.Country,
      areas: postOffices.map((po: { Name: string }) => po.Name),
    };

    pincodeCache.set(pincode, { data, expiry: Date.now() + 5 * 60 * 1000 });

    return NextResponse.json(data);
  } catch {
    // Timed out or network error — soft-fail so checkout continues.
    return unavailable('Could not look up this PIN code. Enter your city and state.');
  } finally {
    clearTimeout(timeout);
  }
}
