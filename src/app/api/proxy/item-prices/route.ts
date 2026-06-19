import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;

    if (!sid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const priceListFilter = searchParams.get('price_list') || 'Standard Selling';
    const itemCode = searchParams.get('item_code') || '';

    // Build the URL
    const url = new URL(
      `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Item%20Price`
    );

    // Build filters - we want to filter by price_list
    let filters = `[["price_list","=","${priceListFilter}"]]`;
    
    // If item_code is provided, add it to filters
    if (itemCode) {
      filters = `[["price_list","=","${priceListFilter}"],["item_code","=","${itemCode}"]]`;
    }

    // Set parameters
    url.searchParams.set("fields", '["name","item_code","price_list_rate","price_list","uom"]');
    url.searchParams.set("filters", filters);
    url.searchParams.set("limit_page_length", "500");
    url.searchParams.set("order_by", "modified desc");

    console.log('=== FETCHING ITEM PRICES ===');
    console.log('URL:', url.toString());

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Cookie': `sid=${sid}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    console.log('Response Status:', res.status);
    console.log('Response Length:', text.length);

    let data;
    try {
      data = JSON.parse(text);
      console.log('Parsed Data:', JSON.stringify(data, null, 2));
    } catch {
      console.error('Frappe returned non-JSON:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Invalid Frappe response', raw: text.substring(0, 500) },
        { status: 500 }
      );
    }

    // If no data found, return empty array
    if (!data.data || data.data.length === 0) {
      console.log('No Item Price records found for:', priceListFilter);
      return NextResponse.json({ 
        data: [],
        message: `No Item Price records found for "${priceListFilter}" price list`,
        success: true,
        count: 0
      });
    }

    console.log(`Found ${data.data.length} item prices`);
    return NextResponse.json({ 
      data: data.data,
      success: true,
      count: data.data.length,
      price_list: priceListFilter
    });
  } catch (error) {
    console.error('Error fetching item prices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch item prices',
        details: String(error),
        data: [],
        success: false
      },
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

    const body = await request.json();
    console.log('Creating Item Price:', body);

    // Validate required fields
    if (!body.item_code) {
      return NextResponse.json({ error: 'item_code is required' }, { status: 400 });
    }
    if (!body.price_list_rate && body.price_list_rate !== 0) {
      return NextResponse.json({ error: 'price_list_rate is required' }, { status: 400 });
    }

    // Prepare data for Frappe
    const priceData = {
      item_code: body.item_code,
      price_list: body.price_list || "Standard Selling",
      price_list_rate: parseFloat(body.price_list_rate) || 0,
      uom: body.uom || "Nos",
      buying: 0,
      selling: 1,
    };

    console.log('Sending to Frappe:', priceData);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Item%20Price`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Cookie: `sid=${sid}`,
        },
        body: JSON.stringify(priceData),
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid response:', text);
      return NextResponse.json({ error: 'Invalid response from Frappe' }, { status: 500 });
    }

    if (!response.ok) {
      console.error('Item Price creation error:', data);
      return NextResponse.json(
        { error: data.message || data.exception || 'Failed to create item price' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Item Price created successfully',
    });
  } catch (error) {
    console.error('Error creating item price:', error);
    return NextResponse.json(
      { error: 'Failed to create item price', details: String(error) },
      { status: 500 }
    );
  }
}
