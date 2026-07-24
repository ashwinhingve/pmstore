import { NextResponse } from 'next/server';

/**
 * Every `/api/v1/*` response carries `apiVersion: 1` at the top level so the
 * mobile client can detect a server it's too old (or too new) to talk to and
 * prompt an update, rather than silently mis-parsing a changed shape.
 */
export function v1Ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ apiVersion: 1, data }, { status });
}

export function v1Error(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ apiVersion: 1, error: { message, code } }, { status });
}
