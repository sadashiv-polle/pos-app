import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    
    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    
    console.log('=== TESTING FRAPPE CONNECTION ===');
    console.log('Frappe URL:', frappeUrl);
    console.log('SID present:', !!sid);

    if (!frappeUrl) {
      return NextResponse.json({ 
        success: false,
        error: 'NEXT_PUBLIC_FRAPPE_URL is not set in .env.local'
      }, { status: 500 });
    }

    // Try to ping Frappe
    const pingUrl = `${frappeUrl}/api/method/ping`;
    console.log('Pinging:', pingUrl);
    
    const pingRes = await fetch(pingUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    const pingData = await pingRes.json();
    console.log('Ping response:', pingData);
    
    return NextResponse.json({
      success: true,
      ping: pingData,
      frappe_url: frappeUrl,
      sid_present: !!sid,
      message: '✅ Frappe is reachable!',
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      frappe_url: process.env.NEXT_PUBLIC_FRAPPE_URL,
      message: '❌ Cannot connect to Frappe. Please check if Frappe is running.',
    }, { status: 500 });
  }
}
