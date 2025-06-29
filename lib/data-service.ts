import Papa from "papaparse";

export interface CompetitionData {
  Report_Date: string;          // "10-05-2025"
  Unique_Product_ID: number;    // 1
  Brand: string;                // "Bikaji"
  Client_Name: string;          // "Bikaji"
  Company: string;              // "HUL"
  Name: string;                 // "Bhujia No.1 – 1 24"
  City: string;                 // "Mumbai"
  Pincode: number;              // 400013
  SKU_ID: string;               // "4GU5LPEOP4"
  Platform: string;             // "Instamart"
  MRP: string;                  // "NaN"
  Selling_Price: string;        // "NaN"
  Availability: string;         // "Item Not Found"
  Discount: string;             // "NaN"
  Added_To_DB: string;          // ISO timestamp "2025-05-10T06:32:18.144Z"
}


export interface ProcessedData {
  id: string;
  reportDate: Date;
  runDate: Date;
  productId: string;
  brand: string;
  clientName: string;
  company: string;
  productDescription: string;
  city: string;
  pincode: string;
  skuId: string;
  platform: string;
  mrp: number;
  sellingPrice: number;
  availability: string;
  discount: number;
  isListed: boolean;
  stockAvailable: boolean;
}

export interface DashboardPayload {
  rawData: ProcessedData[];
  kpis: ReturnType<typeof calculateKPIs>;
  timeSeriesData: ReturnType<typeof getTimeSeriesData>;
  regionalData: ReturnType<typeof getRegionalData>;
  platformShareData: ReturnType<typeof getPlatformShareData>;
  brandCoverage: ReturnType<typeof getCoverageByBrandData>;
}

// Parameters for server-side filtering
export interface FetchFilters {
  brand?: string[];
  company?: string[];
  product?: string[];
  city?: string[];
  platform?: string[];
  pincode?: string;
  from?: string;  // in 'dd-MM-yyyy' or ISO format
  to?: string;    // in 'dd-MM-yyyy' or ISO format
}

// Function to fetch dashboard data (raw + aggregates) with optional filters
export async function fetchCompetitionData(filters: FetchFilters = {}): Promise<DashboardPayload> {
  const start = performance.now();
  try {
    // Fetch summary data for KPI metrics
    const summaryPayload = await fetchSummaryData(filters);

    // If pincode drill-down, fetch raw data; otherwise clear rawData
    if (filters.pincode) {
      const rawResult = await fetchRawData(filters);
      summaryPayload.rawData = rawResult.rawData;
    } else {
      summaryPayload.rawData = [];
    }

    return summaryPayload;
  } catch (error) {
    console.error("Error fetching competition data:", error);
    throw error;
  } finally {
    const duration = performance.now() - start;
  }
}

// Process uploaded CSV data
export function processUploadedData(data: any[]): ProcessedData[] {
  try {
    // Validate expected columns
    if (data.length === 0) {
      throw new Error("CSV file is empty");
    }

    const requiredColumns = [
      "Report_Date",
      "Unique_Product_ID",
      "Brand",
      "Client_Name",
      "Company",
      "Name",
      "City",
      "Pincode",
      "Platform",
      "MRP",
      "Selling_Price",
      "Availability",
      "Discount",
      "Added_To_DB",
    ];
    

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Process the data rows
    return data.map((row) => processRow(row as CompetitionData));
  } catch (error) {
    console.error("Error processing uploaded data:", error);
    throw error;
  }
}

// Function to process each row of the CSV data
export function processRow(row: CompetitionData): ProcessedData {
  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    // 1) dd-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    // 2) ISO fallback
    return new Date(dateStr);
  };

  // Handle both 'Report_Date' and 'Report Date' field names
  const rawDate = (row as any).Report_Date ?? (row as any)['Report Date'] ?? '';
  
  // Determine availability status
  const isListed = row.Availability === "Yes" || row.Availability === "No";
  const stockAvailable = row.Availability === "Yes";

  return {
    id: String(row.Unique_Product_ID),
    reportDate: parseDate(rawDate),
    runDate: row.Added_To_DB ? new Date(row.Added_To_DB) : new Date(),
    productId: String(row.Unique_Product_ID),
    brand: row.Brand,
    clientName: row.Client_Name,
    company: row.Company,
    productDescription: row.Name,
    city: row.City.toLowerCase(),
    pincode: String(row.Pincode),
    skuId: row.SKU_ID,
    platform: row.Platform,
    mrp: parseFloat(row.MRP) || 0,
    sellingPrice: parseFloat(row.Selling_Price) || 0,
    availability: row.Availability,
    discount: parseFloat(row.Discount) || 0,
    isListed: isListed,
    stockAvailable: stockAvailable
  };
}


// Function to get unique values from a field
export function getUniqueValues(
  data: ProcessedData[],
  field: keyof ProcessedData
): string[] {
  const uniqueSet = new Set<string>();

  data.forEach((item) => {
    if (typeof item[field] === "string") {
      uniqueSet.add(item[field] as string);
    }
  });

  return Array.from(uniqueSet).sort();
}

// Function to calculate coverage across competitors
function calculateCoverageAcrossCompetitors(data: ProcessedData[], competitorIds: string[]): number {
  
  // Filter to include only the selected competitors
  const competitorData = data.filter(item => competitorIds.includes(item.platform));
  
  // Group data by pincode
  const pincodeMap = new Map<string, ProcessedData[]>();
  competitorData.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Serviceable pincodes are those where at least one product has "Yes", "No", or "Item Not Found" availability
  const serviceablePincodes = new Set();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  // Get all items in serviceable pincodes
  const serviceableItems = competitorData.filter(item => 
    serviceablePincodes.has(item.pincode)
  );
  
  // Count items with "Yes" or "No" availability (Listed items)
  const listedItems = serviceableItems.filter(item => 
    item.availability === "Yes" || item.availability === "No"
  ).length;
  
  // Count available items (Yes availability)
  const availableItems = serviceableItems.filter(item => 
    item.availability === "Yes"
  ).length;
  
  // Total items in serviceable pincodes
  const totalItems = serviceableItems.length;
  
  // Penetration = Number of Listed Items / Total Items in serviceable pincodes
  const penetration = totalItems > 0 ? 
    (listedItems / totalItems) * 100 : 0;
  
  // Availability = Number of "Yes" Items / Number of Listed Items
  const availability = listedItems > 0 ? 
    (availableItems / listedItems) * 100 : 0;
  
  // Coverage = Number of "Yes" Items / Total Items
  const coverage = totalItems > 0 ?
    (availableItems / totalItems) * 100 : 0;
  
  return coverage;
}

// Function to calculate serviceable SKUs
function calculateServiceableSKUs(data: ProcessedData[]): number {
  // A pincode is serviceable if any product has 'Yes', 'No', or 'Item Not Found' in availability
  const serviceablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is serviceable (availability is "Yes", "No", or "Item Not Found")
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  return serviceablePincodes.size;
}

// Function to calculate listed SKUs
function calculateListedSKUs(data: ProcessedData[]): number {
  // Listed pincodes are those where at least one product has availability "Yes" or "No"
  // (not "Item Not Found" or blank)
  const listedPincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is listed (availability is "Yes" or "No")
  pincodeMap.forEach((items, pincode) => {
    const isListed = items.some(item => 
      item.availability === "Yes" || item.availability === "No");
    if (isListed) {
      listedPincodes.add(pincode);
    }
  });
  
  return listedPincodes.size;
}

// Function to calculate available SKUs 
function calculateAvailableSKUs(data: ProcessedData[]): number {
  // Available pincodes are those where at least one product has availability "Yes"
  const availablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is available (availability is "Yes")
  pincodeMap.forEach((items, pincode) => {
    const isAvailable = items.some(item => item.availability === "Yes");
    if (isAvailable) {
      availablePincodes.add(pincode);
    }
  });
  
  return availablePincodes.size;
}

// Function to calculate not available SKUs
function calculateNotAvailableSKUs(data: ProcessedData[]): number {
  // Not available pincodes are those where products are listed but not available
  // (has "No" but not "Yes" for any product in that pincode)
  const notAvailablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is not available but listed
  pincodeMap.forEach((items, pincode) => {
    const hasNoAvailable = items.some(item => item.availability === "No");
    const hasYesAvailable = items.some(item => item.availability === "Yes");
    
    // Only count if has "No" but no "Yes" products
    if (hasNoAvailable && !hasYesAvailable) {
      notAvailablePincodes.add(pincode);
    }
  });
  
  return notAvailablePincodes.size;
}

// Function to calculate penetration
function calculatePenetration(data: ProcessedData[]): number {
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });

  const serviceablePincodes = new Set<string>();
  const listedPincodes = new Set<string>();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item =>
      item.availability === "Yes" ||
      item.availability === "No" ||
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
      const isListed = items.some(item =>
        item.availability === "Yes" || item.availability === "No"
      );
      if (isListed) {
        listedPincodes.add(pincode);
      }
    }
  });

  const penetration = serviceablePincodes.size > 0
    ? (listedPincodes.size / serviceablePincodes.size) * 100
    : 0;
  return penetration;
}

// Function to calculate availability
function calculateAvailability(data: ProcessedData[]): number {
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });

  const listedPincodes = new Set<string>();
  const availablePincodes = new Set<string>();
  pincodeMap.forEach((items, pincode) => {
    const isListed = items.some(item =>
      item.availability === "Yes" || item.availability === "No"
    );
    if (isListed) {
      listedPincodes.add(pincode);
      const isAvailable = items.some(item => item.availability === "Yes");
      if (isAvailable) {
        availablePincodes.add(pincode);
      }
    }
  });

  const availability = listedPincodes.size > 0
    ? (availablePincodes.size / listedPincodes.size) * 100
    : 0;
  return availability;
}

// Function to calculate coverage
function calculateCoverage(data: ProcessedData[]): number {
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });

  const serviceablePincodes = new Set<string>();
  const availablePincodes = new Set<string>();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item =>
      item.availability === "Yes" ||
      item.availability === "No" ||
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
      const isAvailable = items.some(item => item.availability === "Yes");
      if (isAvailable) {
        availablePincodes.add(pincode);
      }
    }
  });

  const coverage = serviceablePincodes.size > 0
    ? (availablePincodes.size / serviceablePincodes.size) * 100
    : 0;
  return coverage;
}

// Function to calculate regional insights
function calculateRegionalInsights(data: ProcessedData[]): { 
  lowestCoverageRegion: { name: string; value: number; delta: number; competitorCoverage: number };
  highestAvailabilityDeltaRegion: { name: string; value: number; delta: number };
  highestAvailabilityDeltaFromCompetitors: { name: string; value: number; competitors: number; delta: number };
} {
  if (data.length === 0) {
    return {
      lowestCoverageRegion: { name: "-", value: 0, delta: 0, competitorCoverage: 0 },
      highestAvailabilityDeltaRegion: { name: "-", value: 0, delta: 0 },
      highestAvailabilityDeltaFromCompetitors: { name: "-", value: 0, competitors: 0, delta: 0 }
    };
  }

  // Extract client name and client company correctly
  const clientName = data.find(item => item.clientName)?.clientName || '';
  // Determine clientCompany based on clientName
  const clientCompany = data.find(item => item.company === clientName)?.company || '';

  // If no clientName or clientCompany found, return empty data
  if (!clientName || !clientCompany) {
    return {
      lowestCoverageRegion: { name: "-", value: 0, delta: 0, competitorCoverage: 0 },
      highestAvailabilityDeltaRegion: { name: "-", value: 0, delta: 0 },
      highestAvailabilityDeltaFromCompetitors: { name: "-", value: 0, competitors: 0, delta: 0 }
    };
  }
  
  // Client items are those with matching company (based on client brand rows)
  const allClientItems = data.filter(item => item.company === clientCompany);

  // Competitor items are those with a different company
  const allCompetitorItems = data.filter(item => item.company && item.company !== clientCompany);

  if (allClientItems.length === 0) {
    // Fall back: if no items found matching clientCompany, use clientName brand rows
    const altClientItems = data.filter(item => item.brand === clientName);
    if (altClientItems.length > 0) {
    }
  } else {
  }
  
  // Group data by city/region - for client items only
  const clientRegionMap = new Map<string, ProcessedData[]>();
  allClientItems.forEach(item => {
    const region = item.city;
    if (!clientRegionMap.has(region)) {
      clientRegionMap.set(region, []);
    }
    clientRegionMap.get(region)!.push(item);
  });
  
  // Group data by city/region - for competitor items only
  const competitorRegionMap = new Map<string, ProcessedData[]>();
  allCompetitorItems.forEach(item => {
    const region = item.city;
    if (!competitorRegionMap.has(region)) {
      competitorRegionMap.set(region, []);
    }
    competitorRegionMap.get(region)!.push(item);
  });
  
  // Get all regions where both client and competitors have data
  const commonRegions = Array.from(clientRegionMap.keys()).filter(region => 
    competitorRegionMap.has(region)
  );
  
  // Get all regions where both client and competitors have data for more comprehensive analysis
  const allClientRegions = Array.from(clientRegionMap.keys());
  const allCompetitorRegions = Array.from(competitorRegionMap.keys());
  const allRegions = Array.from(new Set([...allClientRegions, ...allCompetitorRegions]));
  

  // Calculate coverage and availability for each region
  const regionMetrics = allRegions.map(region => {
    const clientItems = clientRegionMap.get(region) || [];
    const competitorItems = competitorRegionMap.get(region) || [];
    
    // Process client items
    // --------
    // Group client items by pincode to determine serviceable pincodes
    const clientPincodeMap = new Map<string, ProcessedData[]>();
    clientItems.forEach(item => {
      if (!clientPincodeMap.has(item.pincode)) {
        clientPincodeMap.set(item.pincode, []);
      }
      clientPincodeMap.get(item.pincode)!.push(item);
    });
    
    // Identify serviceable pincodes for client
    const clientServiceablePincodes = new Set();
    clientPincodeMap.forEach((pincodeItems, pincode) => {
      const isServiceable = pincodeItems.some(item => 
        item.availability === "Yes" || 
        item.availability === "No" || 
        item.availability === "Item Not Found"
      );
      if (isServiceable) {
        clientServiceablePincodes.add(pincode);
      }
    });
    
    // Get all client items in serviceable pincodes
    const clientServiceableItems = clientItems.filter(item => 
      clientServiceablePincodes.has(item.pincode)
    );
    
    // Count client items with "Yes" or "No" availability (Listed items)
    const clientListedItems = clientServiceableItems.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Count client available items (Yes availability)
    const clientAvailableItems = clientServiceableItems.filter(item => 
      item.availability === "Yes"
    ).length;
    
    // Total client items in serviceable pincodes
    const clientTotalItems = clientServiceableItems.length;
    
    // Calculate client metrics
    const clientPenetration = clientTotalItems > 0 ? (clientListedItems / clientTotalItems) * 100 : 0;
    const clientAvailability = clientListedItems > 0 ? (clientAvailableItems / clientListedItems) * 100 : 0;
    const clientCoverage = clientTotalItems > 0 ? (clientAvailableItems / clientTotalItems) * 100 : 0;
    
    // Process competitor items
    // --------
    // Group competitor items by pincode
    const competitorPincodeMap = new Map<string, ProcessedData[]>();
    competitorItems.forEach(item => {
      if (!competitorPincodeMap.has(item.pincode)) {
        competitorPincodeMap.set(item.pincode, []);
      }
      competitorPincodeMap.get(item.pincode)!.push(item);
    });
    
    // Identify serviceable pincodes for competitors
    const competitorServiceablePincodes = new Set();
    competitorPincodeMap.forEach((pincodeItems, pincode) => {
      const isServiceable = pincodeItems.some(item => 
        item.availability === "Yes" || 
        item.availability === "No" || 
        item.availability === "Item Not Found"
      );
      if (isServiceable) {
        competitorServiceablePincodes.add(pincode);
      }
    });
    
    // Get all competitor items in serviceable pincodes
    const competitorServiceableItems = competitorItems.filter(item => 
      competitorServiceablePincodes.has(item.pincode)
    );
    
    // Count competitor items with "Yes" or "No" availability (Listed items)
    const competitorListedItems = competitorServiceableItems.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Count competitor available items (Yes availability)
    const competitorAvailableItems = competitorServiceableItems.filter(item => 
      item.availability === "Yes"
    ).length;
    
    // Total competitor items in serviceable pincodes
    const competitorTotalItems = competitorServiceableItems.length;
    
    // Calculate competitor metrics
    const competitorPenetration = competitorTotalItems > 0 ? (competitorListedItems / competitorTotalItems) * 100 : 0;
    const competitorAvailability = competitorListedItems > 0 ? (competitorAvailableItems / competitorListedItems) * 100 : 0;
    const competitorCoverage = competitorTotalItems > 0 ? (competitorAvailableItems / competitorTotalItems) * 100 : 0;
    
    // Calculate availability delta between client and competitors
    const availabilityDeltaFromCompetitors = competitorItems.length > 0 ?
      clientAvailability - competitorAvailability : 0;
    
    // Get previous report data for delta calculation
    // First determine all report dates in the data
    const reportDates = Array.from(
      new Set(clientItems.map(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0];
        } else {
          return new Date().toISOString().split("T")[0];
        }
      }))
    ).sort((a, b) => a.localeCompare(b));
    
    let coverageDelta = 0;
    let availabilityDelta = 0;
    
    if (reportDates.length > 1) {
      const currentDate = reportDates[reportDates.length - 1];
      const previousDate = reportDates[reportDates.length - 2];
      
      // Get current report data
      const currentClientItems = clientItems.filter(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0] === currentDate;
        } else {
          return false;
        }
      });
      
      // Get previous report data
      const previousClientItems = clientItems.filter(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0] === previousDate;
        } else {
          return false;
        }
      });
      
      if (currentClientItems.length > 0 && previousClientItems.length > 0) {
        // Calculate current metrics
        // Use the same approach as above but for current items
        
        // Group current items by pincode
        const currentPincodeMap = new Map<string, ProcessedData[]>();
        currentClientItems.forEach(item => {
          if (!currentPincodeMap.has(item.pincode)) {
            currentPincodeMap.set(item.pincode, []);
          }
          currentPincodeMap.get(item.pincode)!.push(item);
        });
        
        // Identify serviceable pincodes
        const currentServiceablePincodes = new Set();
        currentPincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => 
            item.availability === "Yes" || 
            item.availability === "No" || 
            item.availability === "Item Not Found"
          );
          if (isServiceable) {
            currentServiceablePincodes.add(pincode);
          }
        });
        
        // Filter to serviceable items
        const currentServiceableItems = currentClientItems.filter(item => 
          currentServiceablePincodes.has(item.pincode)
        );
        
        // Calculate current metrics
        const currentListedItems = currentServiceableItems.filter(item => 
          item.availability === "Yes" || item.availability === "No"
        ).length;
        
        const currentAvailableItems = currentServiceableItems.filter(item => 
          item.availability === "Yes"
        ).length;
        
        const currentTotalItems = currentServiceableItems.length;
        
        const currentAvailability = currentListedItems > 0 ? 
          (currentAvailableItems / currentListedItems) * 100 : 0;
        
        const currentCoverage = currentTotalItems > 0 ? 
          (currentAvailableItems / currentTotalItems) * 100 : 0;
        
        // Calculate previous metrics
        // Group previous items by pincode
        const previousPincodeMap = new Map<string, ProcessedData[]>();
        previousClientItems.forEach(item => {
          if (!previousPincodeMap.has(item.pincode)) {
            previousPincodeMap.set(item.pincode, []);
          }
          previousPincodeMap.get(item.pincode)!.push(item);
        });
        
        // Identify serviceable pincodes
        const previousServiceablePincodes = new Set();
        previousPincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => 
            item.availability === "Yes" || 
            item.availability === "No" || 
            item.availability === "Item Not Found"
          );
          if (isServiceable) {
            previousServiceablePincodes.add(pincode);
          }
        });
        
        // Filter to serviceable items
        const previousServiceableItems = previousClientItems.filter(item => 
          previousServiceablePincodes.has(item.pincode)
        );
        
        // Calculate previous metrics
        const previousListedItems = previousServiceableItems.filter(item => 
          item.availability === "Yes" || item.availability === "No"
        ).length;
        
        const previousAvailableItems = previousServiceableItems.filter(item => 
          item.availability === "Yes"
        ).length;
        
        const previousTotalItems = previousServiceableItems.length;
        
        const previousAvailability = previousListedItems > 0 ? 
          (previousAvailableItems / previousListedItems) * 100 : 0;
        
        const previousCoverage = previousTotalItems > 0 ? 
          (previousAvailableItems / previousTotalItems) * 100 : 0;
        
        // Calculate deltas
        coverageDelta = currentCoverage - previousCoverage;
        availabilityDelta = currentAvailability - previousAvailability;
      }
    }

    return {
      name: region,
      clientName,
      coverage: clientCoverage,
      competitorCoverage,
      coverageDelta,
      availability: clientAvailability,
      availabilityDelta,
      availabilityDeltaFromCompetitors,
      competitorAvailability,
      // Add some debug info
      clientItemCount: clientItems.length,
      competitorItemCount: competitorItems.length,
      hasClientData: clientItems.length > 0,
      hasCompetitorData: competitorItems.length > 0
    };
  }).filter(region => {
    // Keep regions that have at least one kind of data
    return region.clientItemCount > 0 || region.competitorItemCount > 0;
  });
  

  // Calculate overall competitor coverage across all regions
  const allCompetitorMetrics = regionMetrics.filter(region => region.hasCompetitorData);
  const aggregatedCompetitorCoverage = allCompetitorMetrics.length > 0 ?
    allCompetitorMetrics.reduce((sum, region) => sum + region.competitorCoverage, 0) / allCompetitorMetrics.length : 0;
  
  
  // Find lowest coverage region for client brand - only consider regions where client brand exists
  const clientRegionMetrics = regionMetrics.filter(region => region.hasClientData);
  
  // Type-check the fallback object to match the properties of regionMetrics items
  const emptyRegionMetric = { 
    name: "-", 
    coverage: 0, 
    coverageDelta: 0, 
    competitorCoverage: 0,
    availability: 0,
    availabilityDelta: 0,
    competitorAvailability: 0,
    availabilityDeltaFromCompetitors: 0,
    clientItemCount: 0,
    competitorItemCount: 0,
    hasClientData: false,
    hasCompetitorData: false
  };
  
  const lowestCoverageRegion = clientRegionMetrics.length > 0 ?
    clientRegionMetrics.sort((a, b) => a.coverage - b.coverage)[0] || emptyRegionMetric :
    emptyRegionMetric;
  
  // For availability comparison, we need to compare client and competitor in the same region
  // So we'll only look at regions where both client and competitor data exist
  const regionsWithBothData = regionMetrics.filter(region => 
    region.hasClientData && region.hasCompetitorData
  );
  
  // Find regions with the largest negative availability gap compared to competitors
  const largestNegativeAvailabilityGap = regionsWithBothData
    .filter(region => 
      region.availability > 0 && 
      region.competitorAvailability > 0 &&
      region.availabilityDeltaFromCompetitors < 0 // Negative delta means competitors have higher availability
    )
    .sort((a, b) => a.availabilityDeltaFromCompetitors - b.availabilityDeltaFromCompetitors)[0] || 
    // Fallback to the region with lowest absolute availability if no negative deltas exist
    (regionsWithBothData.length > 0 ? 
      regionsWithBothData.sort((a, b) => a.availability - b.availability)[0] :
      emptyRegionMetric);
  
  // Return lowest coverage region, using the region-specific competitor coverage
  return {
    lowestCoverageRegion: { 
      name: lowestCoverageRegion.name, 
      value: lowestCoverageRegion.coverage, 
      delta: lowestCoverageRegion.coverage - lowestCoverageRegion.competitorCoverage, // Calculate direct difference between client and competitor
      competitorCoverage: lowestCoverageRegion.competitorCoverage // Use the competitor coverage from this specific region
    },
    highestAvailabilityDeltaRegion: { 
      name: largestNegativeAvailabilityGap.name, 
      value: largestNegativeAvailabilityGap.availability, 
      delta: largestNegativeAvailabilityGap.availabilityDelta || 0
    },
    highestAvailabilityDeltaFromCompetitors: {
      name: largestNegativeAvailabilityGap.name,
      value: largestNegativeAvailabilityGap.availability,
      competitors: largestNegativeAvailabilityGap.competitorAvailability,
      delta: largestNegativeAvailabilityGap.availabilityDeltaFromCompetitors || 0
    }
  };
}

// Helper function to calculate stock-out percentage
function calculateStockOutPercentage(data: ProcessedData[]): number {
  const availabilityStatus = data.reduce((acc, item) => {
    if (item.availability === "Yes") acc.available++;
    else if (item.availability === "No") acc.notAvailable++;
    return acc;
  }, { available: 0, notAvailable: 0 });
  
  const listedCount = availabilityStatus.available + availabilityStatus.notAvailable;
  return listedCount > 0 ? (availabilityStatus.notAvailable / listedCount) * 100 : 0;
}

// Helper function to calculate average discount
function calculateAverageDiscount(data: ProcessedData[]): number {
  if (data.length === 0) return 0;
  
  // Filter items with valid discount values
  const validItems = data.filter(item => 
    typeof item.discount === 'number' && !isNaN(item.discount)
  );
  
  if (validItems.length === 0) return 0;
  
  const totalDiscount = validItems.reduce(
    (sum, item) => sum + item.discount,
    0
  );
  
  return totalDiscount / validItems.length;
}

// Function to calculate KPIs
export function calculateKPIs(data: ProcessedData[]) {
  
  if (data.length === 0) {
    return {
      skusTracked: 0,
      avgDiscount: 0,
      topPlatform: "",
      stockOutPercentage: 0,
      stockOutDelta: 0,
      avgDiscountDelta: 0,
      competitorCoverage: 0,
      totalSKUs: 0,
      serviceableSKUs: 0,
      listedSKUs: 0,
      availableSKUs: 0,
      notAvailableSKUs: 0,
      penetration: 0,
      availability: 0,
      coverage: 0,
      discount: 0,
      lowestCoverageRegion: {
        name: "",
        value: 0,
        delta: 0,
        competitorCoverage: 0,
      },
      highestAvailabilityDeltaRegion: {
        name: "",
        value: 0,
        delta: 0,
      },
      highestAvailabilityDeltaFromCompetitors: {
        name: "",
        value: 0,
        competitors: 0,
        delta: 0,
      },
      // Store the different coverage calculation methods
      coverageMethod1: 0,
      coverageMethod2: 0,
    };
  }

  // Calculate total number of unique SKUs (counted by Unique_Product_ID)
  const uniqueSkus = new Set(data.map((item) => item.productId)).size;

  // Calculate total number of unique pincodes
  const totalPincodes = new Set(data.map((item) => item.pincode)).size;

  // Calculate average discount - specifically for client data
  const clientData = data.filter(item => item.clientName); // Only filter by clientName when client_name exists
  
  // Filter out items with invalid discount values
  const validClientData = clientData.filter(item => 
    typeof item.discount === 'number' && !isNaN(item.discount)
  );
  const validNonClientData = data.filter(item => 
    typeof item.discount === 'number' && !isNaN(item.discount)
  );
  
  const totalDiscount = validClientData.length 
    ? validClientData.reduce((sum, item) => sum + item.discount, 0) 
    : (validNonClientData.length ? validNonClientData.reduce((sum, item) => sum + item.discount, 0) : 0);
  
  const avgDiscount = validClientData.length 
    ? totalDiscount / validClientData.length 
    : (validNonClientData.length ? totalDiscount / validNonClientData.length : 0);
  

  // Find top platform by count
  const platformCounts = data.reduce((counts, item) => {
    counts[item.platform] = (counts[item.platform] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const topPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([platform]) => platform)[0];
  

  // Calculate stock-out percentage
  const availabilityStatus = data.reduce((acc, item) => {
    if (item.availability === "Yes") acc.available++;
    else if (item.availability === "No") acc.notAvailable++;
    return acc;
  }, { available: 0, notAvailable: 0 });
  
  const listedCount = availabilityStatus.available + availabilityStatus.notAvailable;
  const stockOutPercentage = listedCount > 0 ? 
    (availabilityStatus.notAvailable / listedCount) * 100 : 0;
  
  // Calculate competitor coverage
  const competitorIds = Array.from(new Set(data.filter(item => item.platform).map(item => item.platform)));
  const competitorCoverage = competitorIds.length > 0 
    ? calculateCoverageAcrossCompetitors(data, competitorIds) 
    : 0;
  
  // Calculate pincode metrics based on new definitions
  const totalSKUs = totalPincodes; // Use total unique pincodes
  const serviceableSKUs = calculateServiceableSKUs(data);
  const listedSKUs = calculateListedSKUs(data);
  const availableSKUs = calculateAvailableSKUs(data);
  const notAvailableSKUs = calculateNotAvailableSKUs(data);

  // Group data by report date to get previous and current report
  const reportDates = Array.from(
    new Set(data.map(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0];
      } else {
        return new Date().toISOString().split("T")[0];
      }
    }))
  ).sort((a, b) => a.localeCompare(b));

  // Initialize deltas with 0 instead of hardcoded values
  let stockOutDelta = 0;
  let avgDiscountDelta = 0;

  // Calculate stock-out delta and discount delta by comparing different report dates
  if (reportDates.length > 1) {
    const currentDate = reportDates[reportDates.length - 1];
    const previousDate = reportDates[reportDates.length - 2];
    
    // Filter data by report date
    const currentReportData = data.filter(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0] === currentDate;
      } else {
        return false;
      }
    });
    
    const previousReportData = data.filter(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0] === previousDate;
      } else {
        return false;
      }
    });
    
    // Current metrics
    const currentStockOutPercentage = calculateStockOutPercentage(currentReportData);
    const currentAvgDiscount = calculateAverageDiscount(currentReportData);
    
    // Previous metrics
    const previousStockOutPercentage = calculateStockOutPercentage(previousReportData);
    const previousAvgDiscount = calculateAverageDiscount(previousReportData);
    
    // Calculate the deltas
    stockOutDelta = parseFloat(
      (currentStockOutPercentage - previousStockOutPercentage).toFixed(2)
    );
    
    avgDiscountDelta = previousAvgDiscount !== 0 ?
      parseFloat((((currentAvgDiscount - previousAvgDiscount) / previousAvgDiscount) * 100).toFixed(2)) : 0;
  }

  // Calculate penetration
  const penetration = calculatePenetration(data);

  // Calculate availability
  const availability = calculateAvailability(data);

  // Calculate coverage
  const coverage = calculateCoverage(data);

  // Calculate overall metrics
  const overallPenetration = penetration;
  const overallAvailability = availability;
  const overallCoverage = coverage;

  // Calculate coverage methods
  const coverageMethod1 = (availability * penetration) / 100;
  const coverageMethod2 = availability;

  // Return calculated metrics
  const returnObject = {
    skusTracked: uniqueSkus,
    avgDiscount,
    topPlatform,
    stockOutPercentage,
    stockOutDelta,
    avgDiscountDelta,
    competitorCoverage,
    totalSKUs,
    serviceableSKUs,
    listedSKUs,
    availableSKUs,
    notAvailableSKUs,
    penetration: overallPenetration,
    availability: overallAvailability,
    coverage: overallCoverage,
    discount: avgDiscount,
    lowestCoverageRegion: calculateRegionalInsights(data).lowestCoverageRegion,
    highestAvailabilityDeltaRegion: calculateRegionalInsights(data).highestAvailabilityDeltaRegion,
    highestAvailabilityDeltaFromCompetitors: calculateRegionalInsights(data).highestAvailabilityDeltaFromCompetitors,
    coverageMethod1,
    coverageMethod2,
  };
  
  return returnObject;
}

// Function to initialize platform serviceable pincodes count
export function getPlatformServiceablePincodes(data: ProcessedData[]): Map<string, number> {
  const platformMap = new Map<string, Set<string>>();
  
  // Group all pincodes by platform
  data.forEach(item => {
    if (!platformMap.has(item.platform)) {
      platformMap.set(item.platform, new Set());
    }
    platformMap.get(item.platform)!.add(item.pincode);
  });
  
  // Convert sets to counts
  const platformPincodeCounts = new Map<string, number>();
  platformMap.forEach((pincodes, platform) => {
    platformPincodeCounts.set(platform, pincodes.size);
  });
  
  return platformPincodeCounts;
}

// Function to get time series data for trend analysis
export function getTimeSeriesData(data: ProcessedData[]): { date: string; value: number }[] {
  // Group data by report date
  const dateMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.reportDate) return;
    
    const dateString = item.reportDate instanceof Date 
      ? item.reportDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    if (!dateMap.has(dateString)) {
      dateMap.set(dateString, []);
    }
    
    dateMap.get(dateString)!.push(item);
  });
  
  // Calculate availability percentage for each date
  return Array.from(dateMap.entries())
    .map(([date, items]) => {
      // Count items with "Yes" availability
      const availableItems = items.filter(item => item.availability === "Yes").length;
      
      // Count items with "Yes" or "No" availability (listed items)
      const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      
      // Calculate availability percentage
      const availability = listedItems > 0 ? 
        Math.round((availableItems / listedItems) * 100) : 0;
      
      return {
        date,
        value: availability
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Function to get regional data by pincode
export function getRegionalData(data: ProcessedData[]): {
  city: string;
  pincode: string;
  stockAvailability: number;
  stockOutPercent: number;
}[] {


      // Group data by pincode
      const pincodeMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {

        
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
    
        pincodeMap.get(item.pincode)!.push(item);
      });
      


  // Calculate metrics for each pincode
  return Array.from(pincodeMap.entries()).map(([pincode, items]) => {
    const city = items[0].city;
    
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;
    
    // Calculate stock-out percentage
    const stockOutPercent = listedItems > 0 ? 
      Math.round(((listedItems - availableItems) / listedItems) * 100) : 0;
      
      return {
      city,
      pincode,
      stockAvailability,
      stockOutPercent
    };
  });
}

// Function to get city-level regional data
export function getCityRegionalData(data: ProcessedData[]): {
  city: string;
  stockAvailability: number;
  stockOutPercent: number;
  pincodeCount: number;
  pincodes: string[];
  coverage?: number;
  penetration?: number;
}[] {
  // Group data by city
  const cityMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    const city = (item.city || "").toLowerCase();
    
    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    
    cityMap.get(city)!.push(item);
  });
  
  // Calculate metrics for each city
  return Array.from(cityMap.entries()).map(([city, items]) => {
    // Count unique pincodes
    const pincodes = Array.from(new Set(items.map(item => item.pincode)));
    
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Group data by pincode to calculate penetration
      const pincodeMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
        pincodeMap.get(item.pincode)!.push(item);
      });
      
    // Calculate serviceable pincodes
      const serviceablePincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isServiceable = pincodeItems.some(item => 
          item.availability === "Yes" || 
          item.availability === "No" || 
          item.availability === "Item Not Found"
        );
        if (isServiceable) {
          serviceablePincodes.add(pincode);
        }
      });
      
    // Calculate listed pincodes
    const listedPincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isListed = pincodeItems.some(item => 
        item.availability === "Yes" || item.availability === "No"
      );
      if (isListed) {
        listedPincodes.add(pincode);
      }
    });
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;
    
    // Calculate stock-out percentage
    const stockOutPercent = listedItems > 0 ? 
      Math.round(((listedItems - availableItems) / listedItems) * 100) : 0;
    
    // Calculate penetration
    const penetration = serviceablePincodes.size > 0 ?
      Math.round((listedPincodes.size / serviceablePincodes.size) * 100) : 0;
    
    // Calculate coverage
    const coverage = stockAvailability * penetration / 100;

      return {
      city,
        stockAvailability,
        stockOutPercent,
      pincodeCount: pincodes.length,
      pincodes,
      coverage,
      penetration
    };
  }).sort((a, b) => b.stockAvailability - a.stockAvailability);
}

// Function to get platform data for platform comparisons
export function getPlatformData(data: ProcessedData[]): {
  name: string;
  salesValue: number;
  priceChange: number;
  discountChange: number;
  availabilityChange: number;
}[] {
  // Group data by platform
  const platformMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!platformMap.has(item.platform)) {
      platformMap.set(item.platform, []);
    }
    
    platformMap.get(item.platform)!.push(item);
  });
  
  // Calculate metrics for each platform
  return Array.from(platformMap.entries())
    .filter(([name]) => name) // Filter out empty platform names
    .map(([name, items]) => {
      // Calculate sales value (sum of selling prices)
      const salesValue = items.reduce((sum, item) => {
        const price = typeof item.sellingPrice === "number" && !isNaN(item.sellingPrice) 
          ? item.sellingPrice : 0;
        return sum + price;
      }, 0);
      
      // For the platform changes, we would ideally compare with previous data periods
      // Since that comparison logic is complex, we'll use placeholder values for now
      // In a real implementation, this would involve time-based comparisons
      
      // Generate consistent price change values based on platform name
      const priceChange = name.length % 5 - 2; // Range: -2 to 2
      
      // Generate consistent discount change values based on platform name
      const discountChange = (name.charCodeAt(0) % 4) - 1.5; // Range: -1.5 to 2.5
      
      // Generate consistent availability change values based on platform name
      const availabilityChange = (name.length * 0.7) % 5 - 2; // Range: -2 to 3

      return {
        name,
        salesValue,
        priceChange,
        discountChange,
        availabilityChange
      };
    })
    .sort((a, b) => b.salesValue - a.salesValue);
}

// Function to get city choropleth data for map visualizations
export function getCityChoroplethData(data: ProcessedData[]): {
  id: string;
  city: string;
  value: number;
}[] {
  // Group data by city
  const cityMap = new Map<string, ProcessedData[]>();

  data.forEach(item => {
    const city = (item.city || "").toLowerCase();

    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    
    cityMap.get(city)!.push(item);
  });
  
  // Calculate availability percentage for each city
  return Array.from(cityMap.entries()).map(([city, items]) => {
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
            item.availability === "Yes" || item.availability === "No"
          ).length;
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;

      return {
      id: city,
      city,
      value: stockAvailability
    };
  });
}

// Function to get platform share data (for pie charts)
export function getPlatformShareData(data: ProcessedData[], brand?: string): {
  name: string;
  value: number;
}[] {
  // Filter by brand if specified
  const filteredData = brand
    ? data.filter((item) => item.brand === brand)
    : data;

  // Group data by platform and count items
  const platformCounts = filteredData.reduce((counts, item) => {
    if (!item.platform) return counts; // Skip entries with no platform

    counts[item.platform] = (counts[item.platform] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Calculate percentages
  const total = Object.values(platformCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  if (total === 0) {
    return []; // Return empty array if no data
  }

  // Convert to array format for chart components
  return Object.entries(platformCounts)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

// Function to get brand data for brand evaluation page
export function getBrandData(data: ProcessedData[]): {
  name: string;
  avgDiscount: number;
  availability: number;
  penetration?: number;
  coverage?: number;
  skuCount: number;
  products: {
    name: string;
    mrp: number;
    sellingPrice: number;
    availability: number;
  }[];
}[] {
  // Group data by brand
  const brandMap = new Map<string, ProcessedData[]>();

  data.forEach(item => {
    if (!item.brand) return; // Skip entries with no brand

    if (!brandMap.has(item.brand)) {
      brandMap.set(item.brand, []);
    }

    brandMap.get(item.brand)!.push(item);
  });

  // Calculate metrics for each brand
  return Array.from(brandMap.entries())
    .filter(([name]) => name) // Filter out empty brand names
    .map(([name, items]) => {
      // Calculate average discount
      const validItems = items.filter(item => 
        typeof item.discount === 'number' && !isNaN(item.discount)
      );
      const totalDiscount = validItems.reduce((sum, item) => sum + item.discount, 0);
      const avgDiscount = validItems.length > 0 ? 
        Math.round((totalDiscount / validItems.length) * 10) / 10 : 0;

      // Calculate availability percentage
      const availableItems = items.filter(item => item.availability === "Yes").length;
      const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      const availability = listedItems > 0 ? 
        Math.round((availableItems / listedItems) * 100) : 0;
      
      // Calculate penetration - Listed Items / Total Items
      const totalItems = items.length;
      const penetration = totalItems > 0 ?
        Math.round((listedItems / totalItems) * 100) : 0;
      
      // Calculate coverage - Available Items / Total Items
      const coverage = totalItems > 0 ?
        Math.round((availableItems / totalItems) * 100) : 0;

      // Count unique SKUs
      const skuCount = new Set(items.map(item => item.skuId)).size;

      // Get top products
      const productMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!item.productId) return; // Skip entries with no productId
        
        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, []);
        }
        
        productMap.get(item.productId)!.push(item);
      });

      const products = Array.from(productMap.entries())
        .map(([_, productItems]) => {
          const product = productItems[0]; // Use first item for product info
          
          // Calculate availability percentage for this product
          const productAvailableItems = productItems.filter(item => item.availability === "Yes").length;
          const productListedItems = productItems.filter(item => 
            item.availability === "Yes" || item.availability === "No"
          ).length;
          const productAvailability = productListedItems > 0 ? 
            Math.round((productAvailableItems / productListedItems) * 100) : 0;

          return {
            name: product.productDescription,
            mrp: product.mrp,
            sellingPrice: product.sellingPrice,
            availability: productAvailability,
          };
        })
        .sort((a, b) => b.availability - a.availability)
        .slice(0, 3); // Get top 3 products by availability

      return {
        name,
        avgDiscount,
        availability,
        penetration,
        coverage,
        skuCount,
        products,
      };
    })
    .sort((a, b) => b.skuCount - a.skuCount);
}

// Function to get product data - aggregates summary data by product (one row per product)
export function getProductData(data: ProcessedData[]): {
  brand: string;
  name: string;
  mrp: number | null;
  sellingPrice: number | null;
  availability: number;
  coverage?: number;
  penetration?: number;
  discount?: number;
}[] {
  // Group data by product name (since we want one row per unique product)
  const productMap = new Map<string, any[]>();

  data.forEach(item => {
    const key = `${item.brand || ''}_${item.productDescription || ''}`;
    if (!key || key === '_') return; // Skip entries with no brand or product name

    if (!productMap.has(key)) {
      productMap.set(key, []);
    }

    productMap.get(key)!.push(item);
  });

  // Calculate aggregated metrics for each product
  return Array.from(productMap.entries())
    .map(([key, items]) => {
      if (items.length === 0) return null;
      
      // Get product info from first item
      const product = items[0];
      
      // Calculate mean MRP (filter out NaN and 0 values)
      const validMrps = items
        .map(item => typeof item.mrp === "number" && !isNaN(item.mrp) && item.mrp > 0 ? item.mrp : null)
        .filter(mrp => mrp !== null);
      const avgMrp = validMrps.length > 0 ? 
        validMrps.reduce((sum, mrp) => sum + mrp!, 0) / validMrps.length : null;

      // Calculate mean Selling Price (filter out NaN and 0 values)
      const validSps = items
        .map(item => typeof item.sellingPrice === "number" && !isNaN(item.sellingPrice) && item.sellingPrice > 0 ? item.sellingPrice : null)
        .filter(sp => sp !== null);
      const avgSellingPrice = validSps.length > 0 ? 
        validSps.reduce((sum, sp) => sum + sp!, 0) / validSps.length : null;

      // Calculate mean discount (filter out NaN values)
      const validDiscounts = items
        .map(item => typeof item.discount === "number" && !isNaN(item.discount) ? item.discount : null)
        .filter(discount => discount !== null);
      const avgDiscount = validDiscounts.length > 0 ? 
        validDiscounts.reduce((sum, discount) => sum + discount!, 0) / validDiscounts.length : null;

      // Calculate mean availability percentage (from normalized summary data)
      const validAvailabilities = items
        .map(item => typeof item.availability === "number" && !isNaN(item.availability) ? item.availability : null)
        .filter(availability => availability !== null);
      const avgAvailability = validAvailabilities.length > 0 ? 
        validAvailabilities.reduce((sum, availability) => sum + availability!, 0) / validAvailabilities.length : 0;

      // Calculate mean coverage percentage (from normalized summary data)
      const validCoverages = items
        .map(item => typeof item.coverage === "number" && !isNaN(item.coverage) ? item.coverage : null)
        .filter(coverage => coverage !== null);
      const avgCoverage = validCoverages.length > 0 ? 
        validCoverages.reduce((sum, coverage) => sum + coverage!, 0) / validCoverages.length : 0;

      // Calculate mean penetration percentage (from normalized summary data)
      const validPenetrations = items
        .map(item => typeof item.penetration === "number" && !isNaN(item.penetration) ? item.penetration : null)
        .filter(penetration => penetration !== null);
      const avgPenetration = validPenetrations.length > 0 ? 
        validPenetrations.reduce((sum, penetration) => sum + penetration!, 0) / validPenetrations.length : 0;

              return {
          brand: product.brand || '',
          name: product.productDescription || '',
          mrp: avgMrp ? Math.round(avgMrp) : null,
          sellingPrice: avgSellingPrice ? Math.round(avgSellingPrice) : null,
          availability: Math.round(avgAvailability * 100), // Convert to percentage
          coverage: Math.round(avgCoverage * 100), // Convert to percentage
          penetration: Math.round(avgPenetration * 100), // Convert to percentage
          discount: avgDiscount ? parseFloat(avgDiscount.toFixed(1)) : undefined,
        };
    })
    .filter(item => item !== null)
    .sort((a, b) => {
      if (a!.brand !== b!.brand) {
        return a!.brand.localeCompare(b!.brand);
      }
      return a!.name.localeCompare(b!.name);
    });
}

// Function to get choropleth data for map visualizations
export function getChoroplethData(data: ProcessedData[]): {
  id: string;
  value: number;
}[] {
  // Group data by pincode
  const pincodeMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.pincode) return; // Skip entries with no pincode
    
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Calculate availability percentage for each pincode
  return Array.from(pincodeMap.entries()).map(([pincode, items]) => {
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;

      return {
        id: pincode,
      value: stockAvailability
      };
  });
}

// Function to generate heatmap data based on the selected metric type
export function getHeatmapDataByType(
  data: ProcessedData[], 
  cityRegionalData: any[],
  type: "availability" | "coverage" | "penetration" = "availability"
): {
  id: string;
  city: string;
  value: number;
}[] {
  // Use the city regional data to get the metrics based on the selected type
  return cityRegionalData.map(cityData => {
    let value = 0;
    
    // Get the value based on the selected metric type
    if (type === "coverage") {
      value = cityData.coverage || 0;
    } else if (type === "penetration") {
      value = cityData.penetration || 0;
    } else {
      // Default to availability
      value = cityData.stockAvailability || 0;
    }
    
    return {
      id: (cityData.city || "").toLowerCase(),
      city: cityData.city || "",
      value: value,
    };
  });
}

// Function to get coverage data by brand for dashboard page visualizations
export function getCoverageByBrandData(data: ProcessedData[]): {
  name: string;
  coverage: number;
}[] {
  // Group data by brand
  const brandMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.brand) return; // Skip entries with no brand
    
    if (!brandMap.has(item.brand)) {
      brandMap.set(item.brand, []);
    }
    
    brandMap.get(item.brand)!.push(item);
  });
  
  // Calculate coverage for each brand
  return Array.from(brandMap.entries())
    .filter(([name]) => name) // Filter out empty brand names
    .map(([name, items]) => {
      // Group data by pincode to calculate serviceable items
      const pincodeMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
        pincodeMap.get(item.pincode)!.push(item);
      });
      
      // Calculate serviceable pincodes
      const serviceablePincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isServiceable = pincodeItems.some(item => 
          item.availability === "Yes" || 
          item.availability === "No" || 
          item.availability === "Item Not Found"
        );
        if (isServiceable) {
          serviceablePincodes.add(pincode);
        }
      });
      
      // Get all items in serviceable pincodes
      const serviceableItems = items.filter(item => 
        serviceablePincodes.has(item.pincode)
      );
      
      // Count available items (Yes availability)
      const availableItems = serviceableItems.filter(item => 
        item.availability === "Yes"
      ).length;
      
      // Total serviceable items
      const totalServiceableItems = serviceableItems.length;
      
      // Calculate coverage directly (matching the calculateCoverage function)
      // Coverage = Number of "Yes" Items / Total Serviceable Items
      const coverage = totalServiceableItems > 0 ?
        (availableItems / totalServiceableItems) * 100 : 0;
      
      return {
        name,
        coverage: parseFloat(coverage.toFixed(1))
      };
    })
    .sort((a, b) => b.coverage - a.coverage); // Sort by coverage in descending order
}

// New: fetch summary data from precomputed endpoint
export async function fetchSummaryData(filters: FetchFilters = {}): Promise<DashboardPayload> {
  const params = new URLSearchParams();
  if (filters.brand?.length)   params.set('brand', filters.brand.join(','));
  if (filters.company?.length) params.set('company', filters.company.join(','));
  if (filters.product?.length) params.set('product', filters.product.join(','));
  if (filters.city?.length)    params.set('city', filters.city.join(','));
  if (filters.platform?.length)params.set('platform', filters.platform.join(','));
  if (filters.from)             params.set('from', filters.from);
  if (filters.to)               params.set('to', filters.to);
  const url = `/api/summary${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch summary data');
  }
  return (await response.json()) as DashboardPayload;
}

// New: fetch raw data drill-down by pincode
export async function fetchRawData(filters: FetchFilters = {}): Promise<{ rawData: ProcessedData[] }> {
  const params = new URLSearchParams();
  if (filters.brand?.length)    params.set('brand', filters.brand.join(','));
  if (filters.company?.length)  params.set('company', filters.company.join(','));
  if (filters.product?.length)  params.set('product', filters.product.join(','));
  if (filters.city?.length)     params.set('city', filters.city.join(','));
  if (filters.platform?.length) params.set('platform', filters.platform.join(','));
  if (filters.pincode)          params.set('pincode', filters.pincode);
  if (filters.from)             params.set('from', filters.from);
  if (filters.to)               params.set('to', filters.to);
  const url = `/api/raw${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    let errorMessage = 'Failed to fetch raw data';
    try {
    const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // ignore JSON parsing error for empty or invalid error response
    }
    throw new Error(errorMessage);
  }
  let data: { rawData: ProcessedData[] };
  try {
    data = await response.json() as { rawData: ProcessedData[] };
  } catch (e) {
    throw new Error('Failed to parse raw data response');
  }
  return data;
}
