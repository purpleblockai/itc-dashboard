import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function parseReportDate(rawDate) {
  if (typeof rawDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
    const [day, month, year] = rawDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const t = Date.parse(rawDate);
  return isNaN(t) ? new Date() : new Date(t);
}

export async function GET(request) {

  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parseList = key => {
    const param = url.searchParams.get(key);
    return param ? param.split(',') : [];
  };
  const brands = parseList('brand');
  const companies = parseList('company');
  const products = parseList('product');
  const cities = parseList('city');
  const platforms = parseList('platform');
  const pincodeParam = url.searchParams.get('pincode');
  const fromParam = url.searchParams.get('from');
  const toParam   = url.searchParams.get('to');

  

  // Authentication filter
  let query = {};
  const { clientName, role, category } = session.user;
  if (role !== 'admin' && clientName) {
    query.Client_Name = clientName;
    if (category) query.Category = category;
  }

  // Server-side filters - make city filtering case-insensitive
  if (brands.length)    query.Brand     = { $in: brands };
  if (companies.length) query.Company   = { $in: companies };
  if (products.length)  query.Name      = { $in: products };
  if (cities.length)    query.City      = { $in: cities.map(city => new RegExp(`^${city}$`, 'i')) };
  if (platforms.length) query.Platform  = { $in: platforms };
  if (pincodeParam)     query.Pincode   = parseInt(pincodeParam, 10);

  // Date range - handle both Report_Date and reportDateParsed
  if (fromParam || toParam) {
    const dateMatch = {};
    if (fromParam) dateMatch.$gte = parseReportDate(fromParam);
    if (toParam)   dateMatch.$lte = parseReportDate(toParam);
    
    // Try both field names for date filtering
    query.$or = [
      { reportDateParsed: dateMatch },
      { Report_Date: { 
        $gte: fromParam ? fromParam : undefined, 
        $lte: toParam ? toParam : undefined 
      }}
    ].filter(condition => Object.keys(condition).length > 0);
  }

  

  const client = await clientPromise;
  const db = client.db();

  // Raw data pipeline
  const pipeline = [
    { $match: query },
    { $sort: { _id: -1 } }, // Sort by _id instead of reportDateParsed
    { $project: {
        id:               { $toString: '$_id' },
        reportDate:       { 
          $cond: {
            if: { $type: '$reportDateParsed' },
            then: { $dateToString: { format: '%Y-%m-%d', date: '$reportDateParsed' } },
            else: '$Report_Date'
          }
        },
        runDate:          { $dateToString: { format: '%Y-%m-%d', date: '$Added_To_DB' } },
        productId:        { $toString: '$Unique_Product_ID' },
        brand:            '$Brand',
        clientName:       '$Client_Name',
        company:          '$Company',
        productDescription:'$Name',
        city:             { $toLower: '$City' },
        pincode:          { $toString: '$Pincode' },
        skuId:            '$SKU_ID',
        platform:         '$Platform',
        mrp:              { $convert: { input: '$MRP', to: 'double', onError: 0, onNull: 0 } },
        sellingPrice:     { $convert: { input: '$Selling_Price', to: 'double', onError: 0, onNull: 0 } },
        availability:     '$Availability',
        discount:         { $convert: { input: '$Discount', to: 'double', onError: 0, onNull: 0 } },
        isListed:         { 
          $cond: {
            if: { $in: ['$Availability', ['Yes', 'No']] },
            then: true,
            else: false
          }
        },
        stockAvailable:   { 
          $cond: {
            if: { $eq: ['$Availability', 'Yes'] },
            then: true,
            else: false
          }
        }
    }}
  ];

  

  const rawData = await db.collection(process.env.RAW_COLLECTION || 'products')
    .aggregate(pipeline, { allowDiskUse: true })
    .toArray();

  

  return NextResponse.json({ rawData });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] GET /api/raw error:`, error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 