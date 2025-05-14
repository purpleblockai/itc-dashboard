import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function parseReportDate(rawDate) {
  if (typeof rawDate === "string" && /^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
    const [day, month, year] = rawDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const t = Date.parse(rawDate);
  return isNaN(t) ? new Date() : new Date(t);
}

export async function GET(request) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { clientName, role } = session.user;
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    
    // Create query filter based on user role
    let query = {};
    
    // If user is not an admin, filter data by their assigned client
    if (role !== 'admin' && clientName) {
      query = { Client_Name: clientName };
      console.log(`Filtering data for client: ${clientName}`);
    } else {
      console.log('Admin user - showing all data');
    }
    
    // Query data with appropriate filtering
    const data = await db.collection('products')
      .find(query)
      .toArray();
    
    console.log(`[DATA] Retrieved ${data.length} raw records from database`);
    
    // Transform the MongoDB data to match the expected format in the frontend
    const transformedData = data.map(item => {
      // 1. parse into a JS Date
      const dt = parseReportDate(item.Report_Date || "");
  
      // 2. pull out only the YYYY-MM-DD
      const dateOnly = dt.toISOString().split("T")[0];
  
      // availability flags
      const availabilityStatus = item.Availability || "";
      const isListed      = availabilityStatus === "Yes" || availabilityStatus === "No";
      const isAvailable   = availabilityStatus === "Yes";
  
      return {
        id:                item._id.toString(),
        reportDate:        dateOnly,               // <-- now just "2025-05-10"
        productId:         String(item.Unique_Product_ID || ""),
        brand:             item.Brand || "",
        clientName:        item.Client_Name || "",
        productDescription: item.Name || "",
        city:              item.City || "",
        pincode:           String(item.Pincode || ""),
        skuId:             String(item.SKU_ID || ""),
        platform:          item.Platform || "",
        mrp:               typeof item.MRP === "number" ? item.MRP : 0,
        sellingPrice:      typeof item.Selling_Price === "number" ? item.Selling_Price : 0,
        availability:      availabilityStatus,
        discount:          item.Discount ? Number(item.Discount) : 0,
        isListed,
        stockAvailable:    isAvailable,
        // no runDate here
      };
    });
    
    // Log statistics for debugging
    const availabilityCounts = transformedData.reduce((acc, item) => {
      acc[item.availability] = (acc[item.availability] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`[DATA] Transformed data availability distribution:`, availabilityCounts);
    console.log(`[DATA] Listed items: ${transformedData.filter(i => i.isListed).length}`);
    console.log(`[DATA] Available items: ${transformedData.filter(i => i.stockAvailable).length}`);
    
    // Count unique pincodes with different statuses
    const pincodeMap = transformedData.reduce((acc, item) => {
      if (!acc[item.pincode]) {
        acc[item.pincode] = { listed: false, available: false };
      }
      if (item.isListed) acc[item.pincode].listed = true;
      if (item.stockAvailable) acc[item.pincode].available = true;
      return acc;
    }, {});
    
    const listedPincodes = Object.values(pincodeMap).filter(p => p.listed).length;
    const availablePincodes = Object.values(pincodeMap).filter(p => p.available).length;
    
    console.log(`[DATA] Unique pincodes: ${Object.keys(pincodeMap).length}`);
    console.log(`[DATA] Listed pincodes: ${listedPincodes}`);
    console.log(`[DATA] Available pincodes: ${availablePincodes}`);
    
    // Return the transformed data
    return NextResponse.json(transformedData);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
} 