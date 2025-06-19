import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { clientName, role } = session.user;

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
  const fromParam = url.searchParams.get('from');
  const toParam   = url.searchParams.get('to');

  // Build query for summary collection
  const query = {};
  // For non-admin users, filter by their assigned client company and category
  if (role !== 'admin' && clientName) {
    // Filter by Client_Name field for authenticated user
    query.Client_Name = clientName;
    // User session may include category to scope
    if (session.user.category) {
      query.Category = session.user.category;
    }
  }
  if (brands.length)    query.Brand     = { $in: brands };
  if (companies.length) query.Company   = { $in: companies };
  if (products.length)  query.Name      = { $in: products };
  if (cities.length)    query.City      = { $in: cities };
  if (platforms.length) query.Platform  = { $in: platforms };
  if (fromParam || toParam) {
    query.Report_Date = {};
    if (fromParam) query.Report_Date.$gte = fromParam;
    if (toParam)   query.Report_Date.$lte = toParam;
  }

  const client = await clientPromise;
  const db = client.db();
  const summaryCol = db.collection(process.env.SUMMARY_COLLECTION || 'products_summary');

  // Fetch summary documents
  let summaryData = await summaryCol.find(query).toArray();

  // If no explicit date filters, restrict to latest report date only
  if (!fromParam && !toParam) {
    const latestDateRes = await summaryCol.aggregate([
      { $match: query },
      { $group: { _id: null, maxDate: { $max: '$Report_Date' } } }
    ]).toArray();
    if (latestDateRes.length > 0) {
      const latestDate = latestDateRes[0].maxDate;
      query.Report_Date = latestDate;
      summaryData = await summaryCol.find(query).toArray();
    }
  }

  // Compute KPI facets server-side
  const metricsPipeline = [
    { $match: query },
    { $facet: {
      kpis: [
        { $group: {
            _id: null,
            uniqueProducts: { $addToSet: '$Unique_Product_ID' },
            total:    { $sum: '$totalCount' },
            listed:   { $sum: '$listedCount' },
            available:{ $sum: '$availableCount' }
        }},
        { $project: {
            _id: 0,
            skusTracked: { $size: '$uniqueProducts' },
            penetration: { $cond: [ { $gt: ['$total', 0] }, { $multiply: [ { $divide: ['$listed', '$total'] }, 100 ] }, 0 ] },
            availability:{ $cond: [ { $gt: ['$listed', 0] }, { $multiply: [ { $divide: ['$available', '$listed'] }, 100 ] }, 0 ] },
            coverage:    { $cond: [ { $gt: ['$total', 0] }, { $multiply: [ { $divide: ['$available', '$total'] }, 100 ] }, 0 ] }
        }}
      ],
      timeSeriesData: [
        { $group: {
            _id: '$Report_Date',
            available: { $sum: '$availableCount' },
            listed:    { $sum: '$listedCount' }
        }},
        { $project: {
            _id: 0,
            date: '$_id',
            value:{ $cond: [{ $gt: ['$listed', 0] }, { $round: [{ $multiply: [{ $divide: ['$available', '$listed'] }, 100] }, 0] }, 0] }
        }},
        { $sort: { date: 1 } }
      ],
      regionalData: [
        { $group: {
            _id: '$City',
            available: { $sum: '$availableCount' },
            listed:    { $sum: '$listedCount' }
        }},
        { $project: {
            _id: 0,
            city: '$_id',
            stockAvailability: { $cond: [{ $gt: ['$listed', 0] }, { $round: [{ $multiply: [{ $divide: ['$available', '$listed'] }, 100] }, 0] }, 0] },
            stockOutPercent:   { $cond: [{ $gt: ['$listed', 0] }, { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$listed','$available'] }, '$listed'] }, 100] }, 0] }, 0] }
        }},
        { $sort: { city: 1 } }
      ],
      platformShareData: [
        { $group: { _id: '$Platform', count: { $sum: '$totalCount' } }},
        { $group: { _id: null, total: { $sum: '$count' }, items: { $push: { name: '$_id', count: '$count' } } }},
        { $unwind: '$items' },
        { $project: {
            _id: 0,
            name:  '$items.name',
            value: { $round: [{ $multiply: [{ $divide: ['$items.count','$total'] }, 100] }, 0] }
        }},
        { $sort: { value: -1 } }
      ],
      brandCoverage: [
        { $group: { _id: '$Brand', available: { $sum: '$availableCount' }, total: { $sum: '$totalCount' } }},
        { $project: {
            _id: 0,
            name: '$_id',
            coverage: { $cond: [{ $gt: ['$total', 0] }, { $round: [{ $multiply: [{ $divide: ['$available','$total'] }, 100] }, 1] }, 0] }
        }},
        { $sort: { coverage: -1 } }
      ]
    }}
  ];

  const [metrics] = await summaryCol.aggregate(metricsPipeline, { allowDiskUse: true }).toArray();

  // Return same payload shape as DashboardPayload
  return NextResponse.json({
    rawData: summaryData,
    summaryData,
    kpis: metrics.kpis[0] || { skusTracked: 0, penetration: 0, availability: 0, coverage: 0 },
    timeSeriesData: metrics.timeSeriesData || [],
    regionalData: metrics.regionalData || [],
    platformShareData: metrics.platformShareData || [],
    brandCoverage: metrics.brandCoverage || []
  });
} 