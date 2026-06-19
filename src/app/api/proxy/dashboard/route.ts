import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    
    console.log('=== DASHBOARD API ===');
    console.log('SID present:', !!sid);
    
    if (!sid) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        today_sales: 0,
        invoice_count: 0,
        customer_count: 0,
        average_invoice: 0
      }, { status: 401 });
    }

    const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL;
    if (!frappeUrl) {
      console.error('Frappe URL not configured');
      return NextResponse.json({ 
        today_sales: 0,
        invoice_count: 0,
        customer_count: 0,
        average_invoice: 0,
        error: 'Frappe URL not configured'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);

    // 1. Get ALL POS invoices (total count)
    const allUrl = `${frappeUrl}/api/resource/POS%20Invoice?fields=["grand_total","name","customer","status","posting_date"]`;
    console.log('Fetching ALL invoices from:', allUrl);

    const allRes = await fetch(allUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
    });

    if (!allRes.ok) {
      console.error('Failed to fetch invoices:', allRes.status);
      return NextResponse.json({
        today_sales: 0,
        invoice_count: 0,
        customer_count: 0,
        average_invoice: 0,
        error: 'Failed to fetch invoices'
      });
    }

    const allData = await allRes.json();
    const allInvoices = allData.data || [];
    console.log('Total invoices found:', allInvoices.length);

    // 2. Get today's POS invoices
    const todayUrl = `${frappeUrl}/api/resource/POS%20Invoice?filters=[["posting_date","=","${today}"]]&fields=["grand_total","name","customer","status"]`;
    const todayRes = await fetch(todayUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Cookie: `sid=${sid}`,
      },
    });
    const todayData = await todayRes.json();
    const todayInvoices = todayData.data || [];
    console.log('Today\'s invoices:', todayInvoices.length);

    // Calculate totals for ALL invoices
    const totalSales = allInvoices.reduce((acc: number, inv: any) => acc + (inv.grand_total || 0), 0);
    const totalInvoiceCount = allInvoices.length;
    const averageInvoice = totalInvoiceCount > 0 ? totalSales / totalInvoiceCount : 0;

    // Calculate today's stats
    const todayTotalSales = todayInvoices.reduce((acc: number, inv: any) => acc + (inv.grand_total || 0), 0);
    const todayInvoiceCount = todayInvoices.length;

    // Get total customers count
    let customerCount = 0;
    try {
      const customerRes = await fetch(`${frappeUrl}/api/resource/Customer?fields=["name"]&limit=1000`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Cookie: `sid=${sid}`,
        },
      });
      if (customerRes.ok) {
        const customerData = await customerRes.json();
        customerCount = customerData.data?.length || 0;
      }
    } catch (err) {
      console.error('Error fetching customer count:', err);
    }

    return NextResponse.json({
      today_sales: todayTotalSales,
      invoice_count: todayInvoiceCount,      // Today's count
      total_invoice_count: totalInvoiceCount, // All time count
      customer_count: customerCount,
      average_invoice: averageInvoice,
      invoices: allInvoices.map((inv: any) => ({
        name: inv.name,
        grand_total: inv.grand_total,
        customer: inv.customer || 'Guest',
        status: inv.status || 'Draft',
        posting_date: inv.posting_date
      })),
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ 
      today_sales: 0,
      invoice_count: 0,
      total_invoice_count: 0,
      customer_count: 0,
      average_invoice: 0,
      invoices: [],
      error: error.message || 'Failed to fetch dashboard stats'
    });
  }
}
