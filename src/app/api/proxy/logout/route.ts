import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    if (sid) {
      // Logout from Frappe
      await fetch(
        `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/logout`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Cookie: `sid=${sid.value}`,
          },
        }
      );
    }
    
    // Delete the session cookie
    cookieStore.delete('sid');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to logout' 
    }, { status: 500 });
  }
}
