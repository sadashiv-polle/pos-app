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
      return NextResponse.json({ error: 'Frappe URL not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = searchParams.get('filters') || '[]';
    const fields = searchParams.get('fields') || '["name","grand_total","customer","posting_date"]';
    const limit = searchParams.get('limit') || '20';
    
    const url = new URL(`${frappeUrl}/api/resource/POS%20Invoice`);
    url.searchParams.set('filters', filters);
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', limit);
    url.searchParams.set('order_by', 'creation desc');

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Error fetching POS invoices:', error);
    return NextResponse.json({ 
      data: [],
      message: 'Failed to fetch POS invoices'
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    
    console.log('=== CREATING POS INVOICE ===');
    console.log('SID present:', !!sid);
    
    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Customer:', body.customer);
    console.log('Items count:', body.items?.length);
    console.log('POS Profile:', body.pos_profile);

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      return NextResponse.json({ 
        error: 'Frappe URL not configured. Please check .env.local' 
      }, { status: 500 });
    }

    // First, get the POS Profile to get company and warehouse
    console.log('Fetching POS Profile:', body.pos_profile);
    const posProfileUrl = `${frappeUrl}/api/resource/POS%20Profile/${body.pos_profile}`;
    
    let posProfile = {};
    let posProfileRes;
    
    try {
      posProfileRes = await fetch(posProfileUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Cookie: `sid=${sid}`,
        },
      });
      
      if (posProfileRes.ok) {
        posProfile = await posProfileRes.json();
        console.log('POS Profile found:', posProfile);
      } else {
        console.log('POS Profile not found, using defaults');
      }
    } catch (err) {
      console.log('Error fetching POS Profile:', err);
    }

    // Calculate totals
    const totalAmount = body.items.reduce((sum: number, item: any) => sum + (item.rate * item.qty), 0);
    const discountAmount = (totalAmount * (body.additional_discount_percentage || 0)) / 100;
    const grandTotal = totalAmount - discountAmount;

    // Build payload with proper amounts
    const payload: any = {
      customer: body.customer,
      pos_profile: body.pos_profile,
      posting_date: body.set_posting_date || new Date().toISOString().split('T')[0],
      set_posting_date: body.set_posting_date || new Date().toISOString().split('T')[0],
      is_pos: 1,
      additional_discount_percentage: body.additional_discount_percentage || 0,
      items: body.items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty || 1,
        rate: item.rate || 0,
      })),
      payments: body.payments || [{ mode_of_payment: 'Cash', amount: grandTotal }],
      // IMPORTANT: Set these to submit and mark as paid
      paid_amount: grandTotal,
      grand_total: grandTotal,
      rounded_total: grandTotal,
      total: totalAmount,
      net_total: totalAmount,
      base_grand_total: grandTotal,
      base_paid_amount: grandTotal,
      // Add write_off_amount to ensure no outstanding balance
      write_off_amount: 0,
      outstanding_amount: 0,
    };

    // Add company from POS Profile or use default
    if (body.company) {
      payload.company = body.company;
    } else if (posProfile.data?.company) {
      payload.company = posProfile.data.company;
    } else {
      // Try to get default company
      try {
        const settingsRes = await fetch(`${frappeUrl}/api/resource/System%20Settings?fields=["default_company"]`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Cookie: `sid=${sid}`,
          },
        });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.data?.default_company) {
            payload.company = settings.data.default_company;
          }
        }
      } catch (err) {
        console.log('Error fetching default company:', err);
      }
    }

    // Add warehouse
    if (body.set_warehouse) {
      payload.set_warehouse = body.set_warehouse;
    } else if (posProfile.data?.warehouse) {
      payload.set_warehouse = posProfile.data.warehouse;
    }

    // Add warehouse to items
    if (payload.set_warehouse) {
      payload.items = payload.items.map((item: any) => ({
        ...item,
        warehouse: payload.set_warehouse,
      }));
    }

    console.log('Final payload:', JSON.stringify(payload, null, 2));

    // STEP 1: Create the POS Invoice
    const url = `${frappeUrl}/api/resource/POS%20Invoice`;
    console.log('Sending to:', url);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    console.log('Create Response Status:', res.status);
    console.log('Create Response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      return NextResponse.json(
        { error: 'Invalid response from Frappe', raw: responseText.substring(0, 500) },
        { status: 500 }
      );
    }

    if (!res.ok) {
      console.error('Frappe error:', data);
      return NextResponse.json(
        { 
          error: data.message || data.exception || 'Failed to create POS invoice',
          details: data,
          status: res.status 
        },
        { status: res.status }
      );
    }

    const invoiceName = data.data?.name;
    console.log('POS Invoice created:', invoiceName);

    // STEP 2: Submit the invoice to make it Paid
    if (invoiceName) {
      try {
        console.log('Submitting invoice:', invoiceName);
        const submitUrl = `${frappeUrl}/api/resource/POS%20Invoice/${invoiceName}`;
        
        // First, get the current doc to check status
        const getRes = await fetch(submitUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Cookie: `sid=${sid}`,
          },
        });
        
        if (getRes.ok) {
          const getData = await getRes.json();
          console.log('Current doc status:', getData.data?.docstatus);
          
          // If docstatus is 0 (Draft), submit it
          if (getData.data?.docstatus === 0) {
            // Update the document to set docstatus to 1 (Submitted)
            const submitPayload = {
              ...getData.data,
              docstatus: 1,
            };
            
            const submitRes = await fetch(submitUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                Cookie: `sid=${sid}`,
              },
              body: JSON.stringify(submitPayload),
            });
            
            const submitData = await submitRes.json();
            console.log('Submit response:', submitData);
            
            if (!submitRes.ok) {
              console.error('Error submitting invoice:', submitData);
              // Try alternative method - use the action endpoint
              console.log('Trying alternative submit method...');
              const actionUrl = `${frappeUrl}/api/resource/POS%20Invoice/${invoiceName}?action=submit`;
              const actionRes = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  Cookie: `sid=${sid}`,
                },
              });
              const actionData = await actionRes.json();
              console.log('Action submit response:', actionData);
            }
          }
        }
      } catch (submitError) {
        console.error('Error submitting invoice:', submitError);
        // Don't fail the request if submit fails - invoice is still created
      }
    }

    // STEP 3: Try to mark as paid (if submit worked, this is automatic)
    // If still not marked as paid, update the payments
    try {
      // Update payments to ensure they're marked as paid
      const paymentUrl = `${frappeUrl}/api/resource/POS%20Invoice/${invoiceName}`;
      const updateRes = await fetch(paymentUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Cookie: `sid=${sid}`,
        },
        body: JSON.stringify({
          paid_amount: grandTotal,
          outstanding_amount: 0,
          status: 'Paid',
        }),
      });
      console.log('Update payment status:', updateRes.status);
    } catch (updateError) {
      console.error('Error updating payment status:', updateError);
    }

    // Fetch the final invoice to get updated status
    let finalInvoice = data;
    try {
      const finalRes = await fetch(`${frappeUrl}/api/resource/POS%20Invoice/${invoiceName}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Cookie: `sid=${sid}`,
        },
      });
      if (finalRes.ok) {
        finalInvoice = await finalRes.json();
        console.log('Final invoice status:', finalInvoice.data?.docstatus, finalInvoice.data?.status);
      }
    } catch (err) {
      console.error('Error fetching final invoice:', err);
    }

    return NextResponse.json({ 
      success: true, 
      data: finalInvoice.data || data.data,
      message: 'Invoice created successfully'
    });
  } catch (error: any) {
    console.error('Error creating POS invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create POS invoice', 
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
