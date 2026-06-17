import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const sid = cookieStore.get('sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];
  const url = `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/POS%20Invoice?filters=[["posting_date","=","${today}"]]&fields=["grand_total","name"]`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Cookie: `sid=${sid}` },
  });
  const data = await res.json();
  const total = data.data?.reduce((acc: number, inv: any) => acc + inv.grand_total, 0) || 0;

  return NextResponse.json({
    today_sales: total,
    invoice_count: data.data?.length || 0,
  });
}