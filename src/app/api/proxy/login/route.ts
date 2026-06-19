import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { usr, pwd } = await request.json();
    
    // Forward the login request to Frappe
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ usr, pwd }),
      }
    );

    // Get the session cookie from the response
    const setCookie = response.headers.get('set-cookie');
    const data = await response.json();

    // Create response
    const nextResponse = NextResponse.json({
      success: data.message === 'Logged In',
      message: data.message,
    });

    // Forward the session cookie if login was successful
    if (setCookie && data.message === 'Logged In') {
      nextResponse.headers.set('Set-Cookie', setCookie);
    }

    return nextResponse;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    );
  }
}
