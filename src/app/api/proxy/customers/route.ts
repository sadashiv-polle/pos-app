// app/api/proxy/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    
    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      return NextResponse.json({ error: 'FRAPPE_URL not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('id');
    
    let apiUrl: string;
    
    if (customerId) {
      apiUrl = `${frappeUrl}/api/resource/Customer/${customerId}`;
    } else {
      const fields = [
        "name",
        "customer_name",
        "customer_type",
        "email_id",
        "mobile_no"
      ];
      apiUrl = `${frappeUrl}/api/resource/Customer?fields=${JSON.stringify(fields)}&limit_page_length=100`;
    }

    console.log('Fetching customers from:', apiUrl);

    const res = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    if (!res.ok) {
      console.error('Error response:', res.status);
      return NextResponse.json({ data: [], error: `Failed to fetch customers: ${res.status}` });
    }

    const data = await res.json();
    
    return NextResponse.json({ 
      data: data.data || [],
      message: 'Success'
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ data: [], error: error.message || 'Failed to fetch customers' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;

    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      return NextResponse.json({ error: 'FRAPPE_URL not configured' }, { status: 500 });
    }

    const body = await request.json();

    if (!body.customer_name) {
      return NextResponse.json({ error: 'customer_name is required' }, { status: 400 });
    }

    const customerData: any = {
      customer_name: body.customer_name,
      customer_type: body.customer_type || 'Individual',
    };
    
    if (body.email_id) {
      customerData.email_id = body.email_id;
    }
    if (body.mobile_no) {
      customerData.mobile_no = body.mobile_no;
    }

    const res = await fetch(`${frappeUrl}/api/resource/Customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify(customerData),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ 
        error: data.message || 'Failed to create customer'
      }, { status: res.status });
    }

    return NextResponse.json({ 
      data: data.data || data,
      message: 'Customer created successfully'
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create customer' 
    }, { status: 500 });
  }
}