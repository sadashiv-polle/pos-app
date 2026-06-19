import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    if (sid) {
      // Verify the session with Frappe
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/frappe.auth.get_logged_user`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Cookie: `sid=${sid.value}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (data.message) {
        return NextResponse.json({ 
          success: true, 
          user: data.message 
        });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }
}
