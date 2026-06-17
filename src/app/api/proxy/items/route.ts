import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const sid = cookieStore.get('sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(`${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Item`);
  url.search = request.nextUrl.search;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Cookie: `sid=${sid}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const sid = cookieStore.get('sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const res = await fetch(`${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `sid=${sid}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}