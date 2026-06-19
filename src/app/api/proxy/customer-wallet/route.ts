// app/api/proxy/customer-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;

    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized', data: [] }, { status: 401 });
    }

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      return NextResponse.json({ error: 'FRAPPE_URL not configured', data: [] }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fields = searchParams.get('fields');
    const limit = searchParams.get('limit') || '500';
    const walletId = searchParams.get('id');
    const filters = searchParams.get('filters');

    try {
      let url: URL;
      
      if (walletId) {
        url = new URL(`${frappeUrl}/api/resource/Customer%20Wallet/${walletId}`);
      } else {
        url = new URL(`${frappeUrl}/api/resource/Customer%20Wallet`);
        
        if (fields) {
          url.searchParams.set('fields', fields);
        } else {
          url.searchParams.set(
            'fields',
            '["name","customer","card_uid","wallet_balance","status","user","last_recharge_date"]'
          );
        }

        if (filters) {
          url.searchParams.set('filters', filters);
        }

        if (limit) {
          url.searchParams.set('limit_page_length', limit);
        }
      }

      console.log('Fetching wallets from:', url.toString());

      const res = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to fetch wallets:', res.status);
        return NextResponse.json(
          { error: 'Failed to fetch wallets', data: [] },
          { status: res.status }
        );
      }

      const data = await res.json();
      console.log('Wallets found:', data.data?.length || 0);
      
      return NextResponse.json({
        data: data.data || [],
        message: data.message || 'Success',
      });
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Network error', details: fetchError.message, data: [] },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in customer-wallet API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, data: [] },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'FRAPPE_URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    if (!body.customer) {
      return NextResponse.json(
        { error: 'Customer is required' },
        { status: 400 }
      );
    }

    const walletData = {
      customer: body.customer,
      card_uid: body.card_uid || '',
      wallet_balance: body.wallet_balance || 0,
      status: body.status || 'Active',
    };

    const url = new URL(`${frappeUrl}/api/resource/Customer%20Wallet`);
    
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify(walletData),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { message: res.statusText };
      }
      
      return NextResponse.json(
        { error: 'Failed to create wallet', details: errorData },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ 
      data: data.data || data,
      message: 'Wallet created successfully' 
    });
  } catch (error: any) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;

    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      return NextResponse.json(
        { error: 'FRAPPE_URL not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const walletId = searchParams.get('id');

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    if (!body.card_uid) {
      return NextResponse.json(
        { error: 'Card UID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (body.card_uid) updateData.card_uid = body.card_uid;
    if (body.wallet_balance !== undefined) updateData.wallet_balance = body.wallet_balance;
    if (body.status) updateData.status = body.status;

    const url = new URL(`${frappeUrl}/api/resource/Customer%20Wallet/${walletId}`);
    
    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { message: res.statusText };
      }
      
      return NextResponse.json(
        { error: 'Failed to update wallet', details: errorData },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ 
      data: data.data || data,
      message: 'Wallet updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet', details: error.message },
      { status: 500 }
    );
  }
}