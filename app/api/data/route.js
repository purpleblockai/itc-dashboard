import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
      // Create a proper date string that can be parsed correctly
      let dateStr;
      try {
        const rawDate = item.Report_Date || new Date().toISOString();
        // Ensure we have a proper date string that can be parsed
        dateStr = new Date(rawDate).toISOString();
      } catch (e) {
        // Fallback to current date if there's an issue
        dateStr = new Date().toISOString();
      }
      
      // Process availability field for metrics calculation:
      // "Yes" - Product is available in stock
      // "No" - Product is out of stock but listed
      // "Item Not Found" - Product is not listed
      // Any other value - Treat as not listed
      const availabilityStatus = item.Availability || "";
      
      // isListed is true when the item is found (availability is "Yes" or "No")
      const isListed = (availabilityStatus === "Yes" || availabilityStatus === "No");
      
      // stockAvailable is only true when the availability is explicitly "Yes"
      const isAvailable = availabilityStatus === "Yes";
      
      return {
        id: item._id.toString(),
        reportDate: dateStr, // Store as ISO string instead of Date object
        runDate: dateStr, // Use the same validated date string
        productId: (item.Unique_Product_ID || "").toString(),
        brand: item.Brand || "",
        category: "",
        productDescription: item.Name || "",
        quantity: item.Quantity?.toString() || "",
        city: item.City || "Mumbai", 
        pincode: item.Pincode?.toString() || "",
        area: "",
        fgCode: "",
        skuId: (item.SKU_ID || "").toString(),
        platform: item.Platform || "",
        mrp: typeof item.MRP === 'number' ? item.MRP : 0,
        sellingPrice: typeof item.Selling_Price === 'number' ? item.Selling_Price : 0,
        stockAvailable: isAvailable, // Use actual availability status
        isListed: isListed, // Add a flag to track if the item is listed
        availability: availabilityStatus, // Store the raw availability value
        discount: item.Discount ? Number(item.Discount) : 0,
        clientName: item.Client_Name || item.Brand || ""
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