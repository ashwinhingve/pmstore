# API routes

Applies in addition to the root `CLAUDE.md`. Full contract in `docs/02-API-CONTRACT.md`.

## Handler shape

Route handlers are thin. Authenticate, validate, call a lib function, format the response.
Domain logic lives in `src/lib/`, not here — so it stays testable without HTTP and reusable
across routes.

```ts
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth(req);            // 401 if absent
    const body = createOrderSchema.parse(await req.json());
    const order = await createOrder(session.userId, body);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    return handleApiError(err);                        // src/lib/utils/errorHandler.ts
  }
}
```

## Rules

- `await connectDB()` first, always.
- Validate every input with a Zod schema from `src/lib/validations/`. No exceptions, including
  query params and route params.
- **Never trust client-supplied prices.** Reload products from the database and recompute.
- **Never trust the JWT role for a destructive action.** Re-read the user from the database.
- Enforce the prescription rule server-side. A disabled button is not access control.
- Never return a raw Mongoose error — it leaks schema shape. Go through `handleApiError`.
- Never log prescription URLs, phone numbers, addresses, OTPs, tokens or payment signatures.
- `.lean()` on reads that feed React. Serialize `_id` to string at the boundary.
- Rate limit anything that sends mail, accepts an upload, or creates an order.

## Payments

Only `/api/payment/callback` may mark an order paid, and only after verifying the gateway
signature and checking the idempotency key. Stock decrements there and nowhere else. A
client-side success redirect means nothing.
