// app/api/proxy/items/route.ts
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
    const itemId = searchParams.get('id');
    
    let apiUrl: string;
    
    if (itemId) {
      // Fetch single item with all details
      apiUrl = `${frappeUrl}/api/resource/Item/${itemId}`;
    } else {
      // Fetch all items with fields including stock information
      const fields = [
        "name",
        "item_code",
        "item_name",
        "item_group",
        "standard_rate",
        "stock_uom",
        "description",
        "disabled",
        "opening_stock",
        "is_stock_item",
        "valuation_rate",
        "last_purchase_rate",
        "brand",
        "image"
      ];
      
      apiUrl = `${frappeUrl}/api/resource/Item?fields=${JSON.stringify(fields)}&limit_page_length=100`;
    }

    console.log('Fetching items from:', apiUrl);

    const res = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      return NextResponse.json({ 
        data: [], 
        error: `Failed to fetch items: ${res.status}`,
        details: errorText 
      }, { status: res.status });
    }

    const data = await res.json();
    
    // Log the first item to check if opening_stock is present
    if (data.data && data.data.length > 0) {
      console.log('Sample item with fields:', {
        name: data.data[0].name,
        item_code: data.data[0].item_code,
        opening_stock: data.data[0].opening_stock,
        is_stock_item: data.data[0].is_stock_item
      });
    }
    
    return NextResponse.json({ 
      data: data.data || [],
      message: 'Success'
    });
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ 
      data: [], 
      error: error.message || 'Failed to fetch items' 
    }, { status: 500 });
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
    console.log('Creating item with data:', body);

    // Validate required fields
    if (!body.item_code || !body.item_name) {
      return NextResponse.json({ 
        error: 'item_code and item_name are required' 
      }, { status: 400 });
    }

    // Prepare item data with all fields
    const itemData = {
      item_code: body.item_code,
      item_name: body.item_name,
      item_group: body.item_group || 'Products',
      standard_rate: parseFloat(body.standard_rate) || 0,
      stock_uom: body.stock_uom || 'Nos',
      description: body.description || '',
      opening_stock: parseFloat(body.opening_stock) || 0,
      is_stock_item: body.is_stock_item !== undefined ? body.is_stock_item : 1,
    };

    const res = await fetch(`${frappeUrl}/api/resource/Item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: JSON.stringify(itemData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      let errorMessage = 'Failed to create item';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.exception || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json({ 
        error: errorMessage,
        details: errorText
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ 
      data: data.data || data,
      message: 'Item created successfully'
    });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create item' 
    }, { status: 500 });
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
      return NextResponse.json({ error: 'FRAPPE_URL not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const res = await fetch(`${frappeUrl}/api/resource/Item/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      let errorMessage = 'Failed to update item';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.exception || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json({ 
        error: errorMessage,
        details: errorText
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ 
      data: data.data || data,
      message: 'Item updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update item' 
    }, { status: 500 });
  }
}