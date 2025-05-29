import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  calculateKPIs,
  getTimeSeriesData,
  getRegionalData,
  getPlatformShareData,
  getCoverageByBrandData,
} from '@/lib/data-service';

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

    const { clientName, role, category } = session.user;
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    
    // Create query filter based on user role
    let query = {};
    
    // If user is not an admin, filter data by their assigned client and category
    if (role !== 'admin' && clientName) {
      query = { Client_Name: clientName, Category: category };
    } else {
    }
    
    // Fetch rawData separately to avoid $facet memory limits
    const rawDataPipeline = [
      { $match: query },
      { $addFields: { Report_Date: { $ifNull: ["$Report_Date", "$Report Date"] } } },
      { $addFields: {
        reportDateParsed: {
          $ifNull: [
            { $dateFromString: { dateString: '$Report_Date', format: '%d-%m-%Y', onError: null, onNull: null } },
            { $dateFromString: { dateString: '$Report_Date', onError: null, onNull: null } }
          ]
        },
        availabilityFlag: { $cond: [ { $in: ['$Availability', ['Yes', 'No']] }, 1, 0 ] },
        availableFlag:    { $cond: [ { $eq: ['$Availability', 'Yes'] }, 1, 0 ] }
      }},
      { $project: {
        id:               { $toString: '$_id' },
        reportDate:       { $dateToString: { format: '%Y-%m-%d', date: '$reportDateParsed' } },
        productId:        { $toString: '$Unique_Product_ID' },
        brand:            '$Brand',
        clientName:       '$Client_Name',
        company:          '$Company',
        productDescription:'$Name',
        city:             '$City',
        pincode:          { $toString: '$Pincode' },
        skuId:            '$SKU_ID',
        platform:         '$Platform',
        mrp:              { $toDouble: '$MRP' },
        sellingPrice:     { $toDouble: '$Selling_Price' },
        availability:     '$Availability',
        discount:         { $toDouble: '$Discount' },
        isListed:         '$availabilityFlag',
        stockAvailable:   '$availableFlag',
      }}
    ];
    const rawData = await db.collection('products')
      .aggregate(rawDataPipeline, { allowDiskUse: true })
      .toArray();

    // Compute aggregated metrics in a separate facet (no rawData)
    const metricsPipeline = [
      { $match: query },
      { $addFields: { Report_Date: { $ifNull: ["$Report_Date", "$Report Date"] } } },
      { $addFields: {
        reportDateParsed: {
          $ifNull: [
            { $dateFromString: { dateString: '$Report_Date', format: '%d-%m-%Y', onError: null, onNull: null } },
            { $dateFromString: { dateString: '$Report_Date', onError: null, onNull: null } }
          ]
        },
        availabilityFlag: { $cond: [ { $in: ['$Availability', ['Yes', 'No']] }, 1, 0 ] },
        availableFlag:    { $cond: [ { $eq: ['$Availability', 'Yes'] }, 1, 0 ] }
      }},
      { $facet: {
        kpis: [
          { $group: {
              _id:      null,
              total:    { $sum: 1 },
              listed:   { $sum: '$availabilityFlag' },
              available:{ $sum: '$availableFlag' },
            }
          },
          { $project: {
              _id:          0,
              skusTracked:  '$total',
              penetration: { $cond: [ { $gt: ['$total', 0] }, { $multiply: [ { $divide: ['$listed', '$total'] }, 100 ] }, 0 ] },
              availability: { $cond: [ { $gt: ['$listed', 0] }, { $multiply: [ { $divide: ['$available', '$listed'] }, 100 ] }, 0 ] },
              coverage:     { $cond: [ { $gt: ['$total', 0] }, { $multiply: [ { $divide: ['$available', '$total'] }, 100 ] }, 0 ] },
            }
          }
        ],
        timeSeriesData: [
          { $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportDateParsed' } },
              available: { $sum: '$availableFlag' },
              listed: { $sum: '$availabilityFlag' }
            }
          },
          { $project: {
              _id: 0,
              date: '$_id',
              value: {
                $cond: [
                  { $gt: ['$listed', 0] },
                  { $round: [ { $multiply: [ { $divide: ['$available', '$listed'] }, 100 ] }, 0 ] },
                  0
                ]
              }
            }
          },
          { $sort: { date: 1 } }
        ],
        regionalData: [
          { $group: {
              _id: { city: '$City', pincode: { $toString: '$Pincode' } },
              available: { $sum: '$availableFlag' },
              listed: { $sum: '$availabilityFlag' }
            }
          },
          { $project: {
              _id: 0,
              city: '$_id.city',
              pincode: '$_id.pincode',
              stockAvailability: {
                $cond: [
                  { $gt: ['$listed', 0] },
                  { $round: [ { $multiply: [ { $divide: ['$available', '$listed'] }, 100 ] }, 0 ] },
                  0
                ]
              },
              stockOutPercent: {
                $cond: [
                  { $gt: ['$listed', 0] },
                  { $round: [ { $multiply: [ { $divide: [ { $subtract: ['$listed', '$available'] }, '$listed' ] }, 100 ] }, 0 ] },
                  0
                ]
              }
            }
          },
          { $sort: { city: 1, pincode: 1 } }
        ],
        platformShareData: [
          { $group: {
              _id: '$Platform',
              count: { $sum: 1 }
            }
          },
          { $group: {
              _id: null,
              total: { $sum: '$count' },
              items: { $push: { name: '$_id', count: '$count' } }
            }
          },
          { $unwind: '$items' },
          { $project: {
              _id: 0,
              name: '$items.name',
              value: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $round: [ { $multiply: [ { $divide: ['$items.count', '$total'] }, 100 ] }, 0 ] },
                  0
                ]
              }
            }
          },
          { $sort: { value: -1 } }
        ],
        brandCoverage: [
          { $group: {
              _id: { brand: '$Brand', pincode: { $toString: '$Pincode' } },
              available: { $sum: '$availableFlag' },
              total: { $sum: 1 }
            }
          },
          { $group: {
              _id: '$_id.brand',
              available: { $sum: '$available' },
              total: { $sum: '$total' }
            }
          },
          { $project: {
              _id: 0,
              name: '$_id',
              coverage: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $round: [ { $multiply: [ { $divide: ['$available', '$total'] }, 100 ] }, 1 ] },
                  0
                ]
              }
            }
          },
          { $sort: { coverage: -1 } }
        ],
      }}
    ];
    const [metricsResult] = await db.collection('products')
      .aggregate(metricsPipeline, { allowDiskUse: true })
      .toArray();
    const {
      timeSeriesData      = [],
      regionalData        = [],
      platformShareData   = [],
      brandCoverage       = [],
    } = metricsResult;

    // Compute full KPIs on the fetched rawData
    const fullKpis = calculateKPIs(rawData);
    return NextResponse.json({
      rawData,
      kpis: fullKpis,
      timeSeriesData,
      regionalData,
      platformShareData,
      brandCoverage,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
